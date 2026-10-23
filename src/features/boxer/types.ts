import type { Clip } from './clips';

export interface BoxerViewerProps {
  clip: Clip;
  speed: number;
  paused: boolean;
  /** Camera azimuth in radians (0 = front, π/2 = side). */
  view: number;
  southpaw: boolean;
  height: number;
}
