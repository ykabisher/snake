/**
 * ============================================================
 *  MODE REGISTRY
 *  To add a game mode: write src/modes/<name>Mode.ts exporting a
 *  ModeDefinition, then add it to this array. The menu, the HUD,
 *  the level ladder and the high-score storage all pick it up
 *  with no further changes. If it needs a new banner layout, add
 *  a PromptModel variant in src/game/types.ts and render it in
 *  src/ui/PromptBar.tsx.
 * ============================================================
 */
import type { ModeDefinition, ModeId } from "../game/types";
import { MINUS_MODE, PLUS_MODE } from "./mathMode";
import { SPELL_MODE } from "./spellMode";

export const MODES: ModeDefinition[] = [PLUS_MODE, MINUS_MODE, SPELL_MODE];

export const DEFAULT_MODE_ID: ModeId = PLUS_MODE.id;

export function getMode(id: ModeId): ModeDefinition {
  return MODES.find((m) => m.id === id) ?? MODES[0];
}
