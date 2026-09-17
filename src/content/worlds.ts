/**
 * ============================================================
 *  WORLDS — safe to edit by hand.
 *  A run travels through a few of these, picked at random (see
 *  WORLDS_PER_RUN in src/game/constants.ts). Each world has its
 *  own ground, obstacles, terrain twist and sticker page.
 *
 *  Pods are drawn from `pod` and every pod on the board uses the
 *  same style — right and wrong answers must never look different.
 *  `stickers` are the album page for this world: a run that
 *  visits the world can award one of them.
 *
 *  Obstacles and terrain are scattered at random every time the
 *  snake arrives in the world. Nothing here can end a run:
 *  obstacles are soft bumps, terrain only bends the ride.
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

export interface ObstacleStyle {
  /** Emoji for the obstacles that stand still. Big and solid — never pod-shaped. */
  still: string[];
  /** How many still obstacles, min and max. */
  count: [number, number];
  /** The obstacle that moves: a crab walking sideways, a satellite in orbit... */
  mover: string;
  /** patrol: back and forth along a line · orbit: round and round a spot */
  motion: "patrol" | "orbit";
  movers: number;
}

/**
 * What a terrain patch does to the snake's head while it is inside:
 * slow · boost (a burst of speed that lingers) · ice (turns slowly, slides on) ·
 * push (a current along the patch's arrow) · pull (drawn toward the middle).
 * None of them can hold the snake — it can always steer out.
 */
export type TerrainKind = "slow" | "boost" | "ice" | "push" | "pull";

export interface TerrainStyle {
  kind: TerrainKind;
  count: number;
  /** Patch radius, min and max, in board units. */
  size: [number, number];
  /** The patch colour and the colour of its moving detail (ripples, arrows, swirl). */
  fill: string;
  detail: string;
}

