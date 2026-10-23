import type { PunchType } from '../../types';
import type { TrackEvent } from './detector';

/** Gap that still chains two punches into one combination (ms). */
export const COMBO_GAP_MS = 700;

export interface TallyState {
  events: TrackEvent[];
  punches: Record<PunchType, number>;
  byLabel: Record<string, number>;
  defense: number;
  combo: number;
  bestCombo: number;
  lastStrikeT: number;
  comboSeq: string[];
  combos: Record<string, number>;
}

export const emptyTally = (): TallyState => ({
  events: [],
  punches: { jab: 0, cross: 0, hook: 0, uppercut: 0, body: 0 },
  byLabel: {},
  defense: 0,
  combo: 0,
  bestCombo: 0,
  lastStrikeT: -1e9,
  comboSeq: [],
  combos: {},
});

const COMBO_IDS: [string, string[]][] = [
  ['jab-cross-hook', ['Jab', 'Cross', 'Lead Hook']],
  ['one-two', ['Jab', 'Cross']],
  ['hook-cross-hook', ['Lead Hook', 'Cross', 'Lead Hook']],
];

export function addEvent(s: TallyState, e: TrackEvent): TallyState {
  const byLabel = { ...s.byLabel, [e.label]: (s.byLabel[e.label] ?? 0) + 1 };
  if (e.kind === 'defense') return { ...s, events: [...s.events, e], byLabel, defense: s.defense + 1 };

  const chained = e.t - s.lastStrikeT <= COMBO_GAP_MS;
  const combo = chained ? s.combo + 1 : 1;
  const comboSeq = chained ? [...s.comboSeq, e.label] : [e.label];
  const combos = { ...s.combos };
  for (const [id, seq] of COMBO_IDS) {
    const tail = comboSeq.slice(-seq.length);
    if (tail.length === seq.length && tail.every((l, i) => l === seq[i])) {
      combos[id] = (combos[id] ?? 0) + 1;
      break;
    }
  }
  return {
    ...s,
    events: [...s.events, e],
    byLabel,
    punches: { ...s.punches, [e.punch]: s.punches[e.punch] + 1 },
    combo,
    bestCombo: Math.max(s.bestCombo, combo),
    lastStrikeT: e.t,
    comboSeq,
    combos,
  };
}

const LABEL_TECHNIQUE: Record<string, string> = {
  Jab: 'jab',
  Cross: 'cross',
  'Lead Hook': 'lead-hook',
  'Rear Hook': 'rear-hook',
  'Lead Uppercut': 'lead-uppercut',
  'Rear Uppercut': 'rear-uppercut',
  'Body Jab': 'body-jab',
  'Liver Shot': 'liver-shot',
  Slip: 'slip',
  Roll: 'roll',
  Duck: 'roll',
};

/** Techniques worth a drill credit: 5+ clean reps (3+ for combinations). */
export function drilledTechniques(s: TallyState): string[] {
  const reps: Record<string, number> = {};
  for (const [label, n] of Object.entries(s.byLabel)) {
    const id = LABEL_TECHNIQUE[label];
    if (id) reps[id] = (reps[id] ?? 0) + n;
  }
  const out = Object.entries(reps).filter(([, n]) => n >= 5).map(([id]) => id);
  for (const [id, n] of Object.entries(s.combos)) if (n >= 3) out.push(id);
  return out;
}

export const totalPunches = (s: TallyState) => Object.values(s.punches).reduce((a, b) => a + b, 0);
