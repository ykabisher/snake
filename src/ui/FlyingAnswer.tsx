import { useLayoutEffect, useRef, useState, type RefObject } from "react";
import type { FlyAnswer } from "../game/types";

interface Props {
  fly: FlyAnswer | null;
  canvasRef: RefObject<HTMLCanvasElement>;
}

const FLIGHT_MS = 460;

/**
 * The eaten answer arcs from its spot on the board into its slot in the
 * banner (whatever element carries `data-fly-target`). Runs once per `fly.id`;
 * skipped under reduced motion.
 */
export function FlyingAnswer({ fly, canvasRef }: Props) {
  const ref = useRef<HTMLSpanElement>(null);
  const [doneId, setDoneId] = useState(0);
  const active = fly && fly.id !== doneId ? fly : null;

  useLayoutEffect(() => {
    const el = ref.current;
    const canvas = canvasRef.current;
    if (!active || !el || !canvas) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches || !el.animate) {
      setDoneId(active.id);
      return;
    }
    const board = canvas.getBoundingClientRect();
    const sx = board.left + active.x;
    const sy = board.top + active.y;
    const target = document.querySelector<HTMLElement>("[data-fly-target]");
    let tx = sx;
    let ty = sy - 120;
    if (target) {
      const r = target.getBoundingClientRect();
      tx = r.left + r.width / 2;
      ty = r.top + r.height / 2;
    }
    const at = (x: number, y: number, s: number) =>
      `translate(${x}px, ${y}px) translate(-50%, -50%) scale(${s})`;
    const anim = el.animate(
      [
        { transform: at(sx, sy, 0.8), opacity: 1 },
        { transform: at((sx + tx) / 2, Math.min(sy, ty) - 50, 1.5), opacity: 1, offset: 0.5 },
        { transform: at(tx, ty, 1), opacity: 0.9 },
      ],
      { duration: FLIGHT_MS, easing: "cubic-bezier(.45,0,.35,1)", fill: "forwards" },
    );
    anim.onfinish = () => setDoneId(active.id);
    return () => anim.cancel();
  }, [active, canvasRef]);

  if (!active) return null;
  return (
    <span ref={ref} className="fly" aria-hidden>
      {active.label}
    </span>
  );
}
