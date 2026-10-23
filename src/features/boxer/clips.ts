import { GUARD, type Pose } from './rig';
import { apply, rotY, sub, v } from './vec';

type Partial3 = Partial<Pose>;
export interface Key {
  t: number;
  p: Partial3;
}
export interface Clip {
  keys: Key[];
  duration: number;
}

const k = (t: number, p: Partial3 = {}): Key => ({ t, p });
const clip = (...keys: Key[]): Clip => ({ keys, duration: keys[keys.length - 1].t });

/** Play clips back to back; each starts and ends in guard. */
function seq(...clips: Clip[]): Clip {
  const keys: Key[] = [];
  let offset = 0;
  clips.forEach((c, i) => {
    for (const key of c.keys) {
      if (i > 0 && key.t === 0) continue;
      keys.push({ t: key.t + offset, p: key.p });
    }
    offset += c.duration;
  });
  return clip(...keys);
}

// ── Punches ───────────────────────────────────────────────────────────────
const JAB_P: Partial3 = {
  hipYaw: -0.62, torsoYaw: -0.35, lean: 0.12,
  lead: v(0.03, 1.47, 1.0), leadElbow: v(0.6, -1, 0),
  rear: v(-0.06, 1.52, 0.16), leadFoot: v(0.14, GUARD.leadFoot[1], 0.3),
};
const CROSS_P: Partial3 = {
  hipYaw: 0.3, torsoYaw: 0.25, lean: 0.15, drop: 0.08,
  rear: v(0.02, 1.47, 1.0), rearElbow: v(-0.6, -1, 0),
  lead: v(0.1, 1.5, 0.18), rearFootYaw: -0.25,
};
const LEAD_HOOK_LOAD: Partial3 = { lead: v(0.38, 1.47, 0.38), leadElbow: v(1, 0.2, 0), hipYaw: -0.55 };
const LEAD_HOOK_P: Partial3 = {
  hipYaw: 0.15, torsoYaw: 0.3, lean: 0.1, drop: 0.09,
  lead: v(-0.08, 1.45, 0.42), leadElbow: v(1, 0.35, 0.1), leadFootYaw: 0.25,
  rear: v(-0.06, 1.53, 0.14),
};
const REAR_HOOK_LOAD: Partial3 = { rear: v(-0.38, 1.47, 0.3), rearElbow: v(-1, 0.2, 0), hipYaw: -0.6 };
const REAR_HOOK_P: Partial3 = {
  hipYaw: 0.35, torsoYaw: 0.3, lean: 0.1, drop: 0.09,
  rear: v(0.14, 1.45, 0.42), rearElbow: v(-1, 0.35, 0.1), rearFootYaw: -0.35,
  lead: v(0.1, 1.52, 0.18),
};
const LEAD_UPPER_DIP: Partial3 = { side: 0.18, drop: 0.16, hipYaw: -0.55, lead: v(0.12, 1.16, 0.3), leadElbow: v(0.2, -1, 0.3) };
const LEAD_UPPER_P: Partial3 = {
  side: -0.05, drop: 0.05, hipYaw: -0.25, torsoYaw: 0.05,
  lead: v(0.04, 1.66, 0.4), leadElbow: v(0.2, -1, 0.4),
};
const REAR_UPPER_DIP: Partial3 = { side: -0.18, drop: 0.16, hipYaw: -0.3, rear: v(-0.1, 1.16, 0.24), rearElbow: v(-0.2, -1, 0.3) };
const REAR_UPPER_P: Partial3 = {
  side: 0.05, drop: 0.05, hipYaw: 0.25, torsoYaw: 0.15, rearFootYaw: -0.4,
  rear: v(0.0, 1.66, 0.4), rearElbow: v(-0.2, -1, 0.4),
};
const OVERHAND_LOAD: Partial3 = { rear: v(-0.18, 1.66, 0.4), rearElbow: v(-1, 0.6, 0), side: 0.12, hipYaw: 0, drop: 0.08 };
const OVERHAND_P: Partial3 = {
  hipYaw: 0.35, torsoYaw: 0.2, side: 0.25, lean: 0.2, drop: 0.12, rearFootYaw: -0.25,
  rear: v(0.06, 1.48, 0.85), rearElbow: v(-0.8, 0.5, 0), lead: v(0.12, 1.45, 0.15),
};
const BODY_JAB_P: Partial3 = { ...JAB_P, drop: 0.28, lean: 0.18, lead: v(0.03, 1.05, 1.0), leadFoot: v(0.14, GUARD.leadFoot[1], 0.36) };
const BODY_CROSS_P: Partial3 = { ...CROSS_P, drop: 0.26, lean: 0.2, rear: v(0.02, 1.05, 1.0) };
const LIVER_LOAD: Partial3 = { lead: v(0.32, 1.16, 0.28), leadElbow: v(1, -0.2, 0), drop: 0.18, side: 0.12 };
const LIVER_P: Partial3 = {
  drop: 0.22, side: 0.15, hipYaw: 0.1, torsoYaw: 0.3, lean: 0.12, leadFootYaw: 0.2,
  lead: v(-0.06, 1.08, 0.36), leadElbow: v(1, -0.2, 0.1),
};

