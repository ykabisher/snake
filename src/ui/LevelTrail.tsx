import { nextWorld, worldFor } from "../content/worlds";

interface Props {
  level: number;
  maxLevel: number;
  streak: number;
  goal: number;
}

/**
 * "Where am I, and how close is the next world?" — the current world, one
 * star slot per completed answer needed, and the world that comes next.
 * Reads right-to-left with the page.
 */
export function LevelTrail({ level, maxLevel, streak, goal }: Props) {
  const here = worldFor(level);
  const next = nextWorld(level, maxLevel);
  const filled = next ? Math.min(streak, goal) : goal;

  return (
    <div className="trail" aria-label={`רמה ${level}`}>
      <span className="trail__world trail__world--here">
        <span className="trail__icon">{here.icon}</span>
        <b>{level}</b>
      </span>
      <span className="trail__pips">
        {Array.from({ length: goal }, (_, i) => (
          <span key={i} className={`trail__pip${i < filled ? " trail__pip--on" : ""}`}>
            {i < filled ? "⭐" : ""}
          </span>
        ))}
      </span>
      <span className="trail__arrow" aria-hidden>
        ←
      </span>
      {next ? (
        <span className="trail__world trail__world--next">
          <span className="trail__icon">{next.icon}</span>
          <b>{level + 1}</b>
        </span>
      ) : (
        <span className="trail__world trail__world--top">
          <span className="trail__icon">👑</span>
        </span>
      )}
    </div>
  );
}
