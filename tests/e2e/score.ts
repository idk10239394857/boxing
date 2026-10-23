/** Score a recorded MediaPipe landmark stream of the test reel against its ground truth. */
import fs from 'node:fs';
import zlib from 'node:zlib';
import { StrikeDetector } from '../../src/features/tracking/detector';
import { reelSchedule } from './reelScript';

export type Recording = { t: number; image: number[][] | null; world: number[][] | null }[];

export function loadRecording(file: string): Recording {
  const buf = fs.readFileSync(file);
  return JSON.parse((file.endsWith('.gz') ? zlib.gunzipSync(buf) : buf).toString('utf8'));
}

const toL = (a: number[][]) => a.map(([x, y, z, v]) => ({ x, y, z, visibility: v }));

export function scoreRecording(frames: Recording, onWindow?: (info: Record<string, number | string>) => void) {
  const det = new StrikeDetector('orthodox');
  if (onWindow) det.debug = onWindow;
  /** t: the event's own time; at: the frame time at which the detector reported it. */
  const got: { t: number; at: number; label: string }[] = [];
  for (const f of frames) {
    if (!f.image || !f.world) continue;
    for (const e of det.push(f.t, toL(f.image), 4 / 3, toL(f.world))) got.push({ t: e.t, at: f.t, label: e.label });
  }
  const used = new Set<number>();
  const clips = reelSchedule().map((s) => {
    const inWin = got.map((g, i) => ({ ...g, i })).filter((g) => g.t / 1000 >= s.start && g.t / 1000 <= s.end + 0.9);
    inWin.forEach((g) => used.add(g.i));
    const labels = inWin.map((g) => g.label);
    return { ...s, got: labels, ok: labels.join() === s.labels.join(), countOk: labels.length === s.labels.length };
  });
  const stray = got.filter((_, i) => !used.has(i));
  return { got, clips, stray, accuracy: clips.filter((c) => c.ok).length / clips.length, countAccuracy: clips.filter((c) => c.countOk).length / clips.length };
}