export const JAB = clip(k(0), k(0.11, JAB_P), k(0.16, JAB_P), k(0.32));
export const CROSS = clip(k(0), k(0.13, CROSS_P), k(0.18, CROSS_P), k(0.38));
export const LEAD_HOOK = clip(k(0), k(0.08, LEAD_HOOK_LOAD), k(0.2, LEAD_HOOK_P), k(0.25, LEAD_HOOK_P), k(0.45));
export const REAR_HOOK = clip(k(0), k(0.09, REAR_HOOK_LOAD), k(0.22, REAR_HOOK_P), k(0.27, REAR_HOOK_P), k(0.48));
export const LEAD_UPPER = clip(k(0), k(0.12, LEAD_UPPER_DIP), k(0.25, LEAD_UPPER_P), k(0.3, LEAD_UPPER_P), k(0.5));
export const REAR_UPPER = clip(k(0), k(0.12, REAR_UPPER_DIP), k(0.26, REAR_UPPER_P), k(0.31, REAR_UPPER_P), k(0.52));
export const OVERHAND = clip(k(0), k(0.14, OVERHAND_LOAD), k(0.28, OVERHAND_P), k(0.34, OVERHAND_P), k(0.56));
export const BODY_JAB = clip(k(0), k(0.14, BODY_JAB_P), k(0.2, BODY_JAB_P), k(0.42));
export const BODY_CROSS = clip(k(0), k(0.15, BODY_CROSS_P), k(0.21, BODY_CROSS_P), k(0.44));
export const LIVER = clip(k(0), k(0.1, LIVER_LOAD), k(0.23, LIVER_P), k(0.29, LIVER_P), k(0.5));

// ── Defense ───────────────────────────────────────────────────────────────
const SLIP_R: Partial3 = { side: -0.38, drop: 0.12, torsoYaw: 0.1, hipYaw: -0.4 };
const SLIP_L: Partial3 = { side: 0.38, drop: 0.12, torsoYaw: -0.3, hipYaw: -0.6 };
export const SLIP = clip(k(0), k(0.18, SLIP_R), k(0.26, SLIP_R), k(0.46), k(0.64, SLIP_L), k(0.72, SLIP_L), k(0.92));
export const ROLL = clip(
  k(0),
  k(0.16, { drop: 0.3, side: 0.3, lean: 0.3 }),
  k(0.32, { drop: 0.36, side: 0, lean: 0.36 }),
  k(0.48, { drop: 0.26, side: -0.3, lean: 0.22 }),
  k(0.7),
);
const PULL_P: Partial3 = { lean: -0.24, drop: 0.02, hipYaw: -0.6, rear: v(-0.06, 1.55, 0.14), lead: v(0.08, 1.5, 0.22) };
export const PULL_BACK = seq(clip(k(0), k(0.16, PULL_P), k(0.32, PULL_P), k(0.46)), CROSS);
const BLOCK_P: Partial3 = {
  drop: 0.1, lean: 0.12,
  lead: v(0.17, 1.66, 0.12), rear: v(-0.15, 1.66, 0.08),
  leadElbow: v(0.2, -0.4, 1), rearElbow: v(-0.2, -0.4, 1),
};
export const HIGH_BLOCK = clip(k(0), k(0.12, BLOCK_P), k(0.5, BLOCK_P), k(0.7));
const PARRY_P: Partial3 = { rear: v(0.03, 1.51, 0.27), rearElbow: v(-0.3, -1, 0), torsoYaw: -0.05 };
export const PARRY = seq(clip(k(0), k(0.08, PARRY_P), k(0.12, PARRY_P), k(0.26)), JAB);
const CATCH_P: Partial3 = { rear: v(-0.02, 1.53, 0.3), rearElbow: v(-0.2, -1, -0.2), lean: 0.04 };
export const CATCH = seq(clip(k(0), k(0.1, CATCH_P), k(0.2, CATCH_P), k(0.32)), JAB);
const SHOULDER_ROLL_P: Partial3 = {
  hipYaw: -0.75, torsoYaw: -0.45, side: -0.14, lean: 0.06,
  lead: v(0.0, 1.12, 0.24), leadElbow: v(0.3, -1, 0.2), rear: v(-0.02, 1.56, 0.18),
};
export const SHOULDER_ROLL = seq(clip(k(0), k(0.16, SHOULDER_ROLL_P), k(0.34, SHOULDER_ROLL_P), k(0.4)), CROSS);

