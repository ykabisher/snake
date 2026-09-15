import type { Cell, Direction } from "./types";
import type { Skin } from "../content/skins";
import { WORLDS, type PodStyle, type World } from "../content/worlds";
import type { Fx } from "./fx";
import type { Ambient } from "./ambient";
import { GRID } from "./constants";
import { hashString, seeded } from "./rng";

/** Everything drawn on the canvas. Pure rendering — no game rules here. */

export interface PlacedToken extends Cell {
  label: string;
  correct: boolean;
  born: number;
}

/** The snake's face. `happy` after a right answer, `dizzy` after a wrong one. */
export type Mood = "idle" | "happy" | "dizzy" | "dead";

/** A turn was just accepted — draw chevrons from the head that way. */
export interface TurnCue {
  dir: Direction;
  at: number;
}

export interface Frame {
  /** Cell positions this step. */
  snake: Cell[];
  /** Where each segment was on the previous step, for smooth interpolation. */
  prev: Cell[];
  /** 0..1 progress between the two, so the snake glides instead of ticking. */
  alpha: number;
  direction: Direction;
  /** Where the player last asked to go — the eyes look there before the body turns. */
  facing: Direction;
  tokens: PlacedToken[];
  skin: Skin;
  /** Seconds since the run started — drives pulses and the tongue flick. */
  time: number;
  mood: Mood;
  /** Run times of recent bites; each sends a bulge down the body. */
  gulps: number[];
  cue: TurnCue | null;
}

interface Pt {
  x: number;
  y: number;
}

const FONT_STACK = "Fredoka, Heebo, sans-serif";
const EMOJI_STACK = '"Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif';

/** Seconds for a new world to spread out from the snake's head. */
const REVEAL_S = 1.1;
/** Body segments per second a swallowed pod travels toward the tail. */
const GULP_SPEED = 13;
/** Seconds the turn chevrons stay visible. */
const CUE_S = 0.42;

export class Renderer {
  private ctx: CanvasRenderingContext2D;
  /** Board edge in CSS pixels. */
  size = 300;
  /** One grid cell in CSS pixels. */
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
    this.drawMotes(ambient);
    this.drawTokens(frame);
    this.drawCritter(ambient);
    const head = this.drawSnake(frame);
    this.drawCue(frame, head);
    this.drawFx(fx);
    ctx.restore();

