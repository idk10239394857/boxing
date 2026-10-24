import { useEffect, useState, type CSSProperties, type ReactNode } from 'react';
import { AbsoluteFill, Audio, Img, continueRender, delayRender, staticFile, useCurrentFrame } from 'remotion';
import { D, enter, exit, fluid, lerp, scramble, spring, tween } from './motion';

/*
 * FightFlow launch, 15 s at 60 fps. 120 BPM: one beat = 30 frames, every cut lands on the grid.
 * UI layer (phone, callouts, counters) follows Apple Fluid MOTION.md; scene changes use the
 * igloo-style layer (RGB split + displacement, red-tape wipes) timed on the same curves.
 */

export const RED = '#E8202A';
export const INK = '#070707';
const POSTER = 'Poster';
const CAPS = 'Caps';
const TEXT = 'Text';

const FONTS: [string, string, string?][] = [
  [POSTER, 'fonts/BarlowCondensed_800ExtraBold_Italic.ttf', 'italic'],
  [CAPS, 'fonts/BarlowCondensed_600SemiBold.ttf'],
  [TEXT, 'fonts/InterTight_400Regular.ttf'],
  [`${TEXT}Semi`, 'fonts/InterTight_600SemiBold.ttf'],
];

export function useFonts() {
  const [handle] = useState(() => delayRender('fonts'));
  useEffect(() => {
    Promise.all(
      FONTS.map(([family, file, style]) =>
        new FontFace(family, `url(${staticFile(file)})`, style ? { style } : {}).load().then((f) => document.fonts.add(f)),
      ),
    ).then(() => continueRender(handle));
  }, [handle]);
}

export const poster = (size: number, color = '#fff'): CSSProperties => ({
  fontFamily: POSTER,
  fontStyle: 'italic',
  fontSize: size,
  lineHeight: 0.86,
  letterSpacing: -0.01 * size,
  textTransform: 'uppercase',
  color,
  whiteSpace: 'nowrap',
});
export const caps = (size: number, color = RED): CSSProperties => ({
  fontFamily: CAPS,
  fontSize: size,
  letterSpacing: 0.2 * size,
  textTransform: 'uppercase',
  color,
  whiteSpace: 'nowrap',
});
export const body = (size: number, color = '#BDBDBD'): CSSProperties => ({ fontFamily: TEXT, fontSize: size, lineHeight: 1.4, color });

/* ---------- Scene-layer effects ---------- */

/** Transition peaks (frame, strength): RGB split + horizontal displacement. */
const GLITCHES: [number, number][] = [
  [110, 1],
  [596, 1],
  [660, 0.45],
  [720, 0.45],
];
function glitchAt(f: number) {
  return GLITCHES.reduce((a, [c, s]) => a + s * Math.max(0, 1 - Math.abs(f - c) / 9) ** 2, 0);
}

export function GlitchFilter({ amount, frame }: { amount: number; frame: number }) {
  const dx = amount * 26;
  return (
    <svg width="0" height="0" style={{ position: 'absolute' }}>
      <filter id="rgb" x="-10%" y="-10%" width="120%" height="120%" colorInterpolationFilters="sRGB">
        <feTurbulence type="fractalNoise" baseFrequency="0.0006 0.09" numOctaves={1} seed={frame % 7} result="noise" />
        <feDisplacementMap in="SourceGraphic" in2="noise" scale={amount * 90} xChannelSelector="R" yChannelSelector="B" result="d" />
        <feColorMatrix in="d" type="matrix" values="1 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0" result="r" />
        <feOffset in="r" dx={dx} result="r2" />
        <feColorMatrix in="d" type="matrix" values="0 0 0 0 0  0 1 0 0 0  0 0 0 0 0  0 0 0 1 0" result="g" />
        <feColorMatrix in="d" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 1 0 0  0 0 0 1 0" result="b" />
        <feOffset in="b" dx={-dx} result="b2" />
        <feBlend in="r2" in2="g" mode="screen" result="rg" />
        <feBlend in="rg" in2="b2" mode="screen" />
      </filter>
    </svg>
  );
}

