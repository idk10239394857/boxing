import type { ComponentProps } from 'react';
import type MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';

type IconName = ComponentProps<typeof MaterialCommunityIcons>['name'];

export interface AchievementInput {
  sessions: number;
  rounds: number;
  landed: number;
  longestStreak: number;
  sparringSessions: number;
  techniquesTouched: number;
  tiersCompleted: number;
  level: number;
}

interface AchievementDef {
  id: string;
  name: string;
  hint: string;
  icon: IconName;
  progress: (s: AchievementInput) => [number, number];
}

export const ACHIEVEMENTS: AchievementDef[] = [
  { id: 'first-bell', name: 'First Bell', hint: 'Log your first session', icon: 'bell-ring', progress: (s) => [s.sessions, 1] },
  { id: 'week-warrior', name: 'Week Warrior', hint: '7-day FightStreak', icon: 'fire', progress: (s) => [s.longestStreak, 7] },
  { id: 'centurion', name: 'Centurion', hint: '100 rounds logged', icon: 'timer-outline', progress: (s) => [s.rounds, 100] },
  { id: 'gloves-on', name: 'Gloves On', hint: '5 sparring sessions', icon: 'sword-cross', progress: (s) => [s.sparringSessions, 5] },
  { id: 'student', name: 'Student of the Game', hint: 'Drill 15 different techniques', icon: 'book-open-variant', progress: (s) => [s.techniquesTouched, 15] },
  { id: 'heavy-hands', name: 'Heavy Hands', hint: 'Land 1,000 punches', icon: 'boxing-glove', progress: (s) => [s.landed, 1000] },
  { id: 'climber', name: 'Climber', hint: 'Clear a roadmap tier', icon: 'stairs-up', progress: (s) => [s.tiersCompleted, 1] },
  { id: 'main-event', name: 'Main Event', hint: 'Reach Level 5', icon: 'trophy', progress: (s) => [s.level, 5] },
];

export function evaluateAchievements(input: AchievementInput) {
  return ACHIEVEMENTS.map((a) => {
    const [value, goal] = a.progress(input);
    return { ...a, value: Math.min(value, goal), goal, unlocked: value >= goal };
  });
}
