import type { DirectionName } from "./types";

/** Keyboard and swipe wiring. Each attach* returns its own cleanup. */

const KEY_MAP: Record<string, DirectionName> = {
  ArrowUp: "up",
  ArrowDown: "down",
  ArrowLeft: "left",
  ArrowRight: "right",
  w: "up", W: "up",
  s: "down", S: "down",
  a: "left", A: "left",
  d: "right", D: "right",
};

export function attachKeyboard(
  onTurn: (dir: DirectionName) => void,
  onPause: () => void,
): () => void {
  const handler = (e: KeyboardEvent) => {
    const dir = KEY_MAP[e.key];
    if (dir) {
      e.preventDefault();
      onTurn(dir);
      return;
    }
    if (e.key === " " || e.key === "Escape") {
      e.preventDefault();
      onPause();
    }
  };
  window.addEventListener("keydown", handler);
  return () => window.removeEventListener("keydown", handler);
}

/** Minimum travel in CSS pixels before a drag counts as a swipe. */
const SWIPE_THRESHOLD = 18;

/**
 * Swipe anywhere on `el` to turn. The finger does not have to lift between
 * turns: after each swipe the drag re-anchors where the finger is, so a child
 * can steer by sliding around the screen (right, then down, then left...).
 */
export function attachSwipe(
  el: HTMLElement,
  onTurn: (dir: DirectionName) => void,
  onFirstTouch?: () => void,
): () => void {
  let anchorX = 0;
  let anchorY = 0;
  let active = false;
  let last: DirectionName | null = null;

  const start = (e: TouchEvent) => {
    onFirstTouch?.();
    const t = e.touches[0];
    anchorX = t.clientX;
    anchorY = t.clientY;
    active = true;
    last = null;
  };
  const move = (e: TouchEvent) => {
    if (!active) return;
    const t = e.touches[0];
    const dx = t.clientX - anchorX;
    const dy = t.clientY - anchorY;
    if (Math.abs(dx) < SWIPE_THRESHOLD && Math.abs(dy) < SWIPE_THRESHOLD) return;
    e.preventDefault();
    const dir: DirectionName =
      Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? "right" : "left") : dy > 0 ? "down" : "up";
    if (dir !== last) onTurn(dir);
    last = dir;
    anchorX = t.clientX;
    anchorY = t.clientY;
  };
  const end = () => {
    active = false;
  };

  el.addEventListener("touchstart", start, { passive: true });
  el.addEventListener("touchmove", move, { passive: false });
  el.addEventListener("touchend", end);
  el.addEventListener("touchcancel", end);
  return () => {
    el.removeEventListener("touchstart", start);
    el.removeEventListener("touchmove", move);
    el.removeEventListener("touchend", end);
    el.removeEventListener("touchcancel", end);
  };
}
