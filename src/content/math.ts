/**
 * ============================================================
 *  MATH CURRICULUM — safe to edit by hand.
 *  Two ladders, one per game: PLUS_LEVELS (addition) and
 *  MINUS_LEVELS (subtraction). One generator per level, easiest
 *  first. Level N plays in world N, so six levels reach all six
 *  worlds and their sticker pages. To add a level, append a
 *  generator; the mode picks up the new count automatically
 *  (menu difficulty mapping lives in src/modes/mathMode.ts).
 *  No × or ÷ — the player is six.
 * ============================================================
 */
import { ri, chance, shuffle } from "../game/rng";

export interface Question {
  /** Rendered left-to-right in the banner, e.g. "12 − 5". */
  text: string;
  answer: number;
}

export type Generator = () => Question;

/** Unicode minus reads better than a hyphen at large sizes. */
const MINUS = "−";

/** a + b, in either order — both orders are worth practising. */
const add = (a: number, b: number): Question => ({
  text: chance(0.5) ? `${a} + ${b}` : `${b} + ${a}`,
  answer: a + b,
});

const sub = (a: number, b: number): Question => ({ text: `${a} ${MINUS} ${b}`, answer: a - b });

export const PLUS_LEVELS: Generator[] = [
  // 1 — חיבור עד 5
  () => {
    const a = ri(1, 4);
    return add(a, ri(1, 5 - a));
  },

  // 2 — חיבור עד 10
  () => {
    const a = ri(1, 9);
    return add(a, ri(Math.max(1, 6 - a), 10 - a));
  },

  // 3 — עשר ועוד, בלי מעבר עשרת (13 + 4)
  () => {
    const a = ri(10, 18);
    return add(a, ri(1, 19 - a));
  },

  // 4 — חיבור עם מעבר עשרת (8 + 5)
  () => {
    const a = ri(2, 9);
    return add(a, ri(Math.max(2, 11 - a), 9));
  },

  // 5 — שלושה מספרים (2 + 3 + 4)
  () => {
    const a = ri(1, 6);
    const b = ri(1, 6);
    const c = ri(1, 6);
    return { text: `${a} + ${b} + ${c}`, answer: a + b + c };
  },

  // 6 — עשרות (30 + 20) ודו-ספרתי ועוד חד-ספרתי (34 + 5)
  () => {
    if (chance(0.5)) return add(ri(1, 5) * 10, ri(1, 4) * 10);
    const a = ri(2, 8) * 10 + ri(0, 5);
    return add(a, ri(1, 9 - (a % 10)));
  },
];

export const MINUS_LEVELS: Generator[] = [
  // 1 — חיסור בתוך 5
  () => {
    const a = ri(2, 5);
    return sub(a, ri(1, a - 1));
  },

  // 2 — חיסור בתוך 10 (כולל 7 − 7 = 0)
  () => {
    const a = ri(5, 10);
    return sub(a, ri(1, a));
  },

  // 3 — מהעשרת השנייה, בלי מעבר עשרת (17 − 5, 16 − 10)
  () => {
    const a = ri(11, 19);
    return chance(0.3) ? sub(a, 10) : sub(a, ri(1, a - 10));
  },

  // 4 — חיסור עם מעבר עשרת (13 − 5)
  () => {
    const a = ri(11, 18);
    return sub(a, ri(a - 9, 9));
  },

  // 5 — שני חיסורים (12 − 3 − 4)
  () => {
    const a = ri(10, 20);
    const b = ri(1, 5);
    const c = ri(1, 5);
    return { text: `${a} ${MINUS} ${b} ${MINUS} ${c}`, answer: a - b - c };
  },

  // 6 — עשרות (70 − 30) ודו-ספרתי פחות חד-ספרתי (47 − 5)
  () => {
    if (chance(0.5)) {
      const tens = ri(3, 9);
      return sub(tens * 10, ri(1, tens - 1) * 10);
    }
    const a = ri(2, 9) * 10 + ri(1, 9);
    return sub(a, ri(1, a % 10));
  },
];

export function makeQuestion(levels: Generator[], level: number): Question {
  const gen = levels[Math.min(level, levels.length) - 1] ?? levels[0];
  return gen();
}

/**
 * Plausible wrong answers — near misses a child would actually reach for,
 * never negative and never a duplicate.
 */
export function wrongAnswers(answer: number, count: number, level: number): number[] {
  const out: number[] = [];
  const seen = new Set<number>([answer]);

  const candidates = shuffle([
    answer + 1, answer - 1, answer + 2, answer - 2,
    answer + 10, answer - 10, answer + 3, answer - 3,
    answer + 5, answer - 5,
  ]);
  if (level >= 4) candidates.push(answer + ri(1, 4), answer - ri(1, 4));

  for (const v of candidates) {
    if (out.length >= count) break;
    if (v >= 0 && !seen.has(v)) {
      seen.add(v);
      out.push(v);
    }
  }
  let gap = 1;
  while (out.length < count) {
    const v = answer + gap;
    if (!seen.has(v)) {
      seen.add(v);
      out.push(v);
    }
    gap++;
  }
  return out;
}