    if (fx.flash > 0) {
      ctx.fillStyle = fx.flashColor;
      ctx.globalAlpha = fx.flash * 0.26;
      ctx.fillRect(0, 0, this.size, this.size);
      ctx.globalAlpha = 1;
    }
  }

  /** Centre of a cell, in CSS pixels. */
  cellCenter(cell: Cell): { x: number; y: number } {
    return { x: (cell.x + 0.5) * this.cell, y: (cell.y + 0.5) * this.cell };
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
      const { x, y } = this.cellCenter(token);

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
   * Snake
   * ---------------------------------------------------------------- */

  private segmentColor(index: number, skin: Skin, dark = false): string {
    if (skin.rainbow) return `hsl(${(index * 16 + this.hue) % 360} 84% ${dark ? 40 : 60}%)`;
    return dark ? darken(skin.body) : skin.body;
  }

  /** Interpolated centre of segment `i`. Snaps instead of gliding across a wrap. */
  private lerpSegment(frame: Frame, i: number): Pt {
    const to = frame.snake[i];
    const from = frame.prev[i] ?? to;
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    if (Math.abs(dx) > 1 || Math.abs(dy) > 1) return this.cellCenter(to);
    return {
      x: (from.x + dx * frame.alpha + 0.5) * this.cell,
      y: (from.y + dy * frame.alpha + 0.5) * this.cell,
    };
  }

  /** Skip the pair that spans a wrapped edge. */
  private joined(a: Pt, b: Pt): boolean {
    return Math.hypot(a.x - b.x, a.y - b.y) <= this.cell * 1.6;
  }

  /** Where along the body (in segments) each swallowed pod currently is. */
  private gulpPositions(frame: Frame, n: number): number[] {
    if (this.reduced) return [];
    const out: number[] = [];
    for (const at of frame.gulps) {
      const p = (frame.time - at) * GULP_SPEED;
      if (p >= 0 && p < n - 1) out.push(p);
    }
    return out;
  }

  private pointAlong(pts: Pt[], p: number): Pt {
    const i = Math.floor(p);
    const a = pts[i];
    const b = pts[i + 1];
    if (!b || !this.joined(a, b)) return a;
    const f = p - i;
    return { x: a.x + (b.x - a.x) * f, y: a.y + (b.y - a.y) * f };
  }

  private strokeBody(pts: Pt[], width: (i: number) => number, color: (i: number) => string): void {
    const { ctx } = this;
    for (let i = pts.length - 1; i > 0; i--) {
      if (!this.joined(pts[i], pts[i - 1])) continue;
      ctx.strokeStyle = color(i);
      ctx.lineWidth = width(i);
      ctx.beginPath();
      ctx.moveTo(pts[i - 1].x, pts[i - 1].y);
      ctx.lineTo(pts[i].x, pts[i].y);
      ctx.stroke();
    }
  }

  /** Draws the body and head; returns where the head is. */
  private drawSnake(frame: Frame): Pt {
    const { ctx, cell } = this;
    const { skin } = frame;
    const pts = frame.snake.map((_, i) => this.lerpSegment(frame, i));
    const n = pts.length;
    const taper = (i: number) => 1 - (i / n) * 0.42;
    const gulps = this.gulpPositions(frame, n);
    const bulge = (i: number) => {
      let extra = 0;
      for (const p of gulps) extra += cell * 0.3 * Math.max(0, 1 - Math.abs(i - 0.5 - p) / 1.4);
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
    this.strokeBody(pts, (i) => width(i) + cell * 0.12, (i) => this.segmentColor(i, skin, true));
    ctx.shadowBlur = 0;
    this.strokeBody(pts, width, (i) => this.segmentColor(i, skin));

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
      for (let i = 2; i < n; i += 3) {
        ctx.beginPath();
        ctx.arc(pts[i].x, pts[i].y, cell * 0.13 * taper(i), 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    }

    // a glossy highlight toward the light — one path, so the translucent
    // stroke does not pile up where segments overlap
    const ox = -cell * 0.07;
    const oy = -cell * 0.1;
    ctx.strokeStyle = skin.belly;
    ctx.globalAlpha = 0.5;
    ctx.lineWidth = cell * 0.2;
    ctx.beginPath();
    let pen = false;
    for (let i = 0; i < Math.max(1, n - 2); i++) {
      if (i > 0 && !this.joined(pts[i - 1], pts[i])) pen = false;
      if (!pen) ctx.moveTo(pts[i].x + ox, pts[i].y + oy);
      else ctx.lineTo(pts[i].x + ox, pts[i].y + oy);
      pen = true;
    }
    ctx.stroke();
    ctx.globalAlpha = 1;

    this.drawHead(frame, pts[0]);
    return pts[0];
  }

  /** 0..1 — how wide the mouth is open for the nearest pod straight ahead. */
  private mouthOpen(frame: Frame, head: Pt): number {
    const { cell } = this;
    const dir = frame.direction;
    let open = 0;
    for (const t of frame.tokens) {
      const c = this.cellCenter(t);
      const dx = (c.x - head.x) / cell;
      const dy = (c.y - head.y) / cell;
      const ahead = dx * dir.x + dy * dir.y;
      const side = Math.abs(-dx * dir.y + dy * dir.x);
      if (ahead < -0.1 || side > 0.6) continue;
      open = Math.max(open, Math.min(1, Math.max(0, (2.4 - ahead) / 1.6)));
    }
    return open;
  }

  private drawHead(frame: Frame, head: Pt): void {
    const { ctx, cell } = this;
    const { skin, mood, time } = frame;
    const dir = frame.direction;
    const lastBite = frame.gulps.length > 0 ? frame.gulps[frame.gulps.length - 1] : -99;
    const sinceBite = time - lastBite;
    const chomp = !this.reduced && sinceBite < 0.2 ? Math.sin((sinceBite / 0.2) * Math.PI) * 0.16 : 0;
    const r = cell * 0.5 * (1 + chomp);
    const angle = Math.atan2(dir.y, dir.x);
    const gap = (mood === "dead" ? 0 : this.mouthOpen(frame, head)) * 0.62;

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
      if (mood === "dead") {
        const k = er * 0.55;
        ctx.beginPath();
        ctx.moveTo(ex - k, ey - k);
        ctx.lineTo(ex + k, ey + k);
        ctx.moveTo(ex + k, ey - k);
        ctx.lineTo(ex - k, ey + k);
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

      // pupils look where the player last pointed, before the body turns
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

  /** Two chevrons shooting out of the head in the direction just chosen. */
  private drawCue(frame: Frame, head: Pt): void {
    const cue = frame.cue;
    if (!cue || frame.mood === "dead") return;
    const t = (frame.time - cue.at) / CUE_S;
    if (t < 0 || t >= 1) return;
    const { ctx, cell } = this;
    const d = cue.dir;
    const px = -d.y;
    const py = d.x;
    const travel = this.reduced ? 0 : t * cell * 0.9;
    const w = cell * 0.3;

    ctx.save();
    ctx.globalAlpha = 1 - t * t;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    for (let k = 0; k < 2; k++) {
      const dist = cell * 0.9 + k * cell * 0.42 + travel;
      const cx = head.x + d.x * dist;
      const cy = head.y + d.y * dist;
      const chevron = () => {
        ctx.beginPath();
        ctx.moveTo(cx - d.x * w + px * w, cy - d.y * w + py * w);
        ctx.lineTo(cx, cy);
        ctx.lineTo(cx - d.x * w - px * w, cy - d.y * w - py * w);
      };
      chevron();
      ctx.strokeStyle = "rgba(0,0,0,.3)";
      ctx.lineWidth = cell * 0.2;
      ctx.stroke();
      chevron();
      ctx.strokeStyle = "#fff";
      ctx.lineWidth = cell * 0.11;
      ctx.stroke();
    }
    ctx.restore();
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
