/**
 * Shared vocabulary for the whole game. If you are adding a feature, start here:
 * most changes are "add a field to one of these types, then follow the compiler".
 */

export type Difficulty = 1 | 2 | 3;

export type ModeId = string;

/**
 * A point on the board, in board units: the board is GRID units wide and one
 * unit is roughly the snake's width. Fractions are normal — nothing is on a grid.
 */
export interface Pt {
  x: number;
  y: number;
}

/* ------------------------------------------------------------------ *
 * Rounds — what a mode puts on the board
 * ------------------------------------------------------------------ */

/** One edible pod. The engine places it; the mode decides what it says. */
export interface RoundToken {
  /** Text drawn on the pod, e.g. "12" or "ש". Keep it to 1-3 characters. */
  label: string;
  correct: boolean;
}

/**
 * What the banner above the board shows. Add a variant here when you add a mode
 * that needs a new banner layout, then handle it in ui/PromptBar.tsx.
 */
export type PromptModel =
  /** `answer` is filled in for a beat once solved, before the next question. */
  | { kind: "equation"; text: string; answer: string | null }
  | { kind: "word"; icon: string; word: string; index: number };

export interface Round {
  prompt: PromptModel;
  tokens: RoundToken[];
}

/** What the engine should do after the correct pod is eaten. */
export interface CorrectResult {
  points: number;
  /** Extra body segments to grow. */
  grow: number;
  /**
   * True when a whole teaching unit finished (an equation solved, a word
   * completed). Only these count toward the level-up streak — not every
   * single correct letter.
   */
  advanced: boolean;
  celebrate?: { toast: string; confetti: boolean };
  /** ms to hold the finished banner before the next round appears. */
  delay?: number;
}

/* ------------------------------------------------------------------ *
 * Modes
 * ------------------------------------------------------------------ */

/** Per-run state for a mode. Created fresh on every new game. */
export interface ModeRunner {
  /** Build the next set of pods. Called at round start and after each answer. */
  nextRound(level: number): Round;
  /** The correct pod was eaten. Mutate internal state and say what it earned. */
  onCorrect(level: number): CorrectResult;
  /** A wrong pod was eaten — return a replacement wrong label for the board. */
  decoy(level: number): string;
  /** Current banner, without advancing anything (used after a celebration). */
  prompt(): PromptModel;
}

export interface RunStats {
  score: number;
  /** Correct pods eaten (letters in spelling, answers in math). */
  correct: number;
  mistakes: number;
  /** Teaching units completed — solved equations / finished words. */
  completed: number;
  level: number;
  best: number;
}

/**
 * A playable mode. Register new ones in src/modes/index.ts — that is the only
 * other file a new mode has to touch.
 */
export interface ModeDefinition {
  id: ModeId;
  /** Hebrew name shown on the menu card. */
  name: string;
  icon: string;
  /** One-line Hebrew description — for grown-ups and screen readers. */
  blurb: string;
  /**
   * A few characters that show what the mode is to a child who cannot read
   * yet, drawn big on the menu card — e.g. "1+2".
   */
  sample: string;
  maxLevel: number;
  /** Where each menu difficulty starts this mode. */
  startLevel: (d: Difficulty) => number;
  /** Completed units in a row needed to move up a level. */
  levelUpStreak: number;
  /** How many pods sit on the board at this level. */
  tokenCount: (level: number) => number;
  create: () => ModeRunner;
}

/* ------------------------------------------------------------------ *
 * Engine <-> React bridge
 * ------------------------------------------------------------------ */

export type GameStatus = "menu" | "playing" | "paused" | "over";

/**
 * The small snapshot React renders from. The engine pushes a new one only when
 * something discrete changes — never per animation frame.
 */
export interface GameView {
  status: GameStatus;
  modeId: ModeId;
  score: number;
  /** The math / spelling difficulty. Invisible to the player — worlds are the journey. */
  level: number;
  /** The world ids this run travels through, in order. */
  route: string[];
  /** Index into `route` of the world being played. */
  leg: number;
  /** Completed units in this world, out of `legGoal`. */
  legDone: number;
  legGoal: number;
  best: number;
  newBest: boolean;
  prompt: PromptModel | null;
  /** Bumped every time new pods are dealt, so the banner can flip in. */
  roundNonce: number;
  /** Bumped on a wrong answer so the banner can replay its shake. */
  wrongNonce: number;
  /** The last correct pod, for the fly-into-the-banner animation. */
  fly: FlyAnswer | null;
  /** Set when the run is won. */
  trophy: string | null;
  sticker: StickerResult | null;
  stats: RunStats;
}

export interface FlyAnswer {
  id: number;
  label: string;
  /** Where the pod was, in canvas CSS pixels. */
  x: number;
  y: number;
}

/** `full` means every sticker in the worlds this run visited is already owned. */
export type StickerResult = { kind: "new"; emoji: string } | { kind: "full" };

export interface ToastMessage {
  id: number;
  text: string;
  tone: "good" | "info" | "warn";
}
