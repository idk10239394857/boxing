/** Browser harness: run MediaPipe over every frame of a video and return the landmark stream. */
import { FilesetResolver, PoseLandmarker } from '@mediapipe/tasks-vision';

declare global {
  interface Window {
    extractLandmarks: (videoUrl: string, model: 'lite' | 'full', fps: number) => Promise<string>;
  }
}

/** Load as a blob: simple test servers don't support range requests, which breaks seeking. */
const asBlobUrl = async (url: string) => URL.createObjectURL(await (await fetch(url)).blob());

window.extractLandmarks = async (videoUrl, model, fps) => {
  videoUrl = await asBlobUrl(videoUrl);
  const fileset = await FilesetResolver.forVisionTasks('/mediapipe/wasm');
  const lm = await PoseLandmarker.createFromOptions(fileset, {
    baseOptions: { modelAssetPath: `/mediapipe/pose_landmarker_${model}.task`, delegate: 'CPU' },
    runningMode: 'VIDEO',
    numPoses: 1,
  });
  const video = document.createElement('video');
  video.muted = true;
  video.src = videoUrl;
  document.body.appendChild(video);
  await new Promise((r) => (video.onloadeddata = r));

  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d')!;
  const frames: { t: number; world: number[][] | null; image: number[][] | null }[] = [];
  let lastPos = -1, stuck = 0;
  for (let t = 0; ; t += 1 / fps) {
    await new Promise<void>((r) => {
      video.onseeked = () => r();
      video.currentTime = t;
    });
    for (let retry = 0; retry < 8 && video.currentTime < t - 0.5; retry++) {
      await new Promise((r) => setTimeout(r, 150));
      await new Promise<void>((r) => {
        video.onseeked = () => r();
        video.currentTime = t;
      });
    }
    if (video.currentTime < t - 0.5) break;
    if (video.currentTime === lastPos && ++stuck >= 3) break;
    if (video.currentTime !== lastPos) stuck = 0;
    lastPos = video.currentTime;
    // Feed a canvas copy: a paused, seeked <video> can hand MediaPipe a stale texture.
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0);
    const res = lm.detectForVideo(canvas, frames.length * 33 + 1);
    const pack = (l?: { x: number; y: number; z: number; visibility?: number }[]) =>
      l ? l.map((p) => [+p.x.toFixed(4), +p.y.toFixed(4), +p.z.toFixed(4), +(p.visibility ?? 1).toFixed(2)]) : null;
    frames.push({ t: t * 1000, world: pack(res.worldLandmarks[0]), image: pack(res.landmarks[0]) });
    res.close();
  }
  return JSON.stringify(frames);
};

declare global {
  interface Window {
    probeImage: (videoUrl: string, times: number[]) => Promise<string>;
  }
}
/** Single-image mode (no tracking) at given times: isolates perception from tracking. */
window.probeImage = async (videoUrl, times) => {
  const fileset = await FilesetResolver.forVisionTasks('/mediapipe/wasm');
  const lm = await PoseLandmarker.createFromOptions(fileset, {
    baseOptions: { modelAssetPath: '/mediapipe/pose_landmarker_full.task', delegate: 'CPU' },
    runningMode: 'IMAGE',
    numPoses: 1,
  });
  const video = document.createElement('video');
  video.muted = true;
  video.src = videoUrl;
  await new Promise((r) => (video.onloadeddata = r));
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d')!;
  const out: string[] = [];
  for (const t of times) {
    await new Promise<void>((r) => { video.onseeked = () => r(); video.currentTime = t; });
    canvas.width = video.videoWidth; canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0);
    const px = ctx.getImageData(480, 200, 1, 1).data.join(',');
    const res = lm.detect(canvas);
    const p = res.landmarks[0];
    out.push(`t=${t} px@480,200=${px} ` + (p ? [0, 13, 15, 16].map((i) => `${i}:${p[i].x.toFixed(3)},${p[i].y.toFixed(3)}`).join(' ') : 'none'));
  }
  return out.join('\n');
};

declare global {
  interface Window {
    probeVideo: (videoUrl: string, from: number, to: number, stepMs: number) => Promise<string>;
  }
}
/** VIDEO mode over a time range with a chosen timestamp spacing. */
window.probeVideo = async (videoUrl, from, to, stepMs) => {
  const fileset = await FilesetResolver.forVisionTasks('/mediapipe/wasm');
  const lm = await PoseLandmarker.createFromOptions(fileset, {
    baseOptions: { modelAssetPath: '/mediapipe/pose_landmarker_full.task', delegate: 'CPU' },
    runningMode: 'VIDEO',
    numPoses: 1,
  });
  const video = document.createElement('video');
  video.muted = true;
  video.src = videoUrl;
  await new Promise((r) => (video.onloadeddata = r));
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d')!;
  const out: string[] = [];
  let i = 0;
  for (let t = from; t <= to; t += 1 / 30, i++) {
    await new Promise<void>((r) => { video.onseeked = () => r(); video.currentTime = t; });
    canvas.width = video.videoWidth; canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0);
    const res = lm.detectForVideo(canvas, 1 + i * stepMs);
    const p = res.landmarks[0];
    if (i % 2 === 0) out.push(`${t.toFixed(2)} lw ${p ? p[15].x.toFixed(3) : '-'} nose.y ${p ? p[0].y.toFixed(3) : '-'}`);
  }
  return out.join(' | ');
};
