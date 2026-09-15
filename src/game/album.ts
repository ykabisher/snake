import { WORLDS } from "../content/worlds";
import { storage } from "./storage";
import { pick } from "./rng";
import type { StickerResult } from "./types";

/** The sticker album: which stickers this device has collected. */

const KEY = "stickers";

export function ownedStickers(): Set<string> {
  const raw = storage.get<unknown>(KEY, []);
  return new Set(Array.isArray(raw) ? raw.filter((s): s is string => typeof s === "string") : []);
}

export const TOTAL_STICKERS = WORLDS.reduce((n, w) => n + w.stickers.length, 0);

/**
 * Award one sticker for a run that reached `peakLevel`. Only worlds the run
 * actually reached are in the pool, and the furthest one is favoured — so
 * getting to a new world is what fills new album pages.
 */
export function awardSticker(peakLevel: number): StickerResult {
  const reached = WORLDS.slice(0, Math.min(Math.max(1, peakLevel), WORLDS.length));
  const owned = ownedStickers();
  const pool = reached.flatMap((w) => w.stickers).filter((s) => !owned.has(s));
  if (pool.length === 0) return { kind: "full" };

  const furthest = reached[reached.length - 1].stickers.filter((s) => !owned.has(s));
  const emoji = pick(furthest.length > 0 && Math.random() < 0.6 ? furthest : pool);
  storage.set(KEY, [...owned, emoji]);
  return { kind: "new", emoji };
}