/** The red tape: a slab at -14deg that sweeps across and covers the frame at `mid`. */
function TapeWipe({ frame, mid }: { frame: number; mid: number }) {
  const inK = tween(frame, mid - 14, 14, enter);
  const outK = tween(frame, mid, 16, exit);
  if (frame < mid - 14 || frame > mid + 16) return null;
  const x = frame <= mid ? lerp(-3200, 0, inK) : lerp(0, 3200, outK);
  return (
    <AbsoluteFill style={{ pointerEvents: 'none' }}>
      <div style={{ position: 'absolute', left: -600 + x, top: -700, width: 3100, height: 2500, background: RED, transform: 'rotate(-14deg)' }} />
      <div style={{ position: 'absolute', left: -900 + x * 1.15, top: -700, width: 140, height: 2500, background: '#fff', transform: 'rotate(-14deg)', opacity: 0.9 }} />
    </AbsoluteFill>
  );
}

/** Black ground under a red ring light that drifts with the story, plus grain. */
function Backdrop({ frame }: { frame: number }) {
  const x = 72 + 8 * Math.sin(frame / 90);
  const y = 26 + 6 * Math.cos(frame / 120);
  const pulse = 0.5 + 0.08 * Math.sin((frame / 30) * Math.PI);
  return (
    <AbsoluteFill style={{ background: INK }}>
      <AbsoluteFill style={{ background: `radial-gradient(52% 70% at ${x}% ${y}%, rgba(232,32,42,${pulse}), rgba(232,32,42,0) 70%)` }} />
      <AbsoluteFill style={{ background: 'radial-gradient(120% 90% at 50% 50%, rgba(0,0,0,0) 55%, rgba(0,0,0,0.65) 100%)' }} />
      <svg width="1920" height="1080" style={{ position: 'absolute', opacity: 0.09, mixBlendMode: 'screen' }}>
        <filter id="grain">
          <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves={2} seed={frame % 12} />
          <feColorMatrix type="saturate" values="0" />
        </filter>
        <rect width="1920" height="1080" filter="url(#grain)" />
      </svg>
    </AbsoluteFill>
  );
}

/** Bell visual: a ring that expands from a point and fades. */
export function Shockwave({ frame, at, x, y, color = RED }: { frame: number; at: number; x: number; y: number; color?: string }) {
  const k = tween(frame, at, 40, fluid);
  if (frame < at || k >= 1) return null;
  const r = lerp(20, 1100, k);
  return (
    <svg width="1920" height="1080" style={{ position: 'absolute', left: 0, top: 0 }}>
      <circle cx={x} cy={y} r={r} fill="none" stroke={color} strokeWidth={lerp(16, 1, k)} opacity={1 - k} />
      <circle cx={x} cy={y} r={r * 0.72} fill="none" stroke="#fff" strokeWidth={lerp(4, 0.5, k)} opacity={(1 - k) * 0.6} />
    </svg>
  );
}

/** A poster line that slams in: drops from slightly too big, critically damped. */
export function Slam({ frame, at, children, style }: { frame: number; at: number; children: ReactNode; style?: CSSProperties }) {
  if (frame < at) return null;
  const s = spring(frame, at, 1.32, 1, 0.3);
  const y = spring(frame, at, 70, 0, 0.3);
  const o = tween(frame, at, 6, fluid);
  return <div style={{ ...style, opacity: o, transform: `translateY(${y}px) scale(${s})`, transformOrigin: '0% 60%' }}>{children}</div>;
}

/** MOTION.md hero title / main content entrance. */
export function Rise({ frame, at, dist = 28, dur = D.slow, children, style }: { frame: number; at: number; dist?: number; dur?: number; children: ReactNode; style?: CSSProperties }) {
  const k = tween(frame, at, dur, enter);
  return <div style={{ ...style, opacity: k, transform: `translateY(${(1 - k) * dist}px)` }}>{children}</div>;
}

/* ---------- Scene 1: the hook ---------- */

function Hook({ frame }: { frame: number }) {
  const push = lerp(1, 1.05, tween(frame, 0, 108, fluid));
  const bar = tween(frame, 64, 14, enter);
  return (
    <AbsoluteFill>
      <Shockwave frame={frame} at={0} x={1500} y={300} />
      <div style={{ position: 'absolute', left: 150, top: 150, transform: `scale(${push})`, transformOrigin: '0% 50%' }}>
        <div style={{ ...caps(28), height: 40 }}>{scramble('Introducing FightFlow', frame, 2, 26)}</div>
        <div style={{ position: 'absolute', left: 1000, top: 700, width: 1100 * bar, height: 64, background: RED, transform: 'rotate(-14deg)', transformOrigin: '0% 50%', opacity: 0.95 }} />
        <Slam frame={frame} at={6} style={{ ...poster(250), marginTop: 30, position: 'relative' }}>Every</Slam>
        <Slam frame={frame} at={36} style={{ ...poster(250), position: 'relative' }}>punch.</Slam>
        <Slam frame={frame} at={66} style={{ ...poster(250, RED), position: 'relative' }}>Counted.</Slam>
      </div>
    </AbsoluteFill>
  );
}

