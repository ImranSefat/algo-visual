"use client";

import { Suspense, useEffect, useState, type ReactNode } from "react";
import { getAlgorithm, runAlgorithm } from "@/algorithms/registry";
import { isTextEntry, keyOwnedByFocus } from "@/lib/keyboard";
import { createInputStore, InputContext, useInputStore } from "@/store/input";
import {
  createPlaybackStore,
  PlaybackContext,
  SPEEDS,
  usePlaybackClock,
  usePlaybackStore,
} from "@/store/playback";
import { AlgorithmContext } from "./context";
import { UrlStateSync } from "./url-state-sync";

function createVisualizer(slug: string) {
  const algo = getAlgorithm(slug);
  if (!algo) throw new Error(`Unknown algorithm: ${slug}`);
  const input = createInputStore(algo.meta.defaultInput);
  const playback = createPlaybackStore(runAlgorithm(algo, algo.meta.defaultInput));
  // Input changes re-run the generator here, in the store event, never in a render or effect.
  input.subscribe((state, prev) => {
    if (state.spec !== prev.spec) playback.getState().load(runAlgorithm(algo, state.spec));
  });
  return { algo, input, playback };
}

/** Owns one visualizer's stores. Everything inside (canvas, code, transport, controls) reads from them. */
export function VisualizerRoot({ slug, children }: { slug: string; children: ReactNode }) {
  const [{ algo, input, playback }] = useState(() => createVisualizer(slug));
  return (
    <AlgorithmContext.Provider value={algo}>
      <InputContext.Provider value={input}>
        <PlaybackContext.Provider value={playback}>
          <PlaybackClock />
          <PlaybackShortcuts />
          <Suspense fallback={null}>
            <UrlStateSync />
          </Suspense>
          {children}
        </PlaybackContext.Provider>
      </InputContext.Provider>
    </AlgorithmContext.Provider>
  );
}

export function PlaybackClock() {
  usePlaybackClock();
  return null;
}

/** Space / arrows / Home / End / 1–6 / R for whichever visualizer stores are in context. */
export function PlaybackShortcuts() {
  const playback = usePlaybackStore();
  const input = useInputStore();
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.altKey) return;
      if (isTextEntry(e.target) || keyOwnedByFocus(e.target, e.key)) return;
      const p = playback.getState();
      const speed = SPEEDS[Number(e.key) - 1];
      if (speed !== undefined) {
        p.setSpeed(speed);
        return;
      }
      const actions: Record<string, () => void> = {
        " ": p.toggle,
        ArrowRight: p.stepForward,
        ArrowLeft: p.stepBack,
        Home: p.toStart,
        End: p.toEnd,
        r: () => input.getState().randomise(),
        R: () => input.getState().randomise(),
      };
      const action = actions[e.key];
      if (!action) return;
      e.preventDefault();
      action();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [playback, input]);
  return null;
}
