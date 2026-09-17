import { storage } from "./storage";
import { pick } from "./rng";

/**
 * The trophy shelf: one trophy for every finished journey. A new one each
 * time until the shelf is full, then repeats (the shelf counts them).
 */

const KEY = "trophies";

export const TROPHIES = ["🥇", "🏅", "🎖️", "👑", "💎", "🏵️", "🔮", "🪄", "🦄", "🐉", "🧸", "🎁"];

/** Every trophy won on this device, in order, repeats included. */
export function wonTrophies(): string[] {
  const raw = storage.get<unknown>(KEY, []);
  return Array.isArray(raw) ? raw.filter((t): t is string => typeof t === "string") : [];
}

export function awardTrophy(): string {
  const won = wonTrophies();
  const fresh = TROPHIES.filter((t) => !won.includes(t));
  const trophy = pick(fresh.length > 0 ? fresh : TROPHIES);
  storage.set(KEY, [...won, trophy]);
  return trophy;
}
