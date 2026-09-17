import { WORLDS } from "../content/worlds";
import { ownedStickers, TOTAL_STICKERS } from "../game/album";
import { TROPHIES, wonTrophies } from "../game/trophies";
import { BackIcon } from "./icons";

/**
 * The album: the trophy shelf, then one page per world. Missing stickers and
 * trophies show as dark silhouettes; a trophy won more than once shows a count.
 */
export function StickerBook({ onClose }: { onClose: () => void }) {
  const owned = ownedStickers();
  const won = wonTrophies();
  const times = (t: string) => won.filter((w) => w === t).length;
  const kinds = TROPHIES.filter((t) => times(t) > 0).length;
  return (
    <div className="overlay overlay--top">
      <div className="sheet">
        <div className="brand">
          <h1>
            📒 <em dir="ltr">{owned.size}/{TOTAL_STICKERS}</em>
          </h1>
        </div>

        <section className="album-page album-page--shelf">
          <header className="album-page__head">
            <span className="album-page__icon" aria-label="גביעים">
              🏆
            </span>
            <span className="album-page__count">
              {kinds}/{TROPHIES.length}
            </span>
          </header>
          <div className="album-page__grid">
            {TROPHIES.map((t) => {
              const n = times(t);
              return (
                <span key={t} className={`sticker shelf-trophy${n > 0 ? "" : " sticker--missing"}`}>
                  {t}
                  {n > 1 && <b className="shelf-trophy__count">×{n}</b>}
                </span>
              );
            })}
          </div>
        </section>

        {WORLDS.map((world) => {
          const got = world.stickers.filter((s) => owned.has(s)).length;
          return (
            <section className="album-page" key={world.id}>
              <header className="album-page__head">
                <span className="album-page__icon" aria-label={world.name}>
                  {world.icon}
                </span>
                <span className="album-page__count">
                  {got}/{world.stickers.length}
                </span>
              </header>
              <div className="album-page__grid">
                {world.stickers.map((s) => (
                  <span key={s} className={`sticker${owned.has(s) ? "" : " sticker--missing"}`}>
                    {s}
                  </span>
                ))}
              </div>
            </section>
          );
        })}

        <div className="icon-row icon-row--single">
          <button className="big-btn big-btn--primary" onClick={onClose} aria-label="חזרה">
            <BackIcon />
          </button>
        </div>
      </div>
    </div>
  );
}
