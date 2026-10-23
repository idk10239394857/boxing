import * as C from '../src/features/boxer/clips';
import { GUARD, mirrorSkeleton, solvePose } from '../src/features/boxer/rig';
import { StrikeDetector, type Stance, type TrackEvent } from '../src/features/tracking/detector';
import { SQUARE_HIPS } from './e2e/reelScript';
import { DEFAULT_CAMERA, skeletonToImage, skeletonToLandmarks } from '../src/features/tracking/landmarks';

export function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** The camera placement Shadow Cam recommends: 30–45° off to the rear-hand side. */
export const RECOMMENDED_AZ = -0.6;

export interface SimOptions {
  stance?: Stance;
  yaw?: number;
  /** Camera orbit angle for orthodox (mirrored for southpaw). Default: recommended side view. */
  camAz?: number;
  fps?: number;
  noise?: number;
  depthNoise?: number;
  seed?: number;
  repeat?: number;
  /** Camera distance (m); a laptop webcam is ~1.5–2 m away. */
  distance?: number;
  elevation?: number;
  /** Landmarks outside the frame get low visibility and drift, like MediaPipe's guesses. */
  crop?: boolean;
  /** Squared up to the camera instead of bladed (someone facing a laptop). */
  square?: boolean;
  /** Receives, for each event, the frame time (ms) at which the detector reported it. */
  emittedAt?: number[];
}

/** Play a clip (after 1 s of guard) through the detector as fake MediaPipe frames. */
export function simulate(clip: C.Clip, o: SimOptions = {}): TrackEvent[] {
  const { stance = 'orthodox', yaw = 0, fps = 30, noise = 0.01, depthNoise = 0.03, seed = 1, repeat = 1, camAz = RECOMMENDED_AZ, crop = false } = o;
  const cam = {
    ...DEFAULT_CAMERA,
    azimuth: stance === 'southpaw' ? -camAz : camAz,
    ...(o.distance ? { distance: o.distance } : {}),
    ...(o.elevation !== undefined ? { elevation: o.elevation } : {}),
    // Up close (a laptop), the camera frames head to waist.
    ...(o.distance && o.distance < 2.5 ? { targetY: 1.25 } : {}),
  };
  const det = new StrikeDetector(stance);
  const rand = mulberry32(seed);
  const lead = 1;
  const cycle = clip.duration + 0.6;
  const total = lead + Math.max(cycle * repeat, repeat === 0 ? 10 : 0) + 0.4;
  const events: TrackEvent[] = [];
  for (let t = 0; t < total; t += 1 / fps) {
    const local = t - lead;
    const base = local < 0 || local >= cycle * repeat ? GUARD : C.sampleClip(clip, local % cycle);
    // Idle breathing / bounce so the guard isn't perfectly still.
    const pose = { ...base, hipYaw: base.hipYaw + (o.square ? SQUARE_HIPS : 0), yaw: base.yaw + yaw, drop: base.drop + 0.012 * Math.sin(t * 5) };
    let skel = solvePose(pose);
    if (stance === 'southpaw') skel = mirrorSkeleton(skel);
    // 2D noise ≈ 0.4% of the frame, like MediaPipe on a clear view.
    const image = skeletonToImage(skel, cam, noise * 0.4, rand);
    if (crop) for (const l of image) if (l.y > 0.98 || l.y < 0.02 || l.x < 0.02 || l.x > 0.98) {
      l.visibility = 0.1;
      l.y = Math.min(1.15, l.y) + (rand() - 0.5) * 0.06;
    }
    const out = det.push(t * 1000, image, cam.aspect, skeletonToLandmarks(skel, noise, depthNoise, rand, cam.azimuth));
    events.push(...out);
    for (const _ of out) o.emittedAt?.push(t * 1000);
  }
  return events;
}

export const labels = (evs: TrackEvent[]) => evs.map((e) => e.label);
