export type TechniqueCategory = 'Punches' | 'Defense' | 'Footwork' | 'Combos';

export interface Technique {
  id: string;
  name: string;
  category: TechniqueCategory;
  description: string;
  cues: string[];
  timesDrilled: number;
  lastDrilled: string | null; // ISO timestamp
}

export type PunchType = 'jab' | 'cross' | 'hook' | 'uppercut' | 'body';

export interface PunchStat {
  punchType: PunchType;
  thrown: number;
  landed: number;
}

export type SessionType =
  | 'bag'
  | 'pads'
  | 'sparring'
  | 'footwork'
  | 'conditioning'
  | 'shadowboxing';

export interface Session {
  id: string;
  date: string; // YYYY-MM-DD (local)
  type: SessionType;
  rounds: number;
  durationMin: number;
  notes: string;
  xpEarned: number;
}

export interface Tier {
  id: string;
  name: string;
  tagline: string;
}

export interface SkillCheck {
  id: string;
  tierId: string;
  label: string;
  done: boolean;
}

export interface UserState {
  name: string;
  avatar: string;
  xp: number; // cumulative
  level: number;
  streak: number;
  longestStreak: number;
}

export type Celebration =
  | { kind: 'level'; level: number; title: string }
  | { kind: 'tier'; tierName: string; nextTierName: string | null; bonusXp: number };
