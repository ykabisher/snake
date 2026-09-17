import { useEffect } from "react";
import type { GameView } from "../game/types";
import { STAR_MISTAKES } from "../game/constants";
import { sfx } from "../game/audio";
import { Confetti } from "./Confetti";
import { HomeIcon, RetryIcon } from "./icons";

interface Props {
  view: GameView;
  onAgain: () => void;
  onMenu: () => void;
}

/** Finishing is always worth a star; fewer mistakes earn more. */
function starCount(mistakes: number): number {
  if (mistakes <= STAR_MISTAKES[0]) return 3;
  if (mistakes <= STAR_MISTAKES[1]) return 2;
  return 1;
}

/**
 * The finish line of the journey. No words — the player cannot read yet: the
 * trophy they won, the stars, the score, the sticker, confetti, and two
 * picture buttons: play again, go home.
 */
export function GameOverScreen({ view, onAgain, onMenu }: Props) {
  const { trophy, sticker, score, newBest, stats } = view;
  const stars = starCount(stats.mistakes);

  useEffect(() => {
    const t = setTimeout(() => sfx.complete(), 250);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="overlay">
      <Confetti />
      <div className="sheet sheet--centered">
        <div className="card card--over" aria-label={`ניקוד: ${score}`}>
          {trophy && (
            <div className="trophy" aria-label="גביע">
              <span className="trophy__rays" aria-hidden />
              <span className="trophy__emoji">{trophy}</span>
            </div>
          )}

          <div className="over__stars" aria-label={`${stars} כוכבים`}>
            {[0, 1, 2].map((i) => (
              <span key={i} className={`over__slot${i < stars ? " over__slot--on" : ""}`}>
                ⭐
              </span>
            ))}
          </div>

          <div className="over__score">
            <span className="over__star" aria-hidden>
              {newBest ? "🏆" : "⭐"}
            </span>
            <span className="over__points">{score}</span>
          </div>

          {sticker?.kind === "new" && (
            <div className="prize" aria-label="מדבקה חדשה">
              <span className="prize__sticker">{sticker.emoji}</span>
            </div>
          )}

          <div className="icon-row">
            <button className="big-btn big-btn--primary" onClick={onAgain} aria-label="עוד פעם">
              <RetryIcon />
            </button>
            <button className="big-btn" onClick={onMenu} aria-label="תפריט">
              <HomeIcon />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
