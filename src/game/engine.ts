import type {
  Cell,
  Difficulty,
  Direction,
  DirectionName,
  FlyAnswer,
  GameView,
  ModeDefinition,
  ModeRunner,
  RunStats,
  StickerResult,
  ToastMessage,
} from "./types";
import type { Skin } from "../content/skins";
import { worldFor, type World } from "../content/worlds";
import { Renderer, type Mood, type PlacedToken, type TurnCue } from "./renderer";
import { Fx } from "./fx";
import { Ambient } from "./ambient";
import { sfx, music } from "./audio";
import { storage, bestKey } from "./storage";
import { awardSticker } from "./album";
import { pick, clamp } from "./rng";
import {
  BASE_STEP_MS,
  GRID,
  INPUT_BUFFER,
  LEVEL_DOWN_STREAK,
  MAX_LENGTH,
  MIN_LENGTH,
  MIN_STEP_MS,
  SAFE_LANE,
  START_LENGTH,
  STEP_MS_PER_CORRECT,
  STEP_MS_PER_LEVEL,
  STICKER_MIN_COMPLETED,
  TURN_HURRY,
  WRONG_PENALTY,
  WRONG_SHRINK,
} from "./constants";

const DIRECTIONS: Record<DirectionName, Direction> = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
};

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
 * The game. Owns the loop, the snake, the board and the level ladder; asks the
 * active ModeDefinition what to put on the board and what a correct answer is
 * worth. Pushes a GameView to React only when something discrete changes —
 * never per frame.
 */
export class GameEngine {
  private renderer: Renderer;
  private fx: Fx;
  private ambient: Ambient;
  private reduced: boolean;

  private mode!: ModeDefinition;
  private runner!: ModeRunner;
  private skin!: Skin;
  private world: World | null = null;

  private snake: Cell[] = [];
  private prev: Cell[] = [];
  private direction: Direction = DIRECTIONS.right;
  private queue: Direction[] = [];
  private grow = 0;
  private tokens: PlacedToken[] = [];

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
  private peakLevel = 1;

  // cosmetic state handed to the renderer
  private mood: Mood = "idle";
  private moodUntil = 0;
  private gulps: number[] = [];
  private cue: TurnCue | null = null;
  private fly: FlyAnswer | null = null;
  /** Never reset — React tells flights apart by id across runs. */
  private flyId = 0;
  private sticker: StickerResult | null = null;

  private stepMs = BASE_STEP_MS;
  private accumulator = 0;
  private lastFrame = 0;
  private time = 0;
  private deadAt = 0;
  private raf = 0;
  private roundTimer: number | null = null;
  private overTimer: number | null = null;

  private running = false;
  private paused = false;
  private dead = false;
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
    this.clearRoundTimer();
    this.mode = opts.mode;
    this.runner = opts.mode.create();
    this.skin = opts.skin;

    this.level = opts.mode.startLevel(opts.difficulty);
    this.prevBest = storage.get(bestKey(opts.mode.id), 0);
    this.best = this.prevBest;

    const mid = Math.floor(GRID / 2);
    this.snake = Array.from({ length: START_LENGTH }, (_, i) => ({ x: mid - i, y: mid }));
    this.prev = this.snake.map((c) => ({ ...c }));
    this.direction = DIRECTIONS.right;
    this.queue = [];
    this.grow = 0;

    this.score = 0;
    this.correct = 0;
    this.mistakes = 0;
    this.completed = 0;
    this.streak = 0;
    this.wrongStreak = 0;
    this.peakLevel = this.level;
    this.mood = "idle";
    this.moodUntil = 0;
    this.gulps = [];
    this.cue = null;
    this.fly = null;
    this.sticker = null;
    this.fx.clear();

    this.running = true;
    this.paused = false;
    this.dead = false;
    this.time = 0;
    this.accumulator = 0;

    this.updateSpeed();
    this.resize();
    this.world = null;
    this.applyWorld(false);
    this.beginRound();
    this.publish();
    sfx.start();
    music.start();

