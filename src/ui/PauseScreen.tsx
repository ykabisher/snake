import { HomeIcon, PlayIcon } from "./icons";

interface Props {
  onResume: () => void;
  onQuit: () => void;
}

/** A sleeping snake and two picture buttons: keep playing, go home. */
export function PauseScreen({ onResume, onQuit }: Props) {
  return (
    <div className="overlay">
      <div className="sheet sheet--centered">
        <div className="card card--over" aria-label="הפסקה">
          <div className="pause__icon" aria-hidden>
            😴
          </div>
          <div className="icon-row">
            <button className="big-btn big-btn--primary" onClick={onResume} aria-label="ממשיכים">
              <PlayIcon />
            </button>
            <button className="big-btn" onClick={onQuit} aria-label="תפריט">
              <HomeIcon />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
