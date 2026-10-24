import type { CSSProperties, ReactNode } from 'react';
import { AbsoluteFill, Audio, Img, staticFile, useCurrentFrame } from 'remotion';
import { body, caps, count, Fighter, GlitchFilter, INK, PUNCH_COLOR, PunchTags, RED, Rise, Shockwave, Slam, poster, useFonts, type Hit } from './Launch';
import { D, enter, exit, fluid, lerp, scramble, spring, tween } from './motion';

/*
 * FightFlow launch, 9:16 for Reels and TikTok: 1080 x 1920, 15 s at 60 fps, 120 BPM.
 * Nothing holds still: every beat punches the camera in, shots sit at Dutch angles, scenes
 * change on diagonal slash cuts, and the first 3 s cut every eighth note to build to the drop.
 * Key text stays inside y 220..1480 and x 70..940, clear of the app overlays.
 */

const W = 1080;
const H = 1920;
const DROP = 180;

/* ---------- Always-moving layers ---------- */

/** Camera: a punch-in on every beat (eighth notes in the hype), Dutch angle per shot, whip at the drop. */
function useCamera(frame: number) {
  const step = frame < DROP ? 15 : 30;
  const last = Math.floor(frame / step) * step;
  const pulseAmt = frame < DROP ? 0.07 : frame < 810 ? 0.045 : 0.02;
  const pulse = 1 + pulseAmt * Math.exp(-(frame - last) / 7);
  const shots: [number, number][] = [[180, -3], [240, 3], [300, -4], [360, 3], [420, -2], [525, 2], [630, -3], [690, 3], [750, -2], [810, 0]];
  let rot = 0;
  let prev = 0;
  for (const [at, deg] of shots) {
    if (frame >= at) {
      rot = spring(frame, at, prev, deg, 0.3);
      prev = deg;
    }
  }
  const whip = frame >= DROP - 2 && frame < DROP + 10 ? (1 - tween(frame, DROP - 2, 12, enter)) * -900 : 0;
  const blur = Math.abs(whip) / 40;
  return { transform: `translateX(${whip}px) scale(${pulse}) rotate(${rot}deg)`, filter: blur > 0.5 ? `blur(${blur}px)` : undefined } as CSSProperties;
}

/** Diagonal speed lines racing across, faster in the hype. */
function SpeedLines({ frame }: { frame: number }) {
  const speed = frame < DROP ? 90 : 36;
  return (
    <svg width={W} height={H} style={{ position: 'absolute', left: 0, top: 0 }}>
      {Array.from({ length: 16 }, (_, i) => {
        const seed = (i * 7919) % 997;
        const y0 = (seed / 997) * H * 1.4 - 200;
        const len = 160 + (seed % 5) * 90;
        const x = ((frame * speed * (0.6 + (seed % 7) / 10) + seed * 13) % (W + 1400)) - 700;
        return (
          <line key={i} x1={x} y1={y0} x2={x + len} y2={y0 - len * 0.25} stroke={i % 3 ? '#fff' : RED} strokeWidth={i % 4 ? 3 : 6} opacity={i % 3 ? 0.12 : 0.35} strokeLinecap="round" />
        );
      })}
    </svg>
  );
}

/** Sparks drifting up through the ring light. */
function Embers({ frame }: { frame: number }) {
  return (
    <svg width={W} height={H} style={{ position: 'absolute', left: 0, top: 0 }}>
      {Array.from({ length: 34 }, (_, i) => {
        const s = (i * 4513) % 1000;
        const x = (s / 1000) * W + Math.sin((frame + s) / 40) * 30;
        const y = H - ((frame * (2 + (s % 5)) + s * 3) % (H + 200)) + 100;
        const r = 2 + (s % 4);
        return <circle key={i} cx={x} cy={y} r={r} fill={i % 2 ? RED : '#FF7A45'} opacity={0.35 + (s % 3) * 0.15} />;
      })}
    </svg>
  );
}

