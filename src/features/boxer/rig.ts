/**
 * Procedural boxer skeleton. A pose is described the way a coach would describe it
 * (where the gloves and feet go, how much the hips turn, how low you sit) and
 * two-bone IK solves elbows and knees. World: Y up, fighter faces +Z, fighter's
 * left is +X (orthodox: left = lead).
 */
import { add, apply, cross, dot, len, mid, mul, norm, rotX, rotY, rotZ, scale, sub, v, type M3, type V3 } from './vec';

export const BODY = {
  hipHeight: 0.95,
  hipHalf: 0.1,
  spine: 0.48,
  shoulderHalf: 0.19,
  upperArm: 0.29,
  forearm: 0.33, // elbow → glove centre
  thigh: 0.44,
  shin: 0.44,
  ankle: 0.07,
  foot: 0.2,
  headUp: 0.24,
};

export interface Pose {
  x: number;
  z: number;
  yaw: number;
  /** Pelvis lowered by bending the knees (m). */
  drop: number;
  /** Pelvis rotation relative to the root; negative turns the lead hip forward. */
  hipYaw: number;
  /** Extra chest rotation on top of the hips. */
  torsoYaw: number;
  /** Chest pitch, + = forward. */
  lean: number;
  /** Chest roll, + = toward the lead side. */
  side: number;
  /** Glove targets in root space for an upright, un-dropped body; follow the chest automatically. */
  lead: V3;
  rear: V3;
  /** Elbow pole directions in root space. */
  leadElbow: V3;
  rearElbow: V3;
  /** Ankle positions in root space. */
  leadFoot: V3;
  rearFoot: V3;
  leadFootYaw: number;
  rearFootYaw: number;
}

export const GUARD: Pose = {
  x: 0,
  z: 0,
  yaw: 0,
  drop: 0.06,
  hipYaw: -0.5,
  torsoYaw: -0.1,
  lean: 0.08,
  side: 0,
  lead: v(0.1, 1.5, 0.3),
  rear: v(-0.07, 1.52, 0.15),
  leadElbow: v(0.25, -1, -0.1),
  rearElbow: v(-0.25, -1, -0.1),
  leadFoot: v(0.14, BODY.ankle, 0.24),
  rearFoot: v(-0.16, BODY.ankle, -0.22),
  leadFootYaw: -0.3,
  rearFootYaw: -0.9,
};

export type JointName =
  | 'head' | 'neck' | 'chest' | 'pelvis'
  | 'lShoulder' | 'rShoulder' | 'lElbow' | 'rElbow' | 'lGlove' | 'rGlove' | 'lWrist' | 'rWrist'
  | 'lHip' | 'rHip' | 'lKnee' | 'rKnee' | 'lAnkle' | 'rAnkle' | 'lToe' | 'rToe' | 'lHeel' | 'rHeel';

export type Skeleton = Record<JointName, V3> & {
  /** Chest frame axes (world). */
  chestUp: V3;
  chestRight: V3;
  chestForward: V3;
  pelvisForward: V3;
};

/** Analytic two-bone IK. Returns [middle joint, end effector]. */
export function solveTwoBone(root: V3, target: V3, a: number, b: number, pole: V3): [V3, V3] {
  const toT = sub(target, root);
  const d = Math.min(Math.max(len(toT), Math.abs(a - b) + 1e-3), a + b - 1e-4);
  const dir = norm(toT);
  const cosA = (a * a + d * d - b * b) / (2 * a * d);
  const sinA = Math.sqrt(Math.max(0, 1 - cosA * cosA));
  let perp = sub(pole, scale(dir, dot(pole, dir)));
  if (len(perp) < 1e-6) perp = Math.abs(dir[1]) < 0.9 ? cross(dir, v(0, 1, 0)) : cross(dir, v(1, 0, 0));
  perp = norm(perp);
  const joint = add(root, add(scale(dir, a * cosA), scale(perp, a * sinA)));
  return [joint, add(root, scale(dir, d))];
}

function chestFrame(p: Pose) {
  const rot: M3 = mul(mul(rotY(p.yaw + p.hipYaw + p.torsoYaw), rotX(p.lean)), rotZ(-p.side));
  return rot;
}