/* ---------- Scene 2: Shadow Cam ---------- */

type Joint = 'head' | 'neck' | 'ls' | 'rs' | 'le' | 're' | 'lh' | 'rh' | 'lhip' | 'rhip' | 'lk' | 'rk' | 'lf' | 'rf';
type Pose = Record<Joint, [number, number]>;
const GUARD: Pose = {
  head: [300, 140], neck: [300, 195], ls: [330, 212], rs: [268, 214], le: [352, 292], re: [282, 296], lh: [372, 214], rh: [322, 226],
  lhip: [318, 400], rhip: [278, 402], lk: [362, 528], rk: [246, 530], lf: [392, 664], rf: [214, 664],
};
const P = (d: Partial<Pose>): Pose => ({ ...GUARD, ...d });
export const POSES = {
  jab: P({ ls: [345, 210], le: [440, 206], lh: [548, 200], head: [312, 142], neck: [306, 195] }),
  cross: P({ rs: [300, 206], re: [398, 206], rh: [538, 200], ls: [340, 214], le: [346, 290], lh: [360, 206], head: [322, 146], neck: [314, 196], rhip: [292, 402], rk: [262, 528] }),
  hook: P({ ls: [338, 206], le: [430, 192], lh: [474, 236], head: [318, 150], neck: [310, 198], lhip: [324, 400] }),
  uppercut: P({ rs: [290, 222], re: [336, 318], rh: [404, 192], head: [312, 168], neck: [306, 218], lk: [366, 540], rk: [252, 540], lhip: [318, 412], rhip: [280, 414], ls: [330, 230], le: [350, 306], lh: [372, 232] }),
  slip: P({ head: [348, 184], neck: [328, 228], ls: [354, 242], rs: [292, 242], le: [372, 318], re: [300, 320], lh: [394, 242], rh: [346, 252], lhip: [322, 404], rhip: [282, 404], lk: [368, 534], rk: [244, 534] }),
};
export type Move = keyof typeof POSES;
export type Hit = [number, Move];
const EVENTS: Hit[] = [
  [150, 'jab'], [180, 'cross'], [210, 'hook'], [240, 'uppercut'], [270, 'slip'], [300, 'jab'], [315, 'jab'], [330, 'cross'],
];
export const PUNCH_COLOR: Record<Move, string> = { jab: '#FFFFFF', cross: RED, hook: '#FF7A45', uppercut: '#FFC24A', slip: '#FFFFFF' };
export const LABEL: Record<Move, string> = { jab: 'Jab', cross: 'Cross', hook: 'Hook', uppercut: 'Uppercut', slip: 'Slip' };

function weight(f: number, p: number, slip: boolean) {
  const [rise, hold, back] = slip ? [12, 8, 20] : [7, 3, 13];
  if (f < p - rise || f > p + hold + back) return 0;
  if (f <= p) return enter((f - (p - rise)) / rise);
  if (f <= p + hold) return 1;
  return 1 - fluid((f - p - hold) / back);
}
function poseAt(f: number, events: Hit[] = EVENTS): Pose {
  const out = { ...GUARD } as Pose;
  for (const [p, m] of events) {
    const w = weight(f, p, m === 'slip');
    if (!w) continue;
    for (const j of Object.keys(GUARD) as Joint[]) {
      out[j] = [out[j][0] + w * (POSES[m][j][0] - GUARD[j][0]), out[j][1] + w * (POSES[m][j][1] - GUARD[j][1])];
    }
  }
  // Breathing bounce of a fighter on their toes.
  const bob = Math.sin((f / 30) * Math.PI) * 4;
  for (const j of Object.keys(out) as Joint[]) if (j !== 'lf' && j !== 'rf') out[j] = [out[j][0], out[j][1] + bob];
  return out;
}
const BONES: [Joint, Joint][] = [
  ['neck', 'ls'], ['neck', 'rs'], ['ls', 'le'], ['le', 'lh'], ['rs', 're'], ['re', 'rh'], ['lhip', 'rhip'], ['lhip', 'lk'], ['lk', 'lf'], ['rhip', 'rk'], ['rk', 'rf'],
];

