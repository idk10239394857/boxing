import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist, type StateStorage } from 'zustand/middleware';
import { SKILLS, TIERS } from '../data/roadmap';
import { makeFresh, stripDemo, type PersistedData } from '../data/seed';
import { TECHNIQUES } from '../data/techniques';
import { computeStreaks, levelFromXp, rankTitle, sessionXp, XP } from '../lib/gamification';
import type { Celebration, PunchType, Session, SessionType, UserState } from '../types';

export interface NewSession {
  date: string;
  type: SessionType;
  rounds: number;
  durationMin: number;
  notes: string;
}

export interface TrackedSession extends NewSession {
  punches: Partial<Record<PunchType, { thrown: number; landed: number }>>;
  /** Technique ids that earn a drill credit. */
  drilled: string[];
}

interface Toast {
  id: number;
  text: string;
}

interface FightStore extends PersistedData {
  celebrations: Celebration[];
  toast: Toast | null;
  logSession: (input: NewSession) => void;
  deleteSession: (id: string) => void;
  drillTechnique: (id: string) => void;
  logPunches: (entries: Partial<Record<PunchType, { thrown: number; landed: number }>>) => void;
  /** Shadow Cam result: punches, drill credits and the session in one award. */
  logTrackedSession: (input: TrackedSession) => void;
  toggleSkill: (skillId: string) => void;
  refreshStreaks: () => void;
  updateProfile: (patch: Partial<Pick<UserState, 'name' | 'avatar'>>) => void;
  dismissCelebration: () => void;
  resetData: () => void;
}

type Draft = Pick<FightStore, 'user' | 'celebrations' | 'toast'>;

/** Apply an XP change, keep `level` in sync and queue a level-up celebration. */
function withXp(s: Draft, amount: number, label: string): Draft {
  const xp = Math.max(0, s.user.xp + amount);
  const level = levelFromXp(xp);
  const celebrations =
    level > s.user.level
      ? [...s.celebrations, { kind: 'level' as const, level, title: rankTitle(level) }]
      : s.celebrations;
  const sign = amount >= 0 ? '+' : '−';
  return {
    user: { ...s.user, xp, level },
    celebrations,
    toast: amount ? { id: Date.now(), text: `${sign}${Math.abs(amount)} XP · ${label}` } : s.toast,
  };
}

const withStreaks = (user: UserState, sessions: Session[]): UserState => ({
  ...user,
  ...computeStreaks(sessions),
});

/** Storage can be blocked (private mode, sandboxed iframes); fall back to in-memory instead of failing hydration. */
const safeStorage: StateStorage = {
  getItem: (k) => AsyncStorage.getItem(k).catch(() => null),
  setItem: (k, v) => AsyncStorage.setItem(k, v).catch(() => undefined),
  removeItem: (k) => AsyncStorage.removeItem(k).catch(() => undefined),
};

export function isTierUnlocked(tierId: string, tiersCompleted: string[]): boolean {
  const i = TIERS.findIndex((t) => t.id === tierId);
  return i <= 0 || tiersCompleted.includes(TIERS[i - 1].id);
}

