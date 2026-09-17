import { worldById } from "../content/worlds";

interface Props {
  route: string[];
  leg: number;
  done: number;
  goal: number;
}

/**
 * "Where am I on the journey?" — one chip per world of this run, each with a
 * slot per answer it takes to move on, and the trophy waiting at the end.
 * Reads right-to-left with the page.
 */
export function RouteTrail({ route, leg, done, goal }: Props) {
  if (route.length === 0) return <div className="trail" aria-hidden />;
  return (
    <div className="trail" aria-label={`עולם ${leg + 1} מתוך ${route.length}`}>
      {route.map((id, i) => {
        const state = i < leg ? "done" : i === leg ? "here" : "next";
        const filled = i < leg ? goal : i === leg ? Math.min(done, goal) : 0;
        return (
          <span key={`${i}-${id}`} className={`trail__world trail__world--${state}`}>
            <span className="trail__icon">{worldById(id).icon}</span>
            <span className="trail__pips">
              {Array.from({ length: goal }, (_, k) => (
                <span key={k} className={`trail__pip${k < filled ? " trail__pip--on" : ""}`} />
              ))}
            </span>
          </span>
        );
      })}
      <span className="trail__world trail__world--goal">
        <span className="trail__icon">🏆</span>
      </span>
    </div>
  );
}
