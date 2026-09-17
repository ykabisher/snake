import type { Difficulty, ModeId } from "../game/types";
import { SKINS, skinAt } from "../content/skins";
import { MODES } from "../modes";
import { unlock, sfx } from "../game/audio";
import { ownedStickers, TOTAL_STICKERS } from "../game/album";
import { SnakeSwatch } from "./SnakeSwatch";
import { PlayIcon } from "./icons";

interface Props {
  onAlbum: () => void;
  skinIndex: number;
  onSkin: (i: number) => void;
  modeId: ModeId;
  onMode: (id: ModeId) => void;
  difficulty: Difficulty;
  onDifficulty: (d: Difficulty) => void;
  onStart: () => void;
}

const DIFFICULTIES: Array<{ value: Difficulty; label: string }> = [
  { value: 1, label: "קל" },
  { value: 2, label: "בינוני" },
  { value: 3, label: "קשה" },
];

/**
 * Built for a child who cannot read yet: every choice is a picture. Snakes are
 * little snakes, games are "1+2", "3−1" and "אבג", difficulty is stars, and
 * play is a big ▶. The Hebrew names stay as aria-labels.
 */
export function Menu({
  onAlbum,
  skinIndex,
  onSkin,
  modeId,
  onMode,
  difficulty,
  onDifficulty,
  onStart,
}: Props) {
  /** Every menu tap doubles as the gesture that unlocks WebAudio. */
  const tap = <T,>(fn: (v: T) => void) => (value: T) => {
    unlock();
    sfx.tap();
    fn(value);
  };

  return (
    <div className="overlay overlay--menu">
      <div className="sheet sheet--menu">
        <div className="brand brand--menu">
          <SnakeSwatch skin={skinAt(skinIndex)} big />
          <h1>
            נחש <em>חכם</em>
          </h1>
        </div>

        <div className="skins" role="group" aria-label="בוחרים נחש">
          {SKINS.map((skin, i) => (
            <button
              key={skin.id}
              className="tile skin"
              aria-pressed={i === skinIndex}
              aria-label={skin.name}
              onClick={() => tap(onSkin)(i)}
            >
              <SnakeSwatch skin={skin} />
            </button>
          ))}
        </div>

        <div className="modes" role="group" aria-label="בוחרים משחק">
          {MODES.map((m) => (
            <button
              key={m.id}
              className="tile mode"
              aria-pressed={m.id === modeId}
              aria-label={m.name}
              onClick={() => tap(onMode)(m.id)}
            >
              <span className="mode__icon">{m.icon}</span>
              <span className="mode__sample" dir="auto">
                {m.sample}
              </span>
            </button>
          ))}
        </div>

        <div className="pills" role="group" aria-label="רמת התחלה">
          {DIFFICULTIES.map((d) => (
            <button
              key={d.value}
              className="tile pill"
              aria-pressed={d.value === difficulty}
              aria-label={d.label}
              onClick={() => tap(onDifficulty)(d.value)}
            >
              <span className="pill__stars">{"⭐".repeat(d.value)}</span>
            </button>
          ))}
        </div>

        <div className="menu__actions">
          <button className="play-btn" onClick={onStart} aria-label="מתחילים">
            <PlayIcon />
          </button>
          <button className="album-btn" onClick={() => tap(onAlbum)(undefined)} aria-label="האלבום שלי">
            <span className="album-btn__icon">📒</span>
            <span className="album-btn__count">
              {ownedStickers().size}/{TOTAL_STICKERS}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
