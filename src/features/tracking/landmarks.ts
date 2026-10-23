import type { Skeleton } from '../boxer/rig';
import { add, scale, sub, type V3 } from '../boxer/vec';

/** MediaPipe Pose landmark (world: metres, hip-centred, y down). */
export interface Landmark {
  x: number;
  y: number;
  z: number;
  visibility?: number;
}

export const LM = {
  nose: 0,
  lEar: 7,
  rEar: 8,
  lShoulder: 11,
  rShoulder: 12,
  lElbow: 13,
  rElbow: 14,
  lWrist: 15,
  rWrist: 16,
  lHip: 23,
  rHip: 24,
  lKnee: 25,
  rKnee: 26,
  lAnkle: 27,
  rAnkle: 28,
} as const;

/** Joints needed for tracking: shoulders, elbows, wrists, hips, nose. */
export const KEY_LANDMARKS = [LM.nose, LM.lShoulder, LM.rShoulder, LM.lElbow, LM.rElbow, LM.lWrist, LM.rWrist, LM.lHip, LM.rHip];

export const POSE_LINKS: [number, number][] = [
  [11, 12], [11, 13], [13, 15], [12, 14], [14, 16],
  [11, 23], [12, 24], [23, 24],
  [23, 25], [25, 27], [24, 26], [26, 28],
  [27, 31], [28, 32], [27, 29], [28, 30],
];

/**
 * Convert a rig skeleton into MediaPipe-style world landmarks, as seen by a camera
 * standing in front of the fighter (+Z), or orbited round by `azimuth`. Used for tests and demos.
 */
export function skeletonToLandmarks(
  s: Skeleton, noise = 0, depthNoise = noise, rand: () => number = Math.random, azimuth = 0,
): Landmark[] {
  const [c, sn] = [Math.cos(azimuth), Math.sin(azimuth)];
  const hip = scale(add(s.lHip, s.rHip), 0.5);
  const gauss = () => {
    let u = 0, w = 0;
    while (u === 0) u = rand();
    while (w === 0) w = rand();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * w);
  };
  const mp = (p: V3): Landmark => {
    const r = sub(p, hip);
    // MediaPipe's world axes follow the camera: x to its right, z toward it negative.
    const d = [r[0] * c - r[2] * sn, r[1], r[0] * sn + r[2] * c];
    return { x: d[0] + gauss() * noise, y: -d[1] + gauss() * noise, z: -d[2] + gauss() * depthNoise, visibility: 1 };
  };
  const face = (fwd: number, lat: number, up: number) =>
    add(s.head, add(scale(s.chestForward, fwd), add(scale(s.chestRight, -lat), scale(s.chestUp, up))));
  const pts: V3[] = new Array(33);
  pts[0] = face(0.1, 0, 0);
  pts[1] = face(0.09, 0.02, 0.03); pts[2] = face(0.09, 0.03, 0.03); pts[3] = face(0.09, 0.045, 0.03);
  pts[4] = face(0.09, -0.02, 0.03); pts[5] = face(0.09, -0.03, 0.03); pts[6] = face(0.09, -0.045, 0.03);
  pts[7] = face(0, 0.075, 0.01); pts[8] = face(0, -0.075, 0.01);
  pts[9] = face(0.09, 0.02, -0.04); pts[10] = face(0.09, -0.02, -0.04);
  pts[11] = s.lShoulder; pts[12] = s.rShoulder;
  pts[13] = s.lElbow; pts[14] = s.rElbow;
  pts[15] = s.lWrist; pts[16] = s.rWrist;
  pts[17] = pts[19] = pts[21] = s.lGlove;
  pts[18] = pts[20] = pts[22] = s.rGlove;
  pts[23] = s.lHip; pts[24] = s.rHip;
  pts[25] = s.lKnee; pts[26] = s.rKnee;
  pts[27] = s.lAnkle; pts[28] = s.rAnkle;
  pts[29] = s.lHeel; pts[30] = s.rHeel;
  pts[31] = s.lToe; pts[32] = s.rToe;
  return pts.map(mp);
}

export interface SimCamera {
  /** Orbit angle around the fighter (0 = in front). */
  azimuth: number;
  elevation: number;
  distance: number;
  /** Vertical field of view, degrees. */
  fov: number;
  aspect: number;
  /** Height the camera looks at (m); default 1.0 (hips to head in a full-body shot). */
  targetY?: number;
}
export const DEFAULT_CAMERA: SimCamera = { azimuth: -0.5, elevation: 0.08, distance: 3.4, fov: 34, aspect: 4 / 3 };

/**
 * Project a skeleton to MediaPipe-style normalized image landmarks (x,y in 0..1) as seen by an
 * orbit camera matching the 3D viewer's. Used for tests.
 */
export function skeletonToImage(s: Skeleton, cam: SimCamera = DEFAULT_CAMERA, noise = 0, rand: () => number = Math.random): Landmark[] {
  const target: V3 = [0, cam.targetY ?? 1.0, 0.15];
  const eye: V3 = [
    target[0] + Math.sin(cam.azimuth) * Math.cos(cam.elevation) * cam.distance,
    target[1] + Math.sin(cam.elevation) * cam.distance + 0.25,
    target[2] + Math.cos(cam.azimuth) * Math.cos(cam.elevation) * cam.distance,
  ];
  const fwd = norm3(sub(target, eye));
  const right = norm3(cross3(fwd, [0, 1, 0]));
  const up = cross3(right, fwd);
  const f = 1 / Math.tan(((cam.fov / 2) * Math.PI) / 180);
  const world = skeletonToLandmarks(s, 0, 0);
  const hip = scale(add(s.lHip, s.rHip), 0.5);
  const gauss = () => Math.sqrt(-2 * Math.log(rand() || 1e-9)) * Math.cos(2 * Math.PI * rand());
  return world.map((l) => {
    // Undo the MediaPipe-world convention to get scene coordinates back.
    const p: V3 = [l.x + hip[0], -l.y + hip[1], -l.z + hip[2]];
    const d = sub(p, eye);
    const z = d[0] * fwd[0] + d[1] * fwd[1] + d[2] * fwd[2];
    const x = (d[0] * right[0] + d[1] * right[1] + d[2] * right[2]) / z;
    const y = (d[0] * up[0] + d[1] * up[1] + d[2] * up[2]) / z;
    return {
      x: 0.5 + (x * f) / (2 * cam.aspect) + gauss() * noise,
      y: 0.5 - (y * f) / 2 + gauss() * noise,
      z: 0,
      visibility: 1,
    };
  });
}

const cross3 = (a: V3, b: V3): V3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const norm3 = (a: V3): V3 => {
  const l = Math.hypot(a[0], a[1], a[2]) || 1;
  return [a[0] / l, a[1] / l, a[2] / l];
};
