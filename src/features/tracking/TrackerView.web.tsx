import type { NormalizedLandmark } from '@mediapipe/tasks-vision';
import { useEffect, useRef } from 'react';
import { View } from 'react-native';
import { colors } from '../../theme';
import { StrikeDetector } from './detector';
import { FighterIdentity } from './identity';
import { KEY_LANDMARKS, POSE_LINKS } from './landmarks';
import { defaultModelSize, landmarkerDelegate, loadPoseLandmarker, type ModelSize } from './poseEngine.web';
import type { BodyQuality, TrackerViewProps } from './types';

const LEFT_ARM = new Set(['11-13', '13-15']);
/** Frames analysed per second of uploaded video. */
const ANALYSIS_FPS = 30;
/**
 * Longest side of the frame handed to MediaPipe. It resizes to 256 px internally anyway; on the
 * CPU a smaller copy is much cheaper to convert, while the GPU takes the camera's texture as is.
 */
const MAX_INPUT = { GPU: 1280, CPU: 640 } as const;
/** Live camera on the full model: drop to lite if inference averages slower than this (ms). */
const SLOW_FRAME_MS = 50;

const RIGHT_ARM = new Set(['12-14', '14-16']);
/** Corner colours for each tracked fighter. */
/** Skeleton overlay palette, fixed independently of the app theme. */
const SKELETON = { red: '#E10600', blue: '#2F7BFF', gold: '#D4A017', text: '#F4F4F5' };
export const FIGHTER_COLORS = [SKELETON.red, SKELETON.blue];

/** Explain a camera failure in terms of what the viewer can do about it. */
function cameraMessage(err: Error & { name?: string }): { message: string; blocked: boolean } {
  const embedded = typeof window !== 'undefined' && window.top !== window.self;
  if (err.name === 'NotAllowedError' || err.name === 'SecurityError') {
    return {
      blocked: true,
      message: embedded
        ? 'This preview window isn\'t allowed to use the camera. Open FightFlow in its own browser tab (the hosted app link) and allow the camera there.'
        : 'Camera permission was denied. Tap the camera or lock icon in the address bar → Allow camera, then try again. On iPhone: Settings → Safari → Camera → Allow.',
    };
  }
  if (err.name === 'NotFoundError' || err.name === 'OverconstrainedError') return { blocked: true, message: 'No camera found on this device.' };
  if (err.name === 'NotReadableError') return { blocked: true, message: 'The camera is busy in another app or tab. Close it there and try again.' };
  if (!window.isSecureContext) return { blocked: true, message: 'Browsers only allow the camera on https:// pages. Open the hosted (https) FightFlow link.' };
  return { blocked: false, message: `Camera failed: ${err.message}` };
}

