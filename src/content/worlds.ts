/**
 * ============================================================
 *  WORLDS — safe to edit by hand.
 *  Each level of the ladder plays in its own world: level 1 is
 *  the first entry, level 2 the second, and so on (wrapping if a
 *  mode has more levels than there are worlds). Levelling up
 *  reveals the next world from the snake's head.
 *
 *  Pods are drawn from `pod` and every pod on the board uses the
 *  same style — right and wrong answers must never look different.
 *  `stickers` are the album page for this world: a run that
 *  reaches the world can award one of them.
 * ============================================================
 */

export type PodTopper = "leaf" | "ring" | "shine" | "wrapper" | "bubble";

export interface PodStyle {
  /** Highlight side of the body gradient. */
  top: string;
  /** Shadow side of the body gradient. */
  bottom: string;
  rim: string;
  /** Label colour, and the outline drawn around it for contrast. */
  ink: string;
  outline: string;
  topper: PodTopper;
}

export interface MoteStyle {
  /** fall: drift down · rise: drift up · twinkle: stay put and blink */
  motion: "fall" | "rise" | "twinkle";
  shape: "dot" | "ring" | "dash" | "petal" | "star";
  colors: string[];
  count: number;
  /** CSS px per second on a 400px board. */
  speed: number;
}

export interface World {
  id: string;
  /** Hebrew name, shown on level-up and in the sticker album. */
  name: string;
  icon: string;
  /** Checkerboard tiles, light then dark. */
  tiles: [string, string];
  /** Edge darkening. */
  vignette: string;
  /** Small emoji scattered on the ground — scenery, never pod-shaped. */
  deco: string[];
  pod: PodStyle;
  /** Emoji that wander across the board now and then. */
  critters: string[];
  motes: MoteStyle;
  /** Page tint behind the board, and the ring around it. */
  glow: string;
  ring: string;
  stickers: string[];
}

export const WORLDS: World[] = [
  {
    id: "garden",
    name: "הגינה",
    icon: "🌱",
    tiles: ["#BFE08A", "#B2D87C"],
    vignette: "rgba(40,80,20,.22)",
    deco: ["🌼", "🌷", "🍄", "🌿", "🌸"],
    pod: { top: "#FF8A7A", bottom: "#D8362A", rim: "#9E2A1F", ink: "#FFFFFF", outline: "#7A1E14", topper: "leaf" },
    critters: ["🦋", "🐞", "🐝"],
    motes: { motion: "fall", shape: "petal", colors: ["#FFD1E0", "#FFFFFF"], count: 10, speed: 14 },
    glow: "#2f7a3f",
    ring: "#3f8f4a",
    stickers: ["🐞", "🦋", "🐝", "🐛", "🌻", "🍓"],
  },
  {
    id: "beach",
    name: "החוף",
    icon: "🏖️",
    tiles: ["#F8E4B0", "#F1D89C"],
    vignette: "rgba(120,80,20,.2)",
    deco: ["🐚", "🌴", "🐚", "⛱️"],
    pod: { top: "#FFC46B", bottom: "#EE8416", rim: "#B35F0A", ink: "#FFFFFF", outline: "#7A3D00", topper: "leaf" },
    critters: ["🦀", "🐢"],
    motes: { motion: "twinkle", shape: "star", colors: ["#FFFFFF"], count: 14, speed: 0 },
    glow: "#1f6f8a",
    ring: "#2a8aa8",
    stickers: ["🦀", "🐚", "🐬", "🌴", "🍉", "🦩"],
  },
  {
    id: "snow",
    name: "ארץ השלג",
    icon: "⛄",
    tiles: ["#EEF6FC", "#E0EDF7"],
    vignette: "rgba(40,80,130,.2)",
    deco: ["🌲", "❄️", "⛄", "🌲"],
    pod: { top: "#8FD0FF", bottom: "#3A86D6", rim: "#1F5E9E", ink: "#FFFFFF", outline: "#123E6B", topper: "shine" },
    critters: ["🐧", "🦊"],
    motes: { motion: "fall", shape: "dot", colors: ["#FFFFFF", "#CFE6F7"], count: 26, speed: 26 },
    glow: "#3a6d9a",
    ring: "#5a8fc0",
    stickers: ["🐧", "⛄", "🦊", "🦉", "🦌", "🧤"],
  },
  {
    id: "sea",
    name: "מתחת לים",
    icon: "🐠",
    tiles: ["#4DB3D4", "#43A7C9"],
    vignette: "rgba(5,40,70,.35)",
    deco: ["🌿", "🐚", "🌿", "🪨"],
    pod: { top: "#F4FDFF", bottom: "#A6E3F2", rim: "#4FAFCF", ink: "#0B3D52", outline: "#FFFFFF", topper: "bubble" },
    critters: ["🐠", "🐙", "🐡"],
    motes: { motion: "rise", shape: "ring", colors: ["rgba(255,255,255,.7)"], count: 16, speed: 22 },
    glow: "#0f5c7a",
    ring: "#1f7fa0",
    stickers: ["🐠", "🐙", "🐳", "🦈", "🐢", "🦑"],
  },
  {
    id: "candy",
    name: "ארץ הממתקים",
    icon: "🍭",
    tiles: ["#FFDDEB", "#FFD0E3"],
    vignette: "rgba(140,40,90,.18)",
    deco: ["🍬", "🍭", "🧁", "🍩"],
    pod: { top: "#C3A0FF", bottom: "#7A48DA", rim: "#4E2A9E", ink: "#FFFFFF", outline: "#2D1566", topper: "wrapper" },
    critters: ["🦄", "🐝"],
    motes: { motion: "fall", shape: "dash", colors: ["#FF6FA8", "#6FD3FF", "#FFD34D", "#7BE07B"], count: 16, speed: 16 },
    glow: "#8a3a6f",
    ring: "#b0508f",
    stickers: ["🍭", "🍩", "🧁", "🍫", "🍦", "🦄"],
  },
  {
    id: "space",
    name: "החלל",
    icon: "🚀",
    tiles: ["#222055", "#1D1B4A"],
    vignette: "rgba(0,0,20,.45)",
    deco: ["⭐", "🌙", "✨", "⭐"],
    pod: { top: "#FFE08A", bottom: "#F2A100", rim: "#B06F00", ink: "#3B2405", outline: "#FFF3C4", topper: "ring" },
    critters: ["🚀", "🛸", "☄️"],
    motes: { motion: "twinkle", shape: "star", colors: ["#FFFFFF", "#FFE9A8", "#BFD8FF"], count: 30, speed: 0 },
    glow: "#3b2f8a",
    ring: "#5b4fc0",
    stickers: ["🚀", "🛸", "🌙", "🪐", "👽", "☄️"],
  },
];

/** The world a level plays in. */
export function worldFor(level: number): World {
  return WORLDS[(Math.max(1, level) - 1) % WORLDS.length];
}

/** The world the next level would play in, or null at the top of the ladder. */
export function nextWorld(level: number, maxLevel: number): World | null {
  return level < maxLevel ? worldFor(level + 1) : null;
}