export function Fighter({ frame, events = EVENTS }: { frame: number; events?: Hit[] }) {
  const pose = poseAt(frame, events);
  const mid: [number, number] = [(pose.lhip[0] + pose.rhip[0]) / 2, (pose.lhip[1] + pose.rhip[1]) / 2];
  const trail = (hand: 'lh' | 'rh') =>
    Array.from({ length: 7 }, (_, i) => {
      const a = poseAt(frame - i - 1, events)[hand];
      const b = poseAt(frame - i, events)[hand];
      const speed = Math.hypot(b[0] - a[0], b[1] - a[1]);
      return speed > 4 ? <circle key={i} cx={a[0]} cy={a[1]} r={20 - i * 2} fill={RED} opacity={(0.5 * (7 - i)) / 7} /> : null;
    });
  return (
    <svg viewBox="0 0 600 760" width={600} height={760} style={{ overflow: 'visible' }}>
      <ellipse cx={300} cy={672} rx={190} ry={26} fill="none" stroke="#FFC24A" strokeWidth={3} opacity={0.6} />
      {trail('lh')}
      {trail('rh')}
      <g stroke="#fff" strokeWidth={10} strokeLinecap="round" opacity={0.92}>
        {BONES.map(([a, b]) => (
          <line key={a + b} x1={pose[a][0]} y1={pose[a][1]} x2={pose[b][0]} y2={pose[b][1]} />
        ))}
        <line x1={pose.neck[0]} y1={pose.neck[1]} x2={mid[0]} y2={mid[1]} />
      </g>
      <circle cx={pose.head[0]} cy={pose.head[1]} r={34} fill={INK} stroke="#fff" strokeWidth={8} />
      {(Object.keys(pose) as Joint[])
        .filter((j) => !['head', 'lh', 'rh'].includes(j))
        .map((j) => (
          <circle key={j} cx={pose[j][0]} cy={pose[j][1]} r={8} fill={RED} />
        ))}
      <circle cx={pose.lh[0]} cy={pose.lh[1]} r={22} fill={RED} stroke="#fff" strokeWidth={3} />
      <circle cx={pose.rh[0]} cy={pose.rh[1]} r={22} fill={RED} stroke="#fff" strokeWidth={3} />
      {events.filter(([, m]) => m !== 'slip').map(([p, m]) => {
        const k = tween(frame, p, 16, fluid);
        if (frame < p || k >= 1) return null;
        const hand = m === 'jab' || m === 'hook' ? POSES[m].lh : POSES[m].rh;
        return (
          <g key={p} opacity={1 - k}>
            {Array.from({ length: 10 }, (_, i) => {
              const a = (i / 10) * Math.PI * 2;
              const r0 = 26 + 30 * k;
              const r1 = r0 + 26 + 50 * k;
              return <line key={i} x1={hand[0] + Math.cos(a) * r0} y1={hand[1] + Math.sin(a) * r0} x2={hand[0] + Math.cos(a) * r1} y2={hand[1] + Math.sin(a) * r1} stroke={PUNCH_COLOR[m]} strokeWidth={5} strokeLinecap="round" />;
            })}
          </g>
        );
      })}
    </svg>
  );
}

export function PunchTags({ frame, events = EVENTS, size = 54 }: { frame: number; events?: Hit[]; size?: number }) {
  return (
    <>
      {events.map(([p, m]) => {
        if (frame < p || frame > p + 46) return null;
        const hand = m === 'slip' ? POSES.slip.head : m === 'jab' || m === 'hook' ? POSES[m].lh : POSES[m].rh;
        const s = spring(frame, p, 0.6, 1, 0.28);
        const y = -lerp(0, 46, tween(frame, p, 46, fluid));
        const o = 1 - tween(frame, p + 30, 16, exit);
        const color = PUNCH_COLOR[m];
        const slab = m !== 'slip';
        return (
          <div
            key={p}
            style={{
              position: 'absolute',
              left: hand[0] - 30,
              top: hand[1] - 120 + y,
              opacity: o,
              transform: `scale(${s}) skewX(-10deg)`,
              transformOrigin: '0% 100%',
              background: slab ? color : 'transparent',
              border: slab ? 'none' : '3px solid #fff',
              padding: '6px 18px 2px',
            }}
          >
            <div style={{ ...poster(size, slab && color !== RED ? INK : '#fff'), transform: 'skewX(10deg)' }}>{LABEL[m]}</div>
          </div>
        );
      })}
    </>
  );
}

