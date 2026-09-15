/**
 * ============================================================
 *  SNAKE SKINS — safe to edit by hand.
 *  Add an entry and it shows up on the menu picker automatically.
 *  `rainbow` cycles hue along the body (ignores `body`).
 *  `glow` adds a canvas shadow halo (skipped under reduced motion).
 * ============================================================
 */

export interface Skin {
  id: string;
  /** Hebrew name under the picker swatch. */
  name: string;
  /** Main body colour. Ignored when `rainbow` is true. */
  body: string;
  /** Lighter stripe down the middle of the body. */
  belly: string;
  /** Dots along the body. */
  spot: string;
  /** Pupil colour. */
  eye: string;
  rainbow?: boolean;
  glow?: boolean;
}

export const SKINS: Skin[] = [
  { id: "barak",  name: "ברק",  body: "#F7C948", belly: "#FFE9A3", spot: "#C98A0B", eye: "#2B1B00" },
  { id: "esh",    name: "אש",   body: "#FF7A3D", belly: "#FFC5A1", spot: "#C93F12", eye: "#3A1200" },
  { id: "kerah",  name: "קרח",  body: "#57B6F0", belly: "#CDEBFF", spot: "#1F6FA8", eye: "#062238" },
  { id: "aleh",   name: "עלה",  body: "#5ECB63", belly: "#C7F0BE", spot: "#2C8A3B", eye: "#082A0E" },
  { id: "keshet", name: "קשת",  body: "#F26D9D", belly: "#FFF3D0", spot: "#FFFFFF", eye: "#2A1240", rainbow: true },
  { id: "layla",  name: "לילה", body: "#9B6BF0", belly: "#DCC8FF", spot: "#E9D8FF", eye: "#1A0836", glow: true },
];

export const defaultSkin = SKINS[0];

export function skinAt(index: number): Skin {
  return SKINS[Math.max(0, Math.min(index, SKINS.length - 1))];
}
