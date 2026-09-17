import { WORLDS, type World } from "../content/worlds";
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
 * Award one sticker for a run that visited `visited` (in order). Only those
 * worlds are in the pool, and the last one is favoured — so travelling to new
 * worlds is what fills new album pages.
 */
export function awardSticker(visited: World[]): StickerResult {
  const owned = ownedStickers();
  const pool = visited.flatMap((w) => w.stickers).filter((s) => !owned.has(s));
  if (pool.length === 0) return { kind: "full" };

  const last = visited[visited.length - 1].stickers.filter((s) => !owned.has(s));
  const emoji = pick(last.length > 0 && Math.random() < 0.6 ? last : pool);
  storage.set(KEY, [...owned, emoji]);
  return { kind: "new", emoji };
}