function ShadowCam({ frame }: { frame: number }) {
  const thrown = EVENTS.filter(([p, m]) => m !== 'slip' && frame >= p);
  const last = thrown.length ? thrown[thrown.length - 1][0] : 0;
  const pop = thrown.length ? spring(frame, last, 1.18, 1, 0.25) : 1;
  const open = tween(frame, 102, D.slow, enter);
  const push = lerp(1, 1.06, tween(frame, 120, 260, fluid));
  const counts = (['jab', 'cross', 'hook', 'uppercut'] as Move[]).map((m) => [m, thrown.filter(([, x]) => x === m).length] as const);
  const bracket = (x: number, y: number, sx: number, sy: number) => (
    <path d={`M ${x} ${y + sy * 60} L ${x} ${y} L ${x + sx * 60} ${y}`} fill="none" stroke="#fff" strokeWidth={5} />
  );
  return (
    <AbsoluteFill>
      <div style={{ position: 'absolute', left: 140, top: 170, width: 820 }}>
        <div style={{ ...caps(28), height: 40 }}>{scramble('Shadow Cam', frame, 106, 20)}</div>
        <Rise frame={frame} at={106}>
          <div style={{ ...poster(168), marginTop: 20 }}>Your camera</div>
        </Rise>
        <Rise frame={frame} at={114}>
          <div style={poster(168, RED)}>keeps score.</div>
        </Rise>
        <Rise frame={frame} at={128} dist={18} dur={D.default}>
          <div style={{ ...body(30), marginTop: 30, maxWidth: 640 }}>Jabs, crosses, hooks, uppercuts and slips, counted on your device.</div>
        </Rise>
        <div style={{ display: 'flex', gap: 44, marginTop: 56 }}>
          {counts.map(([m, n], i) => (
            <Rise key={m} frame={frame} at={134 + i * 3} dist={20} dur={D.default}>
              <div style={{ width: 8, height: 46, background: PUNCH_COLOR[m], transform: 'skewX(-12deg)', marginBottom: 10 }} />
              <div style={poster(84)}>{n}</div>
              <div style={{ ...caps(20, '#8C8C8C'), marginTop: 6 }}>{LABEL[m]}</div>
            </Rise>
          ))}
        </div>
      </div>

      <div style={{ position: 'absolute', left: 1010, top: 110, width: 780, height: 860, opacity: open, transform: `scale(${lerp(0.92, 1, open)})` }}>
        <svg width={780} height={860} style={{ position: 'absolute' }}>
          {bracket(0, 0, 1, 1)}
          {bracket(780, 0, -1, 1)}
          {bracket(0, 860, 1, -1)}
          {bracket(780, 860, -1, -1)}
          <line x1={0} y1={430 + 300 * Math.sin(frame / 22)} x2={780} y2={430 + 300 * Math.sin(frame / 22)} stroke={RED} strokeWidth={2} opacity={0.35} />
        </svg>
        <div style={{ position: 'absolute', left: 34, top: 30, display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 16, height: 16, borderRadius: 8, background: RED, opacity: Math.floor(frame / 15) % 2 ? 1 : 0.25 }} />
          <div style={caps(20, '#fff')}>Rec · Shadow Cam</div>
        </div>
        <div style={{ position: 'absolute', right: 40, bottom: 40, textAlign: 'right', zIndex: 2 }}>
          <div style={caps(18, '#8C8C8C')}>Punches</div>
          <div style={{ ...poster(120), transform: `scale(${pop})`, transformOrigin: '100% 100%' }}>{String(thrown.length).padStart(2, '0')}</div>
        </div>
        <div style={{ position: 'absolute', left: 90, top: 90, transform: `scale(${push})`, transformOrigin: '50% 80%' }}>
          <Fighter frame={frame} />
          <PunchTags frame={frame} />
        </div>
      </div>
    </AbsoluteFill>
  );
}

/* ---------- Scene 3: the phone ---------- */

