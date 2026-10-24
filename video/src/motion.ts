import { Easing } from 'remotion';

/** Apple Fluid MOTION.md curves. */
export const fluid = Easing.bezier(0.22, 1, 0.36, 1);
export const enter = Easing.bezier(0.16, 1, 0.3, 1);
export const exit = Easing.bezier(0.7, 0, 0.84, 0);
export const FPS = 60;
/** MOTION.md durations in frames. */
export const D = { fast: 10, default: 19, slow: 34 };

const clamp01 = (x: number) => Math.max(0, Math.min(1, x));

/** 0..1 progress of a tween starting at `start` lasting `dur` frames, on a MOTION.md curve. */
export const tween = (frame: number, start: number, dur: number, curve = fluid) => curve(clamp01((frame - start) / dur));

/** Apple spring in closed form (response in s, damping ratio): a pure function of time since `start`. */
export function spring(frame: number, start: number, from: number, to: number, response = 0.35, damping = 1, v0 = 0) {
  const t = (frame - start) / FPS;
  if (t <= 0) return from;
  const w = (2 * Math.PI) / response;
  const x0 = from - to;
  if (damping >= 1) return to + (x0 + (v0 + w * x0) * t) * Math.exp(-w * t);
  const wd = w * Math.sqrt(1 - damping * damping);
  return to + Math.exp(-damping * w * t) * (x0 * Math.cos(wd * t) + ((v0 + damping * w * x0) / wd) * Math.sin(wd * t));
}

export const lerp = (a: number, b: number, k: number) => a + (b - a) * k;

/** Scramble reveal: characters cycle through glyphs, then lock in left to right. */
const GLYPHS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#/-+';
export function scramble(text: string, frame: number, start: number, dur = 22) {
  const k = (frame - start) / dur;
  if (k <= 0) return '';
  return text
    .split('')
    .map((c, i) => {
      if (c === ' ') return ' ';
      const lock = i / text.length;
      if (k >= lock + 0.25) return c;
      if (k < lock * 0.6) return '';
      return GLYPHS[(i * 7 + Math.floor(frame / 2) * 13) % GLYPHS.length];
    })
    .join('');
}
