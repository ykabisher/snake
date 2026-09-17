import { useRef, useState, type CSSProperties } from "react";
import { useGame } from "./hooks/useGame";
import { Hud } from "./ui/Hud";
import { PromptBar } from "./ui/PromptBar";
import { RouteTrail } from "./ui/RouteTrail";
import { FlyingAnswer } from "./ui/FlyingAnswer";
import { Menu } from "./ui/Menu";
import { PauseScreen } from "./ui/PauseScreen";
import { GameOverScreen } from "./ui/GameOverScreen";
import { StickerBook } from "./ui/StickerBook";
import { Toast } from "./ui/Toast";
import { isSoundOn, setSoundOn } from "./game/audio";
import { worldById } from "./content/worlds";

/**
 * Layout owner. The canvas stays mounted for the life of the page — the engine
 * holds a reference to it — and the menu / pause / game-over overlays simply
 * cover it.
 */
export function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const boardRef = useRef<HTMLDivElement>(null);
  const appRef = useRef<HTMLDivElement>(null);
  const [soundOn, setSound] = useState(isSoundOn);
  const [albumOpen, setAlbumOpen] = useState(false);

  const {
    view,
    toast,
    skinIndex,
    setSkinIndex,
    modeId,
    setModeId,
    difficulty,
    setDifficulty,
    start,
    quit,
    resume,
    togglePause,
  } = useGame(canvasRef, boardRef, appRef);

  const toggleSound = () => {
    const next = !soundOn;
    setSoundOn(next);
    setSound(next);
  };

  // the page takes on the tint of the world being played
  const world = worldById(view.route[view.leg]);
  const tint = { "--world-glow": world.glow, "--world-ring": world.ring } as CSSProperties;

  return (
    <>
      <div className="app" ref={appRef} style={tint}>
        <Hud
          score={view.score}
          best={view.best}
          soundOn={soundOn}
          onPause={togglePause}
          onToggleSound={toggleSound}
        />

        <PromptBar prompt={view.prompt} roundNonce={view.roundNonce} wrongNonce={view.wrongNonce} />

        <RouteTrail route={view.route} leg={view.leg} done={view.legDone} goal={view.legGoal} />

        <main className="board" ref={boardRef}>
          <canvas ref={canvasRef} />
        </main>

        <p className="kbd-hint">הנחש הולך אחרי העכבר · חיצים או WASD · רווח להשהיה</p>
        <p className="swipe-hint" aria-label="הנחש הולך אחרי האצבע">
          <span className="swipe-hint__hand">👆</span>
        </p>
      </div>

      <FlyingAnswer fly={view.fly} canvasRef={canvasRef} />

      {view.status === "menu" && (
        <Menu
          onAlbum={() => setAlbumOpen(true)}
          skinIndex={skinIndex}
          onSkin={setSkinIndex}
          modeId={modeId}
          onMode={setModeId}
          difficulty={difficulty}
          onDifficulty={setDifficulty}
          onStart={start}
        />
      )}
      {view.status === "paused" && <PauseScreen onResume={resume} onQuit={quit} />}
      {view.status === "over" && (
        <GameOverScreen view={view} onAgain={start} onMenu={quit} />
      )}
      {albumOpen && <StickerBook onClose={() => setAlbumOpen(false)} />}

      <Toast toast={toast} />
    </>
  );
}
