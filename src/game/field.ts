import type { Pt } from "./types";
import type { TerrainKind, World } from "../content/worlds";
import { between, pick, ri } from "./rng";
import { GRID, PASSAGE } from "./constants";

/**
 * What stands on the board besides pods: obstacles (still and moving) and
 * terrain patches. Scattered at random each time the snake arrives in a world,
 * always with passages wide enough that nothing is ever walled off.
 */

export interface MoverPath {
  kind: "patrol" | "orbit";
  /** Patrol midpoint or orbit centre. */
  ax: number;
  ay: number;
  /** Patrol direction (radians). */
  angle: number;
  /** Patrol half-length or orbit radius. */
  reach: number;
  /** Units per second. */
  speed: number;
  phase: number;
}

export interface Obstacle {
  emoji: string;
  /** Collision radius. The emoji is drawn a little larger. */
  r: number;
  x: number;
  y: number;
  /** Run time it pops onto the board. */
  born: number;
  /** Run time the snake last bumped it, for a jiggle. */
  hitAt: number;
  path: MoverPath | null;
}

export interface Zone {
  kind: TerrainKind;
  x: number;
  y: number;
  r: number;
  /** Which way a push patch flows, or a boost patch launches. */
  angle: number;
  born: number;
}

/** What the terrain under the head does to it this frame. */
export interface Effect {
  /** Speed multiplier. */
  speed: number;
  /** Turn-rate multiplier. */
  turn: number;
  /** Extra velocity, units per second. */
  drift: Pt;
  /** Start (or keep up) a speed burst. */
  boost: boolean;
  zone: Zone | null;
}

export interface Contact {
  /** Unit normal pointing out of what was hit. */
  nx: number;
  ny: number;
  /** Null when it was the board edge. */
  obstacle: Obstacle | null;
}

interface Circle {
  x: number;
  y: number;
  r: number;
}

const STILL_RADIUS: [number, number] = [0.72, 0.92];
const MOVER_RADIUS = 0.6;
const PATROL_REACH = 2;
const PATROL_SPEED = 1.1;
const ORBIT_REACH = 1.5;
const ORBIT_SPEED = 1.3;

const SLOW_FACTOR = 0.5;
const ICE_TURN = 0.25;
const ICE_SPEED = 1.1;
const PUSH_SPEED = 1.6;
const BOOST_NUDGE = 0.8;
const PULL_SPEED = 1.9;

/** A boost patch multiplies speed by this, and the burst lasts this long after leaving it. */
export const BOOST_FACTOR = 1.6;
export const BOOST_LINGER = 0.7;

/** Tries per obstacle or patch before giving up on it (the board is just a bit emptier). */
const TRIES = 80;

export class Field {
  obstacles: Obstacle[] = [];
  zones: Zone[] = [];
  /** Everything solid, including every spot a mover can reach. */
  private solids: Circle[] = [];

  clear(): void {
    this.obstacles = [];
    this.zones = [];
    this.solids = [];
  }

  /**
   * A fresh random layout for `world`. `keepOut` circles (the snake's head, the
   * lane ahead of it and its body) stay clear, so nothing lands on the player.
   * Things pop in outward from `origin`, following the world reveal.
   */
  layout(world: World, keepOut: Circle[], origin: Pt, time: number): void {
    this.clear();
    const style = world.obstacles;
    const born = (p: Pt) => time + 0.15 + Math.hypot(p.x - origin.x, p.y - origin.y) * 0.05;

    for (let i = 0; i < style.movers; i++) {
      const r = MOVER_RADIUS;
      const patrol = style.motion === "patrol";
      const path: MoverPath = {
        kind: style.motion,
        ax: 0,
        ay: 0,
        // mostly across or up-and-down, sometimes on a slant
        angle: pick([0, Math.PI / 2, between(0, Math.PI)]),
        reach: patrol ? PATROL_REACH : ORBIT_REACH,
        speed: patrol ? PATROL_SPEED : ORBIT_SPEED,
        phase: between(0, Math.PI * 2),
      };
      const spot = this.findSpot(r, keepOut, (x, y) => pathSamples({ ...path, ax: x, ay: y }));
      if (!spot) continue;
      path.ax = spot.x;
      path.ay = spot.y;
      for (const s of pathSamples(path)) this.solids.push({ ...s, r });
      const at = moverAt(path, time);
      this.obstacles.push({ emoji: style.mover, r, ...at, born: born(at), hitAt: -99, path });
    }

    const count = ri(style.count[0], style.count[1]);
    for (let i = 0; i < count; i++) {
      const r = between(STILL_RADIUS[0], STILL_RADIUS[1]);
      const spot = this.findSpot(r, keepOut, (x, y) => [{ x, y }]);
      if (!spot) continue;
      this.solids.push({ ...spot, r });
      this.obstacles.push({ emoji: pick(style.still), r, ...spot, born: born(spot), hitAt: -99, path: null });
    }

    const terrain = world.terrain;
    for (let i = 0; i < terrain.count; i++) {
      const r = between(terrain.size[0], terrain.size[1]);
      // a pull patch keeps its middle well away from obstacles, so it never drags into one
      const reachIn = terrain.kind === "pull" ? 1 : 0.6;
      for (let t = 0; t < TRIES; t++) {
        const x = between(r * 0.7, GRID - r * 0.7);
        const y = between(r * 0.7, GRID - r * 0.7);
        const clear =
          this.solids.every((s) => Math.hypot(s.x - x, s.y - y) >= s.r + r * reachIn) &&
          this.zones.every((z) => Math.hypot(z.x - x, z.y - y) >= z.r + r + 0.5) &&
          keepOut.every((k) => Math.hypot(k.x - x, k.y - y) >= k.r + r);
        if (!clear) continue;
        this.zones.push({ kind: terrain.kind, x, y, r, angle: between(0, Math.PI * 2), born: born({ x, y }) });
        break;
      }
    }
  }

