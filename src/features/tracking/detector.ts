/**
 * Turns MediaPipe pose landmarks into boxing events.
 *
 * Works primarily on the 2D image landmarks, which pose models estimate far more reliably
 * than depth. Distances are in torso lengths (shoulders→hips), so camera distance and
 * resolution don't matter.
 *
 * Landmarks go through a One Euro filter: steady at rest, little lag on a fast fist.
 *
 * Strikes: a burst of wrist speed (relative to the shoulders) opens a window per hand. The punch
 * is called at impact — once the fist stops going further and slows or starts back — rather than
 * when the hand gets home; the window then stays open until it does. It is classified from what
 * a straight arm looks like from any angle (shoulder, elbow and wrist line up), upward travel
 * (uppercut), a fist finishing below the chest (body shot), otherwise a bent-arm swing (hook).
 * When both arms move at once, the smaller motion is treated as tracking crosstalk and dropped.
 * A strike's `t` is its moment of impact.
 *
 * Works best with the camera 30–45° off to the rear-hand side. With the camera straight in front
 * (a laptop webcam), punches thrown at the lens barely move the fist on screen: the detector
 * notices that view and also reads the elbow coming up and the upper arm foreshortening.
 *
 * Defense: head position relative to hips and feet (or the frame, when the feet are out of shot)
 * against a slowly adapting baseline — a sideways shift is a slip, a drop is a roll or a duck.
 */
import type { PunchType } from '../../types';
import { LM, type Landmark } from './landmarks';

export type Stance = 'orthodox' | 'southpaw';
export type Hand = 'lead' | 'rear';

export interface StrikeEvent {
  kind: 'strike';
  t: number;
  hand: Hand;
  punch: PunchType;
  label: string;
  /** Peak hand speed, approx. m/s (assumes a typical torso length). */
  speed: number;
}
export interface DefenseEvent {
  kind: 'defense';
  t: number;
  move: 'slip' | 'roll';
  label: string;
}
export type TrackEvent = StrikeEvent | DefenseEvent;

export const TUNING = {
  /**
   * One Euro filter on the landmarks (cutoffs in Hz): steady while still, so jitter doesn't open
   * strike windows, and opening up as a joint speeds up, so a fast fist isn't dragged behind.
   * Cutoff = minCutoff + beta × speed (torso lengths / s). Unlike a fixed per-frame blend, it
   * behaves the same at 15 fps and 60 fps.
   */
  minCutoff: 4,
  beta: 0.5,
  /** Cutoff for the speed estimate that drives the adaptive cutoff. */
  dCutoff: 0.7,
  /** Landmarks MediaPipe is unsure of are smoothed harder: cutoff scales down to this at visibility 0. */
  lowVisCutoff: 0.5,
  /** Hand speed (torso lengths / s, relative to the shoulders) that opens a strike window. */
  startSpeed: 2.0,
  /** Minimum travel for a punch (torso lengths). */
  minTravel: 0.4,
  /** Straight arm: wrist-to-shoulder distance vs. arm length, and the 2D elbow angle. */
  straightExt: 0.95,
  straightAngle: 145,
  straightTravel: 0.4,
  /** Uppercut: rise from the dip (torso lengths). */
  rise: 0.4,
  /** A hook's arm opens to at least this extension (a folded guard is ~0.45). */
  hookExt: 0.75,
  /** Fist this far below the shoulder line at impact (torso lengths) is a body shot. */
  bodyLow: 0.45,
  /** Typical shoulder-to-hip length in metres, to put depth in torso lengths. */
  torsoMetres: 0.5,
  /** A weaker simultaneous strike from the other hand is dropped below this ratio. */
  crosstalk: 0.75,
  /** Facing the camera: upper arm shortened to this fraction and elbow risen this much = straight. */
  frontUa: 0.5,
  frontElbowRise: 0.3,
  /** Facing the camera: a fist sweeping this far sideways is a hook. */
  hookSweep: 0.45,
  /** Facing the camera: an uppercut without a visible dip must rise this much. */
  frontRise: 0.6,
  /** Elbow motion counts this much toward a punch's speed and travel. */
  elbowWeight: 1.2,
  maxWindowMs: 900,
  /** Call a punch at impact: once the fist has gone no further for this long (ms)... */
  settleMs: 50,
  /** ...and has slowed below this fraction of its peak speed... */
  settleSpeed: 0.5,
  /** ...or is already on its way back (below this fraction of its furthest travel). */
  settleBack: 0.9,
  /** Travel gains smaller than this (torso lengths) are jitter on a held fist, not progress. */
  peakEps: 0.04,
  /** For crosstalk, a punch occupies at most this long (ms) before its impact. */
  crossSpanMs: 300,
  /** A called punch waits this long (ms) for the other hand to claim the same moment. */
  flushMs: 30,
  /**
   * It waits longer, up to this (ms), only while the other hand is mid-motion, started before this
   * punch landed and has moved at least holdRatio as far: possibly the real punch it's crosstalk of.
   */
  maxHoldMs: 150,
  holdRatio: 0.5,
  refractoryMs: 120,
  visibilityRatio: 0.85,
  slip: 0.27,
  duck: 0.35,
};

