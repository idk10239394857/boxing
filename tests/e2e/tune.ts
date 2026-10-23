/**
 * Grid-search key detector thresholds against real MediaPipe recordings (weighted 2×)
 * and a light simulation matrix. Usage: tsx tests/e2e/tune.ts <recording.json>...
 */
import { TUNING } from '../../src/features/tracking/detector';
import { EXPECT } from '../expectations';
import { labels, simulate } from '../sim';
import { loadRecording, scoreRecording, type Recording } from './score';

const recs = process.argv.slice(2).map(loadRecording);
const scoreRec = (frames: Recording) => {
  const r = scoreRecording(frames);
  return r.accuracy - (0.5 * r.stray.length) / r.clips.length; // stray events cost half a clip
};

function scoreSim() {
  let ok = 0, n = 0;
  for (const [, clip, want] of EXPECT)
    for (const camAz of [-0.8, -0.5]) for (const stance of ['orthodox', 'southpaw'] as const) {
      const got = labels(simulate(clip, { camAz, stance, fps: 20, seed: 2 })).join();
      ok += +((Array.isArray(want[0]) ? want : [want]) as string[][]).some((w) => w.join() === got);
      n++;
    }
  return ok / n;
}

const grid: Record<string, number[]> = {
  straightAngle: [145, 150, 155],
  straightTravel: [0.4, 0.45, 0.55],
  hookExt: [0.6, 0.65, 0.75],
  startSpeed: [1.6, 2.0, 2.5],
};
const keys = Object.keys(grid);
const base = { ...TUNING };
let best = { score: -1, params: {} as Record<string, number>, real: [] as number[], sim: 0 };
const combos = keys.reduce<Record<string, number>[]>((acc, k) => acc.flatMap((c) => grid[k].map((v) => ({ ...c, [k]: v }))), [{}]);
for (const c of combos) {
  Object.assign(TUNING, base, c);
  const real = recs.map(scoreRec);
  const sim = scoreSim();
  const score = (2 * real.reduce((a, b) => a + b, 0) / real.length + sim) / 3;
  if (score > best.score) best = { score, params: c, real, sim };
}
Object.assign(TUNING, base);
console.log('best', JSON.stringify(best.params), 'score', best.score.toFixed(3), 'real', best.real.map((x) => x.toFixed(2)).join(' '), 'sim', best.sim.toFixed(2));
Object.assign(TUNING, base);
console.log('current', 'real', recs.map(scoreRec).map((x) => x.toFixed(2)).join(' '), 'sim', scoreSim().toFixed(2));
