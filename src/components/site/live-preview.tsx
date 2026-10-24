"use client";

import { LayoutGroup } from "motion/react";
import { useEffect, useState } from "react";
import { generateValues, type InputSpec } from "@/algorithms/core/input";
import { pickTarget } from "@/algorithms/core/randomise";
import { getAlgorithm, runAlgorithm } from "@/algorithms/registry";
import { renderers } from "@/components/renderers";

const TICK_MS = 220;
const MAX_FRAMES = 90;
const HOLD_FRAMES = 8;

/** Small inputs keep thumbnails readable: ~16 bars for array algorithms. */
function previewInput(spec: InputSpec): InputSpec {
  if (spec.kind === "array") return { ...spec, size: 16 };
  if (spec.kind === "search") {
    const array = { ...spec.array, size: 16 };
    return { ...spec, array, target: pickTarget(generateValues(array), array.seed) };
  }
  return spec;
}

/** Auto-playing thumbnail. Long traces are sampled so every loop takes about the same time. */
export default function LivePreview({ slug, playing }: { slug: string; playing: boolean }) {
  const algo = getAlgorithm(slug)!;
  const [steps] = useState(() => runAlgorithm(algo, previewInput(algo.meta.defaultInput)));
  const stride = Math.max(1, Math.ceil(steps.length / MAX_FRAMES));
  const frames = Math.ceil(steps.length / stride);
  const [frame, setFrame] = useState(0);

  useEffect(() => {
    if (!playing) return;
    const id = setInterval(() => setFrame((f) => (f + 1) % (frames + HOLD_FRAMES)), TICK_MS);
    return () => clearInterval(id);
  }, [playing, frames]);

  const step = steps[Math.min(frame * stride, steps.length - 1)];
  const Renderer = renderers[algo.meta.renderer];
  return (
    <LayoutGroup id={`preview-${slug}`}>
      <div className="pointer-events-none h-full w-full" aria-hidden>
        <Renderer step={step} duration={(TICK_MS * 0.8) / 1000} compact />
      </div>
    </LayoutGroup>
  );
}
