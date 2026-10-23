import { xpForLevel } from '../lib/gamification';
import type { PunchStat, PunchType, Session, UserState } from '../types';

export interface DrillRecord {
  timesDrilled: number;
  lastDrilled: string | null;
}

export interface PersistedData {
  user: UserState;
  sessions: Session[];
  drills: Record<string, DrillRecord>;
  punches: Record<PunchType, PunchStat>;
  skillsDone: Record<string, boolean>;
  tiersCompleted: string[];
}

const zero = (punchType: PunchType): PunchStat => ({ punchType, thrown: 0, landed: 0 });

/** A brand-new fighter: no sessions, no stats, level 1. */
export function makeFresh(): PersistedData {
  return {
    user: { name: 'You', avatar: '🥊', xp: 0, level: 1, streak: 0, longestStreak: 0 },
    sessions: [],
    drills: {},
    punches: { jab: zero('jab'), cross: zero('cross'), hook: zero('hook'), uppercut: zero('uppercut'), body: zero('body') },
    skillsDone: {},
    tiersCompleted: [],
  };
}

/** What older builds pre-filled for every new install, so it can be taken back out. */
const DEMO = {
  xp: xpForLevel(2) + 340,
  drills: { jab: 6, cross: 4, 'one-two': 5, slip: 3, 'step-drag': 2 } as Record<string, number>,
  punches: { jab: [420, 251], cross: [310, 164], hook: [180, 83], uppercut: [64, 24], body: [120, 77] } as Record<PunchType, [number, number]>,
  skills: ['novice-1', 'novice-2', 'novice-3', 'novice-6'],
};

/**
 * Remove the demo fighter that older builds shipped. Someone who never logged a session of
 * their own starts fresh; anyone who did keeps their own sessions with the demo numbers taken out.
 */
export function stripDemo(data: PersistedData): PersistedData {
  const own = data.sessions.filter((s) => !s.id.startsWith('seed-'));
  if (own.length === data.sessions.length) return data;
  if (!own.length) return { ...makeFresh(), user: { ...makeFresh().user, name: data.user.name, avatar: data.user.avatar } };
  const drills = Object.fromEntries(
    Object.entries(data.drills)
      .map(([id, d]) => [id, { ...d, timesDrilled: d.timesDrilled - (DEMO.drills[id] ?? 0) }] as const)
      .filter(([, d]) => d.timesDrilled > 0),
  );
  const punches = Object.fromEntries(
    Object.entries(data.punches).map(([k, p]) => {
      const [t, l] = DEMO.punches[k as PunchType] ?? [0, 0];
      return [k, { ...p, thrown: Math.max(0, p.thrown - t), landed: Math.max(0, p.landed - l) }];
    }),
  ) as PersistedData['punches'];
  const skillsDone = { ...data.skillsDone };
  for (const id of DEMO.skills) delete skillsDone[id];
  return { ...data, sessions: own, drills, punches, skillsDone, user: { ...data.user, xp: Math.max(0, data.user.xp - DEMO.xp) } };
}
