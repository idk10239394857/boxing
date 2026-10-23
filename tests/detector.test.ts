import assert from 'node:assert/strict';
import { test } from 'node:test';
import * as C from '../src/features/boxer/clips';
import { loadRecording, scoreRecording } from './e2e/score';
import { EXPECT } from './expectations';
import { labels, simulate } from './sim';

// Recommended camera band (30–45° off to the rear-hand side), frame rates, noise seeds, stances.
const VARIANTS = [-0.8, -0.65, -0.5].flatMap((camAz) =>
  [30, 20, 15].flatMap((fps) =>
    [1, 2, 3].flatMap((seed) => (['orthodox', 'southpaw'] as const).map((stance) => ({ camAz, fps, seed, stance }))),
  ),
);

const matches = (got: string[], want: string[] | string[][]) =>
  ((Array.isArray(want[0]) ? want : [want]) as string[][]).some((w) => w.join() === got.join());

/** Straight vs hook is genuinely ambiguous from one camera; everything else must be solid. */
const HOOKY = /hook/i;

let total = 0, passed = 0;
for (const [name, clip, want] of EXPECT) {
  test(`sim: ${name} → ${JSON.stringify(want)}`, () => {
    const results = VARIANTS.map((o) => simulate(clip, o));
    const ok = results.filter((ev) => matches(labels(ev), want)).length;
    total += VARIANTS.length;
    passed += ok;
    const rate = ok / VARIANTS.length;
    if (want.length === 0) {
      // Footwork and blocks must never log a punch.
      const punches = results.flat().filter((e) => e.kind === 'strike');
      assert.equal(punches.length, 0, `${name} logged ${punches.map((e) => e.label).join(', ')}`);
    } else {
      const floor = JSON.stringify(want).match(HOOKY) ? 0.1 : 0.8;
      assert.ok(rate >= floor, `${name}: ${(rate * 100).toFixed(0)}% (need ${floor * 100}%)`);
    }
  });
}

test('sim: overall accuracy ≥ 80%', () => {
  assert.ok(passed / total >= 0.8, `overall ${((100 * passed) / total).toFixed(1)}%`);
});

test('sim: southpaw right hand is the jab', () => {
  const ev = simulate(C.JAB, { stance: 'southpaw' });
  assert.equal(ev.length, 1);
  assert.equal(ev[0].kind === 'strike' && ev[0].punch, 'jab');
});

// Real MediaPipe output, recorded from rendered footage of the test reel (see tests/e2e).
for (const [file, minClips] of [
  ['mediapipe-bare-m05', 0.8], // recommended camera angle, bare fists
  ['mediapipe-glove-m05', 0.8], // recommended camera angle, gloves
  ['mediapipe-bare-m10', 0.5], // more side-on than recommended: far arm partly hidden
  // Camera straight in front (gloves, tank top): straights thrown at the lens are often missed.
  ['mediapipe-shirt-front', 0.4], // whole body in frame
  ['mediapipe-shirt-laptop', 0.3], // laptop webcam: waist up, legs out of frame
] as const) {
  test(`MediaPipe ${file}: ≥${minClips * 100}% clips exact, no phantom punches`, () => {
    const r = scoreRecording(loadRecording(`${__dirname}/fixtures/${file}.json.gz`));
    const summary = r.clips.filter((c) => !c.ok).map((c) => `${c.name}: ${c.got.join('+') || '-'}`).join('; ');
    assert.ok(r.accuracy >= minClips, `${(r.accuracy * 100).toFixed(0)}% — misses: ${summary}`);
    assert.equal(r.stray.length, 0, `stray events: ${r.stray.map((s) => s.label).join(', ')}`);
  });
}

// Camera straight in front, full body and at laptop distance (legs out of frame).
for (const [name, view, floor] of [
  ['in front', { camAz: 0 }, 0.75],
  ['laptop webcam', { camAz: 0, distance: 1.6, elevation: 0.05, crop: true }, 0.6],
  // Squared up to the camera (not bladed), punching straight at it: how most people use a laptop.
  ['in front, squared up', { camAz: 0, square: true }, 0.85],
  ['laptop, squared up', { camAz: 0, square: true, distance: 1.6, elevation: 0.05, crop: true }, 0.7],
] as const) {
  test(`sim: camera ${name} ≥ ${floor * 100}%`, () => {
    let ok = 0, n = 0;
    for (const [, clip, want] of EXPECT)
      for (const fps of [30, 20]) for (const stance of ['orthodox', 'southpaw'] as const) {
        n++;
        if (matches(labels(simulate(clip, { ...view, fps, stance, seed: 1 })), want)) ok++;
      }
    assert.ok(ok / n >= floor, `${((100 * ok) / n).toFixed(0)}%`);
  });
}

// Uppercuts must read from every camera position people actually use.
for (const [name, view] of [
  ['recommended angle', {}],
  ['in front', { camAz: 0 }],
  ['squared up', { camAz: 0, square: true }],
  ['laptop, squared up', { camAz: 0, square: true, distance: 1.6, elevation: 0.05, crop: true }],
] as const) {
  test(`sim: uppercuts read with the camera ${name}`, () => {
    for (const [clip, label] of [[C.LEAD_UPPER, 'Lead Uppercut'], [C.REAR_UPPER, 'Rear Uppercut']] as const)
      for (const stance of ['orthodox', 'southpaw'] as const)
        for (const fps of [30, 20]) {
          const got = labels(simulate(clip, { ...view, stance, fps, seed: 2 }));
          assert.deepEqual(got, [label], `${label} ${stance} ${fps}fps: ${got.join('+') || '-'}`);
        }
  });
}