type P2 = [number, number];
const sub = (a: P2, b: P2): P2 => [a[0] - b[0], a[1] - b[1]];
const len = (a: P2) => Math.hypot(a[0], a[1]);
const dist3 = (a: number[], b: number[]) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
const midP = (a: P2, b: P2): P2 => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
function angle(a: P2, b: P2, c: P2) {
  const u = sub(a, b), w = sub(c, b);
  const d = len(u) * len(w) || 1;
  return (Math.acos(Math.max(-1, Math.min(1, (u[0] * w[0] + u[1] * w[1]) / d))) * 180) / Math.PI;
}

interface Sample {
  t: number;
  /** Wrist relative to the shoulder midpoint, torso lengths (image y points down). */
  rel: P2;
  /** rel plus depth (torso lengths, + = toward the camera): hooks seen side-on travel in depth. */
  pos: [number, number, number];
  angle: number;
  ext: number;
  /** Wrist depth relative to its shoulder (m, negative = toward camera); 0 without world data. */
  depth: number;
  /** Wrist distance to the nose, torso lengths (blocks end at your own head). */
  face: number;
  /** Shoulder→wrist vector in the same units as pos. */
  arm: [number, number, number];
  /** Elbow relative to the shoulder midpoint, torso lengths. */
  elb: P2;
  /** Upper arm's on-screen length over its full length: short when it points at the camera. */
  ua: number;
  /** Wrist relative to the nose: a guard riding along with a slip barely moves here. */
  head: P2;
}

interface Window {
  t0: number;
  trigger: number;
  start: Sample;
  samples: Sample[];
  maxTravel: number;
  /** Fist travel alone (maxTravel also counts the elbow). */
  fistTravel: number;
  peakSpeed: number;
  /** Time of the furthest fist position so far. */
  peakT: number;
  /** Already classified (at impact); the window stays open only to wait for the hand to return. */
  decided: boolean;
}

interface HandState {
  history: Sample[];
  /** Recent on-screen upper-arm lengths; their upper end is the arm's real length. */
  uaLens: number[];
  uaLen: number;
  active: Window | null;
  lastEnd: number;
  visBase: number;
  unreliableSince: number | null;
}

interface Pending {
  event: StrikeEvent;
  /** When the strike was classified. */
  at: number;
  t0: number;
  t1: number;
  size: number;
}

interface Excursion {
  t0: number;
  maxLat: number;
  minLat: number;
  maxLatSigned: number;
  minUp: number;
}

const freshHand = (): HandState => ({ history: [], uaLens: [], uaLen: 0, active: null, lastEnd: -1e9, visBase: 0, unreliableSince: null });

export class StrikeDetector {
  private stance: Stance;
  private smoothed: P2[] | null = null;
  /** One Euro filter state per landmark: filtered velocity. */
  private velocity: P2[] = [];
  private lastFrameT = -1e9;
  private torso = 0;
  private frames = 0;
  private hands: Record<Hand, HandState> = { lead: freshHand(), rear: freshHand() };
  private pending: Pending[] = [];
  /** Recently released strikes, for crosstalk checks against strikes called later. */
  private released: Pending[] = [];
  private head = { baseLat: 0, baseUp: 0, frames: 0, feetVis: -1, feet: true, excursion: null as Excursion | null };
  private pendingDefense: { event: DefenseEvent; startT: number; size: number }[] = [];
  private lastStrikeT = -1e9;
  private strikeTimes: number[] = [];
  private depth: Record<Hand, number | null> = { lead: null, rear: null };
  private viewSamples: [number, number][] = [];
  /**
   * True when the camera is roughly where an opponent would stand (in front of you). Punches
   * thrown at the lens are then hard to see, so the detector leans on elbows and the UI can coach.
   */
  facingCamera = false;
  /** Window starts of recent punches seen thrown straight at the lens. */
  private lensHits: number[] = [];
  /** Optional hooks for tuning. */
  debug?: (info: Record<string, number | string>) => void;
  debugHead?: (t: number, dLat: number, dUp: number) => void;

