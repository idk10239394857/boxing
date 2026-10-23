/**
 * Strike latency: how long after a punch lands the detector reports it.
 *
 * Latency = frame time at which `push()` returned the event − the clip's impact time (the first
 * key of a punch's held extension). Only clips the detector got exactly right are measured.
 */
import fs from 'node:fs';
import path from 'node:path';
import type { Clip } from '../src/features/boxer/clips';
import { loadRecording, scoreRecording } from './e2e/score';
import { EXPECT } from './expectations';
import { labels, simulate, type SimOptions } from './sim';

/** Impact times (s) of a clip's punches: the start of each held pose that moves a fist. */
export function impactTimes(clip: Clip): number[] {
  const out: number[] = [];
  for (let i = 0; i + 1 < clip.keys.length; i++) {
    const a = clip.keys[i], b = clip.keys[i + 1];
    if (a.p === b.p && ('lead' in a.p || 'rear' in a.p)) out.push(a.t);
  }
  return out;
}

/** Latency (ms) of a strike reported at `at` (ms, clip-local): measured from the latest impact before it. */
function latencyOf(impacts: number[], at: number): number | null {
  const before = impacts.filter((i) => i * 1000 <= at + 50);
  return before.length ? at - before[before.length - 1] * 1000 : null;
}

const matches = (got: string[], want: string[] | string[][]) =>
  ((Array.isArray(want[0]) ? want : [want]) as string[][]).some((w) => w.join() === got.join());

export interface LatencyStats {
  n: number;
  mean: number;
  median: number;
  p90: number;
}
export function stats(xs: number[]): LatencyStats {
  const s = [...xs].sort((a, b) => a - b);
  const q = (f: number) => (s.length ? s[Math.min(s.length - 1, Math.floor(f * s.length))] : NaN);
  return { n: s.length, mean: s.reduce((a, b) => a + b, 0) / (s.length || 1), median: q(0.5), p90: q(0.9) };
}

/** Sim accuracy and strike latency over a set of camera/fps/stance variants. */
export function simLatency(variants: SimOptions[]) {
  const lat: number[] = [];
  let ok = 0, n = 0;
  for (const [, clip, want] of EXPECT) {
    const impacts = impactTimes(clip);
    for (const v of variants) {
      const at: number[] = [];
      const ev = simulate(clip, { ...v, emittedAt: at });
      n++;
      if (!matches(labels(ev), want)) continue;
      ok++;
      ev.forEach((e, i) => {
        if (e.kind !== 'strike') return;
        const l = latencyOf(impacts, at[i] - 1000); // simulate() leads with 1 s of guard
        if (l !== null) lat.push(l);
      });
    }
  }
  return { accuracy: ok / n, latency: stats(lat) };
}

/** Fixture accuracy and strike latency for a recorded MediaPipe stream of the test reel. */
export function fixtureLatency(file: string) {
  const r = scoreRecording(loadRecording(file));
  const lat: number[] = [];
  for (const c of r.clips) {
    if (!c.ok) continue;
    const impacts = impactTimes(c.clip);
    for (const g of r.got) {
      if (g.t / 1000 < c.start || g.t / 1000 > c.end + 0.9 || /Slip|Roll|Duck/.test(g.label)) continue;
      const l = latencyOf(impacts, g.at - c.start * 1000);
      if (l !== null) lat.push(l);
    }
  }
  return { accuracy: r.accuracy, stray: r.stray.length, latency: stats(lat) };
}

/** The sim matrix used by detector.test.ts (recommended camera band). */
export const SIM_VARIANTS: SimOptions[] = [-0.8, -0.65, -0.5].flatMap((camAz) =>
  [30, 20, 15].flatMap((fps) =>
    [1, 2, 3].flatMap((seed) => (['orthodox', 'southpaw'] as const).map((stance) => ({ camAz, fps, seed, stance }))),
  ),
);
const front = (extra: SimOptions): SimOptions[] =>
  [30, 20].flatMap((fps) => (['orthodox', 'southpaw'] as const).map((stance) => ({ ...extra, fps, stance, seed: 1 })));
export const FRONT_VARIANTS = front({ camAz: 0 });
export const LAPTOP_VARIANTS = front({ camAz: 0, distance: 1.6, elevation: 0.05, crop: true });

export const FIXTURES = ['mediapipe-bare-m05', 'mediapipe-glove-m05', 'mediapipe-bare-m10', 'mediapipe-shirt-front', 'mediapipe-shirt-laptop'];
export const fixturePath = (name: string) => path.join(__dirname, 'fixtures', `${name}.json.gz`);

/** Report: `npx tsx tests/latency.ts` (from fightflow/). */
if (require.main === module) {
  const fmt = (l: LatencyStats) => `latency mean ${l.mean.toFixed(0)} ms · median ${l.median.toFixed(0)} · p90 ${l.p90.toFixed(0)} (n=${l.n})`;
  const all: number[] = [];
  for (const [name, variants] of [['sim (recommended band)', SIM_VARIANTS], ['sim in front', FRONT_VARIANTS], ['sim laptop', LAPTOP_VARIANTS]] as const) {
    const r = simLatency(variants);
    console.log(`${name.padEnd(24)} ${(r.accuracy * 100).toFixed(1).padStart(5)}%  ${fmt(r.latency)}`);
  }
  for (const f of FIXTURES) {
    if (!fs.existsSync(fixturePath(f))) continue;
    const r = fixtureLatency(fixturePath(f));
    all.push(r.latency.mean);
    console.log(`${f.padEnd(24)} ${(r.accuracy * 100).toFixed(1).padStart(5)}%  stray ${r.stray}  ${fmt(r.latency)}`);
  }
  console.log(`fixtures mean latency ${(all.reduce((a, b) => a + b, 0) / all.length).toFixed(0)} ms`);
}
