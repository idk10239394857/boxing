import assert from 'node:assert/strict';
import { test } from 'node:test';
import * as C from '../src/features/boxer/clips';
import { FIXTURES, SIM_VARIANTS, fixtureLatency, fixturePath, impactTimes, simLatency } from './latency';
import { simulate } from './sim';

// How long after a punch lands it shows up (run `npx tsx tests/latency.ts` for the full report).
// Before strikes were called at impact this was ~570 ms in the sim and ~610 ms on real footage.

test('latency: sim strikes reported within 250 ms of impact on average', () => {
  const { latency } = simLatency(SIM_VARIANTS);
  assert.ok(latency.mean <= 250, `mean ${latency.mean.toFixed(0)} ms`);
  assert.ok(latency.p90 <= 350, `p90 ${latency.p90.toFixed(0)} ms`);
});

test('latency: real MediaPipe strikes reported within 300 ms of impact on average', () => {
  for (const f of FIXTURES) {
    const { latency } = fixtureLatency(fixturePath(f));
    assert.ok(latency.mean <= 300, `${f}: mean ${latency.mean.toFixed(0)} ms`);
  }
});

test('latency: a jab is called within 250 ms of impact, at every frame rate', () => {
  for (const fps of [60, 30, 20, 15]) {
    const at: number[] = [];
    const ev = simulate(C.JAB, { fps, emittedAt: at });
    assert.deepEqual(ev.map((e) => e.label), ['Jab'], `${fps} fps`);
    const impact = impactTimes(C.JAB)[0] * 1000;
    const local = at[0] - 1000; // simulate() leads with 1 s of guard
    assert.ok(local - impact <= 250, `${fps} fps: reported ${(local - impact).toFixed(0)} ms after impact`);
    // The event carries the moment of impact, not the moment it was reported.
    const t = ev[0].t - 1000;
    assert.ok(Math.abs(t - impact) <= 120, `${fps} fps: event t ${t.toFixed(0)} ms`);
  }
});

test('latency: a combination is reported punch by punch, not at the end', () => {
  const at: number[] = [];
  const ev = simulate(C.ONE_TWO, { emittedAt: at });
  assert.deepEqual(ev.map((e) => e.label), ['Jab', 'Cross']);
  const [jab, cross] = impactTimes(C.ONE_TWO).map((s) => 1000 + s * 1000);
  assert.ok(at[0] < cross, `jab reported at ${(at[0] - 1000).toFixed(0)} ms, after the cross landed`);
  assert.ok(at[0] - jab < 250 && at[1] - cross < 250);
});
