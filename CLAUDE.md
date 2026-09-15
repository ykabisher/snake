# נחש חכם — Smart Snake

A Hebrew educational Snake game for a 6-year-old. Three games today: an
addition game (`1+2`) and a subtraction game (`3−1`) — solve the equation and
eat the answer — and a spelling game (`אבג`) — collect the letters of a word in
order. The UI is Hebrew and RTL; the code and comments are English.

**Live page:** https://claude.ai/artifact/Q6UCiEGgNkjZvbFWLKgcwx
**GitHub Pages:** https://ykabisher.github.io/snake/ — deployed by
`.github/workflows/pages.yml` on every push to `main` (it serves the same
single-file `dist/index.html`). Repo: https://github.com/ykabisher/snake

---

## Commands

```bash
npm run dev        # local dev server with HMR — use this while iterating
npm run typecheck  # tsc --noEmit
npm run build      # typecheck + single-file bundle -> dist/index.html
npm run artifact   # build + strip the document shell -> dist/artifact.html
```

There are no tests. `npm run typecheck` is the fast correctness gate — the types
are strict (`noUnusedLocals`, `noUnusedParameters`, `strict`) and most mistakes
surface there. Run it after any change.

To see a change actually working, `npm run dev` and open the URL. The game needs
a real browser — a headless screenshot will render the menu but cannot play.

---

## Architecture in one paragraph

`GameEngine` (imperative, 60fps, owns the canvas) asks the active
`ModeDefinition` what to put on the board and what an answer is worth. React
renders only the shell — HUD, prompt plank, overlays — and receives a small
`GameView` snapshot from the engine **only when something discrete changes**
(score, level, prompt, status). React never re-renders per frame. That split is
the single most important thing to preserve.

```
index.html ──> src/main.tsx ──> src/App.tsx
                                   │
                    ┌──────────────┴───────────────┐
                    │                              │
             src/hooks/useGame.ts            src/ui/*.tsx
             (owns the engine,               (presentational only)
              mirrors GameView)
                    │
             src/game/engine.ts ──> renderer.ts  (all canvas drawing)
                    │            ├─> fx.ts        (particles, shake, floats)
                    │            ├─> ambient.ts   (drifting motes, wandering critters)
                    │            ├─> album.ts     (sticker awards)
                    │            ├─> audio.ts     (WebAudio synth + inlined sound files)
                    │            └─> input.ts     (keys, swipe)
                    │
             src/content/worlds.ts  (one world per level: ground, pods, stickers)
                    │
             src/modes/index.ts  (registry: PLUS_MODE, MINUS_MODE, SPELL_MODE)
                    ├─> mathMode.ts  ──> src/content/math.ts   (PLUS_LEVELS, MINUS_LEVELS)
                    └─> spellMode.ts ──> src/content/words.ts
```

### Where things live

| Path | What it owns |
|---|---|
| `src/game/types.ts` | Every shared type. **Start here** — most features are "add a field, follow the compiler". |
| `src/hooks/useGame.ts` | Owns the engine; remembers the menu choices (skin, mode, difficulty) in storage. |
| `src/game/constants.ts` | Grid size, speed curve, penalties, star thresholds. Tune game feel here. |
| `src/game/engine.ts` | Rules: movement, wrapping, collision, scoring, the level ladder, round lifecycle. |
| `src/game/renderer.ts` | All canvas drawing: world ground (cached), pods, the snake's face and moods, gulp bulges, turn chevrons. Pure rendering — no rules. |
| `src/game/fx.ts` | Particles, confetti, screen shake, floating score text. Cosmetic only. |
| `src/game/ambient.ts` | Per-world drifting motes and the critter that wanders across. Cosmetic only. |
| `src/game/album.ts` | Which stickers are owned; awards one at game over. |
| `src/game/storage.ts` | The only `localStorage` access; never throws. `bestKey(modeId)` names each mode's high score. |
| `src/game/rng.ts` | Every random helper (`ri`, `pick`, `shuffle`, `chance`, `seeded`...). |
| `src/content/worlds.ts` | The worlds, one per level: tiles, scenery, pod style, critters, sticker page. Hand-editable data. |
| `src/game/audio.ts` | Sound cues (synth fallback + optional files) and the music loop. |
| `src/assets/sounds/` | Optional audio files, named after the cue they replace. See its README. |
| `src/game/input.ts` | Keyboard map, swipe detection (anywhere on the play area; drag to steer without lifting). There is no on-screen D-pad. |
| `src/content/words.ts` | The Hebrew word list. Hand-editable data. |
| `src/content/math.ts` | The math curriculum: `PLUS_LEVELS` and `MINUS_LEVELS`, one generator per level, plus the near-miss wrong answers. Hand-editable data. |
| `src/content/skins.ts` | Snake skins. Hand-editable data. |
| `src/modes/` | Game modes + the registry. `mathMode.ts` builds both equation games from one runner. |
| `src/ui/` | React components. Presentational — no game logic. Icons for the word-free buttons are in `icons.tsx`. |
| `src/styles/tokens.css` | Every colour, radius and font. Change the look from here. |
| `src/styles/app.css` | Layout and components. |
| `scripts/make-artifact.mjs` | Turns `dist/index.html` into the shell-less `dist/artifact.html`. |

