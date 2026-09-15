import { WORLDS } from "../content/worlds";
import { ownedStickers, TOTAL_STICKERS } from "../game/album";
import { BackIcon } from "./icons";

/** The album: one page per world. Missing stickers show as dark silhouettes. */
export function StickerBook({ onClose }: { onClose: () => void }) {
  const owned = ownedStickers();
  return (
    <div className="overlay overlay--top">
      <div className="sheet">
        <div className="brand">
          <h1>
            📒 <em dir="ltr">{owned.size}/{TOTAL_STICKERS}</em>
          </h1>
        </div>

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
