/** Keyboard and finger wiring. Each attach* returns its own cleanup. */

const KEY_VECTORS: Record<string, [number, number]> = {
  ArrowUp: [0, -1],
  ArrowDown: [0, 1],
  ArrowLeft: [-1, 0],
  ArrowRight: [1, 0],
  w: [0, -1],
  s: [0, 1],
  a: [-1, 0],
  d: [1, 0],
};

/**
 * Arrow keys / WASD point the snake: hold one to head that way, hold two for a
 * diagonal. It keeps going the last way pointed when the keys are let go.
 */
export function attachKeyboard(
  onSteer: (angle: number) => void,
  onPause: () => void,
): () => void {
  const held = new Set<string>();
  const steer = () => {
    let x = 0;
    let y = 0;
    for (const k of held) {
      x += KEY_VECTORS[k][0];
      y += KEY_VECTORS[k][1];
    }
    if (x !== 0 || y !== 0) onSteer(Math.atan2(y, x));
  };
  const down = (e: KeyboardEvent) => {
    const key = e.key.length === 1 ? e.key.toLowerCase() : e.key;
    if (KEY_VECTORS[key]) {
      e.preventDefault();
      held.add(key);
      steer();
      return;
    }
    if (e.key === " " || e.key === "Escape") {
      e.preventDefault();
      onPause();
    }
  };
  const up = (e: KeyboardEvent) => {
    held.delete(e.key.length === 1 ? e.key.toLowerCase() : e.key);
  };
  const blur = () => held.clear();
  window.addEventListener("keydown", down);
  window.addEventListener("keyup", up);
  window.addEventListener("blur", blur);
  return () => {
    window.removeEventListener("keydown", down);
    window.removeEventListener("keyup", up);
    window.removeEventListener("blur", blur);
  };
}

/** Browsers send fake mouse events after a tap; ignore mouse this long after a touch. */
const TOUCH_MOUSE_GAP_MS = 800;

/**
 * The snake's head chases the finger. Touch anywhere on `el` and drag — the
 * finger does not have to be on the board; a point outside it pulls toward
 * the nearest edge. Lifting the finger lets the snake glide straight on.
 * With a mouse, the head chases the cursor while it is over `el`.
 */
export function attachPointer(
  el: HTMLElement,
  onAim: (clientX: number, clientY: number) => void,
  onRelease: () => void,
  onFirstTouch?: () => void,
): () => void {
  let lastTouch = 0;

  const start = (e: TouchEvent) => {
    lastTouch = performance.now();
    onFirstTouch?.();
    const t = e.touches[0];
    onAim(t.clientX, t.clientY);
  };
  const move = (e: TouchEvent) => {
    lastTouch = performance.now();
    e.preventDefault();
    const t = e.touches[0];
    onAim(t.clientX, t.clientY);
  };
  const end = (e: TouchEvent) => {
    lastTouch = performance.now();
    const t = e.touches[0];
    // another finger is still down: follow that one
    if (t) onAim(t.clientX, t.clientY);
    else onRelease();
  };
  const mouseMove = (e: MouseEvent) => {
    if (performance.now() - lastTouch < TOUCH_MOUSE_GAP_MS) return;
    onAim(e.clientX, e.clientY);
  };
  const mouseLeave = () => {
    if (performance.now() - lastTouch < TOUCH_MOUSE_GAP_MS) return;
    onRelease();
  };

  el.addEventListener("touchstart", start, { passive: true });
  el.addEventListener("touchmove", move, { passive: false });
  el.addEventListener("touchend", end);
  el.addEventListener("touchcancel", end);
  el.addEventListener("mousemove", mouseMove);
  el.addEventListener("mouseleave", mouseLeave);
  return () => {
    el.removeEventListener("touchstart", start);
    el.removeEventListener("touchmove", move);
    el.removeEventListener("touchend", end);
    el.removeEventListener("touchcancel", end);
    el.removeEventListener("mousemove", mouseMove);
    el.removeEventListener("mouseleave", mouseLeave);
  };
}