---

## Common tasks

### Add words
Append to `WORDS` in `src/content/words.ts`. The level is derived from letter
count (2-3 → 1, 4 → 2, 5+ → 3), so you never assign one. Pick an emoji a child
recognises without being told the word.

### Add or retune a math level
The addition game climbs `PLUS_LEVELS`, the subtraction game `MINUS_LEVELS`,
both in `src/content/math.ts`. Each has six levels, one per world, easiest first
(up to 5 → up to 10 → teens without crossing ten → crossing ten → three numbers
→ tens). Keep each ladder to its own operator. Append or edit a generator;
`maxLevel` follows the array length automatically. If you add levels, revisit
`startLevel` in `mathMode()` in `src/modes/mathMode.ts`, which maps the three
menu difficulties onto the ladder (`[1, 3, 5]`), and `tokenCount` beside it.

Generators must never produce a negative answer or a × / ÷ question (see the
rules below). Use `add(a, b)` for sums — it shows the two numbers in either
order.

### Add a snake skin
Append to `SKINS` in `src/content/skins.ts`. It appears in the picker
automatically. `rainbow: true` cycles hue along the body; `glow: true` adds a
halo.

### Add or change a world
Edit `WORLDS` in `src/content/worlds.ts`. Level N plays in world N (wrapping if
a mode has more levels than worlds), so the order is the level order. Each world
sets its checkerboard tiles, scenery emoji, pod style (`topper` picks the leaf /
ring / wrapper / bubble / shine detail drawn in `renderer.ts`), critters, motes,
the page tint and its sticker page. Keep scenery small and unlike a pod.

### Stickers
A run that completes `STICKER_MIN_COMPLETED` units earns one sticker at game
over, drawn from the worlds it reached (favouring the furthest). Owned stickers
live in storage under `stickers`. Add stickers to a world's `stickers` array.
A mode can only reach as many worlds as it has levels: the math games have six
and reach every world; spelling has three (garden, beach, snow).

### Add or replace a sound
Drop `<cue>.mp3` into `src/assets/sounds/` (`music.mp3` is the in-run loop).
Vite inlines it as a data: URL; `audio.ts` decodes it on `unlock()` and falls
back to the synth if it is missing or undecodable. For a brand-new cue, add it
to `synth` and `sfx` in `audio.ts` and call it from the engine.

### Add a game mode  ← the main extension point
**Another equation game** (a new ladder of `text` → `answer` questions): add a
`Generator[]` ladder to `src/content/math.ts`, then in `src/modes/mathMode.ts`
call `mathMode({ id, name, icon, blurb, sample }, YOUR_LEVELS)` and register
the result. `PLUS_MODE` and `MINUS_MODE` are both built this way.

**Anything else:**
1. Write `src/modes/<name>Mode.ts` exporting a `ModeDefinition` (copy
   `MathRunner` in `mathMode.ts` — it is the simpler runner).
2. Add it to the `MODES` array in `src/modes/index.ts`.

That is all. The menu card (its `icon` and big `sample`, e.g. "1+2"), the
level ladder and per-mode high scores all pick it up. A mode's runner answers
four questions: `nextRound(level)` (what pods go on the board and the banner),
`onCorrect(level)` (what the right answer earns), `decoy(level)` (a replacement
wrong label) and `prompt()` (the current banner, without advancing).

The mode `id` is a storage key — the high score lives under `best_<id>` and the
menu remembers the last-picked id — so renaming a mode resets its high score.
A remembered id that no longer exists falls back to `DEFAULT_MODE_ID`. The
menu cards share one row; beyond four they get cramped on a phone.

If the new mode needs a banner layout the existing ones don't have, add a
variant to `PromptModel` in `src/game/types.ts` and render it in
`src/ui/PromptBar.tsx`. The compiler will point at both places.

### Change difficulty pacing
`ModeDefinition.levelUpStreak` (completed units in a row to level up) and
`LEVEL_DOWN_STREAK` / the speed constants in `src/game/constants.ts`. Growth is
the `grow` each mode returns from `onCorrect` (1 segment today), capped by
`MAX_LENGTH`.

