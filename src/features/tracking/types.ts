import type { Stance, TrackEvent } from './detector';

export type TrackerSource = { kind: 'camera' } | { kind: 'file'; url: string; name: string };
export type TrackerStatus =
  | { phase: 'loading'; message: string }
  | { phase: 'running' }
  | { phase: 'paused' }
  | { phase: 'ended' }
  | { phase: 'error'; message: string; cameraBlocked?: boolean };
export type BodyQuality = 'good' | 'partial' | 'none';

export interface TrackerViewProps {
  source: TrackerSource;
  /** One stance per fighter tracked (1 = solo, 2 = sparring: red corner, blue corner). */
  stances: Stance[];
  paused: boolean;
  onEvent: (e: TrackEvent, fighter: number) => void;
  onStatus: (s: TrackerStatus) => void;
  onQuality: (q: BodyQuality) => void;
  /** Solo: whether the camera sits in front of the fighter, where straight punches are hard to see. */
  onView?: (facingCamera: boolean) => void;
  /** Frames analysed per second (for the HUD). */
  onFps?: (fps: number) => void;
  /** Uploaded videos: seconds analysed so far and total length. */
  onProgress?: (seconds: number, duration: number) => void;
}