export function solvePose(p: Pose): Skeleton {
  const rootRot = rotY(p.yaw);
  const root = v(p.x, 0, p.z);
  const toWorld = (local: V3) => add(root, apply(rootRot, local));

  // Pelvis sits over the midpoint of the feet.
  const feetMid = mid(p.leadFoot, p.rearFoot);
  const pelvisLocal = v(feetMid[0] * 0.6, BODY.hipHeight - p.drop, feetMid[2] * 0.6);
  const pelvis = toWorld(pelvisLocal);
  const pelvisRot = rotY(p.yaw + p.hipYaw);
  const lHip = add(pelvis, apply(pelvisRot, v(BODY.hipHalf, 0, 0)));
  const rHip = add(pelvis, apply(pelvisRot, v(-BODY.hipHalf, 0, 0)));

  const chestRot = chestFrame(p);
  const chestUp = apply(chestRot, v(0, 1, 0));
  const chestRight = apply(chestRot, v(-1, 0, 0));
  const chestForward = apply(chestRot, v(0, 0, 1));
  const chest = add(pelvis, scale(chestUp, BODY.spine));
  const lShoulder = add(chest, apply(chestRot, v(BODY.shoulderHalf, 0, 0)));
  const rShoulder = add(chest, apply(chestRot, v(-BODY.shoulderHalf, 0, 0)));
  const neck = add(chest, scale(chestUp, 0.08));
  const head = add(chest, apply(chestRot, v(0, BODY.headUp, 0.02)));

  // Gloves follow the chest: offset targets by how far the shoulder line moved
  // from an upright, un-dropped body with the same rotation.
  const neutral = solveNeutralChest(p);
  const chestDelta = sub(chest, neutral);
  const leadTarget = add(toWorld(p.lead), chestDelta);
  const rearTarget = add(toWorld(p.rear), chestDelta);

  const [lElbow, lGlove] = solveTwoBone(lShoulder, leadTarget, BODY.upperArm, BODY.forearm, apply(rootRot, p.leadElbow));
  const [rElbow, rGlove] = solveTwoBone(rShoulder, rearTarget, BODY.upperArm, BODY.forearm, apply(rootRot, p.rearElbow));
  const wrist = (elbow: V3, glove: V3) => add(elbow, scale(sub(glove, elbow), 0.8));

  const kneePole = (footYaw: number) => apply(rotY(p.yaw + footYaw * 0.5), v(0, 0.2, 1));
  const [lKnee, lAnkle] = solveTwoBone(lHip, toWorld(p.leadFoot), BODY.thigh, BODY.shin, kneePole(p.leadFootYaw));
  const [rKnee, rAnkle] = solveTwoBone(rHip, toWorld(p.rearFoot), BODY.thigh, BODY.shin, kneePole(p.rearFootYaw));
  const footDir = (yaw: number) => apply(rotY(p.yaw + yaw), v(0, 0, 1));
  const toe = (ankle: V3, yaw: number) => add(v(ankle[0], 0.03, ankle[2]), scale(footDir(yaw), BODY.foot * 0.75));
  const heel = (ankle: V3, yaw: number) => add(v(ankle[0], 0.03, ankle[2]), scale(footDir(yaw), -BODY.foot * 0.25));

  return {
    head, neck, chest, pelvis,
    lShoulder, rShoulder, lElbow, rElbow, lGlove, rGlove,
    lWrist: wrist(lElbow, lGlove), rWrist: wrist(rElbow, rGlove),
    lHip, rHip, lKnee, rKnee, lAnkle, rAnkle,
    lToe: toe(lAnkle, p.leadFootYaw), rToe: toe(rAnkle, p.rearFootYaw),
    lHeel: heel(lAnkle, p.leadFootYaw), rHeel: heel(rAnkle, p.rearFootYaw),
    chestUp, chestRight, chestForward,
    pelvisForward: apply(pelvisRot, v(0, 0, 1)),
  };
}

function solveNeutralChest(p: Pose): V3 {
  const feetMid = mid(GUARD.leadFoot, GUARD.rearFoot);
  const pelvis = add(v(p.x, 0, p.z), apply(rotY(p.yaw), v(feetMid[0] * 0.6, BODY.hipHeight, feetMid[2] * 0.6)));
  const rot = mul(rotY(p.yaw + p.hipYaw + p.torsoYaw), rotX(GUARD.lean));
  return add(pelvis, scale(apply(rot, v(0, 1, 0)), BODY.spine));
}

/** Mirror a skeleton across X so the same clips play southpaw. */
export function mirrorSkeleton(s: Skeleton): Skeleton {
  const m = (p: V3): V3 => [-p[0], p[1], p[2]];
  const out = {} as Skeleton;
  for (const [k, val] of Object.entries(s) as [keyof Skeleton, V3][]) {
    const swapped = k.startsWith('l') ? (`r${k.slice(1)}` as keyof Skeleton)
      : k.startsWith('r') ? (`l${k.slice(1)}` as keyof Skeleton) : k;
    (out as Record<string, V3>)[swapped] = m(val);
  }
  out.chestRight = scale(out.chestRight, -1);
  return out;
}