// ── Footwork ──────────────────────────────────────────────────────────────
const ankle = GUARD.leadFoot[1];
export const STEP_DRAG = clip(
  k(0),
  k(0.2, { leadFoot: v(0.14, ankle, 0.52) }),
  k(0.42, { z: 0.28 }),
  k(0.7, { z: 0.28, rearFoot: v(-0.16, ankle, -0.5) }),
  k(0.92, { z: 0 }),
);
export const LATERAL = clip(
  k(0),
  k(0.2, { leadFoot: v(0.4, ankle, 0.24) }),
  k(0.42, { x: 0.26 }),
  k(0.7, { x: 0.26, rearFoot: v(-0.42, ankle, -0.22) }),
  k(0.92, { x: 0 }),
);

/** Rotate around the lead foot: root moves so the lead foot stays planted. */
function pivotRoot(yaw: number): Partial3 {
  const planted = GUARD.leadFoot;
  const root = sub(planted, apply(rotY(yaw), GUARD.leadFoot));
  return { yaw, x: root[0], z: root[2] };
}
export const PIVOTS = clip(k(0), k(0.35, pivotRoot(0.9)), k(0.7, pivotRoot(0.9)), k(1.05));

const cutRoot: Partial3 = { ...pivotRoot(-0.55), x: pivotRoot(-0.55).x! + 0.18, z: pivotRoot(-0.55).z! + 0.14 };
export const CUTTING_ANGLES = clip(
  ...JAB.keys.slice(0, -1),
  k(0.34, { leadFoot: v(0.36, ankle, 0.42) }),
  k(0.6, cutRoot),
  k(0.9, cutRoot),
  k(1.2),
);
const IN_P: Partial3 = { ...JAB_P, z: 0.38 };
export const IN_AND_OUT = clip(k(0), k(0.16, IN_P), k(0.22, IN_P), k(0.42, { z: 0.38 }), k(0.62, { z: 0 }));

// ── Combos ────────────────────────────────────────────────────────────────
export const ONE_TWO = seq(JAB, CROSS);
export const JAB_CROSS_HOOK = seq(JAB, CROSS, LEAD_HOOK);
export const HOOK_CROSS_HOOK = seq(LEAD_HOOK, CROSS, LEAD_HOOK);
export const BODY_HEAD = seq(BODY_CROSS, LEAD_HOOK);

export const TECHNIQUE_CLIPS: Record<string, Clip> = {
  jab: JAB,
  cross: CROSS,
  'lead-hook': LEAD_HOOK,
  'rear-hook': REAR_HOOK,
  'lead-uppercut': LEAD_UPPER,
  'rear-uppercut': REAR_UPPER,
  'overhand-right': OVERHAND,
  'body-jab': BODY_JAB,
  'liver-shot': LIVER,
  slip: SLIP,
  roll: ROLL,
  'pull-back': PULL_BACK,
  'high-block': HIGH_BLOCK,
  parry: PARRY,
  catch: CATCH,
  'shoulder-roll': SHOULDER_ROLL,
  'step-drag': STEP_DRAG,
  pivots: PIVOTS,
  'lateral-movement': LATERAL,
  'cutting-angles': CUTTING_ANGLES,
  'in-and-out': IN_AND_OUT,
  'one-two': ONE_TWO,
  'jab-cross-hook': JAB_CROSS_HOOK,
  'hook-cross-hook': HOOK_CROSS_HOOK,
  'body-head': BODY_HEAD,
};

