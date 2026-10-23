import { addDays, todayKey } from './dates';
import type { Session } from '../types';

export const XP = {
  session: 50,
  techniqueDrilled: 10,
  round: 5,
  tierCompleted: 100,
};

/** Advancing from Level N to N+1 costs N * LEVEL_STEP XP. */
export const LEVEL_STEP = 500;

/** Cumulative XP needed to reach `level`. */
export function xpForLevel(level: number): number {
  return (LEVEL_STEP * (level - 1) * level) / 2;
}

export function levelFromXp(xp: number): number {
  let level = 1;
  while (xp >= xpForLevel(level + 1)) level++;
  return level;
}

export function levelProgress(xp: number) {
  const level = levelFromXp(xp);
  const floor = xpForLevel(level);
  const needed = xpForLevel(level + 1) - floor;
  const into = xp - floor;
  return { level, into, needed, pct: into / needed };
}

const RANKS = [
  'Rookie', 'Prospect', 'Journeyman', 'Club Fighter', 'Gatekeeper',
  'Contender', 'Headliner', 'Title Challenger', 'Champion', 'Undisputed',
];

export function rankTitle(level: number): string {
  return RANKS[Math.min(level, RANKS.length) - 1];
}

export function sessionXp(rounds: number): number {
  return XP.session + rounds * XP.round;
}

/**
 * FightStreak = consecutive days with ≥1 session, ending today.
 * If today has no session yet, the streak through yesterday is still alive.
 */
export function computeStreaks(sessions: Session[], today = todayKey()) {
  const days = new Set(sessions.map((s) => s.date));

  let cursor = days.has(today) ? today : addDays(today, -1);
  let streak = 0;
  while (days.has(cursor)) {
    streak++;
    cursor = addDays(cursor, -1);
  }

  let longest = 0;
  for (const day of days) {
    if (days.has(addDays(day, -1))) continue; // not the start of a run
    let run = 0;
    let d = day;
    while (days.has(d)) {
      run++;
      d = addDays(d, 1);
    }
    longest = Math.max(longest, run);
  }
  return { streak, longestStreak: Math.max(longest, streak) };
}
