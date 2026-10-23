import { FilesetResolver, PoseLandmarker } from '@mediapipe/tasks-vision';

export const MEDIAPIPE_VERSION = '1.0.1';
export type ModelSize = 'lite' | 'full';
export type Delegate = 'GPU' | 'CPU';

declare global {
  interface Window {
    /** Self-hosted MediaPipe assets (wasm/ + pose_landmarker_*.task); defaults to public CDNs. */
    __FF_MEDIAPIPE_BASE__?: string;
    /** Models are hosted as base64 text (`pose_landmarker_<size>.task.b64.txt`) where binaries can't be served. */
    __FF_MEDIAPIPE_MODEL_B64__?: boolean;
    /** Force a MediaPipe delegate (tests on GPU-less machines use 'CPU'). */
    __FF_MEDIAPIPE_DELEGATE__?: Delegate;
    /** Force a model size instead of picking one from the device's capability. */
    __FF_MEDIAPIPE_MODEL_SIZE__?: ModelSize;
    /** Set when the page already inlines MediaPipe's wasm loader script (no script injection needed). */
    ModuleFactory?: unknown;
  }
}

const cdnModel = (size: ModelSize) =>
  `https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_${size}/float16/1/pose_landmarker_${size}.task`;

const cache = new Map<string, Promise<PoseLandmarker>>();
/** Which delegate each loaded landmarker actually runs on. */
const delegates = new WeakMap<PoseLandmarker, Delegate>();

async function fetchBase64(url: string): Promise<Uint8Array> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`model download failed (${res.status})`);
  const bin = atob((await res.text()).trim());
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

/**
 * Load (once) a MediaPipe pose landmarker; tries the GPU first, then falls back to CPU.
 * `delegate` pins one (e.g. CPU after the GPU failed mid-session); `__FF_MEDIAPIPE_DELEGATE__` wins over both.
 */
export function loadPoseLandmarker(size: ModelSize, numPoses = 1, delegate?: Delegate): Promise<PoseLandmarker> {
  const forced = typeof window !== 'undefined' ? window.__FF_MEDIAPIPE_DELEGATE__ : undefined;
  const want = forced ?? delegate;
  const key = `${size}-${numPoses}-${want ?? 'auto'}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const promise = (async () => {
    const base = window.__FF_MEDIAPIPE_BASE__;
    const wasm = base ? `${base}/wasm` : `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${MEDIAPIPE_VERSION}/wasm`;
    const model = base ? `${base}/pose_landmarker_${size}.task` : cdnModel(size);
    // If the page inlined the wasm loader, skip MediaPipe's <script> injection and only fetch the binary.
    const fileset = window.ModuleFactory
      ? { wasmLoaderPath: '', wasmBinaryPath: `${wasm}/vision_wasm_internal.wasm` }
      : await FilesetResolver.forVisionTasks(wasm);
    const modelAsset = window.__FF_MEDIAPIPE_MODEL_B64__
      ? { modelAssetBuffer: await fetchBase64(`${model}.b64.txt`) }
      : { modelAssetPath: model };
    const create = async (d: Delegate) => {
      const lm = await PoseLandmarker.createFromOptions(fileset, {
        baseOptions: { ...modelAsset, delegate: d },
        runningMode: 'VIDEO',
        numPoses,
        minPoseDetectionConfidence: 0.5,
        minPosePresenceConfidence: 0.5,
        minTrackingConfidence: 0.5,
      });
      delegates.set(lm, d);
      return lm;
    };
    if (want) return create(want);
    // No WebGL2, or only a software rasteriser (no real GPU): the CPU delegate is faster.
    const gpu = gpuInfo();
    if (!gpu.webgl2 || gpu.software) return create('CPU');
    try {
      return await create('GPU');
    } catch {
      return create('CPU');
    }
  })();
  cache.set(key, promise);
  promise.catch(() => cache.delete(key));
  return promise;
}

/** The delegate a landmarker from loadPoseLandmarker runs on. */
export const landmarkerDelegate = (lm: PoseLandmarker): Delegate => delegates.get(lm) ?? 'CPU';

let gpuCache: { webgl2: boolean; software: boolean } | null = null;
/** Whether WebGL2 works here, and whether it is a software rasteriser (no real GPU). */
function gpuInfo() {
  if (gpuCache) return gpuCache;
  let webgl2 = false, software = false;
  try {
    const gl = document.createElement('canvas').getContext('webgl2');
    if (gl) {
      webgl2 = true;
      const ext = gl.getExtension('WEBGL_debug_renderer_info');
      const renderer = String(gl.getParameter(ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER) ?? '');
      software = /swiftshader|llvmpipe|software|basic render/i.test(renderer);
      gl.getExtension('WEBGL_lose_context')?.loseContext();
    }
  } catch {
    // No canvas/WebGL (e.g. locked-down browser): treat as no GPU.
  }
  return (gpuCache = { webgl2, software });
}

/** True on phones and tablets (touch-first, mobile browsers). */
function isMobile(): boolean {
  const nav = navigator as Navigator & { userAgentData?: { mobile?: boolean } };
  if (nav.userAgentData?.mobile !== undefined) return nav.userAgentData.mobile;
  // iPadOS reports a desktop Mac user agent, but has touch.
  return /Android|iPhone|iPad|iPod|Mobile/i.test(nav.userAgent) || (/Macintosh/.test(nav.userAgent) && nav.maxTouchPoints > 1);
}

/**
 * The full model is noticeably more accurate but ~2–3× slower: use it on desktops and laptops with
 * a real GPU and a few cores; phones, tablets and GPU-less machines get the lite model.
 */
export function defaultModelSize(): ModelSize {
  if (typeof window === 'undefined') return 'lite';
  if (window.__FF_MEDIAPIPE_MODEL_SIZE__) return window.__FF_MEDIAPIPE_MODEL_SIZE__;
  if (isMobile()) return 'lite';
  // A pinned delegate (test harnesses) keeps the plain screen-size rule, so runs stay comparable.
  if (window.__FF_MEDIAPIPE_DELEGATE__) return Math.min(window.screen?.width ?? 0, window.innerWidth) >= 900 ? 'full' : 'lite';
  const { webgl2, software } = gpuInfo();
  const cores = navigator.hardwareConcurrency || 4;
  const memory = (navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? 8;
  return webgl2 && !software && cores >= 4 && memory >= 4 ? 'full' : 'lite';
}
