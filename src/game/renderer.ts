import type { Pt } from "./types";
import type { Skin } from "../content/skins";
import { WORLDS, type PodStyle, type World } from "../content/worlds";
import type { Fx } from "./fx";
import type { Ambient } from "./ambient";
import type { Snake } from "./snake";
import type { Field, Obstacle } from "./field";
import { GRID, SEGMENT_GAP } from "./constants";
import { hashString, seeded } from "./rng";

/** Everything drawn on the canvas. Pure rendering — no game rules here. */

export interface PlacedToken extends Pt {
  label: string;
  correct: boolean;
  born: number;
}

/**
 * The snake's face. `happy` after a right answer, `dizzy` after a wrong one,
 * `bonk` for a squeeze-eyed moment after bumping into something.
 */
export type Mood = "idle" | "happy" | "dizzy" | "bonk";

export interface Frame {
  snake: Snake;
  /** Unit vector the eyes look along — toward the finger, before the body turns. */
  facing: Pt;
  /** Where the finger is, in board units, or null. */
  aim: Pt | null;
  tokens: PlacedToken[];
  field: Field;
  skin: Skin;
  /** Seconds since the run started — drives pulses and the tongue flick. */
  time: number;
  mood: Mood;
  /** Run times of recent bites; each sends a bulge down the body. */
  gulps: number[];
}

const FONT_STACK = "Fredoka, Heebo, sans-serif";
const EMOJI_STACK = '"Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif';

/** Seconds for a new world to spread out from the snake's head. */
const REVEAL_S = 1.1;
/** Board units per second a swallowed pod travels toward the tail. */
const GULP_SPEED = 9;
/** Spacing of the points the body is drawn through, in board units. */
const BODY_STEP = 0.25;

export class Renderer {
  private ctx: CanvasRenderingContext2D;
  /** Board edge in CSS pixels. */
  size = 300;
  /** One board unit in CSS pixels. */
  cell = 20;
  private hue = 0;
  private world: World = WORLDS[0];
  /** The painted ground of the current world, cached — it never changes mid-level. */
  private board: HTMLCanvasElement | null = null;
  /** The previous world's ground while the new one is being revealed. */
  private oldBoard: HTMLCanvasElement | null = null;
  private reveal = { x: 0, y: 0, at: 0 };

  constructor(private canvas: HTMLCanvasElement, private reduced: boolean) {
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("2D canvas context unavailable");
    this.ctx = ctx;
  }

  /** Fit the board to its container, square, at device pixel ratio. */
  resize(available: number): void {
    const size = Math.max(160, Math.floor(available) - 4);
    this.size = size;
    this.cell = size / GRID;
    const dpr = Math.min(window.devicePixelRatio || 1, 2.5);
    this.canvas.style.width = `${size}px`;
    this.canvas.style.height = `${size}px`;
    this.canvas.width = Math.round(size * dpr);
    this.canvas.height = Math.round(size * dpr);
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    // the page is RTL and the canvas inherits it, which would draw "+10" as "10+"
    this.ctx.direction = "ltr";
    this.board = this.paintBoard(this.world);
    this.oldBoard = null;
  }

  /** Switch worlds. With `reveal`, the new ground spreads out from that point. */
  setWorld(world: World, reveal: { x: number; y: number; at: number } | null): void {
    if (world === this.world && this.board) return;
    const old = this.board;
    this.world = world;
    this.board = this.paintBoard(world);
    this.oldBoard = reveal && old && !this.reduced ? old : null;
    if (reveal) this.reveal = reveal;
  }

  draw(frame: Frame, fx: Fx, ambient: Ambient, dt: number): void {
    const { ctx } = this;
    this.hue = (this.hue + dt * 70) % 360;

    ctx.save();
    if (fx.shake > 0) {
      const m = fx.shake * 7;
      ctx.translate((Math.random() - 0.5) * m, (Math.random() - 0.5) * m);
    }
    this.drawBoard(frame.time);
    this.drawZones(frame);
    this.drawMotes(ambient);
    this.drawObstacles(frame);
    this.drawTokens(frame);
    this.drawCritter(ambient);
    this.drawAim(frame);
    this.drawSnake(frame);
    this.drawFx(fx);
    ctx.restore();

    if (fx.flash > 0) {
      ctx.fillStyle = fx.flashColor;
      ctx.globalAlpha = fx.flash * 0.26;
      ctx.fillRect(0, 0, this.size, this.size);
      ctx.globalAlpha = 1;
    }
  }

  /** A board point in CSS pixels. */
  px(p: Pt): Pt {
    return { x: p.x * this.cell, y: p.y * this.cell };
  }

  /** A page position (e.g. a touch) in board units. */
  toBoard(clientX: number, clientY: number): Pt {
    const r = this.canvas.getBoundingClientRect();
    const k = r.width > 0 ? GRID / r.width : 0;
    return { x: (clientX - r.left) * k, y: (clientY - r.top) * k };
  }