  constructor(stance: Stance = 'orthodox') {
    this.stance = stance;
  }

  setStance(stance: Stance) {
    this.stance = stance;
  }

  reset() {
    this.smoothed = null;
    this.torso = this.frames = 0;
    this.lastFrameT = -1e9;
    this.hands = { lead: freshHand(), rear: freshHand() };
    this.pending = [];
    this.released = [];
    this.head = { baseLat: 0, baseUp: 0, frames: 0, feetVis: -1, feet: true, excursion: null };
    this.pendingDefense = [];
    this.lastStrikeT = -1e9;
    this.strikeTimes = [];
    this.depth = { lead: null, rear: null };
    this.viewSamples = [];
    this.facingCamera = false;
    this.lensHits = [];
  }

  /**
   * Feed one frame. `image` are MediaPipe's normalized landmarks, `aspect` the frame's
   * width/height, `world` (optional) the world landmarks for the depth assist.
   */
  push(t: number, image: Landmark[], aspect: number, world?: Landmark[]): TrackEvent[] {
    if (image.length < 29) return [];
    // After a gap (no pose), start smoothing and windows afresh.
    if (t - this.lastFrameT > 400) {
      this.smoothed = null;
      this.depth = { lead: null, rear: null };
      this.hands.lead.history = [];
      this.hands.rear.history = [];
    }
    const dt = (t - this.lastFrameT) / 1000;
    this.lastFrameT = t;
    this.frames++;
    const raw = image.map((l): P2 => [l.x * aspect, l.y]);
    const P = (this.smoothed = this.smooth(raw, image, dt));

    const shMid = midP(P[LM.lShoulder], P[LM.rShoulder]);
    const hipMid = midP(P[LM.lHip], P[LM.rHip]);
    const torso = len(sub(shMid, hipMid));
    if (torso < 1e-3) return [];
    this.torso = this.torso ? this.torso * 0.95 + torso * 0.05 : torso;
    const T = this.torso;

    if (world) this.updateView(world, len(sub(P[LM.lShoulder], P[LM.rShoulder])) / T);

    const events: TrackEvent[] = [];
    const sides: Record<Hand, 'l' | 'r'> =
      this.stance === 'orthodox' ? { lead: 'l', rear: 'r' } : { lead: 'r', rear: 'l' };
    for (const hand of ['lead', 'rear'] as Hand[]) {
      const left = sides[hand] === 'l';
      const [si, ei, wi] = left ? [LM.lShoulder, LM.lElbow, LM.lWrist] : [LM.rShoulder, LM.rElbow, LM.rWrist];
      const S = P[si], E = P[ei], W = P[wi];
      const arm = len(sub(W, E)) + len(sub(E, S)) || 1;
      const ua = len(sub(E, S)) / T;
      const hs = this.hands[hand];
      hs.uaLens.push(ua);
      if (hs.uaLens.length > 300) hs.uaLens.shift();
      if (this.frames % 10 === 0 || !hs.uaLen) hs.uaLen = [...hs.uaLens].sort((x, y) => x - y)[Math.floor(hs.uaLens.length * 0.9)];
      const sample: Sample = {
        elb: [(E[0] - shMid[0]) / T, (E[1] - shMid[1]) / T],
        head: [(W[0] - P[LM.nose][0]) / T, (W[1] - P[LM.nose][1]) / T],
        ua: hs.uaLen ? Math.min(1, ua / hs.uaLen) : 1,
        t,
        rel: [(W[0] - shMid[0]) / T, (W[1] - shMid[1]) / T],
        angle: angle(S, E, W),
        ext: len(sub(W, S)) / arm,
        depth: 0,
        face: len(sub(W, P[LM.nose])) / T,
        pos: [0, 0, 0],
        arm: [0, 0, 0],
      };
      if (world) {
        const raw = world[wi].z - world[si].z;
        const prev = this.depth[hand];
        sample.depth = this.depth[hand] = prev === null ? raw : prev * 0.6 + raw * 0.4;
      }
      sample.pos = [sample.rel[0], sample.rel[1], -sample.depth / TUNING.torsoMetres];
      sample.arm = [(W[0] - S[0]) / T, (W[1] - S[1]) / T, -sample.depth / TUNING.torsoMetres];
      const vis = Math.min(image[wi].visibility ?? 1, image[ei].visibility ?? 1);
      if (!this.reliable(hand, vis, t)) continue;
      this.stepHand(hand, sample);
    }
    events.push(...this.flushStrikes(t));

    // Feet out of frame (laptop webcam): MediaPipe guesses them, so measure the head against the frame.
    const feetVis = Math.min(image[LM.lAnkle].visibility ?? 1, image[LM.rAnkle].visibility ?? 1);
    const def = this.stepHead(t, P[LM.nose], hipMid, midP(P[LM.lAnkle], P[LM.rAnkle]), feetVis, T);
    if (def) this.pendingDefense.push(def);
    if (!this.hands.lead.active && !this.hands.rear.active && !this.pending.length && this.pendingDefense.length) {
      for (const d of this.pendingDefense) {
        // A punch moves the head too: right around one, only a clear head movement counts.
        const nearPunch = this.strikeTimes.some((s) => s > d.startT - 300 && s < d.event.t + 100);
        if (!nearPunch || d.size >= TUNING.slip * 1.6) events.push(d.event);
      }
      this.pendingDefense = [];
    }
    return events;
  }

