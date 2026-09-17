import type {
  Difficulty,
  FlyAnswer,
  GameView,
  ModeDefinition,
  ModeRunner,
  Pt,
  RunStats,
  StickerResult,
  ToastMessage,
} from "./types";
import type { Skin } from "../content/skins";
import { WORLDS, type World } from "../content/worlds";
import { Renderer, type Mood, type PlacedToken } from "./renderer";
import { Fx } from "./fx";
import { Ambient } from "./ambient";
import { Snake } from "./snake";
import { BOOST_FACTOR, BOOST_LINGER, Field, type Contact, type Obstacle, type Zone } from "./field";
import { sfx, music } from "./audio";
import { storage, bestKey } from "./storage";
import { awardSticker } from "./album";
import { awardTrophy } from "./trophies";
import { between, clamp, shuffle } from "./rng";
import {
  AIM_ARRIVE,
  AIM_OVERSHOOT,
  BASE_SPEED,
  BUMP_COOLDOWN,
  EAT_RADIUS,
  GRID,
  HEAD_RADIUS,
  LEVEL_DOWN_STREAK,
  MAX_LENGTH,
  MAX_SPEED,
  MIN_LENGTH,
  SAFE_LANE,
  SEGMENT_GAP,
  SPEED_PER_CORRECT,
  SPEED_PER_LEVEL,
  START_LENGTH,
  TURN_RATE,
  UNITS_PER_WORLD,
  WORLDS_PER_RUN,
  WRONG_PENALTY,
  WRONG_SHRINK,
} from "./constants";

export interface EngineCallbacks {
  onView: (view: GameView) => void;
  onToast: (toast: ToastMessage) => void;
}

export interface StartOptions {
  mode: ModeDefinition;
  difficulty: Difficulty;
  skin: Skin;
}

/**
 * The game. Owns the loop, the snake, the board and the journey through the
 * worlds; asks the active ModeDefinition what to put on the board and what a
 * correct answer is worth. Pushes a GameView to React only when something
 * discrete changes — never per frame.
 */
export class GameEngine {
  private renderer: Renderer;
  private fx: Fx;
  private ambient: Ambient;
  private reduced: boolean;

  private mode!: ModeDefinition;
  private runner!: ModeRunner;
  private skin!: Skin;

  /** The worlds this run travels through, and where along it the snake is. */
  private route: World[] = [];
  private leg = 0;
  private legDone = 0;

  private snake = new Snake();
  private field = new Field();
  private tokens: PlacedToken[] = [];

  /** Where the finger (or mouse) is, in board units — the head chases it. */
  private aimAt: Pt | null = null;
  /** The way the arrow keys last pointed, used when there is no finger. */
  private keyAngle: number | null = null;
  /** The head reached the finger and is gliding past before it loops back. */
  private arrived = false;
  private boostUntil = 0;
  private zone: Zone | null = null;
  private touching: Obstacle | null = null;
  private bumpAt = -99;

  private level = 1;
  private score = 0;
  private best = 0;
  private prevBest = 0;
  private correct = 0;
  private mistakes = 0;
  private completed = 0;
  private streak = 0;
  private wrongStreak = 0;
  private wrongNonce = 0;
  private roundNonce = 0;

  // cosmetic state handed to the renderer
  private mood: Mood = "idle";
  private moodUntil = 0;
  private gulps: number[] = [];
  private fly: FlyAnswer | null = null;
  /** Never reset — React tells flights apart by id across runs. */
  private flyId = 0;
  private trophy: string | null = null;
  private sticker: StickerResult | null = null;

  private speed = BASE_SPEED;
  private lastFrame = 0;
  private time = 0;
  private overAt = 0;
  private raf = 0;
  private roundTimer: number | null = null;
  private overTimer: number | null = null;

  private running = false;
  private paused = false;
  /** The journey is finished and the celebration is playing. */
  private over = false;
  private toastId = 0;

  constructor(canvas: HTMLCanvasElement, private cb: EngineCallbacks) {
    this.reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    this.renderer = new Renderer(canvas, this.reduced);
    this.fx = new Fx(this.reduced);
    this.ambient = new Ambient(this.reduced);
  }

  /* ---------------------------------------------------------------- *
   * Lifecycle
   * ---------------------------------------------------------------- */