function Callout({ frame, at, out, x, y, ax, ay, value, label }: { frame: number; at: number; out: number; x: number; y: number; ax: number; ay: number; value: ReactNode; label: string }) {
  const draw = tween(frame, at, D.default, fluid);
  const show = tween(frame, at + 6, D.default, enter);
  const gone = tween(frame, out, D.fast, exit);
  if (frame < at) return null;
  const len = Math.hypot(x - ax, y - ay);
  const ang = (Math.atan2(y - ay, x - ax) * 180) / Math.PI;
  return (
    <div style={{ position: 'absolute', left: 0, top: 0, opacity: 1 - gone }}>
      <div style={{ position: 'absolute', left: ax - 9, top: ay - 9, width: 18, height: 18, borderRadius: 9, background: RED, boxShadow: '0 0 0 6px rgba(232,32,42,0.25)' }} />
      <div style={{ position: 'absolute', left: ax, top: ay, width: len * draw, height: 3, background: '#fff', transform: `rotate(${ang}deg)`, transformOrigin: '0% 50%' }} />
      <div style={{ position: 'absolute', left: x + 16, top: y - 56, opacity: show, transform: `translateY(${(1 - show) * 18}px)` }}>
        <div style={poster(88)}>{value}</div>
        <div style={{ ...caps(20, '#fff'), marginTop: 4 }}>{label}</div>
      </div>
    </div>
  );
}

export function count(frame: number, at: number, to: number, dur = 30) {
  return Math.round(to * tween(frame, at, dur, fluid));
}

function PhoneScene({ frame }: { frame: number }) {
  const y = spring(frame, 388, 980, 0, 0.55);
  const rx = spring(frame, 388, 32, 7, 0.55);
  const ry = spring(frame, 388, -34, -14, 0.55) + lerp(0, 9, tween(frame, 400, 190, fluid));
  const pushOut = tween(frame, 580, 16, exit);
  const scroll = tween(frame, 505, D.slow, fluid);
  const W = 420;
  const H = (W * 1688) / 780;
  const drift = lerp(0, -260, tween(frame, 386, 210, fluid));
  return (
    <AbsoluteFill>
      <div style={{ position: 'absolute', left: 80 + drift, top: 640, ...poster(430, 'transparent'), WebkitTextStroke: '2px rgba(255,255,255,0.07)' }}>Every round</div>
      <div style={{ position: 'absolute', left: 140, top: 200, width: 760, opacity: 1 - pushOut }}>
        <div style={{ ...caps(28), height: 40 }}>{scramble('Your numbers', frame, 392, 20)}</div>
        <Rise frame={frame} at={398}>
          <div style={{ ...poster(200), marginTop: 20 }}>See the</div>
        </Rise>
        <Rise frame={frame} at={406}>
          <div style={poster(200, RED)}>work.</div>
        </Rise>
        <Rise frame={frame} at={420} dist={18} dur={D.default}>
          <div style={{ ...body(30), marginTop: 30, maxWidth: 600 }}>Rounds, streaks, XP and every punch you've thrown, in one place.</div>
        </Rise>
      </div>

      <div style={{ position: 'absolute', left: 1050, top: 80, perspective: 2200 }}>
        <div
          style={{
            width: W + 24,
            height: H + 24,
            padding: 12,
            borderRadius: 64,
            background: '#000',
            boxShadow: '0 60px 120px rgba(0,0,0,0.8), 0 0 0 2px #2c2c2c, 0 0 120px rgba(232,32,42,0.25)',
            transform: `translateY(${y}px) rotateX(${rx}deg) rotateY(${ry}deg) scale(${lerp(1, 2.8, pushOut)})`,
            transformOrigin: '50% 40%',
          }}
        >
          <div style={{ width: W, height: H, borderRadius: 52, overflow: 'hidden', position: 'relative' }}>
            <div style={{ transform: `translateY(${-scroll * H}px)` }}>
              <Img src={staticFile('home.png')} style={{ width: W, height: H, display: 'block' }} />
              <Img src={staticFile('strikes.png')} style={{ width: W, height: H, display: 'block' }} />
            </div>
          </div>
        </div>
      </div>

      <div style={{ opacity: 1 - pushOut }}>
        <Callout frame={frame} at={440} out={500} ax={1180} ay={260} x={1560} y={250} value="4 days" label="FightStreak" />
        <Callout frame={frame} at={465} out={500} ax={1150} ay={500} x={1560} y={470} value={count(frame, 465, 18)} label="Rounds this week" />
        <Callout frame={frame} at={490} out={505} ax={1300} ay={590} x={1560} y={690} value="+80 XP" label="Every session" />
        <Callout frame={frame} at={530} out={580} ax={1180} ay={360} x={1560} y={330} value={count(frame, 530, 1094).toLocaleString('en-US')} label="Punches thrown" />
        <Callout frame={frame} at={550} out={580} ax={1260} ay={600} x={1560} y={580} value={`${count(frame, 550, 55)}%`} label="Landed" />
      </div>
    </AbsoluteFill>
  );
}

