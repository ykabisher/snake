import type {
  CorrectResult,
  Difficulty,
  ModeDefinition,
  ModeRunner,
  PromptModel,
  Round,
} from "../game/types";
import { ALEFBET, wordsAtLevel, type WordEntry } from "../content/words";
import { pick, pickUnlike, shuffle } from "../game/rng";

/** Chance a decoy letter is taken from the target word itself, per level. */
const IN_WORD_DECOY_CHANCE = [0, 0.25, 0.45, 0.55];

/** Collect the letters of a word, in order. */
class SpellRunner implements ModeRunner {
  private entry: WordEntry = wordsAtLevel(1)[0];
  private index = 0;
  private started = false;

  private nextWord(level: number): void {
    const pool = wordsAtLevel(level);
    this.entry = pickUnlike(pool, this.started ? this.entry : null);
    this.index = 0;
    this.started = true;
  }

  nextRound(level: number): Round {
    // A finished word (or the very first round) pulls a new target.
    if (!this.started || this.index >= this.entry.word.length) this.nextWord(level);

    const count = SPELL_MODE.tokenCount(level);
    const tokens = shuffle([
      { label: this.entry.word[this.index], correct: true },
      ...this.decoys(level, count - 1).map((l) => ({ label: l, correct: false })),
    ]);
    return { prompt: this.prompt(), tokens };
  }

  prompt(): PromptModel {
    return {
      kind: "word",
      icon: this.entry.icon,
      word: this.entry.word,
      index: this.index,
    };
  }

  onCorrect(level: number): CorrectResult {
    this.index++;
    const finished = this.index >= this.entry.word.length;
    if (!finished) {
      return { points: 5 * level, grow: 1, advanced: false };
    }
    const bonus = 20 * level;
    return {
      points: 5 * level + bonus,
      grow: 1,
      advanced: true,
      celebrate: { toast: `${this.entry.word} ✓  +${bonus}`, confetti: true },
      delay: 420,
    };
  }

  decoy(level: number): string {
    return this.decoys(level, 1)[0];
  }

  /** Wrong letters — biased toward other letters of the same word at higher
   *  levels, so the answer cannot be found by elimination. */
  private decoys(level: number, count: number): string[] {
    const correct = this.entry.word[Math.min(this.index, this.entry.word.length - 1)];
    const fromWord = this.entry.word.split("").filter((l) => l !== correct);
    const chance = IN_WORD_DECOY_CHANCE[Math.min(level, IN_WORD_DECOY_CHANCE.length - 1)];

    const seen = new Set<string>([correct]);
    const out: string[] = [];
    let guard = 0;
    while (out.length < count && guard++ < 60) {
      const letter =
        fromWord.length > 0 && Math.random() < chance ? pick(fromWord) : pick(ALEFBET);
      if (!seen.has(letter)) {
        seen.add(letter);
        out.push(letter);
      }
    }
    return out;
  }
}

export const SPELL_MODE: ModeDefinition = {
  id: "spell",
  name: "שביל האותיות",
  icon: "✏️",
  blurb: "אוספים את אותיות המילה לפי הסדר",
  sample: "אבג",
  maxLevel: 3,
  startLevel: (d: Difficulty) => d,
  levelUpStreak: 2,
  tokenCount: (level) => (level === 1 ? 3 : 4),
  create: () => new SpellRunner(),
};