  start(opts: StartOptions): void {
    this.clearTimers();
    this.mode = opts.mode;
    this.runner = opts.mode.create();
    this.skin = opts.skin;

    this.level = opts.mode.startLevel(opts.difficulty);
    this.prevBest = storage.get(bestKey(opts.mode.id), 0);
    this.best = this.prevBest;

    this.route = shuffle([...WORLDS]).slice(0, WORLDS_PER_RUN);
    this.leg = 0;
    this.legDone = 0;

    this.snake.reset(GRID / 2 - 2, GRID / 2, 0, START_LENGTH);
    this.aimAt = null;
    this.keyAngle = null;
    this.arrived = false;
    this.boostUntil = 0;
    this.zone = null;
    this.touching = null;
    this.bumpAt = -99;
    this.tokens = [];

    this.score = 0;
    this.correct = 0;
    this.mistakes = 0;
    this.completed = 0;
    this.streak = 0;
    this.wrongStreak = 0;
    this.mood = "idle";
    this.moodUntil = 0;
    this.gulps = [];
    this.fly = null;
    this.trophy = null;
    this.sticker = null;
    this.fx.clear();

    this.running = true;
    this.paused = false;
    this.over = false;
    this.time = 0;

    this.updateSpeed();
    this.resize();
    this.enterWorld(false);
    this.beginRound();
    this.publish();
    sfx.start();
    music.start();

    this.lastFrame = performance.now();
    cancelAnimationFrame(this.raf);
    this.raf = requestAnimationFrame(this.loop);
  }

  stop(): void {
    this.running = false;
    this.paused = false;
    this.over = false;
    cancelAnimationFrame(this.raf);
    this.clearTimers();
    music.stop();
    this.publish("menu");
  }

  destroy(): void {
    cancelAnimationFrame(this.raf);
    this.clearTimers();
    music.stop();
  }

  setPaused(paused: boolean): void {
    if (!this.running || this.over || this.paused === paused) return;
    this.paused = paused;
    this.aimAt = null;
    if (paused) music.pause();
    else music.resume();
    this.publish();
    if (!paused) {
      this.lastFrame = performance.now();
      this.raf = requestAnimationFrame(this.loop);
    }
  }

  togglePause(): void {
    this.setPaused(!this.paused);
  }

  get isPlaying(): boolean {
    return this.running && !this.over;
  }

  /** Fit the board to `available` CSS pixels (the shorter side of its box). */
  resize(available?: number): void {
    const px = available ?? this.renderer.size;
    this.renderer.resize(px);
    this.ambient.resize(this.renderer.size);
  }

  /** Arrive in the current world of the route, with a fresh random layout. */
  private enterWorld(reveal: boolean): void {
    const world = this.route[this.leg];
    const head = this.snake.head;
    this.renderer.setWorld(world, reveal ? { ...this.renderer.px(head), at: this.time } : null);
    this.ambient.setWorld(world, this.renderer.size);
    this.zone = null;

    // keep the snake, the way ahead of it and any pods clear of the new things
    const dir = this.snake.dir;
    const keepOut = [
      { ...head, r: 2.4 },
      ...[1.5, 2.5, 3.5, 4.5].map((d) => ({ x: head.x + dir.x * d, y: head.y + dir.y * d, r: 1.3 })),
      ...this.snake.points(SEGMENT_GAP).map((p) => ({ ...p, r: 0.9 })),
      ...this.tokens.map((t) => ({ x: t.x, y: t.y, r: 1 })),
    ];
    this.field.layout(world, keepOut, head, this.time);
    this.toast(`${world.icon} ${world.name}!`, "info");
  }

  private setMood(mood: Mood, seconds: number): void {
    this.mood = mood;
    this.moodUntil = this.time + seconds;
  }

  /* ---------------------------------------------------------------- *
   * Input
   * ---------------------------------------------------------------- */

  /** The finger (or mouse) is at this page position. */
  aim(clientX: number, clientY: number): void {
    if (!this.isPlaying || this.paused) return;
    const p = this.renderer.toBoard(clientX, clientY);
    const m = 0.4;
    this.aimAt = { x: clamp(p.x, m, GRID - m), y: clamp(p.y, m, GRID - m) };
    this.keyAngle = null;
  }

  /** The finger lifted — glide straight on. */
  release(): void {
    this.aimAt = null;
  }

  /** A finger touched down: a tiny swish says the snake heard it. */
  touchDown(): void {
    if (this.isPlaying && !this.paused) sfx.turn();
  }

  /** Arrow keys: head this way (radians). */
  steer(angle: number): void {
    if (!this.isPlaying || this.paused) return;
    this.keyAngle = angle;
    this.aimAt = null;
  }

