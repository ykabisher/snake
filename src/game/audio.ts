/**
 * Every cue has a synthesised WebAudio version. Dropping a file named after the
 * cue into src/assets/sounds/ (e.g. `correct.mp3`) replaces it; `music.*` is a
 * background loop for a run. Files are inlined into the bundle as data: URLs,
 * so the single-file build stays self-contained and nothing loads at runtime.
 * A missing or undecodable file silently falls back to the synth.
 *
 * The context can only be created inside a user gesture; `unlock()` is called
 * from every button and touch handler.
 */
import { storage } from "./storage";

const SFX_VOLUME = 0.7;
const MUSIC_VOLUME = 0.25;

const FILES = import.meta.glob<string>("../assets/sounds/*.{mp3,ogg,wav,m4a}", {
  eager: true,
  query: "?inline",
  import: "default",
});

let ctx: AudioContext | null = null;
let enabled = storage.get("sound", true);
const buffers = new Map<string, AudioBuffer>();

export function unlock(): void {
  if (!ctx) {
    try {
      const Ctor = window.AudioContext ?? (window as any).webkitAudioContext;
      ctx = new Ctor();
      void loadFiles(ctx);
    } catch {
      ctx = null;
    }
  }
  if (ctx?.state === "suspended") void ctx.resume();
}

export function isSoundOn(): boolean {
  return enabled;
}

export function setSoundOn(on: boolean): void {
  enabled = on;
  storage.set("sound", on);
  syncMusic();
  if (on) {
    unlock();
    sfx.tap();
  }
}

/* ---------------------------------------------------------------- *
 * Files
 * ---------------------------------------------------------------- */

// Decoded by hand rather than fetch()ed: the Artifact CSP may block fetching data: URLs.
function dataUrlToBytes(url: string): ArrayBuffer | null {
  const comma = url.indexOf(",");
  if (comma < 0 || !url.slice(0, comma).endsWith(";base64")) return null;
  const bin = atob(url.slice(comma + 1));
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes.buffer;
}

async function loadFiles(context: AudioContext): Promise<void> {
  await Promise.all(
    Object.entries(FILES).map(async ([path, url]) => {
      const name = path.slice(path.lastIndexOf("/") + 1, path.lastIndexOf("."));
      const bytes = dataUrlToBytes(url);
      if (!bytes) return;
      try {
        buffers.set(name, await context.decodeAudioData(bytes));
      } catch {
        // unsupported format on this browser (e.g. .ogg on older iPads) — keep the synth
      }
    }),
  );
  // the first run usually starts before decoding finishes
  syncMusic();
}

function playBuffer(buffer: AudioBuffer, vol: number): void {
  if (!ctx) return;
  const src = ctx.createBufferSource();
  const gain = ctx.createGain();
  src.buffer = buffer;
  gain.gain.value = vol;
  src.connect(gain);
  gain.connect(ctx.destination);
  src.start();
}

/* ---------------------------------------------------------------- *
 * Synth
 * ---------------------------------------------------------------- */

/** MIDI note number -> Hz. 60 = middle C, 72 = C5, 84 = C6. */
const note = (midi: number) => 440 * 2 ** ((midi - 69) / 12);

interface Voice {
  freq: number;
  /** glide to this pitch over the note */
  to?: number;
  dur: number;
  type?: OscillatorType;
  vol?: number;
  delay?: number;
  /** seconds at full volume before the fade */
  hold?: number;
  /** vibrato depth in Hz */
  vibrato?: number;
  /** lowpass cutoff — softens saw and square waves */
  cutoff?: number;
}

