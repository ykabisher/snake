import { pick } from "./rng";

/** Confetti, bursts, floating score numbers and screen shake. Purely cosmetic:
 *  nothing here affects gameplay, so it is all skipped under reduced motion. */

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  color: string;
  radius: number;
  spin: number;
}

export interface FloatText {
  x: number;
  y: number;
  text: string;
  color: string;
  life: number;
}

const CONFETTI_COLORS = ["#F5A524", "#5FD9A4", "#E85D42", "#57B6F0", "#F7C948", "#9B6BF0"];

export class Fx {
  particles: Particle[] = [];
  floats: FloatText[] = [];
  shake = 0;
  flash = 0;
  flashColor = "#E85D42";

  constructor(private reduced: boolean) {}

  clear(): void {
    this.particles.length = 0;
    this.floats.length = 0;
    this.shake = 0;
    this.flash = 0;
  }

  burst(x: number, y: number, colors: string[], count: number): void {
    if (this.reduced) return;
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 40 + Math.random() * 180;
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 40,
        life: 1,
        color: pick(colors),
        radius: 2 + Math.random() * 4,
        spin: Math.random() * 6,
      });
    }
  }

  confetti(width: number): void {
    if (this.reduced) return;
    for (let i = 0; i < 46; i++) {
      this.particles.push({
        x: Math.random() * width,
        y: -10 - Math.random() * 60,
        vx: (Math.random() - 0.5) * 70,
        vy: 110 + Math.random() * 160,
        life: 1.6,
        color: pick(CONFETTI_COLORS),
        radius: 3 + Math.random() * 4,
        spin: Math.random() * 8,
      });
    }
  }

  float(x: number, y: number, text: string, color: string): void {
    this.floats.push({ x, y, text, color, life: 1 });
  }

  hit(color = "#E85D42"): void {
    this.shake = 1;
    this.flash = 1;
    this.flashColor = color;
  }

  update(dt: number): void {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= dt * (p.life > 1 ? 0.7 : 1.6);
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += 420 * dt;
      p.vx *= 0.99;
      if (p.life <= 0) this.particles.splice(i, 1);
    }
    for (let i = this.floats.length - 1; i >= 0; i--) {
      const f = this.floats[i];
      f.life -= dt * 1.1;
      f.y -= dt * 46;
      if (f.life <= 0) this.floats.splice(i, 1);
    }
    this.shake = Math.max(0, this.shake - dt * 3.2);
    this.flash = Math.max(0, this.flash - dt * 3);
  }
}
