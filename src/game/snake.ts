import type { Pt } from "./types";
import { MAX_LENGTH, SEGMENT_GAP } from "./constants";

/**
 * The snake's body as a path: the head glides freely and every segment sits a
 * fixed distance behind it along the exact route the head took — so the body
 * follows loops, circles and slides around obstacles. No rules here, only
 * geometry: the engine decides where the head is allowed to go.
 */

/** Head positions closer together than this are not recorded. */
const TRAIL_STEP = 0.08;

/** Body length change per second while growing or shrinking, in units. */
const RESIZE_SPEED = 3;

export class Snake {
  head: Pt = { x: 0, y: 0 };
  /** Radians; 0 is right, π/2 is down. */
  heading = 0;
  /** Segments, including the head. The drawn body eases toward it. */
  length = 1;
  /** Newest first; trail[0] is always the head. */
  private trail: Pt[] = [];
  /** Current drawn body length in units, easing toward `length`. */
  private shown = 0;

  reset(x: number, y: number, heading: number, length: number): void {
    this.head = { x, y };
    this.heading = heading;
    this.length = length;
    this.shown = this.targetLength;
    // a straight tail behind the head, long enough for the longest snake
    const back = MAX_LENGTH * SEGMENT_GAP + 1;
    this.trail = [];
    for (let d = 0; d <= back; d += TRAIL_STEP * 4) {
      this.trail.push({ x: x - Math.cos(heading) * d, y: y - Math.sin(heading) * d });
    }
  }

  get dir(): Pt {
    return { x: Math.cos(this.heading), y: Math.sin(this.heading) };
  }

  private get targetLength(): number {
    return (this.length - 1) * SEGMENT_GAP;
  }

  /** Swing the heading toward `angle`, at most `maxTurn` radians. */
  steer(angle: number, maxTurn: number): void {
    let diff = angle - this.heading;
    diff = Math.atan2(Math.sin(diff), Math.cos(diff));
    const h = this.heading + Math.max(-maxTurn, Math.min(maxTurn, diff));
    this.heading = Math.atan2(Math.sin(h), Math.cos(h));
  }

  /** Record where the head is now and ease the body length. Call once a frame. */
  commit(dt: number): void {
    const t = this.targetLength;
    const k = RESIZE_SPEED * dt;
    this.shown = this.shown < t ? Math.min(t, this.shown + k) : Math.max(t, this.shown - k * 2);

    const last = this.trail[1];
    this.trail[0] = { ...this.head };
    if (!last || Math.hypot(this.head.x - last.x, this.head.y - last.y) >= TRAIL_STEP) {
      this.trail.unshift({ ...this.head });
    }

    // keep only as much history as the longest snake could need
    const keep = MAX_LENGTH * SEGMENT_GAP + 1;
    let run = 0;
    for (let i = 1; i < this.trail.length; i++) {
      const a = this.trail[i - 1];
      const b = this.trail[i];
      run += Math.hypot(a.x - b.x, a.y - b.y);
      if (run > keep) {
        this.trail.length = i + 1;
        break;
      }
    }
  }

  /**
   * Points along the body from the head toward the tail tip, `step` units
   * apart. Index × step is the distance from the head.
   */
  points(step: number): Pt[] {
    const out: Pt[] = [{ ...this.head }];
    const total = this.shown;
    let want = step;
    let walked = 0;
    for (let i = 1; i < this.trail.length && want <= total + 1e-6; i++) {
      const a = this.trail[i - 1];
      const b = this.trail[i];
      const len = Math.hypot(a.x - b.x, a.y - b.y);
      while (len > 0 && want <= walked + len && want <= total + 1e-6) {
        const f = (want - walked) / len;
        out.push({ x: a.x + (b.x - a.x) * f, y: a.y + (b.y - a.y) * f });
        want += step;
      }
      walked += len;
    }
    return out;
  }
}