function Ground({ frame, bg = INK }: { frame: number; bg?: string }) {
  const y = 22 + 5 * Math.sin(frame / 50);
  return (
    <AbsoluteFill style={{ background: bg }}>
      {bg === INK ? <AbsoluteFill style={{ background: `radial-gradient(80% 45% at 70% ${y}%, rgba(232,32,42,0.6), rgba(232,32,42,0) 70%)` }} /> : null}
      <AbsoluteFill style={{ background: 'radial-gradient(130% 80% at 50% 50%, rgba(0,0,0,0) 55%, rgba(0,0,0,0.55) 100%)' }} />
    </AbsoluteFill>
  );
}

const CUTS = [0, 15, 30, 45, 60, 75, 90, 105, 120, DROP, 420, 630, 690, 750, 810];
function Flash({ frame }: { frame: number }) {
  const c = [...CUTS].reverse().find((x) => frame >= x);
  if (c === undefined) return null;
  const o = 0.75 * Math.exp(-(frame - c) / 3);
  return o > 0.02 ? <AbsoluteFill style={{ background: '#fff', opacity: o, mixBlendMode: 'screen' }} /> : null;
}

/* ---------- 0..3 s: the hype ---------- */

const HYPE: [number, string, 'black' | 'red' | 'white'][] = [
  [0, 'Every', 'black'], [15, 'jab.', 'red'], [30, 'Every', 'white'], [45, 'hook.', 'black'],
  [60, 'Every', 'red'], [75, 'round.', 'white'], [90, 'Every', 'black'], [105, 'punch.', 'red'],
];

function Hype({ frame }: { frame: number }) {
  if (frame >= 120) {
    // "COUNTED." holds the frame, then the camera dives through it into the drop.
    const dive = tween(frame, 156, 24, exit);
    return (
      <AbsoluteFill>
        <Ground frame={frame} />
        <Shockwave frame={frame} at={120} x={540} y={900} />
        <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center', transform: `scale(${1 + dive * 5}) rotate(${-6 + dive * 10}deg)`, opacity: 1 - dive * 0.6 }}>
          <div style={{ ...caps(34), marginBottom: 20 }}>{scramble('Introducing FightFlow', frame, 122, 18)}</div>
          <Slam frame={frame} at={120} style={poster(270, RED)}>Counted.</Slam>
        </AbsoluteFill>
      </AbsoluteFill>
    );
  }
  const shot = [...HYPE].reverse().find(([at]) => frame >= at)!;
  const [at, word, look] = shot;
  const i = HYPE.indexOf(shot);
  const k = (frame - at) / 15;
  const bg = look === 'red' ? RED : look === 'white' ? '#fff' : INK;
  const fg = look === 'red' ? INK : look === 'white' ? RED : '#fff';
  const tilt = i % 2 ? 7 : -7;
  const zoom = lerp(1.35, 1.05, fluid(Math.min(1, k * 1.4)));
  return (
    <AbsoluteFill>
      <Ground frame={frame} bg={bg} />
      {look === 'black' ? <SpeedLines frame={frame} /> : null}
      <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center', transform: `rotate(${tilt}deg) scale(${zoom}) translateX(${lerp(40, -40, k) * (i % 2 ? 1 : -1)}px)` }}>
        {[-2, -1, 1, 2].map((e) => (
          <div key={e} style={{ position: 'absolute', marginTop: e * 640, ...poster(word === 'Every' ? 330 : 360, 'transparent'), WebkitTextStroke: `3px ${fg}`, opacity: 0.32 / Math.abs(e) }}>{word}</div>
        ))}
        <div style={{ ...poster(word === 'Every' ? 330 : 360, fg) }}>{word}</div>
      </AbsoluteFill>
      <div style={{ position: 'absolute', left: 70, top: 230, ...caps(30, look === 'red' ? INK : RED) }}>FightFlow</div>
      <div style={{ position: 'absolute', right: 70, top: 230, ...caps(30, look === 'red' ? INK : RED) }}>{String(i + 1).padStart(2, '0')} / 08</div>
    </AbsoluteFill>
  );
}

/* ---------- 3..7 s: Shadow Cam ---------- */

const HITS: Hit[] = [
  [195, 'jab'], [210, 'jab'], [225, 'cross'], [255, 'hook'], [270, 'uppercut'], [300, 'slip'], [330, 'jab'], [345, 'cross'], [360, 'hook'], [375, 'uppercut'],
];