/* ---------- Scene 4: rapid-fire features ---------- */

function Panel({ frame, at, kicker, a, b, children }: { frame: number; at: number; kicker: string; a: string; b: string; children: ReactNode }) {
  return (
    <AbsoluteFill>
      <div style={{ position: 'absolute', left: 140, top: 250 }}>
        <div style={{ ...caps(28), height: 40 }}>{scramble(kicker, frame, at, 16)}</div>
        <Slam frame={frame} at={at + 2} style={{ ...poster(210), marginTop: 20 }}>{a}</Slam>
        <Slam frame={frame} at={at + 8} style={poster(210, RED)}>{b}</Slam>
      </div>
      {children}
    </AbsoluteFill>
  );
}

function Timer({ frame }: { frame: number }) {
  const secs = Math.max(10, 180 - Math.max(0, frame - 602) * 3);
  const warn = secs <= 10;
  const k = tween(frame, 598, D.slow, enter);
  const rounds = Math.min(6, Math.floor(Math.max(0, frame - 604) / 8));
  return (
    <Panel frame={frame} at={598} kicker="Round timer" a="Bell" b="to bell.">
      <div style={{ position: 'absolute', left: 1040, top: 260, opacity: k, transform: `scale(${lerp(1.035, 1, k)})` }}>
        <div style={caps(26, warn ? RED : '#fff')}>{warn ? '10 seconds' : `Round ${Math.min(6, rounds + 1)} of 6`}</div>
        <div style={{ ...poster(330, warn ? RED : '#fff'), marginTop: 10, fontVariantNumeric: 'tabular-nums' }}>
          {Math.floor(secs / 60)}:{String(secs % 60).padStart(2, '0')}
        </div>
        <div style={{ display: 'flex', gap: 12, marginTop: 40 }}>
          {Array.from({ length: 6 }, (_, i) => (
            <div key={i} style={{ width: 106, height: 22, background: i < rounds ? RED : '#1C1C1C', transform: 'skewX(-12deg)' }} />
          ))}
        </div>
      </div>
    </Panel>
  );
}