const full = (p: Partial3): Pose => ({ ...GUARD, ...p });

/** Flatten a pose into numbers so splines can run over every channel at once. */
function toVec(p: Pose): number[] {
  const out: number[] = [];
  for (const key of POSE_KEYS) {
    const v = p[key];
    if (typeof v === 'number') out.push(v);
    else out.push(v[0], v[1], v[2]);
  }
  return out;
}
function fromVec(x: number[]): Pose {
  const out = {} as Record<string, unknown>;
  let i = 0;
  for (const key of POSE_KEYS) {
    if (typeof GUARD[key] === 'number') out[key] = x[i++];
    else {
      out[key] = [x[i], x[i + 1], x[i + 2]];
      i += 3;
    }
  }
  return out as unknown as Pose;
}
const POSE_KEYS = Object.keys(GUARD) as (keyof Pose)[];

/**
 * Pose at time t (seconds) within the clip; clamps outside its range.
 * Cubic Hermite through the keyframes with velocity-matched tangents, so motion flows
 * through each key instead of easing to a stop (holds still hold: equal keys get zero slope).
 */
export function sampleClip(c: Clip, t: number): Pose {
  const keys = c.keys;
  if (t <= keys[0].t) return full(keys[0].p);
  if (t >= keys[keys.length - 1].t) return full(keys[keys.length - 1].p);
  let i = 1;
  while (t > keys[i].t) i++;
  const k0 = keys[Math.max(0, i - 2)], k1 = keys[i - 1], k2 = keys[i], k3 = keys[Math.min(keys.length - 1, i + 1)];
  const P0 = toVec(full(k0.p)), P1 = toVec(full(k1.p)), P2 = toVec(full(k2.p)), P3 = toVec(full(k3.p));
  const dt = k2.t - k1.t || 1;
  const u = (t - k1.t) / dt;
  const h00 = 2 * u ** 3 - 3 * u ** 2 + 1, h10 = u ** 3 - 2 * u ** 2 + u, h01 = -2 * u ** 3 + 3 * u ** 2, h11 = u ** 3 - u ** 2;
  // Tangents scaled to this segment; zero at the clip ends (start/finish in a settled guard).
  const tangent = (prev: number[], next: number[], tPrev: number, tNext: number, endpoint: boolean) =>
    endpoint || tNext === tPrev ? prev.map(() => 0) : prev.map((v, j) => ((next[j] - v) / (tNext - tPrev)) * dt);
  const m1 = tangent(P0, P2, k0.t, k2.t, i - 1 === 0);
  const m2 = tangent(P1, P3, k1.t, k3.t, i === keys.length - 1);
  // A key that equals its neighbour is a hold: keep the slope flat there so it doesn't drift.
  const flat = (a: number[], b: number[]) => a.every((v, j) => Math.abs(v - b[j]) < 1e-9);
  const m1f = flat(P1, P0) || flat(P1, P2) ? m1.map(() => 0) : m1;
  const m2f = flat(P2, P1) || flat(P2, P3) ? m2.map(() => 0) : m2;
  return fromVec(P1.map((v, j) => h00 * v + h10 * m1f[j] + h01 * P2[j] + h11 * m2f[j]));
}

/**
 * Living guard for the demos: a boxer's bounce on the balls of the feet, a little weight
 * shift and hands that breathe. Applied on top of any clip, so idle moments never freeze.
 */
export function withRhythm(p: Pose, t: number): Pose {
  const beat = 1.7; // bounces per second
  const bounce = 0.5 - 0.5 * Math.cos(2 * Math.PI * beat * t);
  const sway = Math.sin(Math.PI * beat * t);
  const breathe = Math.sin(2 * Math.PI * beat * t + 1.1);
  return {
    ...p,
    drop: p.drop + 0.022 * bounce,
    hipYaw: p.hipYaw + 0.035 * sway,
    side: p.side + 0.025 * sway,
    lead: [p.lead[0], p.lead[1] + 0.012 * breathe, p.lead[2] + 0.01 * sway],
    rear: [p.rear[0], p.rear[1] + 0.012 * Math.sin(2 * Math.PI * beat * t + 2.2), p.rear[2]],
  };
}

export const LOOP_REST = 0.7;
export const loopLength = (c: Clip) => c.duration + LOOP_REST;