  /* ---------------------------------------------------------------- *
   * Rounds
   * ---------------------------------------------------------------- */

  private beginRound(): void {
    const round = this.runner.nextRound(this.level);
    const placed: PlacedToken[] = [];
    this.tokens = [];
    for (const token of round.tokens) {
      const spot = this.freeSpot(placed);
      if (!spot) break;
      // a small stagger, so the pods pop in one after another
      placed.push({
        ...spot,
        label: token.label,
        correct: token.correct,
        born: this.time + placed.length * 0.07,
      });
    }
    this.tokens = placed;
    this.roundNonce++;
  }

  /**
   * A spot for a pod: clear of obstacles and mover routes, other pods, the
   * snake's body, and the lane straight ahead of the head.
   */
  private freeSpot(alsoTaken: PlacedToken[]): Pt | null {
    const head = this.snake.head;
    const dir = this.snake.dir;
    const body = this.snake.points(SEGMENT_GAP);
    const others = [...this.tokens, ...alsoTaken];
    const m = 0.9;
    for (let tries = 0; tries < 300; tries++) {
      const p = { x: between(m, GRID - m), y: between(m, GRID - m) };
      if (!this.field.isClear(p, 1)) continue;
      if (others.some((t) => Math.hypot(t.x - p.x, t.y - p.y) < 1.7)) continue;
      if (body.some((b) => Math.hypot(b.x - p.x, b.y - p.y) < 1.1)) continue;
      const dx = p.x - head.x;
      const dy = p.y - head.y;
      if (Math.hypot(dx, dy) < 2) continue;
      const ahead = dx * dir.x + dy * dir.y;
      const side = Math.abs(-dx * dir.y + dy * dir.x);
      if (ahead > 0 && ahead < SAFE_LANE && side < 1.3) continue;
      return p;
    }
    return null;
  }

  private replaceDecoy(token: PlacedToken): void {
    const index = this.tokens.indexOf(token);
    if (index < 0) return;
    this.tokens.splice(index, 1);
    const spot = this.freeSpot([]);
    if (!spot) return;
    this.tokens.push({
      ...spot,
      label: this.runner.decoy(this.level),
      correct: false,
      born: this.time,
    });
  }

  /* ---------------------------------------------------------------- *
   * Rules
   * ---------------------------------------------------------------- */

  private updateSpeed(): void {
    this.speed = clamp(
      BASE_SPEED + this.level * SPEED_PER_LEVEL + this.correct * SPEED_PER_CORRECT,
      BASE_SPEED,
      MAX_SPEED,
    );
  }

  /**
   * Ratchet the question difficulty up on a streak of completed units, down on
   * repeated misses. Quietly — the worlds are the progress the player sees.
   */
  private adjustLevel(): void {
    if (this.streak >= this.mode.levelUpStreak && this.level < this.mode.maxLevel) {
      this.level++;
      this.streak = 0;
      this.wrongStreak = 0;
    } else if (this.wrongStreak >= LEVEL_DOWN_STREAK && this.level > 1) {
      this.level--;
      this.wrongStreak = 0;
      this.streak = 0;
    }
    this.updateSpeed();
  }

  private onCorrect(token: PlacedToken): void {
    const { x, y } = this.renderer.px(token);
    this.correct++;
    this.wrongStreak = 0;
    this.fx.burst(x, y, ["#5FD9A4", "#F5A524", "#F7C948", "#FFFFFF"], 22);
    this.gulps = [...this.gulps.filter((t) => this.time - t < 5), this.time];
    this.setMood("happy", 0.9);
    this.fly = { id: ++this.flyId, label: token.label, x, y };

    const result = this.runner.onCorrect(this.level);
    this.score += result.points;
    this.snake.length = Math.min(MAX_LENGTH, this.snake.length + result.grow);
    this.fx.float(x, y, `+${result.points}`, "#5FD9A4");

    if (result.advanced) {
      this.completed++;
      this.streak++;
      this.legDone++;
    }

    if (result.celebrate) {
      sfx.complete();
      if (result.celebrate.confetti) this.fx.confetti(this.renderer.size);
      this.toast(result.celebrate.toast, "good");
    } else {
      sfx.correct();
    }

    if (result.advanced) this.adjustLevel();

    if (result.advanced && this.legDone >= UNITS_PER_WORLD) {
      if (this.leg + 1 >= this.route.length) {
        this.finish();
        return;
      }
      this.tokens = [];
      this.leg++;
      this.legDone = 0;
      sfx.world();
      this.fx.confetti(this.renderer.size);
      this.enterWorld(true);
    }

    // Hold the finished banner for a beat before the next pods appear.
    if (result.delay && result.delay > 0) {
      this.tokens = [];
      this.publish();
      this.clearTimers();
      this.roundTimer = window.setTimeout(() => {
        this.roundTimer = null;
        if (!this.isPlaying) return;
        this.beginRound();
        this.publish();
      }, result.delay);
      return;
    }

    this.beginRound();
    this.publish();
  }