export const useFightStore = create<FightStore>()(
  persist(
    (set) => ({
      ...makeFresh(),
      celebrations: [],
      toast: null,

      logSession: (input) =>
        set((s) => {
          const session: Session = {
            ...input,
            id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
            notes: input.notes.trim(),
            xpEarned: sessionXp(input.rounds),
          };
          const sessions = [...s.sessions, session];
          const next = withXp(s, session.xpEarned, 'Session logged');
          return { ...next, sessions, user: withStreaks(next.user, sessions) };
        }),

      deleteSession: (id) =>
        set((s) => {
          const target = s.sessions.find((x) => x.id === id);
          if (!target) return s;
          const sessions = s.sessions.filter((x) => x.id !== id);
          const next = withXp(s, -target.xpEarned, 'Session removed');
          return { ...next, sessions, user: withStreaks(next.user, sessions) };
        }),

      drillTechnique: (id) =>
        set((s) => {
          const prev = s.drills[id] ?? { timesDrilled: 0, lastDrilled: null };
          const name = TECHNIQUES.find((t) => t.id === id)?.name ?? 'Technique';
          return {
            ...withXp(s, XP.techniqueDrilled, `${name} drilled`),
            drills: {
              ...s.drills,
              [id]: { timesDrilled: prev.timesDrilled + 1, lastDrilled: new Date().toISOString() },
            },
          };
        }),

      logPunches: (entries) =>
        set((s) => {
          const punches = { ...s.punches };
          let total = 0;
          for (const [type, e] of Object.entries(entries) as [PunchType, { thrown: number; landed: number }][]) {
            const thrown = Math.max(0, e.thrown);
            const landed = Math.min(thrown, Math.max(0, e.landed));
            punches[type] = {
              ...punches[type],
              thrown: punches[type].thrown + thrown,
              landed: punches[type].landed + landed,
            };
            total += thrown;
          }
          return { punches, toast: { id: Date.now(), text: `${total} punches logged` } };
        }),

      logTrackedSession: ({ punches: entries, drilled, ...input }) =>
        set((s) => {
          const punches = { ...s.punches };
          for (const [type, e] of Object.entries(entries) as [PunchType, { thrown: number; landed: number }][]) {
            punches[type] = {
              ...punches[type],
              thrown: punches[type].thrown + e.thrown,
              landed: punches[type].landed + Math.min(e.thrown, e.landed),
            };
          }
          const now = new Date().toISOString();
          const drills = { ...s.drills };
          for (const id of drilled) {
            drills[id] = { timesDrilled: (drills[id]?.timesDrilled ?? 0) + 1, lastDrilled: now };
          }
          const session: Session = {
            ...input,
            id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
            notes: input.notes.trim(),
            xpEarned: sessionXp(input.rounds),
          };
          const sessions = [...s.sessions, session];
          const next = withXp(s, session.xpEarned + drilled.length * XP.techniqueDrilled, 'Shadow Cam session');
          return { ...next, punches, drills, sessions, user: withStreaks(next.user, sessions) };
        }),

      toggleSkill: (skillId) =>
        set((s) => {
          const skill = SKILLS.find((k) => k.id === skillId);
          if (!skill || !isTierUnlocked(skill.tierId, s.tiersCompleted)) return s;
          const skillsDone = { ...s.skillsDone, [skillId]: !s.skillsDone[skillId] };

          const tierDone = SKILLS.filter((k) => k.tierId === skill.tierId).every((k) => skillsDone[k.id]);
          if (!tierDone || s.tiersCompleted.includes(skill.tierId)) return { skillsDone };

          // Tier cleared for the first time: bonus XP + celebration.
          const i = TIERS.findIndex((t) => t.id === skill.tierId);
          const tierCelebration: Celebration = {
            kind: 'tier',
            tierName: TIERS[i].name,
            nextTierName: TIERS[i + 1]?.name ?? null,
            bonusXp: XP.tierCompleted,
          };
          const next = withXp(
            { ...s, celebrations: [...s.celebrations, tierCelebration] },
            XP.tierCompleted,
            `${TIERS[i].name} cleared`,
          );
          return { ...next, skillsDone, tiersCompleted: [...s.tiersCompleted, skill.tierId] };
        }),

      refreshStreaks: () => set((s) => ({ user: withStreaks(s.user, s.sessions) })),

      updateProfile: (patch) => set((s) => ({ user: { ...s.user, ...patch } })),

      dismissCelebration: () => set((s) => ({ celebrations: s.celebrations.slice(1) })),

      resetData: () => set({ ...makeFresh(), celebrations: [], toast: null }),
    }),
    {
      name: 'fightflow-v1',
      version: 2,
      // v1 shipped a demo fighter to everyone; v2 starts empty and strips it from old installs.
      migrate: (persisted, version) => {
        const data = persisted as PersistedData;
        if (version >= 2 || !data?.sessions) return data;
        const clean = stripDemo(data);
        const level = levelFromXp(clean.user.xp);
        return { ...clean, user: withStreaks({ ...clean.user, level }, clean.sessions) };
      },
      storage: createJSONStorage(() => safeStorage),
      partialize: (s): PersistedData => ({
        user: s.user,
        sessions: s.sessions,
        drills: s.drills,
        punches: s.punches,
        skillsDone: s.skillsDone,
        tiersCompleted: s.tiersCompleted,
      }),
    },
  ),
);
