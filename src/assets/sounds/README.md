# Sound files

Drop audio files here named after the cue they replace. Any cue without a file
keeps its synthesised sound, so every file is optional.

| File name | When it plays |
|---|---|
| `music.*` | Background loop during a run (stops on pause / game over) |
| `start.*` | A run begins |
| `correct.*` | Ate the right answer |
| `wrong.*` | Ate a wrong answer |
| `complete.*` | Finished a whole word / big celebration |
| `levelUp.*` | Level went up |
| `levelDown.*` | Level eased down (keep it gentle, not a "fail" sound) |
| `gameOver.*` | Ran into your own tail |
| `tap.*` | Menu buttons, sound toggle |

- Formats: `.mp3` (plays everywhere — prefer it), `.ogg`, `.wav`, `.m4a`.
  Some older iPhones/iPads can't play `.ogg`; those cues fall back to the synth.
- Names are case-sensitive: `levelUp.mp3`, not `levelup.mp3`.
- Files are embedded in the published page (+33% size). Keep the whole folder
  under ~5 MB; the artifact limit is 16 MB.
- Volumes are `SFX_VOLUME` / `MUSIC_VOLUME` in `src/game/audio.ts`.
