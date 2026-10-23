import * as C from '../../src/features/boxer/clips';
import { GUARD } from '../../src/features/boxer/rig';

/** The scripted test reel: each clip and the labels Shadow Cam should report for it. */
export const REEL: [string, C.Clip, string[]][] = [
  ['jab', C.JAB, ['Jab']],
  ['cross', C.CROSS, ['Cross']],
  ['lead hook', C.LEAD_HOOK, ['Lead Hook']],
  ['rear hook', C.REAR_HOOK, ['Rear Hook']],
  ['lead upper', C.LEAD_UPPER, ['Lead Uppercut']],
  ['rear upper', C.REAR_UPPER, ['Rear Uppercut']],
  ['body jab', C.BODY_JAB, ['Body Jab']],
  ['liver', C.LIVER, ['Liver Shot']],
  ['1-2', C.ONE_TWO, ['Jab', 'Cross']],
  ['1-2-3', C.JAB_CROSS_HOOK, ['Jab', 'Cross', 'Lead Hook']],
  ['slips', C.SLIP, ['Slip', 'Slip']],
  ['roll', C.ROLL, ['Roll']],
];
export const LEAD_IN = 1.5, GAP = 1.0, TAIL = 1.5;
/** Hip turn that squares a bladed guard up to face the opponent (and the camera in front). */
export const SQUARE_HIPS = 0.55;

export function reelSchedule() {
  let cursor = LEAD_IN;
  return REEL.map(([name, clip, labels]) => {
    const start = cursor;
    cursor += clip.duration + GAP;
    return { name, clip, labels, start, end: start + clip.duration };
  });
}

export function reelPoseAt(t: number) {
  for (const s of reelSchedule()) if (t >= s.start && t < s.end) return C.sampleClip(s.clip, t - s.start);
  return GUARD;
}
export const reelLength = () => LEAD_IN + REEL.reduce((n, [, c]) => n + c.duration + GAP, 0) + TAIL;

/** Two fighters facing each other: red on the left of the screen, blue on the right. */
export const SPARRING: { fighter: 0 | 1; name: string; clip: C.Clip; labels: string[]; start: number }[] = [
  { fighter: 0, name: 'red jab', clip: C.JAB, labels: ['Jab'], start: 1.5 },
  { fighter: 1, name: 'blue jab', clip: C.JAB, labels: ['Jab'], start: 3.0 },
  { fighter: 0, name: 'red cross', clip: C.CROSS, labels: ['Cross'], start: 4.5 },
  { fighter: 1, name: 'blue body jab', clip: C.BODY_JAB, labels: ['Body Jab'], start: 6.0 },
  { fighter: 0, name: 'red 1-2', clip: C.ONE_TWO, labels: ['Jab', 'Cross'], start: 7.5 },
  { fighter: 1, name: 'blue rear upper', clip: C.REAR_UPPER, labels: ['Rear Uppercut'], start: 9.5 },
  { fighter: 0, name: 'red jab (exchange)', clip: C.JAB, labels: ['Jab'], start: 11.5 },
  { fighter: 1, name: 'blue cross (exchange)', clip: C.CROSS, labels: ['Cross'], start: 11.6 },
  { fighter: 1, name: 'blue 1-2', clip: C.ONE_TWO, labels: ['Jab', 'Cross'], start: 13.2 },
];
export const SPARRING_LENGTH = 15.5;
export const SPARRING_SPOTS = [
  { x: -0.85, yaw: Math.PI / 2 },
  { x: 0.85, yaw: -Math.PI / 2 },
];

export function sparringPoseAt(fighter: 0 | 1, t: number) {
  const spot = SPARRING_SPOTS[fighter];
  let pose = GUARD;
  for (const s of SPARRING) if (s.fighter === fighter && t >= s.start && t < s.start + s.clip.duration) pose = C.sampleClip(s.clip, t - s.start);
  return { ...pose, x: spot.x, z: 0, yaw: spot.yaw };
}
