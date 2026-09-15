/** Board and pacing constants. Tune the feel of the game from here. */

/** Cells per side. The board is always square. */
export const GRID = 15;

/** Starting snake length. */
export const START_LENGTH = 4;

/** Never let the snake shrink below this. */
export const MIN_LENGTH = 3;

/**
 * Never let the snake grow past this — one board-width. A long tail is what
 * makes the game hard to survive, and for a six-year-old it should stay
 * playable however well the run goes.
 */
export const MAX_LENGTH = 15;

/** Segments lost when a wrong pod is eaten. */
export const WRONG_SHRINK = 2;

/** Points lost on a wrong answer (score never goes below zero). */
export const WRONG_PENALTY = 3;

/** Wrong answers in a row before the game eases the level back down. */
export const LEVEL_DOWN_STREAK = 2;

/** ms per step at level 1 with no answers yet — bigger is slower. */
export const BASE_STEP_MS = 300;

/** Each level and each correct answer shaves this much off the step time. */
export const STEP_MS_PER_LEVEL = 16;
export const STEP_MS_PER_CORRECT = 1;

/** Fastest the snake is ever allowed to move. */
export const MIN_STEP_MS = 130;

/** Turns that can be buffered ahead, so fast double-taps register. */
export const INPUT_BUFFER = 2;

/**
 * While a turn is waiting, the snake glides into the next cell this many times
 * faster, so a swipe takes effect almost at once instead of waiting out a
 * whole step. Bigger feels snappier; 1 turns it off.
 */
export const TURN_HURRY = 2.6;

/** Cells directly ahead of the head kept free of pods, so nothing is a trap. */
export const SAFE_LANE = 3;

/** Score thresholds for the game-over stars. */
export const STAR_THRESHOLDS = [180, 400] as const;

/** Completed units (solved equations / finished words) a run needs to earn a sticker. */
export const STICKER_MIN_COMPLETED = 1;