  /** A centre where every sample of the shape clears the edges, other solids and `keepOut`. */
  private findSpot(r: number, keepOut: Circle[], samples: (x: number, y: number) => Pt[]): Pt | null {
    const lo = r + PASSAGE;
    const hi = GRID - r - PASSAGE;
    for (let t = 0; t < TRIES; t++) {
      const x = between(lo, hi);
      const y = between(lo, hi);
      const ok = samples(x, y).every(
        (s) =>
          s.x >= lo &&
          s.x <= hi &&
          s.y >= lo &&
          s.y <= hi &&
          this.solids.every((o) => Math.hypot(o.x - s.x, o.y - s.y) >= o.r + r + PASSAGE) &&
          keepOut.every((k) => Math.hypot(k.x - s.x, k.y - s.y) >= k.r + r),
      );
      if (ok) return { x, y };
    }
    return null;
  }

  /** Move the movers to where they are at run time `time`. */
  update(time: number): void {
    for (const o of this.obstacles) {
      if (!o.path) continue;
      const at = moverAt(o.path, time);
      o.x = at.x;
      o.y = at.y;
    }
  }

  /** True when a circle at `p` stays clear of everything solid, including mover routes. */
  isClear(p: Pt, r: number): boolean {
    return this.solids.every((s) => Math.hypot(s.x - p.x, s.y - p.y) >= s.r + r);
  }

  effectAt(p: Pt): Effect {
    const effect: Effect = { speed: 1, turn: 1, drift: { x: 0, y: 0 }, boost: false, zone: null };
    for (const z of this.zones) {
      const dx = z.x - p.x;
      const dy = z.y - p.y;
      const d = Math.hypot(dx, dy);
      if (d > z.r) continue;
      effect.zone = z;
      switch (z.kind) {
        case "slow":
          effect.speed *= SLOW_FACTOR;
          break;
        case "ice":
          effect.turn *= ICE_TURN;
          effect.speed *= ICE_SPEED;
          break;
        case "boost":
          effect.boost = true;
          effect.drift.x += Math.cos(z.angle) * BOOST_NUDGE;
          effect.drift.y += Math.sin(z.angle) * BOOST_NUDGE;
          break;
        case "push":
          effect.drift.x += Math.cos(z.angle) * PUSH_SPEED;
          effect.drift.y += Math.sin(z.angle) * PUSH_SPEED;
          break;
        case "pull": {
          if (d < 0.25) break;
          // strongest near the middle, but never faster than the snake can swim
          const k = PULL_SPEED * (0.35 + 0.65 * (1 - d / z.r));
          effect.drift.x += (dx / d) * k;
          effect.drift.y += (dy / d) * k;
          break;
        }
      }
    }
    return effect;
  }

  /**
   * Push a circle at `p` (mutated) out of every obstacle and back inside the
   * board. Returns the obstacle contact if there was one, else the edge contact.
   */
  resolve(p: Pt, r: number): Contact | null {
    let hit: Contact | null = null;
    let edge: Contact | null = null;
    // two passes, so being squeezed between an obstacle and the edge settles
    for (let pass = 0; pass < 2; pass++) {
      for (const o of this.obstacles) {
        let dx = p.x - o.x;
        let dy = p.y - o.y;
        let d = Math.hypot(dx, dy);
        const min = o.r + r;
        if (d >= min) continue;
        if (d < 1e-4) {
          dx = 1;
          dy = 0;
          d = 1;
        }
        p.x = o.x + (dx / d) * min;
        p.y = o.y + (dy / d) * min;
        hit = { nx: dx / d, ny: dy / d, obstacle: o };
      }
      // edges are soft walls: the head slides along them
      if (p.x < r) {
        p.x = r;
        edge = { nx: 1, ny: 0, obstacle: null };
      } else if (p.x > GRID - r) {
        p.x = GRID - r;
        edge = { nx: -1, ny: 0, obstacle: null };
      }
      if (p.y < r) {
        p.y = r;
        edge = { nx: 0, ny: 1, obstacle: null };
      } else if (p.y > GRID - r) {
        p.y = GRID - r;
        edge = { nx: 0, ny: -1, obstacle: null };
      }
    }
    return hit ?? edge;
  }
}

function moverAt(path: MoverPath, time: number): Pt {
  if (path.kind === "patrol") {
    // eases at each end, like a creature turning round
    const s = Math.sin(path.phase + (time * path.speed) / path.reach) * path.reach;
    return { x: path.ax + Math.cos(path.angle) * s, y: path.ay + Math.sin(path.angle) * s };
  }
  const a = path.phase + (time * path.speed) / path.reach;
  return { x: path.ax + Math.cos(a) * path.reach, y: path.ay + Math.sin(a) * path.reach };
}

/** Points along everywhere a mover goes, for keeping its route clear. */
function pathSamples(path: MoverPath): Pt[] {
  const out: Pt[] = [];
  if (path.kind === "patrol") {
    for (let i = 0; i <= 6; i++) {
      const s = (i / 6 - 0.5) * 2 * path.reach;
      out.push({ x: path.ax + Math.cos(path.angle) * s, y: path.ay + Math.sin(path.angle) * s });
    }
  } else {
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2;
      out.push({ x: path.ax + Math.cos(a) * path.reach, y: path.ay + Math.sin(a) * path.reach });
    }
  }
  return out;
}
