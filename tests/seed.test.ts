import assert from 'node:assert/strict';
import { test } from 'node:test';
import { makeFresh, stripDemo } from '../src/data/seed';
import type { Session } from '../src/types';

const s = (id: string, xpEarned: number): Session => ({ id, date: '2026-10-20', type: 'bag', rounds: 3, durationMin: 20, notes: '', xpEarned });

test('new installs start empty', () => {
  const d = makeFresh();
  assert.equal(d.sessions.length, 0);
  assert.equal(d.user.xp, 0);
  assert.equal(d.punches.jab.thrown, 0);
});

test('the old demo fighter is removed, own sessions are kept', () => {
  const fresh = makeFresh();
  const old = { ...fresh, user: { ...fresh.user, name: 'Ali', xp: 840 + 65 }, sessions: [s('seed-1', 80), s('mine', 65)], punches: { ...fresh.punches, jab: { punchType: 'jab' as const, thrown: 430, landed: 255 } }, skillsDone: { 'novice-1': true, 'novice-4': true } };
  const out = stripDemo(old);
  assert.deepEqual(out.sessions.map((x) => x.id), ['mine']);
  assert.equal(out.user.xp, 65);
  assert.deepEqual([out.punches.jab.thrown, out.punches.jab.landed], [10, 4]);
  assert.deepEqual(Object.keys(out.skillsDone), ['novice-4']);
  assert.equal(stripDemo({ ...old, sessions: [s('seed-1', 80)] }).user.name, 'Ali');
});