  /** One Euro filter (Casiez et al. 2012) over every landmark, scaled to torso lengths. */
  private smooth(raw: P2[], image: Landmark[], dt: number): P2[] {
    const prev = this.smoothed;
    if (!prev || dt <= 0) {
      this.velocity = raw.map((): P2 => [0, 0]);
      return raw;
    }
    // Torso length for speed units: the running estimate, or this frame's raw one at start-up.
    const T = this.torso || len(sub(midP(raw[LM.lShoulder], raw[LM.rShoulder]), midP(raw[LM.lHip], raw[LM.rHip]))) || 0.25;
    const alpha = (fc: number) => 1 / (1 + 1 / (2 * Math.PI * fc * dt));
    const ad = alpha(TUNING.dCutoff);
    return raw.map((r, i) => {
      const p = prev[i], v = this.velocity[i];
      v[0] += ad * ((r[0] - p[0]) / dt - v[0]);
      v[1] += ad * ((r[1] - p[1]) / dt - v[1]);
      const vis = Math.max(0, Math.min(1, image[i].visibility ?? 1));
      const trust = TUNING.lowVisCutoff + (1 - TUNING.lowVisCutoff) * vis;
      const a = alpha((TUNING.minCutoff + (TUNING.beta * len(v)) / T) * trust);
      return [p[0] + a * (r[0] - p[0]), p[1] + a * (r[1] - p[1])];
    });
  }

  /**
   * Where's the camera? Your shoulders turn toward it as it moves round to your rear-hand side
   * (the recommended spot); in front of you the lead shoulder points at it and they look narrow.
   */
  private updateView(world: Landmark[], shoulderWidth: number) {
    const [lead, rear] = this.stance === 'orthodox' ? [LM.lShoulder, LM.rShoulder] : [LM.rShoulder, LM.lShoulder];
    const yaw = (Math.atan2(world[lead].z - world[rear].z, world[LM.lShoulder].x - world[LM.rShoulder].x) * 180) / Math.PI;
    this.viewSamples.push([yaw, shoulderWidth]);
    if (this.viewSamples.length > 90) this.viewSamples.shift();
    if (this.frames % 15 !== 0 || this.viewSamples.length < 15) return;
    const median = (i: number) => this.viewSamples.map((v) => v[i]).sort((a, b) => a - b)[this.viewSamples.length >> 1];
    const y = median(0), w = median(1);
    this.facingCamera = y < -8 || (w < 0.6 && y < 15);
  }