function ShadowCam({ frame }: { frame: number }) {
  const thrown = HITS.filter(([p, m]) => m !== 'slip' && frame >= p);
  const last = thrown.length ? thrown[thrown.length - 1][0] : 0;
  const pop = thrown.length ? spring(frame, last, 1.25, 1, 0.22) : 1;
  const punchIn = thrown.length ? 1 + 0.05 * Math.exp(-(frame - last) / 8) : 1;
  return (
    <AbsoluteFill>
      <Ground frame={frame} />
      <SpeedLines frame={frame} />
      <div style={{ position: 'absolute', left: 70, top: 220, width: 940 }}>
        <div style={{ ...caps(32), height: 46 }}>{scramble('Shadow Cam', frame, 182, 16)}</div>
        <Slam frame={frame} at={184} style={{ ...poster(168), marginTop: 10 }}>Your camera</Slam>
        <Slam frame={frame} at={192} style={poster(168, RED)}>keeps score.</Slam>
      </div>
      <div style={{ position: 'absolute', left: 165, top: 700, transform: `scale(${1.25 * punchIn})`, transformOrigin: '0 0' }}>
        <Fighter frame={frame} events={HITS} />
        <PunchTags frame={frame} events={HITS} size={60} />
      </div>
      <div style={{ position: 'absolute', left: 70, top: 560, display: 'flex', alignItems: 'flex-end', gap: 20 }}>
        <div style={{ ...poster(130), transform: `scale(${pop})`, transformOrigin: '0% 100%' }}>{String(thrown.length).padStart(2, '0')}</div>
        <div style={{ paddingBottom: 16 }}>
          <div style={caps(30, '#fff')}>Punches</div>
          <div style={caps(24, '#8C8C8C')}>Counted on-device</div>
        </div>
      </div>
      <div style={{ position: 'absolute', right: 70, top: 600, display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ width: 18, height: 18, borderRadius: 9, background: RED, opacity: Math.floor(frame / 15) % 2 ? 1 : 0.25 }} />
        <div style={caps(24, '#fff')}>Rec</div>
      </div>
      {HITS.filter(([, m]) => m !== 'slip').map(([p, m]) => {
        const o = 0.35 * Math.exp(-(frame - p) / 4);
        return frame >= p && o > 0.02 ? <AbsoluteFill key={p} style={{ background: PUNCH_COLOR[m], opacity: o * 0.5, mixBlendMode: 'screen' }} /> : null;
      })}
    </AbsoluteFill>
  );
}

/* ---------- 7..10.5 s: the phone ---------- */

function Tag({ frame, at, out, x, y, tilt, value, label }: { frame: number; at: number; out: number; x: number; y: number; tilt: number; value: ReactNode; label: string }) {
  if (frame < at || frame > out + 12) return null;
  const s = spring(frame, at, 0.4, 1, 0.26);
  const r = spring(frame, at, tilt * 3, tilt, 0.3);
  const o = 1 - tween(frame, out, 12, exit);
  return (
    <div style={{ position: 'absolute', left: x, top: y, opacity: o, transform: `rotate(${r}deg) scale(${s})`, transformOrigin: '50% 50%' }}>
      <div style={{ background: RED, padding: '14px 34px 6px', clipPath: 'polygon(5% 0, 100% 0, 95% 100%, 0 100%)', boxShadow: '0 20px 40px rgba(0,0,0,0.5)' }}>
        <div style={poster(110)}>{value}</div>
      </div>
      <div style={{ ...caps(26, '#fff'), marginTop: 10, marginLeft: 10 }}>{label}</div>
    </div>
  );
}

