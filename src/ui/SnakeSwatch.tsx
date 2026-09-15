import type { CSSProperties } from "react";
import type { Skin } from "../content/skins";

/**
 * A little wiggling snake in a skin's colours, with a face — so a child picks a
 * snake by how it looks, not by its name. `big` is the menu's hero snake.
 */
export function SnakeSwatch({ skin, big = false }: { skin: Skin; big?: boolean }) {
  const count = big ? 7 : 5;
  const base = big ? 34 : 15;
  const step = big ? 3 : 1.4;
  // tail first: in the RTL page the first item sits on the right, so the head
  // ends up on the left, facing "forward"
  const segments = Array.from({ length: count }, (_, k) => {
    const size = base - (count - 1 - k) * step;
    const color = skin.rainbow ? `hsl(${k * 52} 85% 62%)` : skin.body;
    return { size, color, k };
  });

  return (
    <span className={`snakelet${big ? " snakelet--big" : ""}`} aria-hidden>
      {segments.map(({ size, color, k }) => (
        <i
          key={k}
          style={{ width: size, height: size, background: color, "--k": count - k } as CSSProperties}
        />
      ))}
      <b
        className="snakelet__head"
        style={{
          width: base * 1.3,
          height: base * 1.3,
          background: skin.rainbow ? `hsl(${count * 52} 85% 62%)` : skin.body,
          "--eye": skin.eye,
        } as CSSProperties}
      >
        <span className="snakelet__eye" />
        <span className="snakelet__eye" />
      </b>
    </span>
  );
}