  private onWrong(token: PlacedToken): void {
    const { x, y } = this.renderer.px(token);
    this.mistakes++;
    this.wrongStreak++;
    this.streak = 0;
    this.wrongNonce++;

    sfx.wrong();
    this.fx.hit();
    this.setMood("dizzy", 1);
    this.fx.burst(x, y, ["#E85D42", "#FFB4A2"], 14);
    this.fx.float(x, y, "אופס", "#E85D42");

    this.snake.length = Math.max(MIN_LENGTH, this.snake.length - WRONG_SHRINK);
    this.score = Math.max(0, this.score - WRONG_PENALTY);

    this.replaceDecoy(token);
    if (this.wrongStreak >= LEVEL_DOWN_STREAK) this.adjustLevel();
    this.publish();
  }

  /** The last world is done: celebrate, hand out the prizes, show the finish card. */
  private finish(): void {
    this.running = false;
    this.over = true;
    this.overAt = this.time;
    this.aimAt = null;
    this.tokens = [];
    this.clearTimers();
    music.stop();
    sfx.win();
    this.fx.confetti(this.renderer.size);
    this.setMood("happy", 99);

    this.best = Math.max(this.prevBest, this.score);
    storage.set(bestKey(this.mode.id), this.best);
    this.trophy = awardTrophy();
    this.sticker = awardSticker(this.route);

    // show the solved banner and the flying answer, then the card
    this.publish("playing");
    this.overTimer = window.setTimeout(() => {
      this.overTimer = null;
      if (this.over) this.publish("over");
    }, 1300);
  }

  /** One frame of movement: steer, glide, terrain, bumps, bites. */
  private tick(dt: number): void {
    const snake = this.snake;
    this.field.update(this.time);

    const effect = this.field.effectAt(snake.head);
    if (effect.zone !== this.zone) {
      this.zone = effect.zone;
      if (effect.zone) {
        sfx.zone();
        const { x, y } = this.renderer.px(snake.head);
        const terrain = this.route[this.leg].terrain;
        this.fx.burst(x, y, [terrain.detail, terrain.fill], 8);
      }
    }
    if (effect.boost) this.boostUntil = this.time + BOOST_LINGER;

    let desired = this.keyAngle;
    if (this.aimAt) {
      const dx = this.aimAt.x - snake.head.x;
      const dy = this.aimAt.y - snake.head.y;
      const d = Math.hypot(dx, dy);
      // reached the finger: glide on a little, then loop back around it
      if (d < AIM_ARRIVE) this.arrived = true;
      else if (d > AIM_OVERSHOOT) this.arrived = false;
      desired = this.arrived ? null : Math.atan2(dy, dx);
    }
    if (desired !== null) snake.steer(desired, TURN_RATE * effect.turn * dt);

    const boost = this.time < this.boostUntil ? BOOST_FACTOR : 1;
    const v = this.speed * effect.speed * boost;
    const dir = snake.dir;
    snake.head.x += (dir.x * v + effect.drift.x) * dt;
    snake.head.y += (dir.y * v + effect.drift.y) * dt;

    const contact = this.field.resolve(snake.head, HEAD_RADIUS);
    if (contact) this.slide(contact, desired);
    if (contact?.obstacle !== this.touching) this.touching = contact?.obstacle ?? null;
    snake.commit(dt);

    const bite = this.tokens.find(
      (t) => this.time >= t.born && Math.hypot(t.x - snake.head.x, t.y - snake.head.y) < EAT_RADIUS,
    );
    if (bite) {
      if (bite.correct) this.onCorrect(bite);
      else this.onWrong(bite);
    }
  }