function Phone({ frame }: { frame: number }) {
  const y = spring(frame, 408, 1400, 0, 0.5);
  const ry = Math.sin((frame - 408) / 34) * 16;
  const rx = spring(frame, 408, 40, 6, 0.5);
  const scroll = tween(frame, 512, D.slow, fluid);
  const dive = tween(frame, 612, 18, exit);
  const PW = 560;
  const PH = (PW * 1688) / 780;
  return (
    <AbsoluteFill>
      <Ground frame={frame} />
      {[0, 1, 2, 3].map((row) => (
        <div key={row} style={{ position: 'absolute', top: 560 + row * 330, left: ((frame * (row % 2 ? 4 : -4)) % 1400) - 400, ...poster(300, 'transparent'), WebkitTextStroke: '2px rgba(255,255,255,0.08)' }}>
          Every round · every round
        </div>
      ))}
      <div style={{ position: 'absolute', left: 70, top: 220, opacity: 1 - dive }}>
        <div style={{ ...caps(32), height: 46 }}>{scramble('Your numbers', frame, 410, 16)}</div>
        <Slam frame={frame} at={412} style={{ ...poster(190), marginTop: 10 }}>See the</Slam>
        <Slam frame={frame} at={420} style={poster(190, RED)}>work.</Slam>
      </div>
      <div style={{ position: 'absolute', left: (W - PW) / 2 - 12, top: 640, perspective: 2400 }}>
        <div
          style={{
            padding: 12,
            borderRadius: 78,
            background: '#000',
            boxShadow: '0 60px 120px rgba(0,0,0,0.85), 0 0 0 2px #2c2c2c, 0 0 160px rgba(232,32,42,0.35)',
            transform: `translateY(${y}px) rotateX(${rx}deg) rotateY(${ry}deg) scale(${1 + dive * 3.2})`,
            transformOrigin: '50% 30%',
          }}
        >
          <div style={{ width: PW, height: PH * 0.86, borderRadius: 66, overflow: 'hidden' }}>
            <div style={{ transform: `translateY(${-scroll * PH}px)` }}>
              <Img src={staticFile('home.png')} style={{ width: PW, height: PH, display: 'block' }} />
              <Img src={staticFile('strikes.png')} style={{ width: PW, height: PH, display: 'block' }} />
            </div>
          </div>
        </div>
      </div>
      <Tag frame={frame} at={450} out={505} x={560} y={760} tilt={6} value="4 days" label="FightStreak" />
      <Tag frame={frame} at={475} out={505} x={60} y={1150} tilt={-5} value={count(frame, 475, 18, 20)} label="Rounds this week" />
      <Tag frame={frame} at={532} out={606} x={540} y={820} tilt={-6} value={count(frame, 532, 1094, 24).toLocaleString('en-US')} label="Punches thrown" />
      <Tag frame={frame} at={562} out={606} x={70} y={1190} tilt={5} value={`${count(frame, 562, 55, 20)}%`} label="Landed" />
    </AbsoluteFill>
  );
}

/* ---------- 10.5..13.5 s: features ---------- */

function Head({ frame, at, kicker, a, b }: { frame: number; at: number; kicker: string; a: string; b: string }) {
  return (
    <div style={{ position: 'absolute', left: 70, top: 220 }}>
      <div style={{ ...caps(32), height: 46 }}>{scramble(kicker, frame, at, 14)}</div>
      <Slam frame={frame} at={at + 2} style={{ ...poster(200), marginTop: 10 }}>{a}</Slam>
      <Slam frame={frame} at={at + 8} style={poster(200, RED)}>{b}</Slam>
    </div>
  );
}

function Timer({ frame }: { frame: number }) {
  const secs = Math.max(10, 180 - Math.max(0, frame - 636) * 3.4);
  const s = Math.round(secs);
  const warn = s <= 10;
  const rounds = Math.min(6, Math.floor(Math.max(0, frame - 636) / 7));
  const zoom = lerp(1.15, 1, tween(frame, 630, 60, fluid));
  return (
    <AbsoluteFill>
      <Ground frame={frame} bg={warn ? '#1a0304' : INK} />
      <SpeedLines frame={frame} />
      <Head frame={frame} at={630} kicker="Round timer" a="Bell" b="to bell." />
      <div style={{ position: 'absolute', left: 0, right: 0, top: 820, display: 'flex', flexDirection: 'column', alignItems: 'center', transform: `scale(${zoom})` }}>
        <div style={caps(32, warn ? RED : '#fff')}>{warn ? '10 seconds' : `Round ${Math.min(6, rounds + 1)} of 6`}</div>
        <div style={{ ...poster(380, warn ? RED : '#fff'), marginTop: 10 }}>
          {Math.floor(s / 60)}:{String(s % 60).padStart(2, '0')}
        </div>
        <div style={{ display: 'flex', gap: 14, marginTop: 30 }}>
          {Array.from({ length: 6 }, (_, i) => (
            <div key={i} style={{ width: 130, height: 28, background: i < rounds ? RED : '#1C1C1C', transform: 'skewX(-12deg)' }} />
          ))}
        </div>
      </div>
    </AbsoluteFill>
  );
}

