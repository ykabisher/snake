interface Props {
  score: number;
  best: number;
  soundOn: boolean;
  onPause: () => void;
  onToggleSound: () => void;
}

/** Icons, not words — the player is still learning to read. */
export function Hud({ score, best, soundOn, onPause, onToggleSound }: Props) {
  return (
    <header className="hud">
      <div className="hud__side">
        <button className="icon-btn" onClick={onPause} aria-label="השהיה">
          ⏸
        </button>
        <button className="icon-btn" onClick={onToggleSound} aria-label="צליל">
          {soundOn ? "🔊" : "🔇"}
        </button>
      </div>
      <div className="hud__stats">
        <Stat icon="⭐" label="ניקוד" value={score} variant="score" />
        <Stat icon="🏆" label="שיא" value={best} />
      </div>
    </header>
  );
}

function Stat({
  icon,
  label,
  value,
  variant,
}: {
  icon: string;
  label: string;
  value: number;
  variant?: "score";
}) {
  return (
    <div className={`stat${variant ? ` stat--${variant}` : ""}`} aria-label={`${label}: ${value}`}>
      <span className="stat__icon" aria-hidden>
        {icon}
      </span>
      {/* keyed on the value, so every change replays the bump */}
      <span className="stat__value" key={value}>
        {value}
      </span>
    </div>
  );
}
