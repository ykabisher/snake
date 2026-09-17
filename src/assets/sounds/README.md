# Sound files

Drop audio files here named after the cue they replace. Any cue without a file
keeps its synthesised sound, so every file is optional.

| File name | When it plays |
|---|---|
| `music.*` | Background loop during a run (stops on pause / at the finish) |
| `start.*` | A run begins |
| `correct.*` | Ate the right answer |
| `wrong.*` | Ate a wrong answer |
| `complete.*` | Finished a whole word / big celebration |
| `world.*` | Arrived in a new world |
| `bonk.*` | Bumped into an obstacle (soft and funny — nothing is lost) |
| `zone.*` | Rolled onto a terrain patch (ice, sand, current...) |
| `win.*` | Finished the journey |
| `tap.*` | Menu buttons, sound toggle |
| `turn.*` | A finger touched the board (keep it tiny and quiet) |

- Formats: `.mp3` (plays everywhere — prefer it), `.ogg`, `.wav`, `.m4a`.
  Some older iPhones/iPads can't play `.ogg`; those cues fall back to the synth.
- Names are case-sensitive: `world.mp3`, not `World.mp3`.
- Files are embedded in the published page (+33% size). Keep the whole folder
  under ~5 MB; the artifact limit is 16 MB.
- Volumes are `SFX_VOLUME` / `MUSIC_VOLUME` in `src/game/audio.ts`.
