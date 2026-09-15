import { useMemo, type CSSProperties } from "react";
import { between, pick } from "../game/rng";

const COLORS = ["#F5A524", "#5FD9A4", "#E85D42", "#57B6F0", "#F7C948", "#9B6BF0", "#FF7AB6"];

/** Paper confetti raining over an overlay. CSS-driven; hidden under reduced motion. */
export function Confetti({ count = 70 }: { count?: number }) {
  const pieces = useMemo(
    () =>
      Array.from({ length: count }, () => {
        const w = between(7, 13);
        return {
          left: `${between(0, 100)}%`,
          width: w,
          height: w * between(0.4, 0.7),
          background: pick(COLORS),
          animationDuration: `${between(2.2, 4)}s`,
          animationDelay: `${between(0, 1.8)}s`,
          "--drift": `${between(-80, 80)}px`,
          "--spin": `${between(-900, 900)}deg`,
        } as CSSProperties;
      }),
    [count],
  );
  return (
    <div className="confetti" aria-hidden>
      {pieces.map((style, i) => (
        <i key={i} style={style} />
      ))}
    </div>
  );
}
