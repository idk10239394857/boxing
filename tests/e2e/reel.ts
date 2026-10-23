/**
 * Browser harness: renders the 3D boxer performing a scripted reel and records it
 * to WebM, producing a test video for Shadow Cam with known ground truth.
 * Bundled with esbuild and driven by Playwright (see run-e2e.mjs).
 */
import { createBoxerScene } from '../../src/features/boxer/boxerScene';
import { solvePose } from '../../src/features/boxer/rig';
import { REEL, reelLength, reelPoseAt as poseAt, SQUARE_HIPS } from './reelScript';

declare global {
  interface Window {
    recordReel: (opts: {
      width: number; height: number; azimuth: number; colors?: Record<string, string>; bare?: boolean;
      /** Camera distance (m) and look-at height: ~1.7 m at chest height frames a laptop webcam's waist-up view. */
      distance?: number; targetY?: number; shirt?: string;
      /** Hips and chest squared up to the opponent (a fighter facing a laptop), not bladed. */
      square?: boolean;
    }) => Promise<string>;
    expected: string[];
  }
}

window.expected = REEL.flatMap(([, , e]) => e);
window.recordReel = async ({ width, height, azimuth, colors, bare, distance = 3.4, targetY, shirt, square }) => {
  const boxer = createBoxerScene({
    colors: { body: '#C68E6A', bg: '#2B2F36', floor: '#3A3A40', ...colors },
    trails: false,
    preserveDrawingBuffer: true,
    face: 'human',
    bareHands: !!bare,
    shirt,
    ...(targetY !== undefined ? { target: [0, targetY, 0.15] as [number, number, number] } : {}),
  });
  document.body.appendChild(boxer.renderer.domElement);
  boxer.resize(width, height);
  boxer.renderer.setPixelRatio(1);
  boxer.resize(width, height);
  boxer.aim(azimuth, 0.08, distance);

  const canvas = boxer.renderer.domElement;
  const stream = canvas.captureStream(30);
  const rec = new MediaRecorder(stream, { mimeType: 'video/webm;codecs=vp8', videoBitsPerSecond: 6_000_000 });
  const chunks: Blob[] = [];
  rec.ondataavailable = (e) => e.data.size && chunks.push(e.data);
  const done = new Promise<void>((r) => (rec.onstop = () => r()));

  const total = reelLength();
  const render = (t: number) => {
    const pose = poseAt(t);
    boxer.update(solvePose({ ...pose, hipYaw: pose.hipYaw + (square ? SQUARE_HIPS : 0), drop: pose.drop + 0.012 * Math.sin(t * 5) }));
    boxer.render();
  };
  render(0);
  rec.start(250);
  const start = performance.now();
  await new Promise<void>((resolve) => {
    const tick = () => {
      const t = (performance.now() - start) / 1000;
      render(Math.min(t, total));
      if (t >= total) return resolve();
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });
  rec.stop();
  await done;
  const buf = await new Blob(chunks, { type: 'video/webm' }).arrayBuffer();
  let bin = '';
  const bytes = new Uint8Array(buf);
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(bin);
};

// ── Frame-exact raw video (y4m) for Chromium's fake webcam ───────────────────────────
import { SPARRING_LENGTH, sparringPoseAt } from './reelScript';

declare global {
  interface Window {
    setupY4M: (opts: { width: number; height: number; azimuth: number; mode: 'solo' | 'sparring' }) => { frames: number; header: string };
    y4mFrames: (start: number, count: number) => string;
  }
}

let y4m: { draw: (i: number) => void; width: number; height: number; read: () => Uint8ClampedArray } | null = null;
const FPS = 30;

window.setupY4M = ({ width, height, azimuth, mode }) => {
  const sparring = mode === 'sparring';
  const boxer = createBoxerScene({
    colors: { body: '#C68E6A', bg: '#2B2F36', floor: '#3A3A40' },
    trails: false,
    preserveDrawingBuffer: true,
    face: 'human',
    figures: sparring ? [{ colors: { glove: '#E10600' } }, { colors: { glove: '#1E5BFF', shorts: '#E8E8EA', body: '#B98563' } }] : [{}],
    target: sparring ? [0, 1.0, 0] : undefined,
  });
  boxer.renderer.setPixelRatio(1);
  boxer.resize(width, height);
  boxer.aim(azimuth, 0.08, sparring ? 4.6 : 3.4);
  const copy = document.createElement('canvas');
  copy.width = width;
  copy.height = height;
  const ctx = copy.getContext('2d', { willReadFrequently: true })!;
  const total = sparring ? SPARRING_LENGTH : reelLength();
  y4m = {
    width,
    height,
    draw(i) {
      const t = i / FPS;
      if (sparring) {
        for (const f of [0, 1] as const) boxer.update(solvePose(sparringPoseAt(f, t)), f);
      } else {
        const pose = poseAt(t);
        boxer.update(solvePose({ ...pose, hipYaw: pose.hipYaw + (square ? SQUARE_HIPS : 0), drop: pose.drop + 0.012 * Math.sin(t * 5) }));
      }
      boxer.render();
      ctx.drawImage(boxer.renderer.domElement, 0, 0);
    },
    read: () => ctx.getImageData(0, 0, width, height).data,
  };
  return { frames: Math.ceil(total * FPS), header: `YUV4MPEG2 W${width} H${height} F${FPS}:1 Ip A1:1 C420jpeg\n` };
};

/** Render frames [start, start+count) and return them as base64 y4m FRAME records (I420). */
window.y4mFrames = (start, count) => {
  const { width: w, height: h } = y4m!;
  const frameSize = (w * h * 3) / 2;
  const tag = new TextEncoder().encode('FRAME\n');
  const out = new Uint8Array(count * (tag.length + frameSize));
  let o = 0;
  for (let i = start; i < start + count; i++) {
    y4m!.draw(i);
    const rgba = y4m!.read();
    out.set(tag, o);
    o += tag.length;
    const Y = o, U = o + w * h, V = U + (w * h) / 4;
    for (let y = 0; y < h; y++)
      for (let x = 0; x < w; x++) {
        const p = (y * w + x) * 4;
        const r = rgba[p], g = rgba[p + 1], b = rgba[p + 2];
        out[Y + y * w + x] = Math.min(255, Math.max(0, 0.299 * r + 0.587 * g + 0.114 * b));
        if (!(y & 1) && !(x & 1)) {
          const c = (y >> 1) * (w >> 1) + (x >> 1);
          out[U + c] = Math.min(255, Math.max(0, 128 - 0.168736 * r - 0.331264 * g + 0.5 * b));
          out[V + c] = Math.min(255, Math.max(0, 128 + 0.5 * r - 0.418688 * g - 0.081312 * b));
        }
      }
    o += frameSize;
  }
  let bin = '';
  for (let i = 0; i < out.length; i += 0x8000) bin += String.fromCharCode(...out.subarray(i, i + 0x8000));
  return btoa(bin);
};
