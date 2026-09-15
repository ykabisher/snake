import type { World, MoteStyle } from "../content/worlds";
import { pick } from "./rng";

/**
 * The life of the board: drifting motes (petals, snow, bubbles, twinkles) and
 * a critter that wanders across now and then. Purely cosmetic — nothing here
 * touches gameplay — and all of it is skipped under reduced motion.
 */

export interface Mote {
  x: number;
  y: number;
  size: number;
  color: string;
  /** Phase for sway and twinkle. */
  phase: number;
  spin: number;
}

export interface Critter {
  emoji: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  /** Seconds alive, for the wobble. */
  age: number;
}

/** Seconds between critters, min and max. */
const CRITTER_GAP: [number, number] = [7, 15];

export class Ambient {
  motes: Mote[] = [];
  critter: Critter | null = null;
  style: MoteStyle | null = null;
  private world: World | null = null;
  private size = 300;
  private untilCritter = 4;
  private time = 0;

  constructor(private reduced: boolean) {}

  setWorld(world: World, size: number): void {
    this.world = world;
    this.style = world.motes;
    this.size = size;
    this.critter = null;
    this.untilCritter = 3;
    this.motes = [];
    if (this.reduced) return;
    for (let i = 0; i < world.motes.count; i++) this.motes.push(this.spawn(true));
  }

  resize(size: number): void {
    const k = size / this.size;
    for (const m of this.motes) {
      m.x *= k;
      m.y *= k;
    }
    if (this.critter) {
      this.critter.x *= k;
      this.critter.y *= k;
    }
    this.size = size;
  }

  private spawn(anywhere: boolean): Mote {
    const s = this.style!;
    const y = anywhere
      ? Math.random() * this.size
      : s.motion === "rise"
        ? this.size + 8
        : -8;
    return {
      x: Math.random() * this.size,
      y,
      size: (s.shape === "star" ? 1.6 : 2) + Math.random() * 2.6,
      color: pick(s.colors),
      phase: Math.random() * Math.PI * 2,
      spin: Math.random() * Math.PI,
    };
  }

  update(dt: number): void {
    if (this.reduced || !this.style || !this.world) return;
    this.time += dt;
    const s = this.style;
    const k = this.size / 400;

    for (let i = 0; i < this.motes.length; i++) {
      const m = this.motes[i];
      if (s.motion === "twinkle") continue;
      const dir = s.motion === "rise" ? -1 : 1;
      m.y += dir * s.speed * k * dt * (0.6 + m.size * 0.15);
      m.x += Math.sin(this.time * 1.2 + m.phase) * 10 * k * dt;
      m.spin += dt;
      if (m.y > this.size + 10 || m.y < -10) this.motes[i] = this.spawn(false);
    }

    const c = this.critter;
    if (c) {
      c.age += dt;
      c.x += c.vx * dt;
      c.y += c.vy * dt;
      const out = 40;
      if (c.x < -out || c.x > this.size + out || c.y < -out || c.y > this.size + out) {
        this.critter = null;
        this.untilCritter = CRITTER_GAP[0] + Math.random() * (CRITTER_GAP[1] - CRITTER_GAP[0]);
      }
    } else {
      this.untilCritter -= dt;
      if (this.untilCritter <= 0) this.critter = this.spawnCritter();
    }
  }

  /** Walk in from one side and out the other, a little off straight. */
  private spawnCritter(): Critter {
    const size = this.size;
    const speed = (size / 6) * (0.8 + Math.random() * 0.4);
    const fromLeft = Math.random() < 0.5;
    const y = size * (0.15 + Math.random() * 0.7);
    return {
      emoji: pick(this.world!.critters),
      x: fromLeft ? -30 : size + 30,
      y,
      vx: fromLeft ? speed : -speed,
      vy: (Math.random() - 0.5) * speed * 0.35,
      age: 0,
    };
  }

  /** 0..1 brightness of a twinkling mote. */
  twinkle(m: Mote): number {
    return 0.35 + 0.65 * Math.max(0, Math.sin(this.time * 2.2 + m.phase));
  }

  get clock(): number {
    return this.time;
  }
}