  /* ---------------------------------------------------------------- *
   * Ground
   * ---------------------------------------------------------------- */

  /** Checkerboard tiles, a wash of sunlight, scattered scenery, a vignette. */
  private paintBoard(world: World): HTMLCanvasElement {
    const out = document.createElement("canvas");
    out.width = this.canvas.width;
    out.height = this.canvas.height;
    const g = out.getContext("2d");
    if (!g) return out;
    const { size, cell } = this;
    const k = out.width / size;
    g.setTransform(k, 0, 0, k, 0, 0);

    g.fillStyle = world.tiles[0];
    g.fillRect(0, 0, size, size);
    g.fillStyle = world.tiles[1];
    for (let y = 0; y < GRID; y++) {
      for (let x = y % 2; x < GRID; x += 2) {
        const x0 = Math.round(x * cell);
        const y0 = Math.round(y * cell);
        g.fillRect(x0, y0, Math.round((x + 1) * cell) - x0, Math.round((y + 1) * cell) - y0);
      }
    }

    const sun = g.createRadialGradient(size * 0.2, size * 0.05, 0, size * 0.2, size * 0.05, size * 0.95);
    sun.addColorStop(0, "rgba(255,255,255,.2)");
    sun.addColorStop(1, "rgba(255,255,255,0)");
    g.fillStyle = sun;
    g.fillRect(0, 0, size, size);

    // same world, same scenery — seeded so it does not reshuffle on resize
    const rand = seeded(hashString(world.id) + GRID);
    g.textAlign = "center";
    g.textBaseline = "middle";
    const count = Math.round(GRID * 1.1);
    for (let i = 0; i < count; i++) {
      const cx = (Math.floor(rand() * GRID) + 0.5 + (rand() - 0.5) * 0.4) * cell;
      const cy = (Math.floor(rand() * GRID) + 0.5 + (rand() - 0.5) * 0.4) * cell;
      const s = cell * (0.42 + rand() * 0.25);
      const emoji = world.deco[Math.floor(rand() * world.deco.length)];
      g.save();
      g.globalAlpha = 0.45 + rand() * 0.2;
      g.translate(cx, cy);
      g.rotate((rand() - 0.5) * 0.6);
      g.font = `${Math.round(s)}px ${EMOJI_STACK}`;
      g.fillText(emoji, 0, 0);
      g.restore();
    }

    const vignette = g.createRadialGradient(size / 2, size / 2, size * 0.32, size / 2, size / 2, size * 0.78);
    vignette.addColorStop(0, "rgba(0,0,0,0)");
    vignette.addColorStop(1, world.vignette);
    g.fillStyle = vignette;
    g.fillRect(0, 0, size, size);
    return out;
  }

  private drawBoard(time: number): void {
    const { ctx, size } = this;
    if (!this.board) return;
    const old = this.oldBoard;
    const t = old ? (time - this.reveal.at) / REVEAL_S : 1;
    if (!old || t >= 1) {
      this.oldBoard = null;
      ctx.drawImage(this.board, 0, 0, size, size);
      return;
    }

    ctx.drawImage(old, 0, 0, size, size);
    const eased = 1 - (1 - Math.max(0, t)) ** 3;
    const radius = eased * size * 1.45;
    ctx.save();
    ctx.beginPath();
    ctx.arc(this.reveal.x, this.reveal.y, radius, 0, Math.PI * 2);
    ctx.clip();
    ctx.drawImage(this.board, 0, 0, size, size);
    ctx.restore();

    ctx.strokeStyle = `rgba(255,255,255,${0.75 * (1 - t)})`;
    ctx.lineWidth = this.cell * 0.35;
    ctx.beginPath();
    ctx.arc(this.reveal.x, this.reveal.y, radius, 0, Math.PI * 2);
    ctx.stroke();
  }

  /* ---------------------------------------------------------------- *
   * Ambient life
   * ---------------------------------------------------------------- */

