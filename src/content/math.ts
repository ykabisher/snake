/**
 * ============================================================
 *  MATH CURRICULUM — safe to edit by hand.
 *  One entry per level, easiest first. To add a level, append a
 *  generator to MATH_LEVELS; the mode picks up the new count
 *  automatically (menu difficulty mapping lives in
 *  src/modes/mathMode.ts).
 * ============================================================
 */
import { ri, pick, shuffle } from "../game/rng";

export interface Question {
  /** Rendered left-to-right in the banner, e.g. "12 − 5". */
  text: string;
  answer: number;
}

type Generator = () => Question;

/** Unicode minus/times/divide read better than -, * and / at large sizes. */
const MINUS = "−";
const TIMES = "×";
const DIVIDE = "÷";

export const MATH_LEVELS: Generator[] = [
  // 1 — חיבור עד 10
  () => {
    const a = ri(1, 5);
    const b = ri(1, 5);
    return { text: `${a} + ${b}`, answer: a + b };
  },

  // 2 — חיסור עד 10, עם קצת חיבור
  () => {
    if (Math.random() < 0.45) {
      const a = ri(2, 6);
      const b = ri(2, 6);
      return { text: `${a} + ${b}`, answer: a + b };
    }
    const a = ri(3, 10);
    const b = ri(1, a);
    return { text: `${a} ${MINUS} ${b}`, answer: a - b };
  },

  // 3 — חיבור וחיסור עד 20
  () => {
    if (Math.random() < 0.5) {
      const a = ri(4, 12);
      const b = ri(3, Math.min(9, 20 - a));
      return { text: `${a} + ${b}`, answer: a + b };
    }
    const a = ri(11, 20);
    const b = ri(2, 9);
    return { text: `${a} ${MINUS} ${b}`, answer: a - b };
  },

  // 4 — לוח הכפל הקל: 2, 5, 10
  () => {
    const t = pick([2, 5, 10]);
    const b = ri(2, 10);
    return { text: `${t} ${TIMES} ${b}`, answer: t * b };
  },

  // 5 — כל לוח הכפל
  () => {
    const a = ri(2, 10);
    const b = ri(2, 10);
    return { text: `${a} ${TIMES} ${b}`, answer: a * b };
  },

  // 6 — מעורב: חילוק, שלושה איברים, כפל ועוד
  () => {
    const kind = ri(0, 2);
    if (kind === 0) {
      const a = ri(2, 10);
      const b = ri(2, 10);
      return { text: `${a * b} ${DIVIDE} ${a}`, answer: b };
    }
    if (kind === 1) {
      const a = ri(6, 18);
      const b = ri(2, 9);
      const c = ri(2, Math.min(9, a + b - 1));
      return { text: `${a} + ${b} ${MINUS} ${c}`, answer: a + b - c };
    }
    const a = ri(2, 9);
    const b = ri(2, 9);
    const c = ri(1, 10);
    return { text: `${a} ${TIMES} ${b} + ${c}`, answer: a * b + c };
  },
];

export const MAX_MATH_LEVEL = MATH_LEVELS.length;

export function makeQuestion(level: number): Question {
  const gen = MATH_LEVELS[Math.min(level, MAX_MATH_LEVEL) - 1] ?? MATH_LEVELS[0];
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