  /**
   * Pose models lose a fist held against the face or torso and guess while their visibility
   * score sags. Skip those frames; drop a strike window that stays unreliable.
   */
  private reliable(hand: Hand, vis: number, t: number): boolean {
    const st = this.hands[hand];
    st.visBase = st.visBase ? (vis > st.visBase ? st.visBase * 0.9 + vis * 0.1 : st.visBase * 0.995 + vis * 0.005) : vis;
    if (vis >= Math.max(0.3, TUNING.visibilityRatio * st.visBase)) {
      st.unreliableSince = null;
      return true;
    }
    st.unreliableSince ??= t;
    // A fist crossing in front of the face often loses visibility right at impact: if the window
    // already shows a real punch, judge it on the frames before the dropout; otherwise drop it.
    if (st.active) {
      const w = st.active;
      st.active = null;
      st.lastEnd = t;
      if (w.maxTravel >= 0.35 && !w.decided) {
        const result = this.classify(hand, w, t);
        if (result) this.pending.push(result);
      }
    }
    st.history = [];
    return false;
  }

  private stepHand(hand: Hand, s: Sample) {
    const st = this.hands[hand];
    st.history.push(s);
    while (st.history.length && s.t - st.history[0].t > 400) st.history.shift();
    if (st.history.length < 2) return;

    // Speed over a ~100 ms baseline: frame-to-frame differences are dominated by jitter.
    let base = st.history[st.history.length - 2];
    for (let i = st.history.length - 2; i >= 0; i--) {
      base = st.history[i];
      if (s.t - base.t >= 90) break;
    }
    const span = (s.t - base.t) / 1000;
    if (span <= 0) return;
    // Fists thrown at the camera barely move on screen, but the elbow comes up behind them.
    const speed = Math.max(dist3(s.pos, base.pos), TUNING.elbowWeight * len(sub(s.elb, base.elb))) / span;

    if (!st.active) {
      if (this.frames > 10 && speed > TUNING.startSpeed && s.t - st.lastEnd > TUNING.refractoryMs) {
        // Start ~200 ms earlier so the window includes the wind-up.
        const start = st.history.find((h) => s.t - h.t <= 200) ?? base;
        st.active = {
          t0: start.t, trigger: s.t, start,
          samples: st.history.filter((h) => h.t >= start.t),
          maxTravel: 0, fistTravel: 0, peakSpeed: speed, peakT: s.t, decided: false,
        };
      }
      return;
    }

    const w = st.active;
    w.samples.push(s);
    w.peakSpeed = Math.max(w.peakSpeed, speed);
    const fist = dist3(s.pos, w.start.pos);
    w.fistTravel = Math.max(w.fistTravel, fist);
    const travel = Math.max(fist, TUNING.elbowWeight * len(sub(s.elb, w.start.elb)));
    // Jitter on a held fist keeps nudging the maximum: only real progress moves the peak time.
    if (travel > w.maxTravel + TUNING.peakEps) w.peakT = s.t;
    w.maxTravel = Math.max(w.maxTravel, travel);
    const sinceTrigger = s.t - w.trigger;
    // Noise opened this window and nothing is happening: drop it so a real punch isn't blocked.
    if (sinceTrigger > 220 && w.maxTravel < 0.25) {
      st.active = null;
      return;
    }
    // Impact: the fist has stopped going further and slowed down. Call the punch now rather
    // than when the hand gets home.
    // (Not yet a punch, e.g. an uppercut's dip: keep watching; the window is judged again when it ends.)
    const settled = speed < TUNING.settleSpeed * w.peakSpeed || travel < TUNING.settleBack * w.maxTravel;
    if (!w.decided && w.maxTravel >= 0.3 && s.t - w.peakT >= TUNING.settleMs && settled) {
      const result = this.classify(hand, w, s.t, true);
      if (result) {
        w.decided = true;
        this.pending.push(result);
      }
    }
    const elapsed = s.t - w.t0;
    // Back near the start *and* slowing down (an uppercut passes its start point at full speed).
    const returned = elapsed > 150 && w.maxTravel > 0.3 && travel < Math.max(0.2, 0.4 * w.maxTravel) && speed < TUNING.startSpeed * 0.6;
    if (!returned && elapsed < TUNING.maxWindowMs) return;

    st.active = null;
    st.lastEnd = s.t;
    if (w.decided) return;
    const result = this.classify(hand, w, s.t);
    if (result) this.pending.push(result);
  }

