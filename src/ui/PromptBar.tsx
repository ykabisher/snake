import { useEffect, useRef, useState } from "react";
import type { PromptModel } from "../game/types";

interface Props {
  prompt: PromptModel | null;
  /** Bumped every time new pods are dealt — a new equation flips in. */
  roundNonce: number;
  /** Bumped by the engine on every wrong answer, to replay the shake. */
  wrongNonce: number;
}

/**
 * The plank above the board. Add a case here when you add a PromptModel
 * variant in src/game/types.ts. Mark the slot a correct answer should fly
 * into with `data-fly-target` (see FlyingAnswer).
 */
export function PromptBar({ prompt, roundNonce, wrongNonce }: Props) {
  const shaking = useShake(wrongNonce);
  return (
    <section className={`prompt${shaking ? " prompt--shake" : ""}`} aria-live="polite">
      {prompt?.kind === "equation" && (
        <Equation key={roundNonce} text={prompt.text} answer={prompt.answer} />
      )}
      {prompt?.kind === "word" && (
        <Word key={prompt.word} icon={prompt.icon} word={prompt.word} index={prompt.index} />
      )}
    </section>
  );
}

/** Numbers and operators must run left-to-right inside the RTL page. */
function Equation({ text, answer }: { text: string; answer: string | null }) {
  return (
    <div className="equation prompt__card">
      {text} ={" "}
      {answer === null ? (
        <span className="equation__blank" data-fly-target>
          ?
        </span>
      ) : (
        <span className="equation__answer" data-fly-target>
          {answer}
        </span>
      )}
    </div>
  );
}

/** The target word with an icon; letters fill in as they are collected. */
function Word({ icon, word, index }: { icon: string; word: string; index: number }) {
  return (
    <div className="prompt__card prompt__card--word">
      <span className="word-icon">{icon}</span>
      <div className="word">
        {word.split("").map((letter, i) => {
          const state = i < index ? "done" : i === index ? "now" : "";
          const landed = i === index - 1;
          return (
            <span
              key={i}
              className={`letter${state ? ` letter--${state}` : ""}${landed ? " letter--landed" : ""}`}
              data-fly-target={landed || undefined}
            >
              {i <= index ? letter : "־"}
            </span>
          );
        })}
      </div>
    </div>
  );
}

function useShake(nonce: number): boolean {
  const [on, setOn] = useState(false);
  const first = useRef(true);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    setOn(true);
    const t = setTimeout(() => setOn(false), 400);
    return () => clearTimeout(t);
  }, [nonce]);
  return on;
}