  /**
   * Something is in the way: turn the heading along its edge, so the snake
   * slides around it instead of stopping. A fresh, head-on hit is a "bonk".
   */
  private slide(contact: Contact, desired: number | null): void {
    const snake = this.snake;
    const dir = snake.dir;
    const into = -(dir.x * contact.nx + dir.y * contact.ny);
    const fresh = contact.obstacle !== null && contact.obstacle !== this.touching;
    if (fresh && (into > 0.4 || contact.obstacle!.path) && this.time - this.bumpAt > BUMP_COOLDOWN) {
      this.bump(contact);
    }
    if (into <= 0) return;

    let tx = -contact.ny;
    let ty = contact.nx;
    let side = dir.x * tx + dir.y * ty;
    // dead-on: slide toward whichever side the finger is on
    if (Math.abs(side) < 0.05 && desired !== null) side = Math.cos(desired) * tx + Math.sin(desired) * ty;
    if (side < 0) {
      tx = -tx;
      ty = -ty;
    }
    snake.heading = Math.atan2(ty, tx);
  }

  private bump(contact: Contact): void {
    this.bumpAt = this.time;
    sfx.bonk();
    this.setMood("bonk", 0.45);
    this.fx.shake = Math.max(this.fx.shake, 0.3);
    if (contact.obstacle) contact.obstacle.hitAt = this.time;
    const head = this.snake.head;
    const { x, y } = this.renderer.px({
      x: head.x - contact.nx * HEAD_RADIUS,
      y: head.y - contact.ny * HEAD_RADIUS,
    });
    this.fx.burst(x, y, ["#FFFFFF", "#FFE08A"], 8);
  }

  /* ---------------------------------------------------------------- *
   * Loop
   * ---------------------------------------------------------------- */

  private loop = (now: number): void => {
    const dt = Math.min(0.05, (now - this.lastFrame) / 1000);
    this.lastFrame = now;

    if (!this.running || this.paused) {
      // Let the finish land: keep confetti and the happy snake moving for a beat.
      if (this.over && this.time - this.overAt < 1.6) {
        this.time += dt;
        this.render(dt);
        this.raf = requestAnimationFrame(this.loop);
      }
      return;
    }

    this.time += dt;
    this.tick(dt);
    this.render(dt);
    if (this.running || this.over) this.raf = requestAnimationFrame(this.loop);
  };

  private render(dt: number): void {
    this.fx.update(dt);
    this.ambient.update(dt);
    const head = this.snake.head;
    let facing = this.snake.dir;
    if (this.aimAt) {
      const dx = this.aimAt.x - head.x;
      const dy = this.aimAt.y - head.y;
      const d = Math.hypot(dx, dy);
      if (d > AIM_ARRIVE) facing = { x: dx / d, y: dy / d };
    }
    this.renderer.draw(
      {
        snake: this.snake,
        facing,
        aim: this.aimAt,
        tokens: this.tokens,
        field: this.field,
        skin: this.skin,
        time: this.time,
        mood: this.time < this.moodUntil ? this.mood : "idle",
        gulps: this.gulps,
      },
      this.fx,
      this.ambient,
      dt,
    );
  }

  /* ---------------------------------------------------------------- *
   * React bridge
   * ---------------------------------------------------------------- */

  private clearTimers(): void {
    if (this.roundTimer !== null) {
      clearTimeout(this.roundTimer);
      this.roundTimer = null;
    }
    if (this.overTimer !== null) {
      clearTimeout(this.overTimer);
      this.overTimer = null;
    }
  }

  private toast(text: string, tone: ToastMessage["tone"]): void {
    this.cb.onToast({ id: ++this.toastId, text, tone });
  }

  private get stats(): RunStats {
    return {
      score: this.score,
      correct: this.correct,
      mistakes: this.mistakes,
      completed: this.completed,
      level: this.level,
      best: Math.max(this.best, this.score),
    };
  }

  private publish(forceStatus?: GameView["status"]): void {
    const status: GameView["status"] =
      forceStatus ?? (this.over ? "over" : !this.running ? "menu" : this.paused ? "paused" : "playing");
    const stats = this.stats;
    this.cb.onView({
      status,
      modeId: this.mode?.id ?? "",
      score: this.score,
      level: this.level,
      route: this.route.map((w) => w.id),
      leg: this.leg,
      legDone: this.legDone,
      legGoal: UNITS_PER_WORLD,
      best: stats.best,
      newBest: this.score > this.prevBest && this.score > 0,
      prompt: this.runner ? this.runner.prompt() : null,
      roundNonce: this.roundNonce,
      wrongNonce: this.wrongNonce,
      fly: this.fly,
      trophy: this.trophy,
      sticker: this.sticker,
      stats,
    });
  }
}