  /** Name a strike window (or null if it isn't one). `early`: called at impact, before the hand is home. */
  private classify(hand: Hand, w: Window, now: number, early = false): Pending | null {
    const st = w.start;
    const proj = w.samples.map((s) => ({ s, travel: dist3(s.pos, st.pos), flat: len(sub(s.rel, st.rel)) }));
    let impact = 0;
    proj.forEach((p, i) => {
      if (p.travel > proj[impact].travel) impact = i;
    });
    const impactT = proj[impact].s.t;
    const strike = proj.filter((p, i) => i <= impact || p.s.t - impactT <= 100);

    // Uppercut shape (image y points down): dip below the guard, then drive up past it.
    let lowest = 0;
    proj.forEach((p, i) => {
      if (p.s.rel[1] > proj[lowest].s.rel[1]) lowest = i;
    });
    const afterDip = proj.slice(lowest);
    const top = Math.min(...afterDip.map((p) => p.s.rel[1]));
    const dip = proj[lowest].s.rel[1] - st.rel[1];
    const rise = proj[lowest].s.rel[1] - top;
    const aboveGuard = st.rel[1] - top;
    const travel = proj[impact].travel;
    const flat = proj[impact].flat; // in the image plane only
    // Straight punches travel along the arm; hooks sweep across it.
    const d3 = proj[impact].s.pos.map((x, i) => x - st.pos[i]);
    const arm = proj[impact].s.arm;
    const align = (d3[0] * arm[0] + d3[1] * arm[1] + d3[2] * arm[2]) / ((Math.hypot(...d3) * Math.hypot(...arm)) || 1);
    const across = Math.abs(proj[impact].s.rel[0] - st.rel[0]) + Math.abs(proj[impact].s.pos[2] - st.pos[2]);
    const maxExt = Math.max(...strike.map((p) => p.s.ext));
    const maxAngle = Math.max(...strike.map((p) => p.s.angle));
    const low = proj[impact].s.rel[1]; // + = fist below the shoulder line
    const eRise = st.elb[1] - Math.min(...strike.map((p) => p.s.elb[1]));
    const uaMin = Math.min(...strike.map((p) => p.s.ua));
    const eTravel = Math.max(...strike.map((p) => len(sub(p.s.elb, st.elb))));
    const dx = proj[impact].s.rel[0] - st.rel[0];
    const eDx = Math.max(...strike.map((p) => Math.abs(p.s.elb[0] - st.elb[0])));
    const hTravel = Math.max(...strike.map((p) => len(sub(p.s.head, st.head))));

    this.debug?.({
      hand, n: w.samples.length, impact, travel: +travel.toFixed(2), rise: +rise.toFixed(2), dip: +dip.toFixed(2), above: +aboveGuard.toFixed(2), face: +proj[impact].s.face.toFixed(2),
      flat: +flat.toFixed(2), align: +align.toFixed(2), across: +across.toFixed(2), maxExt: +maxExt.toFixed(2), maxAngle: Math.round(maxAngle), low: +low.toFixed(2),
      eRise: +eRise.toFixed(2), uaMin: +uaMin.toFixed(2), eTravel: +eTravel.toFixed(2), dx: +dx.toFixed(2), eDx: +eDx.toFixed(2), hTravel: +hTravel.toFixed(2), sx: +st.rel[0].toFixed(2),
      t0: Math.round(w.t0), t1: Math.round(w.samples[w.samples.length - 1].t), early: +early,
    });

    let kind: 'straight' | 'hook' | 'uppercut' | null = null;
    const straight = maxExt >= TUNING.straightExt && maxAngle >= TUNING.straightAngle && flat >= TUNING.straightTravel;
    // Facing the camera, a punch thrown at the lens barely moves the fist on screen: the elbow
    // comes up behind it and the upper arm foreshortens. A jab lands on your own centreline.
    const sweep = Math.abs(dx);
    // From any camera position: a punch thrown at the lens barely moves the fist on screen while
    // the upper arm points at the camera and the elbow comes up behind it.
    const atLens =
      eDx < 0.35 &&
      low > -0.3 &&
      uaMin <= 0.35 &&
      // fist hardly moves, or the arm locks out fully while pointing at the lens
      ((flat < 0.25 && eRise >= 0.3) || (maxExt >= TUNING.straightExt && maxAngle >= TUNING.straightAngle));
    // A hook seen from in front: fist and elbow both sweep sideways, at head or body height.
    const sweptHook = sweep >= TUNING.hookSweep && eDx >= 0.3 && low > -0.3;
    // Punches at the lens mean the camera is where an opponent would stand, whatever the
    // shoulders suggest (someone squared up to a laptop looks like a side view at rest).
    if (atLens && this.lensHits[this.lensHits.length - 1] !== w.t0) this.lensHits = [...this.lensHits, w.t0].slice(-4);
    const front = this.facingCamera || this.lensHits.filter((h) => w.t0 - h < 60_000).length >= 2;
    const frontStraight =
      front &&
      low > -0.3 &&
      ((uaMin <= TUNING.frontUa && eRise >= TUNING.frontElbowRise && sweep < TUNING.hookSweep && eDx < 0.35) ||
        (sweep >= 0.25 && sweep < TUNING.hookSweep && travel >= TUNING.minTravel && low <= 0.25 && dip < 0.15));
    // Facing the camera the dip before an uppercut is often lost; a big straight rise still shows.
    const frontUpper =
      front &&
      low > -0.4 && // a fist finishing above your head is a block
      ((rise >= TUNING.frontRise && aboveGuard >= 0.4 && sweep <= 0.3) ||
      // A short one: the fist rises with the elbow staying down and the arm bent.
      (rise >= 0.25 && aboveGuard >= 0.25 && sweep <= 0.2 && uaMin >= 0.6 && maxExt < 0.6));
    if (((rise >= TUNING.rise && dip >= 0.1 && aboveGuard >= 0.12) || frontUpper) && !straight && !atLens) kind = 'uppercut';
    else if (straight || frontStraight || atLens) kind = 'straight';
    // Fists that finish at or above your own head are blocking, not punching.
    else if (proj[impact].s.face < 0.3 || low <= -0.35) kind = null;
    // A hand dropping straight down (shoulder-roll guard) isn't a body shot.
    else if (low > 0.3 && across < 0.25) kind = null;
    // From the side, a hook arcs across the body partly toward or away from the lens. The arm
    // must open up: a guard hand that only rides along with the turning torso stays folded.
    else if (travel >= TUNING.minTravel && (maxExt >= TUNING.hookExt || sweptHook || (front && sweep >= TUNING.hookSweep))) kind = 'hook';
    if (!kind) return null;

    const body = kind !== 'uppercut' && low >= TUNING.bodyLow;
    const lead = hand === 'lead';
    let punch: PunchType, label: string;
    if (kind === 'uppercut') [punch, label] = ['uppercut', lead ? 'Lead Uppercut' : 'Rear Uppercut'];
    else if (kind === 'straight') [punch, label] = body ? ['body', lead ? 'Body Jab' : 'Body Cross'] : lead ? ['jab', 'Jab'] : ['cross', 'Cross'];
    else [punch, label] = body ? ['body', lead ? 'Liver Shot' : 'Body Hook'] : ['hook', lead ? 'Lead Hook' : 'Rear Hook'];

    return {
      at: now,
      event: { kind: 'strike', t: impactT, hand, punch, label, speed: Math.round(w.peakSpeed * TUNING.torsoMetres * 10) / 10 },
      t0: Math.max(w.t0, impactT - TUNING.crossSpanMs),
      t1: impactT + 100,
      size: Math.max(travel, rise),
    };
  }