export interface World {
  id: string;
  /** Hebrew name, shown on arrival and in the sticker album. */
  name: string;
  icon: string;
  /** Checkerboard tiles, light then dark. */
  tiles: [string, string];
  /** Edge darkening. */
  vignette: string;
  /** Small emoji scattered on the ground — scenery, never pod-shaped. */
  deco: string[];
  pod: PodStyle;
  obstacles: ObstacleStyle;
  terrain: TerrainStyle;
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
    obstacles: { still: ["🌳", "🪴", "🌻"], count: [4, 6], mover: "🦔", motion: "patrol", movers: 1 },
    // muddy puddles: splash through slowly
    terrain: { kind: "slow", count: 2, size: [1.4, 2], fill: "rgba(96,150,210,.55)", detail: "rgba(255,255,255,.7)" },
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
    deco: ["🐚", "⛱️", "🐚"],
    pod: { top: "#FFC46B", bottom: "#EE8416", rim: "#B35F0A", ink: "#FFFFFF", outline: "#7A3D00", topper: "leaf" },
    obstacles: { still: ["🏰", "🪨"], count: [4, 6], mover: "🦀", motion: "patrol", movers: 2 },
    // surf waves: ride one for a burst of speed
    terrain: { kind: "boost", count: 2, size: [1.3, 1.8], fill: "rgba(60,190,220,.5)", detail: "rgba(255,255,255,.9)" },
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
    deco: ["❄️", "⛄", "❄️"],
    pod: { top: "#8FD0FF", bottom: "#3A86D6", rim: "#1F5E9E", ink: "#FFFFFF", outline: "#123E6B", topper: "shine" },
    obstacles: { still: ["🌲", "🧊"], count: [4, 6], mover: "🐧", motion: "patrol", movers: 1 },
    // frozen ponds: the snake slides and turns slowly
    terrain: { kind: "ice", count: 2, size: [1.6, 2.3], fill: "rgba(150,210,245,.6)", detail: "rgba(255,255,255,.95)" },
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
    deco: ["🌿", "🐚", "🌿"],
    pod: { top: "#F4FDFF", bottom: "#A6E3F2", rim: "#4FAFCF", ink: "#0B3D52", outline: "#FFFFFF", topper: "bubble" },
    obstacles: { still: ["🪨", "⚓"], count: [4, 6], mover: "🦈", motion: "patrol", movers: 1 },
    // currents carry the snake along their arrows
    terrain: { kind: "push", count: 2, size: [1.6, 2.2], fill: "rgba(20,90,140,.35)", detail: "rgba(255,255,255,.75)" },
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
    deco: ["🍬", "🍭", "🍬"],
    pod: { top: "#C3A0FF", bottom: "#7A48DA", rim: "#4E2A9E", ink: "#FFFFFF", outline: "#2D1566", topper: "wrapper" },
    obstacles: { still: ["🎂", "🍫"], count: [4, 6], mover: "🍩", motion: "orbit", movers: 2 },
    // sprinkle patches: a sugar rush
    terrain: { kind: "boost", count: 2, size: [1.3, 1.8], fill: "rgba(255,120,180,.4)", detail: "#FFFFFF" },
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
    obstacles: { still: ["🪐", "🌑"], count: [4, 5], mover: "🛰️", motion: "orbit", movers: 1 },
    // a black hole bends the snake's path toward it
    terrain: { kind: "pull", count: 1, size: [2.4, 2.8], fill: "rgba(10,5,30,.55)", detail: "rgba(190,150,255,.85)" },
    critters: ["🚀", "🛸", "☄️"],
    motes: { motion: "twinkle", shape: "star", colors: ["#FFFFFF", "#FFE9A8", "#BFD8FF"], count: 30, speed: 0 },
    glow: "#3b2f8a",
    ring: "#5b4fc0",
    stickers: ["🚀", "🛸", "🌙", "🪐", "👽", "☄️"],
  },
  {
    id: "jungle",
    name: "הג'ונגל",
    icon: "🌴",
    tiles: ["#7CC06A", "#72B560"],
    vignette: "rgba(10,50,20,.32)",
    deco: ["🌿", "🍃", "🌺", "🍄"],
    pod: { top: "#FF8AC8", bottom: "#D6307F", rim: "#8F1A52", ink: "#FFFFFF", outline: "#5E0F35", topper: "leaf" },
    obstacles: { still: ["🌴", "🌳"], count: [5, 7], mover: "🐊", motion: "patrol", movers: 1 },
    // a lazy river carries the snake along
    terrain: { kind: "push", count: 2, size: [1.5, 2], fill: "rgba(60,140,170,.5)", detail: "rgba(255,255,255,.8)" },
    critters: ["🦜", "🐒"],
    motes: { motion: "fall", shape: "petal", colors: ["#9BE07A", "#5FB04A"], count: 10, speed: 12 },
    glow: "#1f5a2a",
    ring: "#2f7a3a",
    stickers: ["🦜", "🐒", "🐊", "🦍", "🐅", "🍌"],
  },
  {
    id: "desert",
    name: "המדבר",
    icon: "🌵",
    tiles: ["#EDC48A", "#E5B878"],
    vignette: "rgba(120,60,10,.25)",
    deco: ["🌾", "🦴", "🌾"],
    pod: { top: "#7FE3D8", bottom: "#1FA391", rim: "#11695E", ink: "#FFFFFF", outline: "#0B4640", topper: "shine" },
    obstacles: { still: ["🌵", "🪨"], count: [5, 7], mover: "🐪", motion: "patrol", movers: 1 },
    // soft sand: slow going
    terrain: { kind: "slow", count: 2, size: [1.5, 2.1], fill: "rgba(190,130,60,.45)", detail: "rgba(255,240,210,.8)" },
    critters: ["🦎", "🦂"],
    motes: { motion: "fall", shape: "dot", colors: ["#FFF1D0", "#F5D9A8"], count: 12, speed: 8 },
    glow: "#9a5a1f",
    ring: "#c07a34",
    stickers: ["🐪", "🌵", "🦎", "🦂", "🐫", "☀️"],
  },
];

export function worldById(id: string | undefined): World {
  return WORLDS.find((w) => w.id === id) ?? WORLDS[0];
}
