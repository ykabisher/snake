import { useEffect } from "react";
import type { GameView } from "../game/types";
import { STAR_THRESHOLDS } from "../game/constants";
import { sfx } from "../game/audio";
import { Confetti } from "./Confetti";
import { HomeIcon, RetryIcon } from "./icons";

interface Props {
  view: GameView;
  onAgain: () => void;
  onMenu: () => void;
}

function starCount(score: number): number {
  if (score >= STAR_THRESHOLDS[1]) return 3;
  if (score >= STAR_THRESHOLDS[0]) return 2;
  return score > 0 ? 1 : 0;
}

/**
 * No words — the player cannot read yet. The score, the stars, the sticker
 * they won, confetti, and two picture buttons: play again, go home.
 */
export function GameOverScreen({ view, onAgain, onMenu }: Props) {
  const { sticker, score, newBest } = view;
  const stars = starCount(score);
  const celebrate = score > 0 || sticker?.kind === "new";

  useEffect(() => {
    if (!celebrate) return;
    const t = setTimeout(() => sfx.complete(), 250);
    return () => clearTimeout(t);
  }, [celebrate]);

  return (
    <div className="overlay">
      {celebrate && <Confetti />}
      <div className="sheet sheet--centered">
        <div className="card card--over" aria-label={`ניקוד: ${score}`}>
          {newBest && (
            <div className="over__best" aria-label="שיא חדש">
              🏆
            </div>
          )}

          <div className="over__score">
            <span className="over__star" aria-hidden>
              ⭐
            </span>
            <span className="over__points">{score}</span>
          </div>

          <div className="over__stars" aria-hidden>
            {[0, 1, 2].map((i) => (
              <span key={i} className={`over__slot${i < stars ? " over__slot--on" : ""}`}>
                ⭐
              </span>
            ))}
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
