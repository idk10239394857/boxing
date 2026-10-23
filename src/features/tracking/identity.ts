import { LM, type Landmark } from './landmarks';

type P2 = [number, number];

/**
 * Keeps two fighters' identities stable across frames. MediaPipe returns poses in no
 * particular order, so each frame's poses are matched to the previous hip positions.
 * Fighter 0 (red corner) starts as whoever is on the left of the screen as displayed.
 */
export class FighterIdentity {
  private centers: (P2 | null)[] = [null, null];
  private seen = [-1e9, -1e9];

  constructor(private mirrored: boolean) {}

  /** Returns, for each input pose, the fighter slot (0/1) it belongs to, or -1 if unassigned. */
  assign(t: number, poses: Landmark[][]): number[] {
    const centers = poses.map((p): P2 => {
      const x = (p[LM.lHip].x + p[LM.rHip].x) / 2, y = (p[LM.lHip].y + p[LM.rHip].y) / 2;
      return [this.mirrored ? 1 - x : x, y];
    });
    // Forget a fighter not seen for a while (left the frame); re-seed by position.
    for (const i of [0, 1]) if (t - this.seen[i] > 1500) this.centers[i] = null;

    let out: number[];
    if (centers.length === 0) return [];
    if (centers.length === 1) out = [this.closestFree(centers[0])];
    else {
      const [a, b] = centers;
      const [c0, c1] = this.centers;
      if (c0 && c1) {
        const keep = dist(a, c0) + dist(b, c1);
        const swap = dist(a, c1) + dist(b, c0);
        out = keep <= swap ? [0, 1] : [1, 0];
      } else if (c0 || c1) {
        const known = c0 ? 0 : 1;
        const ref = (c0 ?? c1)!;
        const aIsKnown = dist(a, ref) <= dist(b, ref);
        out = aIsKnown ? [known, 1 - known] : [1 - known, known];
      } else {
        out = a[0] <= b[0] ? [0, 1] : [1, 0];
      }
      out = out.concat(centers.slice(2).map(() => -1));
    }
    out.forEach((slot, i) => {
      if (slot < 0) return;
      this.centers[slot] = centers[i];
      this.seen[slot] = t;
    });
    return out;
  }

  private closestFree(c: P2): number {
    const [c0, c1] = this.centers;
    if (c0 && c1) return dist(c, c0) <= dist(c, c1) ? 0 : 1;
    if (c0) return dist(c, c0) < 0.15 ? 0 : 1;
    if (c1) return dist(c, c1) < 0.15 ? 1 : 0;
    return c[0] < 0.5 ? 0 : 1;
  }
}

const dist = (a: P2, b: P2) => Math.hypot(a[0] - b[0], a[1] - b[1]);
