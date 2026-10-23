import { EXPECT } from './expectations';
import { labels, simulate } from './sim';
let total = 0, ok = 0;
const byFps: Record<number, [number, number]> = {};
for (const [name, clip, want] of EXPECT) {
  let good = 0, n = 0; const fails: string[] = [];
  for (const camAz of [-0.8, -0.65, -0.5]) for (const fps of [30, 20, 15]) for (const seed of [1, 2, 3, 4, 5]) for (const stance of ['orthodox', 'southpaw'] as const) {
    const got = labels(simulate(clip, { camAz, fps, seed, stance }));
    const options = (Array.isArray(want[0]) ? want : [want]) as string[][];
    const pass = options.some((w) => w.join() === got.join());
    n++; good += +pass; byFps[fps] = byFps[fps] ?? [0, 0]; byFps[fps][0] += +pass; byFps[fps][1]++;
    if (!pass && fails.length < 3) fails.push(`${stance[0]} az${camAz} ${fps}fps s${seed}: ${got.join('+') || '-'}`);
  }
  total += n; ok += good;
  console.log(`${name.padEnd(22)} ${String(Math.round((100 * good) / n)).padStart(3)}%  ${fails.join(' | ')}`);
}
console.log('OVERALL', ((100 * ok) / total).toFixed(1) + '%', Object.entries(byFps).map(([f, [a, b]]) => `${f}fps ${((100 * a) / b).toFixed(1)}%`).join(' '));
