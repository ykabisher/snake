import type {
  CorrectResult,
  Difficulty,
  ModeDefinition,
  ModeRunner,
  PromptModel,
  Round,
} from "../game/types";
import { MAX_MATH_LEVEL, makeQuestion, wrongAnswers, type Question } from "../content/math";
import { pick, shuffle } from "../game/rng";

/** Solve an equation, eat the pod with the answer. */
class MathRunner implements ModeRunner {
  private question: Question = makeQuestion(1);
  private solved = false;

  nextRound(level: number): Round {
    this.question = makeQuestion(level);
    this.solved = false;
    const count = MATH_MODE.tokenCount(level);
    const tokens = shuffle([
      { label: String(this.question.answer), correct: true },
      ...wrongAnswers(this.question.answer, count - 1, level).map((v) => ({
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

export const MATH_MODE: ModeDefinition = {
  id: "math",
  name: "חשבון טעים",
  icon: "🔢",
  blurb: "פותרים תרגיל ואוכלים את המספר הנכון",
  sample: "1+2",
  maxLevel: MAX_MATH_LEVEL,
  startLevel: (d: Difficulty) => [1, 3, 5][d - 1],
  levelUpStreak: 3,
  tokenCount: (level) => (level <= 2 ? 3 : level <= 4 ? 4 : 5),
  create: () => new MathRunner(),
};