function voice({ freq, to, dur, type = "sine", vol = 0.1, delay = 0, hold = 0, vibrato, cutoff }: Voice): void {
  if (!ctx) return;
  const t0 = ctx.currentTime + delay;
  const end = t0 + dur;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  if (to) osc.frequency.exponentialRampToValueAtTime(to, end);
  gain.gain.setValueAtTime(0.0001, t0);
  gain.gain.exponentialRampToValueAtTime(vol, t0 + 0.012);
  if (hold > 0) gain.gain.setValueAtTime(vol, t0 + hold);
  gain.gain.exponentialRampToValueAtTime(0.0001, end);

  let last: AudioNode = osc;
  if (cutoff) {
    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = cutoff;
    osc.connect(filter);
    last = filter;
  }
  last.connect(gain);
  gain.connect(ctx.destination);

  if (vibrato) {
    const lfo = ctx.createOscillator();
    const depth = ctx.createGain();
    lfo.frequency.value = 6;
    depth.gain.value = vibrato;
    lfo.connect(depth);
    depth.connect(osc.frequency);
    lfo.start(t0);
    lfo.stop(end + 0.02);
  }
  osc.start(t0);
  osc.stop(end + 0.02);
}

let noiseBuffer: AudioBuffer | null = null;

/** A filtered burst of noise — the "crunch" of a bite. */
function noise(dur: number, vol: number, freq: number, delay = 0): void {
  if (!ctx) return;
  if (!noiseBuffer) {
    noiseBuffer = ctx.createBuffer(1, ctx.sampleRate * 0.5, ctx.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  }
  const t0 = ctx.currentTime + delay;
  const src = ctx.createBufferSource();
  const filter = ctx.createBiquadFilter();
  const gain = ctx.createGain();
  src.buffer = noiseBuffer;
  filter.type = "bandpass";
  filter.frequency.value = freq;
  filter.Q.value = 1.2;
  gain.gain.setValueAtTime(vol, t0);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  src.connect(filter);
  filter.connect(gain);
  gain.connect(ctx.destination);
  src.start(t0);
  src.stop(t0 + dur + 0.02);
}

/** A soft glockenspiel note: fundamental plus a quick-fading octave. */
function bell(freq: number, delay = 0, vol = 0.1): void {
  voice({ freq, dur: 0.5, vol, delay });
  voice({ freq: freq * 2, dur: 0.18, vol: vol * 0.35, delay });
}

/** High twinkles on top of a celebration. */
function sparkle(delay: number): void {
  [96, 100, 103, 108, 103].forEach((m, i) =>
    voice({ freq: note(m), dur: 0.12, vol: 0.035, delay: delay + i * 0.06 }),
  );
}

/**
 * The built-in sound of every cue, used when no file overrides it. Everything
 * is major-key, round and soft — the player is six, so even "wrong" and a
 * bump are cartoon sounds, never harsh buzzers.
 */
const synth = {
  /** a bubble pop */
  tap: () => voice({ freq: 600, to: 1300, dur: 0.07, vol: 0.12 }),
  /** a tiny, quiet swish — the finger touched down and the snake is coming */
  turn: () => voice({ freq: 520, to: 880, dur: 0.06, vol: 0.035 }),
  /** a whoosh up, then ding-ding */
  start: () => {
    voice({ freq: 260, to: 780, dur: 0.22, type: "triangle", vol: 0.08 });
    bell(note(84), 0.18);
    bell(note(91), 0.3);
  },
  /** a crunchy bite and three rising bells */
  correct: () => {
    noise(0.07, 0.14, 1800);
    [76, 79, 84].forEach((m, i) => bell(note(m), 0.04 + i * 0.06, 0.11));
  },
  /** a cartoon "uh-oh" */
  wrong: () => {
    voice({ freq: note(71), to: note(69), dur: 0.16, type: "triangle", vol: 0.15 });
    voice({ freq: note(67), to: note(62), dur: 0.32, type: "triangle", vol: 0.15, delay: 0.17, vibrato: 8 });
  },
  /** a bell run into a held chord with twinkles */
  complete: () => {
    noise(0.07, 0.12, 1800);
    [72, 76, 79, 84].forEach((m, i) => bell(note(m), i * 0.08, 0.1));
    [72, 76, 79, 84].forEach((m) =>
      voice({ freq: note(m), dur: 0.8, type: "triangle", vol: 0.05, delay: 0.34, hold: 0.25 }),
    );
    sparkle(0.34);
  },
  /** a fast climbing power-up into a shimmering chord — arriving in a new world */
  world: () => {
    [72, 76, 79, 84, 88, 91, 96].forEach((m, i) =>
      voice({ freq: note(m), dur: 0.1, type: "square", vol: 0.05, delay: i * 0.05, cutoff: 3000 }),
    );
    [84, 88, 91].forEach((m) =>
      voice({ freq: note(m), dur: 0.7, type: "triangle", vol: 0.06, delay: 0.36, hold: 0.15, vibrato: 5 }),
    );
    sparkle(0.36);
  },
  /** a rubbery "boing" — bumped into an obstacle, nothing lost */
  bonk: () => {
    noise(0.05, 0.08, 500);
    voice({ freq: 330, to: 170, dur: 0.18, type: "triangle", vol: 0.1, vibrato: 14 });
  },
  /** a soft bubbly whoosh — rolled onto a terrain patch */
  zone: () => {
    voice({ freq: 300, to: 620, dur: 0.16, vol: 0.05 });
    voice({ freq: 450, to: 900, dur: 0.12, vol: 0.03, delay: 0.06 });
  },
  /** the journey is done: a fanfare climbing into a big held chord */
  win: () => {
    [60, 64, 67, 72].forEach((m, i) =>
      voice({ freq: note(m), dur: 0.16, type: "square", vol: 0.05, delay: i * 0.11, cutoff: 2600 }),
    );
    [72, 76, 79, 84].forEach((m) =>
      voice({ freq: note(m), dur: 1.3, type: "triangle", vol: 0.06, delay: 0.46, hold: 0.6, vibrato: 4 }),
    );
    [84, 88, 91, 96].forEach((m, i) => bell(note(m), 0.5 + i * 0.09, 0.08));
    sparkle(0.9);
  },
};

type Cue = keyof typeof synth;

function play(name: Cue): void {
  if (!enabled || !ctx) return;
  const buffer = buffers.get(name);
  if (buffer) playBuffer(buffer, SFX_VOLUME);
  else synth[name]();
}

/** Add new cues to `synth` and here, then call them from the engine. */
export const sfx: Record<Cue, () => void> = {
  start: () => play("start"),
  correct: () => play("correct"),
  wrong: () => play("wrong"),
  complete: () => play("complete"),
  world: () => play("world"),
  bonk: () => play("bonk"),
  zone: () => play("zone"),
  win: () => play("win"),
  tap: () => play("tap"),
  turn: () => play("turn"),
};

/* ---------------------------------------------------------------- *
 * Music — a looping file, silent if there is none
 * ---------------------------------------------------------------- */

let musicWanted = false;
let musicSource: AudioBufferSourceNode | null = null;
let musicStartedAt = 0;
let musicOffset = 0;

function startMusic(): void {
  const buffer = buffers.get("music");
  if (!ctx || !buffer || musicSource) return;
  const gain = ctx.createGain();
  gain.gain.value = MUSIC_VOLUME;
  gain.connect(ctx.destination);
  const src = ctx.createBufferSource();
  src.buffer = buffer;
  src.loop = true;
  src.connect(gain);
  const offset = musicOffset % buffer.duration;
  src.start(0, offset);
  musicStartedAt = ctx.currentTime - offset;
  musicSource = src;
}

function stopMusic(): void {
  if (!ctx || !musicSource) return;
  musicOffset = ctx.currentTime - musicStartedAt;
  musicSource.stop();
  musicSource.disconnect();
  musicSource = null;
}

function syncMusic(): void {
  if (enabled && musicWanted) startMusic();
  else stopMusic();
}

export const music = {
  /** From the top — a new run. */
  start: () => {
    stopMusic();
    musicOffset = 0;
    musicWanted = true;
    syncMusic();
  },
  pause: () => {
    musicWanted = false;
    syncMusic();
  },
  resume: () => {
    musicWanted = true;
    syncMusic();
  },
  stop: () => {
    musicWanted = false;
    stopMusic();
    musicOffset = 0;
  },
};