    this.lastFrame = performance.now();
    this.raf = requestAnimationFrame(this.loop);
  }

  stop(): void {
    this.running = false;
    this.paused = false;
    this.dead = false;
    cancelAnimationFrame(this.raf);
    this.clearRoundTimer();
    music.stop();
    this.publish("menu");
  }

  destroy(): void {
    cancelAnimationFrame(this.raf);
    this.clearRoundTimer();
    music.stop();
  }

  setPaused(paused: boolean): void {
    if (!this.running || this.dead) return;
    this.paused = paused;
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
    return this.running && !this.dead;
  }

  /** Fit the board to `available` CSS pixels (the shorter side of its box). */
  resize(available?: number): void {
    const px = available ?? this.renderer.size;
    this.renderer.resize(px);
    this.ambient.resize(this.renderer.size);
  }

  /** Move to the world of the current level; `reveal` spreads it from the head. */
  private applyWorld(reveal: boolean): void {
    const world = worldFor(this.level);
    if (world === this.world) return;
    this.world = world;
    const head = this.renderer.cellCenter(this.snake[0]);
    this.renderer.setWorld(world, reveal ? { ...head, at: this.time } : null);
    this.ambient.setWorld(world, this.renderer.size);
  }

  private setMood(mood: Mood, seconds: number): void {
    this.mood = mood;
    this.moodUntil = this.time + seconds;
  }

  /* ---------------------------------------------------------------- *
   * Input
   * ---------------------------------------------------------------- */

  turn(name: DirectionName): void {
    const next = DIRECTIONS[name];
    if (!next || !this.running || this.paused || this.dead) return;
    const last = this.queue.length > 0 ? this.queue[this.queue.length - 1] : this.direction;
    // ignore reversals (instant self-collision) and no-op repeats
    if (next.x === -last.x && next.y === -last.y) return;
    if (next.x === last.x && next.y === last.y) return;
    if (this.queue.length >= INPUT_BUFFER) return;
    this.queue.push(next);
    // instant acknowledgement: chevrons from the head, eyes turn, a soft swish
    this.cue = { dir: next, at: this.time };
    sfx.turn();
  }

  /* ---------------------------------------------------------------- *
   * Rounds
   * ---------------------------------------------------------------- */

  private beginRound(): void {
    const round = this.runner.nextRound(this.level);
    this.tokens = [];
    const placed: PlacedToken[] = [];
    for (const token of round.tokens) {
      const cell = this.freeCell(placed);
      if (!cell) break;
      // a small stagger, so the pods pop in one after another
      placed.push({
        ...cell,
        label: token.label,
        correct: token.correct,
        born: this.time + placed.length * 0.07,
      });
    }
    this.tokens = placed;
    this.roundNonce++;
  }

  /** A cell not under the snake, another pod, or the lane ahead of the head. */
  private freeCell(alsoTaken: PlacedToken[]): Cell | null {
    const taken = new Set<string>();
    const key = (x: number, y: number) => `${x},${y}`;
    for (const s of this.snake) taken.add(key(s.x, s.y));
    for (const t of this.tokens) taken.add(key(t.x, t.y));
    for (const t of alsoTaken) taken.add(key(t.x, t.y));

    const head = this.snake[0];
    for (let i = 1; i <= SAFE_LANE; i++) {
      taken.add(
        key(
          (head.x + this.direction.x * i + GRID) % GRID,
          (head.y + this.direction.y * i + GRID) % GRID,
        ),
      );
    }

    const free: Cell[] = [];
    for (let y = 0; y < GRID; y++) {
      for (let x = 0; x < GRID; x++) if (!taken.has(key(x, y))) free.push({ x, y });
    }
    return free.length > 0 ? pick(free) : null;
  }

  private replaceDecoy(token: PlacedToken): void {
    const index = this.tokens.indexOf(token);
    if (index < 0) return;
    this.tokens.splice(index, 1);
    const cell = this.freeCell([]);
    if (!cell) return;
    this.tokens.push({
      ...cell,
      label: this.runner.decoy(this.level),
      correct: false,
      born: this.time,
    });
  }

  /* ---------------------------------------------------------------- *
   * Rules
   * ---------------------------------------------------------------- */

  private updateSpeed(): void {
    this.stepMs = clamp(
      BASE_STEP_MS - this.level * STEP_MS_PER_LEVEL - this.correct * STEP_MS_PER_CORRECT,
      MIN_STEP_MS,
      BASE_STEP_MS + 20,
    );
  }

  /** Ratchet the level up on a streak of completed units, down on repeated misses. */
  private adjustLevel(): void {
    if (this.streak >= this.mode.levelUpStreak && this.level < this.mode.maxLevel) {
      this.level++;
      this.peakLevel = Math.max(this.peakLevel, this.level);
      this.streak = 0;
      this.wrongStreak = 0;
      sfx.levelUp();
      this.fx.confetti(this.renderer.size);
      this.applyWorld(true);
      const world = worldFor(this.level);
      this.toast(`${world.icon} ${world.name}!`, "info");
    } else if (this.wrongStreak >= LEVEL_DOWN_STREAK && this.level > 1) {
      this.level--;
      this.wrongStreak = 0;
      this.streak = 0;
      sfx.levelDown();
      this.applyWorld(true);
      this.toast("קצת יותר קל 🙂", "warn");
    }
    this.updateSpeed();
  }

  private onCorrect(token: PlacedToken): void {
    const { x, y } = this.renderer.cellCenter(token);
    this.correct++;
    this.wrongStreak = 0;
    this.fx.burst(x, y, ["#5FD9A4", "#F5A524", "#F7C948", "#FFFFFF"], 22);
    this.gulps = [...this.gulps.filter((t) => this.time - t < 5), this.time];
    this.setMood("happy", 0.9);
    this.fly = { id: ++this.flyId, label: token.label, x, y };

    const result = this.runner.onCorrect(this.level);
    this.score += result.points;
    // growth stops at MAX_LENGTH, counting segments still waiting to grow
    this.grow = clamp(this.grow + result.grow, 0, Math.max(0, MAX_LENGTH - this.snake.length));
    this.fx.float(x, y, `+${result.points}`, "#5FD9A4");

    if (result.advanced) {
      this.completed++;
      this.streak++;
    }

    if (result.celebrate) {
      sfx.complete();
      if (result.celebrate.confetti) this.fx.confetti(this.renderer.size);
      this.toast(result.celebrate.toast, "good");
    } else {
      sfx.correct();
    }

    if (result.advanced) this.adjustLevel();

    // Hold the finished banner for a beat before the next pods appear.
    if (result.delay && result.delay > 0) {
      this.tokens = [];
      this.publish();
      this.clearRoundTimer();
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
    const { x, y } = this.renderer.cellCenter(token);
    this.mistakes++;
    this.wrongStreak++;
    this.streak = 0;
    this.wrongNonce++;

    sfx.wrong();
    this.fx.hit();
    this.setMood("dizzy", 1);
    this.fx.burst(x, y, ["#E85D42", "#FFB4A2"], 14);
    this.fx.float(x, y, "אופס", "#E85D42");

    for (let i = 0; i < WRONG_SHRINK; i++) {
      if (this.snake.length > MIN_LENGTH) this.snake.pop();
    }
    this.prev = this.prev.slice(0, this.snake.length);
    this.score = Math.max(0, this.score - WRONG_PENALTY);

    this.replaceDecoy(token);
    if (this.wrongStreak >= LEVEL_DOWN_STREAK) this.adjustLevel();
    this.publish();
  }

  private step(): void {
    if (this.queue.length > 0) {
      const next = this.queue.shift()!;
      if (!(next.x === -this.direction.x && next.y === -this.direction.y)) {
        this.direction = next;
      }
    }

    this.prev = this.snake.map((c) => ({ ...c }));
    const head = this.snake[0];
    const nextHead: Cell = {
      x: (head.x + this.direction.x + GRID) % GRID,
      y: (head.y + this.direction.y + GRID) % GRID,
    };

    // Walls wrap. The only way to die is your own tail — and the last segment
    // is moving out of the way this step unless the snake is growing.
    const limit = this.grow > 0 ? this.snake.length : this.snake.length - 1;
    for (let i = 0; i < limit; i++) {
      if (this.snake[i].x === nextHead.x && this.snake[i].y === nextHead.y) {
        this.gameOver();
        return;
      }
    }

    this.snake.unshift(nextHead);
    if (this.grow > 0) this.grow--;
    else this.snake.pop();
    if (this.prev.length < this.snake.length) {
      this.prev.push({ ...this.snake[this.snake.length - 1] });
    }

    const hit = this.tokens.find((t) => t.x === nextHead.x && t.y === nextHead.y);
    if (hit) {
      if (hit.correct) this.onCorrect(hit);
      else this.onWrong(hit);
    }
  }

  private gameOver(): void {
    this.running = false;
    this.dead = true;
    this.deadAt = this.time;
    this.clearRoundTimer();
    music.stop();
    sfx.gameOver();
    this.fx.shake = 1.4;
    const head = this.snake[0];
    const { x, y } = this.renderer.cellCenter(head);
    this.fx.burst(x, y, ["#E85D42", "#F5A524", "#FFFFFF"], 26);

    this.best = Math.max(this.prevBest, this.score);
    storage.set(bestKey(this.mode.id), this.best);
    this.sticker = this.completed >= STICKER_MIN_COMPLETED ? awardSticker(this.peakLevel) : null;

    // Let the crash land before the card covers the board.
    this.overTimer = window.setTimeout(() => {
      this.overTimer = null;
      if (this.dead) this.publish("over");
    }, 700);
  }

  /* ---------------------------------------------------------------- *
   * Loop
   * ---------------------------------------------------------------- */

  private loop = (now: number): void => {
    if (!this.running || this.paused) {
      // Let the crash settle: keep shake and particles moving for a beat.
      if (this.dead && this.time - this.deadAt < 1.4) {
        const dt = Math.min(0.05, (now - this.lastFrame) / 1000);
        this.lastFrame = now;
        this.time += dt;
        this.render(dt);
        this.raf = requestAnimationFrame(this.loop);
      }
      return;
    }

    const dt = Math.min(0.05, (now - this.lastFrame) / 1000);
    this.lastFrame = now;
    this.time += dt;
    // a waiting turn hurries the snake into the next cell, so it lands sooner
    this.accumulator += dt * 1000 * (this.queue.length > 0 ? TURN_HURRY : 1);

    while (this.accumulator >= this.stepMs) {
      this.accumulator -= this.stepMs;
      this.step();
      if (!this.running) break;
    }

    this.render(dt);
    this.raf = requestAnimationFrame(this.loop);
  };

  private render(dt: number): void {
    this.fx.update(dt);
    this.ambient.update(dt);
    const mood: Mood = this.dead ? "dead" : this.time < this.moodUntil ? this.mood : "idle";
    this.renderer.draw(
      {
        snake: this.snake,
        prev: this.prev,
        alpha: clamp(this.accumulator / this.stepMs, 0, 1),
        direction: this.direction,
        facing: this.queue.length > 0 ? this.queue[this.queue.length - 1] : this.direction,
        tokens: this.tokens,
        skin: this.skin,
        time: this.time,
        mood,
        gulps: this.gulps,
        cue: this.cue,
      },
      this.fx,
      this.ambient,
      dt,
    );
  }

  /* ---------------------------------------------------------------- *
   * React bridge
   * ---------------------------------------------------------------- */

  private clearRoundTimer(): void {
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
      forceStatus ?? (this.dead ? "over" : !this.running ? "menu" : this.paused ? "paused" : "playing");
    const stats = this.stats;
    this.cb.onView({
      status,
      modeId: this.mode?.id ?? "",
      score: this.score,
      level: this.level,
      maxLevel: this.mode?.maxLevel ?? 1,
      streak: this.streak,
      streakGoal: this.mode?.levelUpStreak ?? 1,
      best: stats.best,
      newBest: this.score > this.prevBest && this.score > 0,
      prompt: this.runner ? this.runner.prompt() : null,
      roundNonce: this.roundNonce,
      wrongNonce: this.wrongNonce,
      fly: this.fly,
      sticker: this.sticker,
      stats,
    });
  }
}
