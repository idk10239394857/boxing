import { useMemo } from 'react';
import { SKILLS, TIERS } from '../data/roadmap';
import { TECHNIQUES } from '../data/techniques';
import type { PunchType, SkillCheck, Technique } from '../types';
import { isTierUnlocked, useFightStore } from './useFightStore';

export function useTechniques(): Technique[] {
  const drills = useFightStore((s) => s.drills);
  return useMemo(
    () =>
      TECHNIQUES.map((t) => ({
        ...t,
        timesDrilled: drills[t.id]?.timesDrilled ?? 0,
        lastDrilled: drills[t.id]?.lastDrilled ?? null,
      })),
    [drills],
  );
}

export function useTechnique(id: string): Technique | undefined {
  return useTechniques().find((t) => t.id === id);
}

export interface TierView {
  id: string;
  name: string;
  tagline: string;
  index: number;
  skills: SkillCheck[];
  done: number;
  unlocked: boolean;
  completed: boolean;
}

export function useRoadmap(): TierView[] {
  const skillsDone = useFightStore((s) => s.skillsDone);
  const tiersCompleted = useFightStore((s) => s.tiersCompleted);
  return useMemo(
    () =>
      TIERS.map((tier, index) => {
        const skills = SKILLS.filter((k) => k.tierId === tier.id).map((k) => ({
          ...k,
          done: !!skillsDone[k.id],
        }));
        return {
          ...tier,
          index,
          skills,
          done: skills.filter((k) => k.done).length,
          unlocked: isTierUnlocked(tier.id, tiersCompleted),
          completed: tiersCompleted.includes(tier.id),
        };
      }),
    [skillsDone, tiersCompleted],
  );
}

export function useTotals() {
  const sessions = useFightStore((s) => s.sessions);
  const punches = useFightStore((s) => s.punches);
  const drills = useFightStore((s) => s.drills);
  return useMemo(() => {
    const p = Object.values(punches);
    return {
      sessions: sessions.length,
      rounds: sessions.reduce((n, s) => n + s.rounds, 0),
      minutes: sessions.reduce((n, s) => n + s.durationMin, 0),
      thrown: p.reduce((n, x) => n + x.thrown, 0),
      landed: p.reduce((n, x) => n + x.landed, 0),
      drills: Object.values(drills).reduce((n, d) => n + d.timesDrilled, 0),
      techniquesTouched: Object.keys(drills).length,
    };
  }, [sessions, punches, drills]);
}

export const landPct = (p: { thrown: number; landed: number }) =>
  p.thrown ? Math.round((p.landed / p.thrown) * 100) : 0;

export type PunchTotals = Record<PunchType, { thrown: number; landed: number }>;
