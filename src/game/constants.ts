/** Board and pacing constants. Tune the feel of the game from here. */

/**
 * Board units per side. The board is always square, and one unit is about the
 * snake's width — every distance below is in these units.
 */
export const GRID = 15;

/* ---------------------------------------------------------------- *
 * The snake
 * ---------------------------------------------------------------- */

/** Starting snake length, in segments. */
export const START_LENGTH = 5;

/** Never let the snake shrink below this. */
export const MIN_LENGTH = 3;

/**
 * Never let the snake grow past this. A long tail crowds the board, and for a
 * six-year-old it should stay easy to steer however well the run goes.
 */
export const MAX_LENGTH = 15;

/** Distance between body segments along the path the head travelled. */
export const SEGMENT_GAP = 0.75;

/** The head's collision circle — against obstacles and the board edge. */
export const HEAD_RADIUS = 0.42;

/** How close the head has to get to a pod to eat it. */
export const EAT_RADIUS = 0.78;

/* ---------------------------------------------------------------- *
 * Steering and speed
 * ---------------------------------------------------------------- */

/** Units per second at level 1 with no answers yet. */
export const BASE_SPEED = 3.1;

/** Each level and each correct answer adds this much speed. */
export const SPEED_PER_LEVEL = 0.16;
export const SPEED_PER_CORRECT = 0.02;

/** Fastest the snake is ever allowed to glide. */
export const MAX_SPEED = 5;

/**
 * How fast the head can swing toward the finger, in radians per second. With
 * the speeds above the tightest circle is about a unit and a half across — small
 * enough to loop around anything, wide enough that the body reads as a curve.
 */
export const TURN_RATE = 6.5;

/**
 * Once the head reaches the finger it stops steering and glides on, until it
 * is this far past — then it swings back. A finger held still gets a loop
 * around it instead of a tight knot.
 */
export const AIM_ARRIVE = 0.55;
export const AIM_OVERSHOOT = 1.7;

/* ---------------------------------------------------------------- *
 * Answers
 * ---------------------------------------------------------------- */

/** Segments lost when a wrong pod is eaten. */
export const WRONG_SHRINK = 2;

/** Points lost on a wrong answer (score never goes below zero). */
export const WRONG_PENALTY = 3;

/** Wrong answers in a row before the game eases the level back down. */
export const LEVEL_DOWN_STREAK = 2;

/**
 * Distance ahead of the head (in a narrow cone) kept free of new pods, so the
 * player is never forced into a wrong answer.
 */
export const SAFE_LANE = 3.5;

/* ---------------------------------------------------------------- *
 * The board
 * ---------------------------------------------------------------- */

/**
 * The narrowest gap left between two obstacles, or an obstacle and the edge.
 * Wider than the head, so every open spot on the board can always be reached.
 */
export const PASSAGE = 1.5;

/** Seconds before bumping the same way makes another "bonk". */
export const BUMP_COOLDOWN = 0.6;

/* ---------------------------------------------------------------- *
 * The journey
 * ---------------------------------------------------------------- */

/** Worlds a run travels through, picked at random without repeats. */
export const WORLDS_PER_RUN = 3;

/** Completed units (solved equations / finished words) to leave a world. */
export const UNITS_PER_WORLD = 3;

/** Stars at the finish: at most [0] mistakes earns 3, at most [1] earns 2, else 1. */
export const STAR_MISTAKES = [1, 4] as const;
