import type {
  CorrectResult,
  Difficulty,
  ModeDefinition,
  ModeRunner,
  PromptModel,
  Round,
} from "../game/types";
import {
  MINUS_LEVELS,
  PLUS_LEVELS,
  makeQuestion,
  wrongAnswers,
  type Generator,
  type Question,
} from "../content/math";
import { pick, shuffle } from "../game/rng";

/** Pods on the board — more choices as the numbers grow. */
const tokenCount = (level: number) => (level <= 2 ? 3 : level <= 4 ? 4 : 5);

/** Solve an equation, eat the pod with the answer. */
class MathRunner implements ModeRunner {
  private question: Question;
  private solved = false;

  constructor(private levels: Generator[]) {
    this.question = makeQuestion(levels, 1);
  }

  nextRound(level: number): Round {
    this.question = makeQuestion(this.levels, level);
    this.solved = false;
    const tokens = shuffle([
      { label: String(this.question.answer), correct: true },
      ...wrongAnswers(this.question.answer, tokenCount(level) - 1, level).map((v) => ({
        label: String(v),
        correct: false,
      })),
    ]);
    return { prompt: this.prompt(), tokens };
  }

  prompt(): PromptModel {
    return {
      kind: "equation",
      text: this.question.text,
      answer: this.solved ? String(this.question.answer) : null,
    };
  }

  onCorrect(level: number): CorrectResult {
    this.solved = true;
    // the delay holds the solved equation on screen while the answer flies in
    return { points: 10 * level, grow: 1, advanced: true, delay: 650 };
  }

  decoy(level: number): string {
    return String(pick(wrongAnswers(this.question.answer, 4, level)));
  }
}

/** The math games differ only in their ladder and their menu card. */
function mathMode(
  card: Pick<ModeDefinition, "id" | "name" | "icon" | "blurb" | "sample">,
  levels: Generator[],
): ModeDefinition {
  return {
    ...card,
    maxLevel: levels.length,
    startLevel: (d: Difficulty) => [1, 3, 5][d - 1],
    levelUpStreak: 3,
    tokenCount,
    create: () => new MathRunner(levels),
  };
}

export const PLUS_MODE = mathMode(
  {
    id: "plus",
    name: "חיבור טעים",
    icon: "➕",
    blurb: "פותרים תרגיל חיבור ואוכלים את התשובה",
    sample: "1+2",
  },
  PLUS_LEVELS,
);

export const MINUS_MODE = mathMode(
  {
    id: "minus",
    name: "חיסור טעים",
    icon: "➖",
    blurb: "פותרים תרגיל חיסור ואוכלים את התשובה",
    sample: "3−1",
  },
  MINUS_LEVELS,
);