const TIERS = ['Novice', 'Fundamentals', 'Contender', 'Sharp', 'Fight ready'];
function Roadmap({ frame }: { frame: number }) {
  return (
    <Panel frame={frame} at={660} kicker="Skill roadmap" a="36 skills." b="5 tiers.">
      <div style={{ position: 'absolute', left: 1120, top: 230, display: 'grid', gridTemplateColumns: 'repeat(6, 76px)', gap: 18 }}>
        {Array.from({ length: 36 }, (_, i) => {
          const at = 668 + i * 1.2;
          const on = frame >= at;
          const s = on ? spring(frame, at, 0.6, 1, 0.25) : 1;
          return (
            <div key={i} style={{ width: 76, height: 76, border: '3px solid #2C2C2C', background: on ? RED : 'transparent', transform: `skewX(-8deg) scale(${s})`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {on ? <svg width={34} height={34} viewBox="0 0 24 24"><path d="M4 12.5l5 5L20 6.5" fill="none" stroke="#fff" strokeWidth={3.4} strokeLinecap="round" strokeLinejoin="round" /></svg> : null}
            </div>
          );
        })}
      </div>
      <div style={{ position: 'absolute', left: 1120, top: 840, display: 'flex', gap: 26 }}>
        {TIERS.map((t, i) => (
          <div key={t} style={caps(24, frame >= 676 + i * 8 ? '#fff' : '#5a5a5a')}>{scramble(t, frame, 670 + i * 6, 12)}</div>
        ))}
      </div>
    </Panel>
  );
}

function Technique({ frame }: { frame: number }) {
  const k = tween(frame, 722, D.slow, enter);
  const turn = Math.sin(((frame - 720) / 62) * Math.PI) * 22;
  // Crop of the 3D viewer from the technique screen (780 x 1688 source).
  const crop = { x: 36, y: 214, w: 708, h: 680 };
  const S = 0.92;
  return (
    <Panel frame={frame} at={720} kicker="Technique library" a="25 moves." b="In 3D.">
      <div style={{ position: 'absolute', left: 1080, top: 150, perspective: 1600, opacity: k }}>
        <div style={{ width: crop.w * S, height: crop.h * S, overflow: 'hidden', borderRadius: 30, transform: `rotateY(${turn}deg) scale(${lerp(1.035, 1, k)})`, boxShadow: '0 50px 100px rgba(0,0,0,0.7), 0 0 0 2px #2c2c2c' }}>
          <Img src={staticFile('technique.png')} style={{ width: 780 * S, height: 1688 * S, marginLeft: -crop.x * S, marginTop: -crop.y * S, display: 'block' }} />
        </div>
        <svg width={760} height={200} style={{ position: 'absolute', left: -60, top: crop.h * S - 120, overflow: 'visible' }}>
          <ellipse cx={380} cy={100} rx={360} ry={60} fill="none" stroke={RED} strokeWidth={4} strokeDasharray="40 22" strokeDashoffset={-(frame - 720) * 6} />
        </svg>
        <div style={{ display: 'flex', gap: 12, marginTop: 34 }}>
          {['1×', '½×', '¼×', 'Front', 'Side'].map((c, i) => {
            const on = frame >= 730 + i * 3;
            const o = tween(frame, 730 + i * 3, D.fast, fluid);
            return (
              <div key={c} style={{ opacity: o, padding: '10px 18px', border: `2px solid ${i === 0 ? RED : '#2C2C2C'}`, background: i === 0 && on ? RED : 'transparent' }}>
                <div style={caps(22, '#fff')}>{c}</div>
              </div>
            );
          })}
        </div>
      </div>
    </Panel>
  );
}

/* ---------- Scene 5: end card ---------- */

function EndCard({ frame }: { frame: number }) {
  const stripe = tween(frame, 794, 16, enter);
  const slabS = frame >= 836 ? spring(frame, 836, 0, 1, 0.3) : 0;
  const glow = 0.4 + 0.2 * tween(frame, 838, 30, fluid);
  return (
    <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center' }}>
      <AbsoluteFill style={{ background: `radial-gradient(40% 50% at 50% 46%, rgba(232,32,42,${glow}), rgba(232,32,42,0) 70%)` }} />
      <div style={{ position: 'absolute', left: 1010, top: 730, width: 1100 * stripe, height: 46, background: RED, transform: 'rotate(-14deg)', transformOrigin: '0% 50%' }} />
      <Shockwave frame={frame} at={838} x={960} y={520} color="#fff" />
      <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <div style={{ ...caps(28), height: 40 }}>{scramble('Boxing training tracker', frame, 786, 22)}</div>
        <div style={{ display: 'flex', gap: 30, marginTop: 18 }}>
          <Slam frame={frame} at={790} style={poster(300)}>Fight</Slam>
          <Slam frame={frame} at={798} style={poster(300, RED)}>Flow</Slam>
        </div>
        <Rise frame={frame} at={814} dist={18} dur={D.default}>
          <div style={{ ...body(38, '#fff'), marginTop: 28 }}>Train like it's fight night.</div>
        </Rise>
        <div style={{ marginTop: 44, height: 84, display: 'flex', alignItems: 'center', transform: `scaleX(${slabS})` }}>
          <div style={{ background: RED, padding: '0 56px', height: 84, display: 'flex', alignItems: 'center', clipPath: 'polygon(4% 0, 100% 0, 96% 100%, 0 100%)' }}>
            <div style={poster(54)}>Live now · in your browser</div>
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
}

/* ---------- Timeline ---------- */

export function Launch() {
  useFonts();
  const frame = useCurrentFrame();
  const g = glitchAt(frame);
  let scene: ReactNode;
  if (frame < 110) scene = <Hook frame={frame} />;
  else if (frame < 386) scene = <ShadowCam frame={frame} />;
  else if (frame < 596) scene = <PhoneScene frame={frame} />;
  else if (frame < 660) scene = <Timer frame={frame} />;
  else if (frame < 720) scene = <Roadmap frame={frame} />;
  else if (frame < 788) scene = <Technique frame={frame} />;
  else scene = <EndCard frame={frame} />;
  return (
    <AbsoluteFill style={{ background: INK }}>
      <Audio src={staticFile('mix.wav')} />
      <GlitchFilter amount={g} frame={frame} />
      <AbsoluteFill style={{ filter: g > 0.02 ? 'url(#rgb)' : undefined }}>
        <Backdrop frame={frame} />
        {scene}
      </AbsoluteFill>
      <TapeWipe frame={frame} mid={386} />
      <TapeWipe frame={frame} mid={788} />
    </AbsoluteFill>
  );
}
