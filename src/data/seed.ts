import { addDays, todayKey } from '../lib/dates';
import { sessionXp, xpForLevel } from '../lib/gamification';
import type { PunchStat, PunchType, Session, SessionType, UserState } from '../types';

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

const session = (daysAgo: number, type: SessionType, rounds: number, durationMin: number, notes = ''): Session => ({
  id: `seed-${daysAgo}`,
  date: addDays(todayKey(), -daysAgo),
  type,
  rounds,
  durationMin,
  notes,
  xpEarned: sessionXp(rounds),
});

const punch = (punchType: PunchType, thrown: number, landed: number): PunchStat => ({ punchType, thrown, landed });

/** Demo fighter: Level 2, 340 XP into the level, 4-day FightStreak. */
export function makeSeed(): PersistedData {
  const ago = (d: number) => new Date(Date.now() - d * 86_400_000).toISOString();
  return {
    user: {
      name: 'You',
      avatar: '🥊',
      xp: xpForLevel(2) + 340,
      level: 2,
      streak: 4,
      longestStreak: 4,
    },
    sessions: [
      session(1, 'pads', 6, 45, 'Coach had me doubling the jab. Felt sharp.'),
      session(2, 'bag', 8, 50),
      session(3, 'shadowboxing', 4, 20, 'Focused on slipping after the 1-2.'),
      session(4, 'conditioning', 0, 35, 'Rope + circuits.'),
      session(7, 'sparring', 3, 30, 'Got caught with the right hand twice. Keep the left up.'),
      session(9, 'bag', 6, 40),
      session(12, 'footwork', 4, 25),
    ],
    drills: {
      jab: { timesDrilled: 6, lastDrilled: ago(1) },
      cross: { timesDrilled: 4, lastDrilled: ago(2) },
      'one-two': { timesDrilled: 5, lastDrilled: ago(1) },
      slip: { timesDrilled: 3, lastDrilled: ago(3) },
      'step-drag': { timesDrilled: 2, lastDrilled: ago(4) },
    },
    punches: {
      jab: punch('jab', 420, 251),
      cross: punch('cross', 310, 164),
      hook: punch('hook', 180, 83),
      uppercut: punch('uppercut', 64, 24),
      body: punch('body', 120, 77),
    },
    skillsDone: {
      'novice-1': true,
      'novice-2': true,
      'novice-3': true,
      'novice-6': true,
    },
    tiersCompleted: [],
  };
}
