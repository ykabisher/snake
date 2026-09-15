import { useCallback, useEffect, useRef, useState, type RefObject } from "react";
import type { Difficulty, DirectionName, GameView, ModeId, ToastMessage } from "../game/types";
import { GameEngine } from "../game/engine";
import { attachKeyboard, attachSwipe } from "../game/input";
import { getMode, DEFAULT_MODE_ID } from "../modes";
import { skinAt } from "../content/skins";
import { storage } from "../game/storage";
import { unlock } from "../game/audio";

const EMPTY_VIEW: GameView = {
  status: "menu",
  modeId: DEFAULT_MODE_ID,
  score: 0,
  level: 1,
  maxLevel: 1,
  streak: 0,
  streakGoal: 1,
  best: 0,
  newBest: false,
  prompt: null,
  roundNonce: 0,
  wrongNonce: 0,
  fly: null,
  sticker: null,
  stats: { score: 0, correct: 0, mistakes: 0, completed: 0, level: 1, best: 0 },
};

/**
 * Owns the engine instance and mirrors its discrete state into React.
 * The 60fps rendering never passes through here — only score, level, prompt
 * and status changes do.
 */
export function useGame(
  canvasRef: RefObject<HTMLCanvasElement>,
  boardRef: RefObject<HTMLElement>,
  /** Where swipes are read — the whole play area, not just the board. */
  swipeRef: RefObject<HTMLElement>,
) {
  const engineRef = useRef<GameEngine | null>(null);
  const [view, setView] = useState<GameView>(EMPTY_VIEW);
  const [toast, setToast] = useState<ToastMessage | null>(null);

  // menu selections, remembered on the device
  const [skinIndex, setSkinIndex] = useState(() => storage.get("skin", 0));
  // a stored id from a mode that no longer exists falls back to the default
  const [modeId, setModeId] = useState<ModeId>(() => getMode(storage.get("mode", DEFAULT_MODE_ID)).id);
  const [difficulty, setDifficulty] = useState<Difficulty>(() => storage.get("difficulty", 1 as Difficulty));

  useEffect(() => storage.set("skin", skinIndex), [skinIndex]);
  useEffect(() => storage.set("mode", modeId), [modeId]);
  useEffect(() => storage.set("difficulty", difficulty), [difficulty]);

  // create the engine once the canvas exists
  useEffect(() => {
    if (!canvasRef.current) return;
    const engine = new GameEngine(canvasRef.current, {
      onView: setView,
      onToast: setToast,
    });
    engineRef.current = engine;
    return () => {
      engine.destroy();
      engineRef.current = null;
    };
  }, [canvasRef]);

  const turn = useCallback((dir: DirectionName) => engineRef.current?.turn(dir), []);
  const togglePause = useCallback(() => engineRef.current?.togglePause(), []);

  const start = useCallback(() => {
    unlock();
    engineRef.current?.start({
      mode: getMode(modeId),
      difficulty,
      skin: skinAt(skinIndex),
    });
  }, [modeId, difficulty, skinIndex]);

  const quit = useCallback(() => engineRef.current?.stop(), []);
  const resume = useCallback(() => engineRef.current?.setPaused(false), []);

  // keep the board square and filling its box
  useEffect(() => {
    const el = boardRef.current;
    if (!el) return;
    const fit = () => {
      const r = el.getBoundingClientRect();
      engineRef.current?.resize(Math.min(r.width, r.height));
    };
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    window.addEventListener("orientationchange", fit);
    fit();
    return () => {
      ro.disconnect();
      window.removeEventListener("orientationchange", fit);
    };
  }, [boardRef, view.status]);

  // input
  useEffect(() => attachKeyboard(turn, togglePause), [turn, togglePause]);
  useEffect(() => {
    const el = swipeRef.current;
    if (!el) return;
    return attachSwipe(el, turn, unlock);
  }, [swipeRef, turn]);

  // pause when the tab goes away, so nobody comes back to a dead snake
  useEffect(() => {
    const onHide = () => {
      if (document.hidden) engineRef.current?.setPaused(true);
    };
    document.addEventListener("visibilitychange", onHide);
    return () => document.removeEventListener("visibilitychange", onHide);
  }, []);

  return {
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
    turn,
  };
}
