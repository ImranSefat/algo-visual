"use client";

import { throttle, useQueryStates } from "nuqs";
import { useEffect, useRef } from "react";
import { queryFromSpec, specFromQuery, urlParsers } from "@/lib/url-state";
import { useInputStore } from "@/store/input";
import { usePlaybackStore } from "@/store/playback";
import { useAlgorithm } from "./context";

/**
 * Two-way bridge between the URL and the visualizer stores. The stores stay the source of
 * truth: the URL is read once on mount, then only written. Must sit inside <Suspense>
 * because it reads search params on a statically rendered page.
 */
export function UrlStateSync() {
  const { meta } = useAlgorithm();
  const input = useInputStore();
  const playback = usePlaybackStore();
  const [query, setQuery] = useQueryStates(urlParsers, {
    history: "replace",
    scroll: false,
    limitUrlUpdates: throttle(250),
  });
  const initial = useRef(query);

  useEffect(() => {
    const spec = specFromQuery(initial.current, meta.defaultInput);
    if (spec && JSON.stringify(spec) !== JSON.stringify(input.getState().spec)) input.getState().setSpec(spec);
    if (initial.current.step !== null) playback.getState().seek(initial.current.step);

    const offInput = input.subscribe((state, prev) => {
      if (state.spec !== prev.spec) void setQuery({ ...queryFromSpec(state.spec), step: null });
    });
    const offPlayback = playback.subscribe((state, prev) => {
      if (state.index === prev.index && state.playing === prev.playing) return;
      void setQuery({ step: state.playing || state.index === 0 ? null : state.index });
    });
    return () => {
      offInput();
      offPlayback();
    };
  }, [meta, input, playback, setQuery]);

  return null;
}