  /**
   * Release classified strikes once the other hand can no longer claim the same moment.
   * Pose models often drag the idle arm along with a punching one; the bigger motion wins.
   */
  private flushStrikes(now: number): StrikeEvent[] {
    // The other hand is still mid-motion over the same moment and hasn't been called yet.
    const busyOther = (p: Pending) => {
      const other = this.hands[p.event.hand === 'lead' ? 'rear' : 'lead'].active;
      // Started after this punch landed: the next punch of a combination, not crosstalk.
      // One still far smaller than this punch is the idle arm dragged along: no need to wait.
      return other && !other.decided && other.trigger < p.event.t && other.maxTravel >= TUNING.holdRatio * p.size && now - p.at < TUNING.maxHoldMs;
    };
    const ready = this.pending.filter((p) => now - p.at >= TUNING.flushMs && !busyOther(p));
    if (!ready.length) return [];
    this.released = this.released.filter((q) => now - q.at < 1500);
    const out: StrikeEvent[] = [];
    for (const p of ready) {
      // Compare with released strikes too: a rival may have been called a moment earlier.
      const rival = [...this.pending, ...this.released].find(
        (q) => q !== p && q.event.hand !== p.event.hand && q.t0 < p.t1 && p.t0 < q.t1 && q.size > p.size,
      );
      const overlap = rival ? Math.min(p.t1, rival.t1) - Math.max(p.t0, rival.t0) : 0;
      const shorter = rival ? Math.min(p.t1 - p.t0, rival.t1 - rival.t0) : 1;
      if (rival && overlap > 0.5 * shorter && p.size < TUNING.crosstalk * rival.size) continue;
      out.push(p.event);
      this.released.push(p);
    }
    this.pending = this.pending.filter((p) => !ready.includes(p));
    out.sort((a, b) => a.t - b.t);
    if (out.length) this.lastStrikeT = now;
    this.strikeTimes = [...this.strikeTimes, ...out.map((e) => e.t)].slice(-8);
    return out;
  }

