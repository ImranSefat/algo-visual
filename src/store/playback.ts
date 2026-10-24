import { createContext, useContext, useEffect } from "react";
import { createStore, useStore, type StoreApi } from "zustand";
import type { Step } from "@/algorithms/core/types";

export const BASE_MS = 600;
export const SPEEDS = [0.25, 0.5, 1, 2, 4, 8] as const;
export type Speed = (typeof SPEEDS)[number];

export type PlaybackState = {
  steps: Step<unknown>[];
  index: number;
  playing: boolean;
  speed: Speed;
  /** Replaces the timeline; resets to step 0, paused. */
  load(steps: Step<unknown>[]): void;
  play(): void;
  pause(): void;
  toggle(): void;
  stepForward(): void;
  stepBack(): void;
  seek(i: number): void;
  toStart(): void;
  toEnd(): void;
  setSpeed(s: Speed): void;
  /** Clock advance: like stepForward but keeps playing, and stops on the last step. */
  tick(): void;
};

export type PlaybackStore = StoreApi<PlaybackState>;

export function createPlaybackStore(steps: Step<unknown>[]): PlaybackStore {
  return createStore<PlaybackState>()((set, get) => {
    const last = () => Math.max(0, get().steps.length - 1);
    const clamp = (i: number) => Math.min(Math.max(0, Math.round(i)), last());
    return {
      steps,
      index: 0,
      playing: false,
      speed: 1,
      load: (next) => set({ steps: next, index: 0, playing: false }),
      play: () => {
        if (last() === 0) return;
        set((s) => ({ playing: true, index: s.index >= last() ? 0 : s.index }));
      },
      pause: () => set({ playing: false }),
      toggle: () => (get().playing ? get().pause() : get().play()),
      stepForward: () => set((s) => ({ index: clamp(s.index + 1), playing: false })),
      stepBack: () => set((s) => ({ index: clamp(s.index - 1), playing: false })),
      seek: (i) => set({ index: clamp(i) }),
      toStart: () => set({ index: 0, playing: false }),
      toEnd: () => set({ index: last(), playing: false }),
      setSpeed: (speed) => set({ speed }),
      tick: () =>
        set((s) => {
          const index = clamp(s.index + 1);
          return { index, playing: s.playing && index < last() };
        }),
    };
  });
}

export const PlaybackContext = createContext<PlaybackStore | null>(null);

export function usePlaybackStore(): PlaybackStore {
  const store = useContext(PlaybackContext);
  if (!store) throw new Error("usePlaybackStore must be used inside a Visualizer");
  return store;
}

/** Select narrowly: `usePlayback(s => s.index)`. */
export function usePlayback<T>(selector: (s: PlaybackState) => T): T {
  return useStore(usePlaybackStore(), selector);
}

export function stepDuration(speed: Speed): number {
  return Math.min(0.35, ((BASE_MS / speed) * 0.8) / 1000);
}

/** Animation duration in seconds that always fits inside one clock tick. */
export function useStepDuration(): number {
  return stepDuration(usePlayback((s) => s.speed));
}

/** Discrete clock: one step per BASE_MS / speed while playing. */
export function usePlaybackClock(): void {
  const store = usePlaybackStore();
  const playing = usePlayback((s) => s.playing);
  const index = usePlayback((s) => s.index);
  const speed = usePlayback((s) => s.speed);
  useEffect(() => {
    if (!playing) return;
    const id = setTimeout(() => store.getState().tick(), BASE_MS / speed);
    return () => clearTimeout(id);
  }, [store, playing, index, speed]);
}