### Change the look
`src/styles/tokens.css` first. Canvas colours (board soil, pods) are in
`renderer.ts` — they are drawing code, not tokens, so change them there.

---

## Rules that are deliberate — don't "fix" them

These exist because the player is six years old:

- **Walls wrap.** Hitting an edge is not death. The only way to lose is running
  into your own tail.
- **A wrong answer never ends the run.** It costs two tail segments, three
  points and a red shake; the question stays and a fresh decoy respawns
  elsewhere.
- **The level adapts both ways.** Up after a streak of *completed units*, down
  after two mistakes in a row. In spelling, a single correct letter is not a
  completed unit — the whole word is (`CorrectResult.advanced`).
- **Pods look identical.** Right and wrong answers are visually the same; the
  answer is in the text. Never colour-code correctness. The pod style changes
  per world, but every pod on the board shares it — and the snake's mouth opens
  for any pod ahead, right or wrong.
- **Turns feel instant.** A swipe is acknowledged at once (chevrons from the
  head, the eyes look, a soft swish) and a waiting turn hurries the snake into
  the next cell (`TURN_HURRY`), so the grid never makes a child wait out a
  whole step.
- **A lane of 3 cells ahead of the head stays free of pods** (`SAFE_LANE`), so
  the player is never forced into a wrong answer.
- **No timer.** Speed rises with level and answers, but nothing counts down.
- **Addition and subtraction only, in separate games.** No × or ÷, and no
  negative answers. Each math game practises one operator, so a child always
  knows which kind of question is coming.
- **The snake stays short.** One segment per right answer, never longer than
  `MAX_LENGTH` (15). A long tail is what ends runs.
- **The player cannot read yet.** Menus, the pause card and the end-of-run
  card are pictures, numbers and icon buttons (`src/ui/icons.tsx`) — no words.
  Hebrew names live on as `aria-label`s. The end of a run shows only the
  score, stars, the sticker won and confetti.

## Conventions

- Hebrew for anything the player reads; English for code, comments and commits.
- Numbers and equations need `dir="ltr"` inside the RTL page — see `.equation`.
- Every `localStorage` access goes through `src/game/storage.ts`, which never
  throws (private windows and blocked site data are real).
- Randomness goes through `src/game/rng.ts`.
- Audio files live only in `src/assets/sounds/` and are inlined into the bundle —
  never load sound from a URL (CSP). Every cue must keep a synth fallback. Keep
  the folder under ~5 MB.
- `unlock()` from `audio.ts` must be called from a user gesture before any sound
  plays; menu taps and touch handlers already do it.
- Respect `prefers-reduced-motion`: `Fx` skips particles, `Ambient` skips
  motes and critters, the renderer skips pod bounce, glow, gulp bulges and the
  world reveal, the answer does not fly, and the CSS disables animation.
- The canvas inherits the page's RTL direction; `Renderer.resize` resets it to
  LTR so "+10" does not draw as "10+".

---

## Publishing

The game is published as a Claude Artifact and must stay **one self-contained
file**.

```bash
npm run artifact          # -> dist/artifact.html
```

Then publish `dist/artifact.html` with the Artifact tool, passing the existing
URL so the link the child uses keeps working:

> `url: "https://claude.ai/artifact/Q6UCiEGgNkjZvbFWLKgcwx"`

Publishing without `url` creates a *new* artifact at a new link. Read the
artifact first if this conversation has not published it.

### Constraints the build must respect

- **No document shell in the published file.** Artifacts supply their own
  `<!doctype html>`, `<head>` and `<body>`. `scripts/make-artifact.mjs` strips
  Vite's shell and re-emits `<title>`, the fonts `<link>`, the inlined
  `<style>`, `#root`, then the inlined script — in that order, script last.
- **CSP.** Stylesheets may only come from `fonts.googleapis.com` (fonts from
  `fonts.gstatic.com`). Scripts only from cdnjs / jsdelivr / tailwind / jQuery.
  Everything else — images, fetch, other CDNs — is blocked silently. That is why
  React is bundled and sound is synthesised or inlined rather than loaded.
- **16 MB limit.** Currently ~1.6 MB, almost all of it `music.mp3`, so there
  is plenty of room, but don't embed video.
- **`<title>` must be in the first 8 KB** of the published file. The build puts
  it first; don't reorder it.
- The favicon is set once at publish time and must not change on redeploys.

### `snake-game.html`
The original hand-written prototype, kept for reference only. It is **not** the
source of truth and is not built or published. Delete it once you're confident
in the port.