  private stepHead(
    t: number, nose: P2, hipMid: P2, ankles: P2, feetVis: number, T: number,
  ): { event: DefenseEvent; startT: number; size: number } | null {
    const h = this.head;
    // Settle on feet-or-frame from the first frame, so the baseline isn't reset mid-session.
    if (h.feetVis < 0) h.feet = feetVis > 0.35;
    h.feetVis = h.feetVis < 0 ? feetVis : h.feetVis * 0.95 + feetVis * 0.05;
    const feet = h.feet ? h.feetVis > 0.2 : h.feetVis > 0.35;
    if (feet !== h.feet) {
      h.feet = feet;
      h.frames = 0;
      h.excursion = null;
    }
    const lat = (nose[0] - hipMid[0]) / T;
    const up = ((feet ? ankles[1] : 1) - nose[1]) / T;

    if (h.frames < 15) {
      h.baseLat = (h.baseLat * h.frames + lat) / (h.frames + 1);
      h.baseUp = (h.baseUp * h.frames + up) / (h.frames + 1);
      h.frames++;
      return null;
    }
    const dLat = lat - h.baseLat, dUp = up - h.baseUp;
    this.debugHead?.(t, dLat, dUp);
    // A slip tilts the shoulders and swings the elbows; only a moving fist means a punch.
    const busy = (w: Window | null) => !!w && w.fistTravel >= 0.25;
    const punching = busy(this.hands.lead.active) || busy(this.hands.rear.active) || t - this.lastStrikeT < 200;
    // Track a whole head excursion, then name it once the head comes home.
    const ex = h.excursion;
    if (!ex) {
      if (!punching && (Math.abs(dLat) > TUNING.slip || dUp < -TUNING.duck)) {
        h.excursion = { t0: t, maxLat: Math.abs(dLat), minLat: dLat, maxLatSigned: dLat, minUp: dUp };
      } else if (Math.abs(dLat) < 0.15 && Math.abs(dUp) < 0.1) {
        // Adapt slowly to the fighter's natural stance while calm.
        h.baseLat += (lat - h.baseLat) * 0.02;
        h.baseUp += (up - h.baseUp) * 0.02;
      }
      return null;
    }
    ex.maxLat = Math.max(ex.maxLat, Math.abs(dLat));
    ex.minLat = Math.min(ex.minLat, dLat);
    ex.maxLatSigned = Math.max(ex.maxLatSigned, dLat);
    ex.minUp = Math.min(ex.minUp, dUp);
    const dipped = ex.minUp < -TUNING.duck;
    const home = dipped ? dUp > -TUNING.duck / 2 && Math.abs(dLat) < 0.25 : Math.abs(dLat) < 0.15;
    if (!home && t - ex.t0 < 1200) return null;
    h.excursion = null;
    if (dipped) {
      const sway = ex.maxLatSigned - ex.minLat;
      return { startT: ex.t0, size: -ex.minUp, event: { kind: 'defense', t, move: 'roll', label: sway >= 0.3 ? 'Roll' : 'Duck' } };
    }
    if (ex.maxLat > TUNING.slip) return { startT: ex.t0, size: ex.maxLat, event: { kind: 'defense', t, move: 'slip', label: 'Slip' } };
    return null;
  }
}