  private drawMotes(ambient: Ambient): void {
    const style = ambient.style;
    if (!style || ambient.motes.length === 0) return;
    const { ctx } = this;
    for (const m of ambient.motes) {
      ctx.globalAlpha = style.motion === "twinkle" ? ambient.twinkle(m) : 0.75;
      ctx.fillStyle = m.color;
      ctx.strokeStyle = m.color;
      switch (style.shape) {
        case "dot":
          ctx.beginPath();
          ctx.arc(m.x, m.y, m.size, 0, Math.PI * 2);
          ctx.fill();
          break;
        case "ring":
          ctx.lineWidth = 1.3;
          ctx.beginPath();
          ctx.arc(m.x, m.y, m.size * 1.2, 0, Math.PI * 2);
          ctx.stroke();
          break;
        case "dash":
          ctx.save();
          ctx.translate(m.x, m.y);
          ctx.rotate(m.spin);
          ctx.lineWidth = 2.2;
          ctx.lineCap = "round";
          ctx.beginPath();
          ctx.moveTo(-m.size, 0);
          ctx.lineTo(m.size, 0);
          ctx.stroke();
          ctx.restore();
          break;
        case "petal":
          ctx.save();
          ctx.translate(m.x, m.y);
          ctx.rotate(m.spin);
          ctx.beginPath();
          ctx.ellipse(0, 0, m.size * 1.3, m.size * 0.7, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
          break;
        case "star":
          this.sparkle(m.x, m.y, m.size * 1.6);
          break;
      }
    }
    ctx.globalAlpha = 1;
  }

  private drawCritter(ambient: Ambient): void {
    const c = ambient.critter;
    if (!c) return;
    const { ctx, cell } = this;
    const hop = Math.abs(Math.sin(c.age * 7)) * cell * 0.14;

    ctx.fillStyle = "rgba(0,0,0,.14)";
    ctx.beginPath();
    ctx.ellipse(c.x, c.y + cell * 0.38, cell * 0.28, cell * 0.09, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.save();
    ctx.translate(c.x, c.y - hop);
    ctx.rotate(Math.sin(c.age * 7) * 0.14);
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = `${Math.round(cell * 0.8)}px ${EMOJI_STACK}`;
    ctx.fillText(c.emoji, 0, 0);
    ctx.restore();
  }

  /* ---------------------------------------------------------------- *
   * Pods
   * ---------------------------------------------------------------- */

  /** Pods look identical whether right or wrong — the answer is in the text. */
  private drawTokens(frame: Frame): void {
    const { ctx, cell } = this;
    const pod = this.world.pod;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    for (const token of frame.tokens) {
      const age = frame.time - token.born;
      const pop = this.reduced ? Math.min(1, age / 0.15) : springPop(age);
      if (pop <= 0.01) continue;
      const phase = token.x * 1.7 + token.y * 2.3;
      const bob = this.reduced ? 0 : Math.sin(frame.time * 2.6 + phase) * cell * 0.045;
      const sway = this.reduced ? 0 : Math.sin(frame.time * 1.9 + phase) * 0.08;
      const r = cell * 0.47 * pop;
      const { x, y } = this.px(token);

      // the shadow stays on the ground while the pod bobs above it
      ctx.fillStyle = "rgba(0,0,0,.18)";
      ctx.beginPath();
      ctx.ellipse(x, y + cell * 0.4, r * 0.75, r * 0.22, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.save();
      ctx.translate(x, y - cell * 0.03 + bob);
      ctx.rotate(sway);
      this.drawPod(pod, r);

      ctx.rotate(-sway * 0.6); // keep the label close to level so it stays readable
      const len = [...token.label].length;
      const fontSize = Math.max(1, Math.round(cell * (len > 2 ? 0.42 : len === 2 ? 0.54 : 0.62) * pop));
      ctx.font = `700 ${fontSize}px ${FONT_STACK}`;
      ctx.lineJoin = "round";
      ctx.lineWidth = Math.max(2.5, cell * 0.1) * pop;
      ctx.strokeStyle = pod.outline;
      ctx.strokeText(token.label, 0, r * 0.08);
      ctx.fillStyle = pod.ink;
      ctx.fillText(token.label, 0, r * 0.08);
      ctx.restore();
    }
  }

  /** One pod at the origin, radius `r`, in the world's style. */
  private drawPod(pod: PodStyle, r: number): void {
    const { ctx, cell } = this;
    const rim = Math.max(1.5, cell * 0.055);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    if (pod.topper === "wrapper") {
      // twisted candy-wrapper ends, behind the body
      ctx.fillStyle = pod.top;
      ctx.strokeStyle = pod.rim;
      ctx.lineWidth = rim;
      for (const side of [-1, 1]) {
        ctx.beginPath();
        ctx.moveTo(side * r * 0.7, 0);
        ctx.lineTo(side * r * 1.38, -r * 0.5);
        ctx.lineTo(side * r * 1.38, r * 0.5);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      }
    }
    if (pod.topper === "ring") {
      // back half of a planet's ring
      ctx.strokeStyle = pod.rim;
      ctx.lineWidth = Math.max(2, cell * 0.07);
      ctx.beginPath();
      ctx.ellipse(0, 0, r * 1.4, r * 0.38, -0.35, Math.PI, Math.PI * 2);
      ctx.stroke();
    }

    const body = ctx.createRadialGradient(-r * 0.35, -r * 0.4, r * 0.1, 0, 0, r);
    body.addColorStop(0, pod.top);
    body.addColorStop(1, pod.bottom);
    ctx.fillStyle = body;
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.lineWidth = rim;
    ctx.strokeStyle = pod.rim;
    ctx.stroke();

    ctx.fillStyle = "rgba(255,255,255,.55)";
    ctx.beginPath();
    ctx.ellipse(-r * 0.38, -r * 0.46, r * 0.26, r * 0.14, -0.6, 0, Math.PI * 2);
    ctx.fill();

    switch (pod.topper) {
      case "leaf":
        ctx.strokeStyle = "#6B4423";
        ctx.lineWidth = Math.max(1.5, cell * 0.06);
        ctx.beginPath();
        ctx.moveTo(0, -r * 0.85);
        ctx.quadraticCurveTo(r * 0.05, -r * 1.1, r * 0.15, -r * 1.22);
        ctx.stroke();
        ctx.fillStyle = "#5EA04A";
        ctx.beginPath();
        ctx.ellipse(r * 0.42, -r * 1.02, r * 0.3, r * 0.14, -0.45, 0, Math.PI * 2);
        ctx.fill();
        break;
      case "ring":
        ctx.strokeStyle = pod.rim;
        ctx.lineWidth = Math.max(2, cell * 0.07);
        ctx.beginPath();
        ctx.ellipse(0, 0, r * 1.4, r * 0.38, -0.35, 0, Math.PI);
        ctx.stroke();
        break;
      case "shine":
        ctx.fillStyle = "#FFFFFF";
        this.sparkle(r * 0.55, -r * 0.62, r * 0.3);
        break;
      case "bubble":
        ctx.fillStyle = "rgba(255,255,255,.8)";
        ctx.beginPath();
        ctx.arc(r * 0.42, r * 0.38, r * 0.09, 0, Math.PI * 2);
        ctx.fill();
        break;
      case "wrapper":
        break;
    }
  }

  /* ---------------------------------------------------------------- *
   * Terrain and obstacles
   * ---------------------------------------------------------------- */

  /** Terrain patches: a soft blob on the ground with its moving detail on top. */
  private drawZones(frame: Frame): void {
    const { ctx, cell } = this;
    const style = this.world.terrain;
    const t = this.reduced ? 0 : frame.time;
    for (const z of frame.field.zones) {
      const grow = Math.min(1, Math.max(0, (frame.time - z.born) / 0.4));
      if (grow <= 0) continue;
      const pop = this.reduced ? 1 : 1 - (1 - grow) ** 3;
      const { x, y } = this.px(z);
      const r = z.r * cell * pop;

      ctx.save();
      this.blobPath(x, y, r, z.x * 3.1 + z.y * 1.7);
      ctx.fillStyle = style.fill;
      ctx.fill();
      ctx.clip();
      ctx.translate(x, y);
      ctx.strokeStyle = style.detail;
      ctx.fillStyle = style.detail;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      switch (z.kind) {
        case "slow":
          this.drawRipples(r, t);
          break;
        case "boost":
          ctx.rotate(z.angle);
          this.drawChevrons(r, t);
          break;
        case "ice":
          this.drawIce(r, t);
          break;
        case "push":
          ctx.rotate(z.angle);
          this.drawCurrent(r, t);
          break;
        case "pull":
          this.drawVortex(r, t);
          break;
      }
      ctx.restore();
    }
  }

  /** A slightly wobbly circle, the same shape every frame for the same seed. */
  private blobPath(x: number, y: number, r: number, seed: number): void {
    const { ctx } = this;
    ctx.beginPath();
    for (let k = 0; k <= 28; k++) {
      const a = (k / 28) * Math.PI * 2;
      const rr = r * (1 + 0.06 * Math.sin(a * 3 + seed) + 0.04 * Math.sin(a * 5 + seed * 2));
      if (k === 0) ctx.moveTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
      else ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
    }
    ctx.closePath();
  }

  /** Puddle / soft sand: rings spreading slowly from the middle. */
  private drawRipples(r: number, t: number): void {
    const { ctx, cell } = this;
    ctx.lineWidth = cell * 0.07;
    for (let k = 0; k < 3; k++) {
      const f = this.reduced ? 0.25 + k * 0.3 : (t * 0.4 + k / 3) % 1;
      ctx.globalAlpha = 0.85 * (1 - f);
      ctx.beginPath();
      ctx.ellipse(0, 0, r * (0.15 + f * 0.75), r * (0.1 + f * 0.55), 0, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }

  /** Surf / sugar rush: chevrons racing along the launch direction. */
  private drawChevrons(r: number, t: number): void {
    const { ctx, cell } = this;
    const gap = cell * 0.75;
    const w = cell * 0.32;
    ctx.lineWidth = cell * 0.13;
    for (let cx = -r - gap + ((t * cell * 2.2) % gap); cx < r + gap; cx += gap) {
      ctx.globalAlpha = Math.max(0, 1 - Math.abs(cx) / r) * 0.95;
      ctx.beginPath();
      ctx.moveTo(cx - w, -w);
      ctx.lineTo(cx, 0);
      ctx.lineTo(cx - w, w);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }

  /** Ice: glossy streaks and a twinkle. */
  private drawIce(r: number, t: number): void {
    const { ctx, cell } = this;
    ctx.save();
    ctx.rotate(-0.55);
    ctx.lineWidth = cell * 0.11;
    ctx.globalAlpha = 0.85;
    const streaks: Array<[number, number, number]> = [
      [-0.35, -0.55, 0.2],
      [-0.12, -0.4, -0.05],
      [0.3, -0.1, 0.5],
    ];
    for (const [y, x0, x1] of streaks) {
      ctx.beginPath();
      ctx.moveTo(r * x0, r * y);
      ctx.lineTo(r * x1, r * y);
      ctx.stroke();
    }
    ctx.restore();
    ctx.globalAlpha = 0.5 + 0.5 * Math.max(0, Math.sin(t * 2.5));
    this.sparkle(r * 0.4, -r * 0.35, cell * 0.28);
    ctx.globalAlpha = 1;
  }

  /** A current: rows of dashes flowing along the arrow, with one big arrowhead. */
  private drawCurrent(r: number, t: number): void {
    const { ctx, cell } = this;
    const period = cell * 1.1;
    ctx.lineWidth = cell * 0.08;
    ctx.globalAlpha = 0.8;
    for (let j = -2; j <= 2; j++) {
      const y = j * r * 0.36;
      const shift = (t * cell * 1.6 + j * cell * 0.37 + period * 10) % period;
      ctx.beginPath();
      for (let x = -r - period + shift; x < r; x += period) {
        ctx.moveTo(x, y);
        ctx.lineTo(x + cell * 0.45, y);
      }
      ctx.stroke();
    }
    const w = cell * 0.36;
    ctx.globalAlpha = 0.95;
    ctx.lineWidth = cell * 0.15;
    ctx.beginPath();
    ctx.moveTo(-w * 0.6, -w);
    ctx.lineTo(w * 0.4, 0);
    ctx.lineTo(-w * 0.6, w);
    ctx.stroke();
    ctx.globalAlpha = 1;
  }

  /** A black hole: a dark heart and spiral arms turning inward. */
  private drawVortex(r: number, t: number): void {
    const { ctx, cell } = this;
    const heart = ctx.createRadialGradient(0, 0, 0, 0, 0, r * 0.55);
    heart.addColorStop(0, "rgba(0,0,0,.85)");
    heart.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = heart;
    ctx.fillRect(-r, -r, r * 2, r * 2);

    ctx.rotate(t * 1.4);
    ctx.lineWidth = cell * 0.1;
    ctx.globalAlpha = 0.8;
    for (let arm = 0; arm < 3; arm++) {
      ctx.beginPath();
      for (let k = 0; k <= 20; k++) {
        const s = k / 20;
        const a = (arm * Math.PI * 2) / 3 + s * 3.2;
        const rr = r * (0.95 - s * 0.85);
        if (k === 0) ctx.moveTo(Math.cos(a) * rr, Math.sin(a) * rr);
        else ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
      }
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }

  /** Obstacles: big emoji standing on a shadow; movers waddle, bumped ones jiggle. */
  private drawObstacles(frame: Frame): void {
    const { ctx, cell } = this;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    for (const o of frame.field.obstacles) {
      const age = frame.time - o.born;
      const pop = this.reduced ? (age >= 0 ? 1 : 0) : springPop(age);
      if (pop <= 0.01) continue;
      const { x, y } = this.px(o);
      const size = o.r * cell;

      ctx.fillStyle = "rgba(0,0,0,.2)";
      ctx.beginPath();
      ctx.ellipse(x, y + size * 0.62, size * 0.9 * pop, size * 0.32 * pop, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(this.obstacleTilt(o, frame.time));
      ctx.scale(pop, pop);
      ctx.font = `${Math.round(size * 2.3)}px ${EMOJI_STACK}`;
      ctx.fillStyle = "#000";
      ctx.fillText(o.emoji, 0, size * 0.06);
      ctx.restore();
    }
  }

  private obstacleTilt(o: Obstacle, time: number): number {
    if (this.reduced) return 0;
    const since = time - o.hitAt;
    const jiggle = since < 0.45 ? Math.sin(since * 38) * (1 - since / 0.45) * 0.22 : 0;
    const waddle = o.path ? Math.sin(time * 9 + o.path.phase) * 0.1 : 0;
    return jiggle + waddle;
  }

  /** A ring under the finger, so the child can see where the snake is headed. */
  private drawAim(frame: Frame): void {
    const aim = frame.aim;
    if (!aim) return;
    const { ctx, cell } = this;
    const { x, y } = this.px(aim);
    const pulse = this.reduced ? 0 : Math.sin(frame.time * 6) * 0.08;
    const r = cell * 0.62 * (1 + pulse);
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.lineWidth = cell * 0.2;
    ctx.strokeStyle = "rgba(0,0,0,.18)";
    ctx.stroke();
    ctx.lineWidth = cell * 0.1;
    ctx.strokeStyle = "rgba(255,255,255,.75)";
    ctx.stroke();
  }

  /* ---------------------------------------------------------------- *
   * Snake
   * ---------------------------------------------------------------- */

  /** `dist` is how far along the body, in board units. */
  private segmentColor(dist: number, skin: Skin, dark = false): string {
    if (skin.rainbow) return `hsl(${((dist / SEGMENT_GAP) * 16 + this.hue) % 360} 84% ${dark ? 40 : 60}%)`;
    return dark ? darken(skin.body) : skin.body;
  }

  /** How far along the body (in board units) each swallowed pod currently is. */
  private gulpPositions(frame: Frame, length: number): number[] {
    if (this.reduced) return [];
    const out: number[] = [];
    for (const at of frame.gulps) {
      const p = (frame.time - at) * GULP_SPEED;
      if (p >= 0 && p < length) out.push(p);
    }
    return out;
  }

  /** The point `dist` units along the body. */
  private pointAlong(pts: Pt[], dist: number): Pt {
    const f = dist / BODY_STEP;
    const i = Math.min(Math.floor(f), pts.length - 1);
    const a = pts[i];
    const b = pts[i + 1];
    if (!b) return a;
    const k = f - i;
    return { x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k };
  }

  private strokeBody(pts: Pt[], width: (i: number) => number, color: (i: number) => string): void {
    const { ctx } = this;
    for (let i = pts.length - 1; i > 0; i--) {
      ctx.strokeStyle = color(i);
      ctx.lineWidth = width(i);
      ctx.beginPath();
      ctx.moveTo(pts[i - 1].x, pts[i - 1].y);
      ctx.lineTo(pts[i].x, pts[i].y);
      ctx.stroke();
    }
  }

  /**
   * The body is stroked tail-first through points along the head's path, so
   * where it loops over itself the part nearer the head lies on top.
   */
  private drawSnake(frame: Frame): void {
    const { ctx, cell } = this;
    const { skin } = frame;
    const pts = frame.snake.points(BODY_STEP).map((p) => this.px(p));
    const n = pts.length;
    const length = Math.max(BODY_STEP, (n - 1) * BODY_STEP);
    const taper = (i: number) => 1 - ((i * BODY_STEP) / length) * 0.42;
    const gulps = this.gulpPositions(frame, length);
    const bulge = (i: number) => {
      let extra = 0;
      for (const p of gulps) extra += cell * 0.3 * Math.max(0, 1 - Math.abs(i * BODY_STEP - p) / 1.05);
      return extra;
    };
    const width = (i: number) => cell * 0.78 * taper(i) + bulge(i);

    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    // outline a shade darker, so the body reads on every world
    if (skin.glow && !this.reduced) {
      ctx.shadowColor = skin.body;
      ctx.shadowBlur = cell * 0.5;
    }
    this.strokeBody(pts, (i) => width(i) + cell * 0.12, (i) => this.segmentColor(i * BODY_STEP, skin, true));
    ctx.shadowBlur = 0;
    this.strokeBody(pts, width, (i) => this.segmentColor(i * BODY_STEP, skin));

    // the swallowed pod, faintly visible inside the bulge
    if (gulps.length > 0) {
      ctx.fillStyle = this.world.pod.top;
      ctx.globalAlpha = 0.45;
      for (const p of gulps) {
        const at = this.pointAlong(pts, p);
        ctx.beginPath();
        ctx.arc(at.x, at.y, cell * 0.24, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    }

    if (!skin.rainbow) {
      ctx.fillStyle = skin.spot;
      ctx.globalAlpha = 0.55;
      const every = Math.round((SEGMENT_GAP * 3) / BODY_STEP);
      for (let i = Math.round((SEGMENT_GAP * 2) / BODY_STEP); i < n; i += every) {
        ctx.beginPath();
        ctx.arc(pts[i].x, pts[i].y, cell * 0.13 * taper(i), 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    }

    // a glossy highlight toward the light — one path, so the translucent
    // stroke does not pile up where it overlaps itself
    const ox = -cell * 0.07;
    const oy = -cell * 0.1;
    ctx.strokeStyle = skin.belly;
    ctx.globalAlpha = 0.5;
    ctx.lineWidth = cell * 0.2;
    ctx.beginPath();
    const stop = Math.max(1, n - Math.round(SEGMENT_GAP / BODY_STEP));
    for (let i = 0; i < stop; i++) {
      if (i === 0) ctx.moveTo(pts[i].x + ox, pts[i].y + oy);
      else ctx.lineTo(pts[i].x + ox, pts[i].y + oy);
    }
    ctx.stroke();
    ctx.globalAlpha = 1;

    this.drawHead(frame, pts[0]);
  }

  /** 0..1 — how wide the mouth is open for the nearest pod straight ahead. */
  private mouthOpen(frame: Frame, head: Pt): number {
    const { cell } = this;
    const dir = frame.snake.dir;
    let open = 0;
    for (const t of frame.tokens) {
      const c = this.px(t);
      const dx = (c.x - head.x) / cell;
      const dy = (c.y - head.y) / cell;
      const ahead = dx * dir.x + dy * dir.y;
      const side = Math.abs(-dx * dir.y + dy * dir.x);
      if (ahead < -0.1 || side > 0.7) continue;
      open = Math.max(open, Math.min(1, Math.max(0, (2.4 - ahead) / 1.6)));
    }
    return open;
  }

  private drawHead(frame: Frame, head: Pt): void {
    const { ctx, cell } = this;
    const { skin, mood, time } = frame;
    const dir = frame.snake.dir;
    const lastBite = frame.gulps.length > 0 ? frame.gulps[frame.gulps.length - 1] : -99;
    const sinceBite = time - lastBite;
    const chomp = !this.reduced && sinceBite < 0.2 ? Math.sin((sinceBite / 0.2) * Math.PI) * 0.16 : 0;
    const r = cell * 0.5 * (1 + chomp);
    const angle = Math.atan2(dir.y, dir.x);
    const gap = this.mouthOpen(frame, head) * 0.62;

    // head, cut open like a mouth when food is straight ahead
    ctx.beginPath();
    if (gap > 0.02) {
      ctx.moveTo(head.x, head.y);
      ctx.arc(head.x, head.y, r, angle + gap, angle - gap + Math.PI * 2);
      ctx.closePath();
    } else {
      ctx.arc(head.x, head.y, r, 0, Math.PI * 2);
    }
    if (skin.glow && !this.reduced) {
      ctx.shadowColor = skin.body;
      ctx.shadowBlur = cell * 0.7;
    }
    ctx.lineWidth = cell * 0.12;
    ctx.strokeStyle = this.segmentColor(0, skin, true);
    ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.fillStyle = this.segmentColor(0, skin);
    ctx.fill();

    if (gap > 0.02) {
      ctx.fillStyle = "#7A1F35";
      ctx.beginPath();
      ctx.moveTo(head.x, head.y);
      ctx.arc(head.x, head.y, r * 0.86, angle - gap, angle + gap);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = "#F06B8B";
      ctx.beginPath();
      ctx.ellipse(head.x + dir.x * r * 0.5, head.y + dir.y * r * 0.5, r * 0.2, r * 0.13, angle, 0, Math.PI * 2);
      ctx.fill();
    } else if (mood === "idle") {
      const flick = Math.sin(time * 7);
      if (flick > 0.4) {
        const len = r * (0.8 + flick * 0.5);
        ctx.strokeStyle = "#E8436B";
        ctx.lineWidth = Math.max(1.6, cell * 0.075);
        ctx.beginPath();
        ctx.moveTo(head.x + dir.x * r * 0.7, head.y + dir.y * r * 0.7);
        ctx.lineTo(head.x + dir.x * (r + len), head.y + dir.y * (r + len));
        ctx.stroke();
      }
    }

    const px = -dir.y;
    const py = dir.x;

    // rosy cheeks by the corners of the mouth
    ctx.fillStyle = "rgba(255,105,140,.42)";
    for (const side of [1, -1]) {
      ctx.beginPath();
      ctx.arc(head.x + dir.x * r * 0.48 + px * side * r * 0.58, head.y + dir.y * r * 0.48 + py * side * r * 0.58, r * 0.16, 0, Math.PI * 2);
      ctx.fill();
    }

    if (mood === "happy" && gap <= 0.02) {
      ctx.strokeStyle = skin.eye;
      ctx.lineWidth = r * 0.1;
      ctx.beginPath();
      ctx.arc(head.x + dir.x * r * 0.1, head.y + dir.y * r * 0.1, r * 0.6, angle - 0.55, angle + 0.55);
      ctx.stroke();
    }

    const look = frame.facing;
    const blink = mood === "idle" && (time + 0.7) % 3.4 < 0.13;
    for (const side of [1, -1]) {
      const ex = head.x + dir.x * r * 0.1 + px * side * r * 0.5;
      const ey = head.y + dir.y * r * 0.1 + py * side * r * 0.5;
      const er = r * 0.32;
      ctx.strokeStyle = skin.eye;
      ctx.lineWidth = r * 0.1;

      if (mood === "happy") {
        // closed, smiling eyes: ∩
        ctx.beginPath();
        ctx.arc(ex, ey + er * 0.35, er * 0.7, Math.PI * 1.1, Math.PI * 1.9);
        ctx.stroke();
        continue;
      }
      if (mood === "bonk") {
        // squeezed shut: > <
        const k = er * 0.6;
        const toward = side * k * 0.8;
        ctx.beginPath();
        ctx.moveTo(ex + px * toward - dir.x * k, ey + py * toward - dir.y * k);
        ctx.lineTo(ex - px * toward, ey - py * toward);
        ctx.lineTo(ex + px * toward + dir.x * k, ey + py * toward + dir.y * k);
        ctx.stroke();
        continue;
      }
      if (blink) {
        ctx.beginPath();
        ctx.moveTo(ex - er * 0.7, ey);
        ctx.lineTo(ex + er * 0.7, ey);
        ctx.stroke();
        continue;
      }

      ctx.fillStyle = "#fff";
      ctx.beginPath();
      ctx.arc(ex, ey, er, 0, Math.PI * 2);
      ctx.fill();
      ctx.lineWidth = Math.max(1, r * 0.05);
      ctx.strokeStyle = "rgba(0,0,0,.25)";
      ctx.stroke();

      if (mood === "dizzy") {
        ctx.strokeStyle = skin.eye;
        ctx.lineWidth = Math.max(1.2, r * 0.08);
        ctx.beginPath();
        for (let k = 0; k <= 24; k++) {
          const t = k / 24;
          const a = t * Math.PI * 4 + time * 10 * side;
          const rr = er * 0.85 * t;
          if (k === 0) ctx.moveTo(ex, ey);
          else ctx.lineTo(ex + Math.cos(a) * rr, ey + Math.sin(a) * rr);
        }
        ctx.stroke();
        continue;
      }

      // pupils look toward the finger, before the body turns
      const pupilX = ex + look.x * er * 0.38;
      const pupilY = ey + look.y * er * 0.38;
      ctx.fillStyle = skin.eye;
      ctx.beginPath();
      ctx.arc(pupilX, pupilY, er * 0.55, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#fff";
      ctx.beginPath();
      ctx.arc(pupilX - er * 0.18, pupilY - er * 0.2, er * 0.2, 0, Math.PI * 2);
      ctx.fill();
    }

    if (mood === "dizzy") {
      // little stars circling the head
      ctx.fillStyle = "#FFD34D";
      for (let k = 0; k < 3; k++) {
        const a = time * 4 + (k * Math.PI * 2) / 3;
        this.sparkle(head.x + Math.cos(a) * r * 1.3, head.y - r * 0.4 + Math.sin(a) * r * 0.45, r * 0.3);
      }
    }
  }

  /* ---------------------------------------------------------------- *
   * FX
   * ---------------------------------------------------------------- */

  /** A soft four-point star, filled with the current fillStyle. */
  private sparkle(x: number, y: number, r: number): void {
    const { ctx } = this;
    ctx.beginPath();
    ctx.moveTo(x, y - r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.quadraticCurveTo(x, y, x, y + r);
    ctx.quadraticCurveTo(x, y, x - r, y);
    ctx.quadraticCurveTo(x, y, x, y - r);
    ctx.fill();
  }

  private drawFx(fx: Fx): void {
    const { ctx, cell } = this;
    for (const p of fx.particles) {
      ctx.globalAlpha = Math.min(1, p.life);
      ctx.fillStyle = p.color;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.spin);
      ctx.fillRect(-p.radius, -p.radius * 0.6, p.radius * 2, p.radius * 1.2);
      ctx.restore();
    }
    ctx.globalAlpha = 1;

    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = `700 ${Math.round(cell * 0.6)}px ${FONT_STACK}`;
    ctx.lineWidth = Math.max(3, cell * 0.12);
    ctx.lineJoin = "round";
    for (const f of fx.floats) {
      ctx.globalAlpha = Math.min(1, f.life * 1.4);
      ctx.strokeStyle = "rgba(255,255,255,.9)";
      ctx.strokeText(f.text, f.x, f.y);
      ctx.fillStyle = f.color;
      ctx.fillText(f.text, f.x, f.y);
    }
    ctx.globalAlpha = 1;
  }
}

/** A springy 0 → overshoot → 1 for pods popping onto the board. */
function springPop(t: number): number {
  if (t <= 0) return 0;
  if (t > 1.2) return 1;
  return 1 - Math.exp(-t * 9) * Math.cos(t * 15);
}

const darkCache = new Map<string, string>();

/** A hex colour about a third darker — body outlines. */
function darken(hex: string): string {
  const hit = darkCache.get(hex);
  if (hit) return hit;
  const m = /^#([0-9a-f]{6})$/i.exec(hex);
  if (!m) return hex;
  const n = parseInt(m[1], 16);
  const f = (c: number) => Math.round(c * 0.66);
  const out = `rgb(${f(n >> 16)}, ${f((n >> 8) & 255)}, ${f(n & 255)})`;
  darkCache.set(hex, out);
  return out;
}
