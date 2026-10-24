"use client";

import { parseAsString, throttle, useQueryStates } from "nuqs";
import { Suspense, useEffect, useRef, useState, type ReactNode } from "react";
import { getAlgorithm } from "@/algorithms/registry";
import { AlgorithmContext } from "@/components/visualizer/context";
import { PlaybackClock, PlaybackShortcuts } from "@/components/visualizer/visualizer-root";
import { queryFromSpec, specFromQuery, urlParsers } from "@/lib/url-state";
import { InputContext } from "@/store/input";
import { PlaybackContext } from "@/store/playback";
import { CompareContext, createCompareStores, useCompare, useCompareStore, type CompareStores } from "./compare-store";

const compareParsers = { ...urlParsers, a: parseAsString, b: parseAsString };

/** Reads `?a=&b=` plus the usual input params once, then mirrors store changes back into the URL. */
function CompareUrlSync({ stores }: { stores: CompareStores }) {
  const [query, setQuery] = useQueryStates(compareParsers, { history: "replace", scroll: false, limitUrlUpdates: throttle(250) });
  const initial = useRef(query);

  useEffect(() => {
    const { compare, input, playback } = stores;
    const q = initial.current;
    if (q.a && getAlgorithm(q.a) && q.a !== compare.getState().a) compare.getState().select("a", q.a);
    if (q.b && getAlgorithm(q.b) && q.b !== compare.getState().b) compare.getState().select("b", q.b);
    const defaults = getAlgorithm(compare.getState().a)!.meta.defaultInput;
    const spec = specFromQuery(q, defaults);
    if (spec && JSON.stringify(spec) !== JSON.stringify(input.getState().spec)) input.getState().setSpec(spec);
    if (q.step !== null) playback.getState().seek(q.step);

    const offCompare = compare.subscribe((s, prev) => {
      if (s.a !== prev.a || s.b !== prev.b) void setQuery({ a: s.a, b: s.b, step: null });
    });
    const offInput = input.subscribe((s, prev) => {
      if (s.spec !== prev.spec) void setQuery({ ...queryFromSpec(s.spec), step: null });
    });
    const offPlayback = playback.subscribe((s, prev) => {
      if (s.index === prev.index && s.playing === prev.playing) return;
      void setQuery({ step: s.playing || s.index === 0 ? null : s.index });
    });
    return () => {
      offCompare();
      offInput();
      offPlayback();
    };
  }, [stores, setQuery]);

  return null;
}

/** Algorithm A's context for root-level consumers (input controls need its defaults). */
function PrimaryAlgorithm({ children }: { children: ReactNode }) {
  const a = useCompare((s) => s.a);
  return <AlgorithmContext.Provider value={getAlgorithm(a)!}>{children}</AlgorithmContext.Provider>;
}

/** Shared stores for both panes: one input, one clock. */
export function CompareRoot({ a, b, children }: { a: string; b: string; children: ReactNode }) {
  const [stores] = useState(() => createCompareStores(a, b));
  return (
    <CompareContext.Provider value={stores.compare}>
      <InputContext.Provider value={stores.input}>
        <PlaybackContext.Provider value={stores.playback}>
          <PrimaryAlgorithm>
            <PlaybackClock />
            <PlaybackShortcuts />
            <Suspense fallback={null}>
              <CompareUrlSync stores={stores} />
            </Suspense>
            {children}
          </PrimaryAlgorithm>
        </PlaybackContext.Provider>
      </InputContext.Provider>
    </CompareContext.Provider>
  );
}

export { useCompareStore };