function Roadmap({ frame }: { frame: number }) {
  return (
    <AbsoluteFill>
      <Ground frame={frame} />
      <Head frame={frame} at={680} kicker="Skill roadmap" a="36 skills." b="5 tiers." />
      <div style={{ position: 'absolute', left: 95, top: 760, display: 'grid', gridTemplateColumns: 'repeat(6, 128px)', gap: 18, transform: `rotate(-4deg) scale(${lerp(1.1, 1, tween(frame, 680, 70, fluid))})` }}>
        {Array.from({ length: 36 }, (_, i) => {
          const at = 686 + i * 1.1;
          const on = frame >= at;
          const s = on ? spring(frame, at, 0.5, 1, 0.22) : 1;
          return (
            <div key={i} style={{ width: 128, height: 128, border: '4px solid #2C2C2C', background: on ? RED : 'transparent', transform: `skewX(-8deg) scale(${s})`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {on ? <svg width={56} height={56} viewBox="0 0 24 24"><path d="M4 12.5l5 5L20 6.5" fill="none" stroke="#fff" strokeWidth={3.4} strokeLinecap="round" strokeLinejoin="round" /></svg> : null}
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
}

function Technique({ frame }: { frame: number }) {
  const turn = Math.sin(((frame - 740) / 70) * Math.PI) * 26;
  const crop = { x: 36, y: 214, w: 708, h: 680 };
  const S = 1.3;
  const zoom = lerp(1.12, 1, tween(frame, 740, 70, fluid));
  return (
    <AbsoluteFill>
      <Ground frame={frame} />
      <SpeedLines frame={frame} />
      <Head frame={frame} at={740} kicker="Technique library" a="25 moves." b="In 3D." />
      <div style={{ position: 'absolute', left: (W - crop.w * S) / 2, top: 700, perspective: 1800, transform: `scale(${zoom})` }}>
        <div style={{ width: crop.w * S, height: crop.h * S, overflow: 'hidden', borderRadius: 40, transform: `rotateY(${turn}deg)`, boxShadow: '0 60px 120px rgba(0,0,0,0.75), 0 0 0 2px #2c2c2c' }}>
          <Img src={staticFile('technique.png')} style={{ width: 780 * S, height: 1688 * S, marginLeft: -crop.x * S, marginTop: -crop.y * S, display: 'block' }} />
        </div>
        <svg width={crop.w * S + 120} height={240} style={{ position: 'absolute', left: -60, top: crop.h * S - 170, overflow: 'visible' }}>
          <ellipse cx={(crop.w * S + 120) / 2} cy={120} rx={(crop.w * S + 80) / 2} ry={80} fill="none" stroke={RED} strokeWidth={5} strokeDasharray="50 26" strokeDashoffset={-(frame - 740) * 8} />
        </svg>
      </div>
    </AbsoluteFill>
  );
}

/* ---------- 13.5..15 s: end card ---------- */

function EndCard({ frame }: { frame: number }) {
  const slab = frame >= 846 ? spring(frame, 846, 0, 1, 0.3) : 0;
  const drift = lerp(1.08, 1, tween(frame, 800, 100, fluid));
  const arrow = Math.sin(((frame - 860) / 30) * Math.PI) * 10;
  return (
    <AbsoluteFill>
      <Ground frame={frame} />
      <Embers frame={frame} />
      <Shockwave frame={frame} at={868} x={540} y={900} color="#fff" />
      <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center', transform: `scale(${drift}) rotate(-4deg)` }}>
        <div style={{ ...caps(32), height: 46 }}>{scramble('Boxing training tracker', frame, 800, 18)}</div>
        <Slam frame={frame} at={804} style={{ ...poster(360), marginTop: 10 }}>Fight</Slam>
        <Slam frame={frame} at={812} style={poster(360, RED)}>Flow</Slam>
        <Rise frame={frame} at={826} dist={18} dur={D.default}>
          <div style={{ ...body(44, '#fff'), marginTop: 30 }}>Train like it's fight night.</div>
        </Rise>
        <div style={{ marginTop: 50, transform: `scaleX(${slab})` }}>
          <div style={{ background: RED, padding: '0 60px', height: 104, display: 'flex', alignItems: 'center', clipPath: 'polygon(5% 0, 100% 0, 95% 100%, 0 100%)' }}>
            <div style={poster(66)}>Live now · link in bio</div>
          </div>
        </div>
        <div style={{ marginTop: 34, opacity: tween(frame, 860, D.default, fluid), transform: `translateY(${arrow}px)` }}>
          <svg width={60} height={60} viewBox="0 0 24 24"><path d="M12 4v15M5 12l7 7 7-7" fill="none" stroke="#fff" strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round" /></svg>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
}

/* ---------- Timeline ---------- */

/** The scene that owns frame `pick`, rendered at frame `f` (so an incoming shot is already moving). */
function sceneAt(pick: number, f = pick): ReactNode {
  if (pick < DROP) return <Hype frame={f} />;
  if (pick < 420) return <ShadowCam frame={f} />;
  if (pick < 630) return <Phone frame={f} />;
  if (pick < 690) return <Timer frame={f} />;
  if (pick < 750) return <Roadmap frame={f} />;
  if (pick < 810) return <Technique frame={f} />;
  return <EndCard frame={f} />;
}

/** Angle cut: the next shot slices in along a diagonal behind a red edge. */
const SLASHES = [420, 690, 750, 810];
function SlashCut({ frame }: { frame: number }) {
  const at = SLASHES.find((c) => frame >= c - 12 && frame < c + 6);
  if (at === undefined) return null;
  const k = enter((frame - (at - 12)) / 18);
  const X = lerp(-700, W + 700, k);
  const angle = (Math.atan(700 / H) * 180) / Math.PI;
  return (
    <>
      <AbsoluteFill style={{ clipPath: `polygon(0 0, ${X}px 0, ${X - 700}px ${H}px, 0 ${H}px)` }}>{sceneAt(at, frame)}</AbsoluteFill>
      <div style={{ position: 'absolute', left: X - 350 - 30, top: -200, width: 60, height: H + 400, background: RED, transform: `rotate(${angle}deg)`, boxShadow: '0 0 60px rgba(232,32,42,0.9)' }} />
      <div style={{ position: 'absolute', left: X - 350 + 40, top: -200, width: 14, height: H + 400, background: '#fff', transform: `rotate(${angle}deg)` }} />
    </>
  );
}

const GLITCH_AT: [number, number][] = [[DROP, 1], [630, 1], [120, 0.6]];
const glitch = (f: number) => GLITCH_AT.reduce((a, [c, s]) => a + s * Math.max(0, 1 - Math.abs(f - c) / 8) ** 2, 0);

export function Vertical() {
  useFonts();
  const frame = useCurrentFrame();
  const cam = useCamera(frame);
  const g = glitch(frame);
  return (
    <AbsoluteFill style={{ background: INK, overflow: 'hidden' }}>
      <Audio src={staticFile('mix-vertical.wav')} />
      <GlitchFilter amount={g} frame={frame} />
      <AbsoluteFill style={{ filter: g > 0.02 ? 'url(#rgb)' : undefined }}>
        <AbsoluteFill style={{ ...cam, transformOrigin: '50% 45%' }}>
          {sceneAt(frame)}
          <SlashCut frame={frame} />
          {frame >= DROP && frame < 810 ? <Embers frame={frame} /> : null}
        </AbsoluteFill>
      </AbsoluteFill>
      <Flash frame={frame} />
    </AbsoluteFill>
  );
}
