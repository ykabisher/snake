/** Tiny random helpers. Everything random in the game funnels through here. */

/** Random integer in [a, b] inclusive. */
export const ri = (a: number, b: number): number =>
  a + Math.floor(Math.random() * (b - a + 1));

/** Random float in [a, b). */
export const between = (a: number, b: number): number => a + Math.random() * (b - a);

/** True with probability `p`. */
export const chance = (p: number): boolean => Math.random() < p;

export const pick = <T,>(arr: readonly T[]): T =>
  arr[Math.floor(Math.random() * arr.length)];

export function shuffle<T>(arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export const clamp = (v: number, min: number, max: number): number =>
  Math.max(min, Math.min(max, v));

/** A repeatable generator in [0, 1) — for layouts that must not reshuffle
 *  every time they are redrawn (board scenery). Mulberry32. */
export function seeded(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** A small stable number from a string, to seed `seeded`. */
export function hashString(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

/** Pick from `arr` avoiding `avoid`, giving up after a few tries. */
export function pickUnlike<T>(arr: readonly T[], avoid: T | null, tries = 8): T {
  let v = pick(arr);
  for (let i = 0; i < tries && v === avoid && arr.length > 1; i++) v = pick(arr);
  return v;
}