/** Camera or video file → MediaPipe pose → StrikeDetector, with a skeleton overlay. */
export function TrackerView({ source, stances, paused, onEvent, onStatus, onQuality, onView, onFps, onProgress }: TrackerViewProps) {
  const host = useRef<HTMLElement | null>(null);
  const cb = useRef({ onEvent, onStatus, onQuality, onView, onFps, onProgress, paused, stances });
  cb.current = { onEvent, onStatus, onQuality, onView, onFps, onProgress, paused, stances };
  const fighters = stances.length;

  useEffect(() => {
    const el = host.current;
    if (!el) return;
    let disposed = false;
    let raf = 0;
    let vfc = 0;
    let stream: MediaStream | null = null;
    const mirror = source.kind === 'camera';
    const detectors = cb.current.stances.map((st) => new StrikeDetector(st));
    const identity = new FighterIdentity(mirror);

    const box = document.createElement('div');
    Object.assign(box.style, { position: 'relative', width: '100%', height: '100%', background: '#000', overflow: 'hidden', borderRadius: '16px' });
    const video = document.createElement('video');
    video.playsInline = true;
    video.muted = true;
    video.setAttribute('playsinline', '');
    const layer = { position: 'absolute', inset: '0', width: '100%', height: '100%', objectFit: 'contain', transform: mirror ? 'scaleX(-1)' : 'none' };
    Object.assign(video.style, layer);
    const canvas = document.createElement('canvas');
    Object.assign(canvas.style, layer);
    box.append(video, canvas);
    el.appendChild(box);
    const ctx = canvas.getContext('2d')!;

    const flash = detectors.map(() => ({ l: 0, r: 0 }));
    let facing = false;
    let lastQuality: BodyQuality | null = null;
    let frames = 0, fpsT = performance.now(), lastTs = 0;

    const draw = (people: { lms: NormalizedLandmark[]; fighter: number }[], now: number) => {
      const w = video.videoWidth, h = video.videoHeight;
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
      }
      ctx.clearRect(0, 0, w, h);
      for (const { lms, fighter } of people) drawPerson(lms, fighter, now, w, h);
    };
    const drawPerson = (lms: NormalizedLandmark[], fighter: number, now: number, w: number, h: number) => {
      const s = Math.max(w, h) / 640;
      const corner = FIGHTER_COLORS[fighter] ?? SKELETON.red;
      for (const [a, b] of POSE_LINKS) {
        const A = lms[a], B = lms[b];
        if ((A.visibility ?? 1) < 0.4 || (B.visibility ?? 1) < 0.4) continue;
        const key = `${a}-${b}`;
        const side = LEFT_ARM.has(key) ? 'l' : RIGHT_ARM.has(key) ? 'r' : null;
        const hot = side && now - flash[fighter][side] < 300;
        ctx.strokeStyle = hot ? SKELETON.gold : side ? corner : 'rgba(244,244,245,0.75)';
        ctx.lineWidth = (hot ? 9 : side ? 5 : 3) * s;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(A.x * w, A.y * h);
        ctx.lineTo(B.x * w, B.y * h);
        ctx.stroke();
      }
      for (const i of [0, 11, 12, 13, 14, 15, 16, 23, 24, 25, 26, 27, 28]) {
        const p = lms[i];
        if ((p.visibility ?? 1) < 0.4) continue;
        ctx.fillStyle = i === 15 || i === 16 ? corner : SKELETON.text;
        ctx.beginPath();
        ctx.arc(p.x * w, p.y * h, (i === 15 || i === 16 ? 9 : 5) * s, 0, Math.PI * 2);
        ctx.fill();
      }
    };

    const loop = async () => {
      cb.current.onStatus({ phase: 'loading', message: 'Loading pose model…' });
      let landmarker: Awaited<ReturnType<typeof loadPoseLandmarker>>;
      let size: ModelSize = defaultModelSize();
      try {
        landmarker = await loadPoseLandmarker(size, fighters);
      } catch (e) {
        cb.current.onStatus({ phase: 'error', message: `Couldn't load the pose model (${(e as Error).message}). Check your connection and try again.` });
        return;
      }
      if (disposed) return;

      try {
        if (source.kind === 'camera') {
          cb.current.onStatus({ phase: 'loading', message: 'Waiting for camera…' });
          if (!navigator.mediaDevices?.getUserMedia) throw new Error('This browser has no camera access.');
          stream = await navigator.mediaDevices.getUserMedia({
            // A higher camera frame rate means a fresher frame whenever inference is ready for one.
            video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 }, frameRate: { ideal: size === 'full' ? 60 : 30 } },
            audio: false,
          });
          video.srcObject = stream;
        } else {
          video.src = source.url;
          video.playbackRate = 1;
        }
        await new Promise<void>((resolve, reject) => {
          video.onloadeddata = () => resolve();
          video.onerror = () => reject(new Error('This video format is not supported.'));
        });
        await video.play();
      } catch (e) {
        const err = e as Error & { name?: string };
        if (source.kind === 'camera') {
          const { message, blocked } = cameraMessage(err);
          cb.current.onStatus({ phase: 'error', cameraBlocked: blocked, message });
        } else cb.current.onStatus({ phase: 'error', message: err.message });
        return;
      }
      if (disposed) return;
      cb.current.onStatus({ phase: 'running' });

      // A paused, seeked <video> can hand MediaPipe a stale texture, so videos go through a canvas
      // copy; so does a camera frame too big for the delegate (downsized on the way).
      const frame = document.createElement('canvas');
      const frameCtx = frame.getContext('2d')!;
      const inputFor = (): HTMLVideoElement | HTMLCanvasElement => {
        const vw = video.videoWidth, vh = video.videoHeight;
        const scale = Math.min(1, MAX_INPUT[landmarkerDelegate(landmarker)] / Math.max(vw, vh, 1));
        if (source.kind === 'camera' && scale === 1) return video;
        const w = Math.max(1, Math.round(vw * scale)), h = Math.max(1, Math.round(vh * scale));
        if (frame.width !== w) frame.width = w;
        if (frame.height !== h) frame.height = h;
        frameCtx.drawImage(video, 0, 0, w, h);
        return frame;
      };

      // Swap in another landmarker (GPU failed mid-session, or the full model is too slow here)
      // without stalling the loop: frames are skipped until it's ready.
      let swapping = false, failed = false;
      const stop = (message: string) => {
        failed = true;
        cb.current.onStatus({ phase: 'error', message: `Pose tracking stopped (${message}).` });
      };
      const swap = (next: ModelSize, delegate?: 'CPU') => {
        if (swapping) return;
        swapping = true;
        loadPoseLandmarker(next, fighters, delegate)
          .then((lm) => {
            landmarker = lm;
            size = next;
            inferMs = 0;
            inferN = 0;
          })
          .catch((e: Error) => stop(e.message))
          .finally(() => (swapping = false));
      };
      let inferMs = 0, inferN = 0;

      const analyse = (mediaT: number, frameT = performance.now()) => {
        if (swapping || failed) return;
        // MediaPipe needs strictly increasing timestamps; the detector gets real media time.
        const ts = Math.max(frameT, lastTs + 1);
        lastTs = ts;
        const t0 = performance.now();
        let res: ReturnType<typeof landmarker.detectForVideo>;
        try {
          res = landmarker.detectForVideo(inputFor(), ts);
        } catch (e) {
          // A lost WebGL context or a GPU the delegate can't drive: carry on on the CPU.
          if (landmarkerDelegate(landmarker) === 'GPU' && !window.__FF_MEDIAPIPE_DELEGATE__) swap(size, 'CPU');
          else stop((e as Error).message);
          return;
        }
        const now = performance.now();
        // Live camera: if the full model can't keep up here, the lite one tracks more frames.
        inferMs = inferN ? inferMs * 0.95 + (now - t0) * 0.05 : now - t0;
        if (++inferN > 60 && source.kind === 'camera' && size === 'full' && inferMs > SLOW_FRAME_MS && !window.__FF_MEDIAPIPE_MODEL_SIZE__) {
          swap('lite', landmarkerDelegate(landmarker) === 'CPU' ? 'CPU' : undefined);
        }
        const aspect = video.videoWidth / (video.videoHeight || 1);
        // Solo: the one pose is the fighter. Sparring: keep each corner's identity stable.
        const slots = fighters === 1 ? res.landmarks.map((_, i) => (i === 0 ? 0 : -1)) : identity.assign(mediaT, res.landmarks);
        const people: { lms: NormalizedLandmark[]; fighter: number }[] = [];
        res.landmarks.forEach((lms, i) => slots[i] >= 0 && people.push({ lms, fighter: slots[i] }));
        draw(people, now);

        // Quality: every expected fighter fully visible.
        let quality: BodyQuality = people.length ? 'good' : 'none';
        for (const { lms } of people) {
          const vis = KEY_LANDMARKS.map((i) => lms[i].visibility ?? 1);
          const inFrame = KEY_LANDMARKS.every((i) => lms[i].x > -0.02 && lms[i].x < 1.02 && lms[i].y > -0.02 && lms[i].y < 1.02);
          if (!(Math.min(...vis) > 0.5 && inFrame)) quality = 'partial';
        }
        if (people.length && people.length < fighters) quality = 'partial';
        if (quality !== lastQuality) {
          lastQuality = quality;
          cb.current.onQuality(quality);
        }

        res.landmarks.forEach((image, i) => {
          const f = slots[i];
          if (f < 0) return;
          const stance = cb.current.stances[f] ?? 'orthodox';
          detectors[f].setStance(stance);
          for (const ev of detectors[f].push(mediaT, image, aspect, res.worldLandmarks[i])) {
            if (ev.kind === 'strike') {
              const left = (ev.hand === 'lead') === (stance === 'orthodox');
              flash[f][left ? 'l' : 'r'] = now;
            }
            cb.current.onEvent(ev, f);
          }
        });
        if (detectors.length === 1 && detectors[0].facingCamera !== facing) {
          facing = detectors[0].facingCamera;
          cb.current.onView?.(facing);
        }
        res.close();

        frames++;
        if (now - fpsT > 1000) {
          cb.current.onFps?.(Math.round((frames * 1000) / (now - fpsT)));
          frames = 0;
          fpsT = now;
        }
      };

      if (source.kind === 'camera') {
        // One analysis per new camera frame, never the same frame twice. Inference runs inline,
        // so when it's slower than the camera, frames are skipped (always the newest) rather than queued.
        let lastFrame = -1;
        const onFrame = (key: number, frameT: number) => {
          if (cb.current.paused || video.readyState < 2 || key === lastFrame) return;
          lastFrame = key;
          const now = performance.now();
          // Capture time keeps the detector's speeds true to the motion; fall back on odd clocks.
          const t = Math.abs(frameT - now) < 1000 ? frameT : now;
          analyse(t, t);
        };
        if (typeof video.requestVideoFrameCallback === 'function') {
          const step = (now: number, meta: VideoFrameCallbackMetadata) => {
            if (disposed) return;
            vfc = video.requestVideoFrameCallback(step);
            onFrame(meta.presentedFrames, meta.captureTime ?? now);
          };
          vfc = video.requestVideoFrameCallback(step);
        } else {
          const step = () => {
            if (disposed) return;
            raf = requestAnimationFrame(step);
            onFrame(video.currentTime, performance.now());
          };
          raf = requestAnimationFrame(step);
        }
        return;
      }

      // Videos: step through every frame (seek → analyse), so slow devices miss nothing.
      // Browser-recorded WebMs report an Infinity duration; jumping to the end to measure it
      // breaks frame-accurate seeking afterwards, so just step until the video stops advancing.
      video.pause();
      const duration = Number.isFinite(video.duration) ? video.duration : 0;
      const seek = (t: number) =>
        new Promise<void>((resolve) => {
          video.onseeked = () => resolve();
          video.currentTime = t;
        });
      let lastPos = -1, stuck = 0;
      for (let t = 0; !disposed; t += 1 / ANALYSIS_FPS) {
        if (duration && t > duration) break;
        while (cb.current.paused && !disposed) await new Promise((r) => setTimeout(r, 100));
        await seek(t);
        // Browser-recorded WebMs expose their length progressively: give loading a moment
        // before deciding we've hit the end.
        for (let retry = 0; retry < 8 && !disposed && video.currentTime < t - 0.5; retry++) {
          await new Promise((r) => setTimeout(r, 150));
          await seek(t);
        }
        if (disposed) return;
        if (video.currentTime < t - 0.5) break; // past the end
        if (video.currentTime === lastPos && ++stuck >= 3) break;
        if (video.currentTime !== lastPos) stuck = 0;
        lastPos = video.currentTime;
        while (swapping && !disposed) await new Promise((r) => setTimeout(r, 50));
        analyse(t * 1000);
        if (failed) return;
        cb.current.onProgress?.(t, duration);
      }
      if (!disposed) cb.current.onStatus({ phase: 'ended' });
    };
    void loop();

    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      if (vfc) video.cancelVideoFrameCallback?.(vfc);
      stream?.getTracks().forEach((t) => t.stop());
      video.pause();
      video.removeAttribute('src');
      video.srcObject = null;
      box.remove();
    };
  }, [source, fighters]);

  return <View ref={host as never} style={{ width: '100%', aspectRatio: 16 / 10, maxHeight: 520, backgroundColor: colors.sunken, borderRadius: 10 }} />;
}

/** Live camera tracking is available in browsers. */
export const TRACKING_SUPPORTED = true;
