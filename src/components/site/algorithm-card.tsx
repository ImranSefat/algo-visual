import Link from "next/link";
import type { ReactNode } from "react";
import type { AlgorithmMeta } from "@/algorithms/core/types";
import { algorithmHref } from "@/algorithms/registry";
import { RendererGlyph } from "./renderer-glyph";

export function firstSentence(text: string): string {
  const end = text.indexOf(". ");
  return end === -1 ? text : text.slice(0, end + 1);
}

/** Landing-page card. `preview` replaces the static glyph when given. */
export function AlgorithmCard({ meta, preview, index = 0 }: { meta: AlgorithmMeta; preview?: ReactNode; index?: number }) {
  return (
    <Link
      href={algorithmHref(meta)}
      className="group flex flex-col overflow-hidden rounded-2xl border bg-card transition-[border-color,box-shadow,translate] duration-200 animate-in fade-in slide-in-from-bottom-2 fill-mode-both hover:-translate-y-0.5 hover:border-foreground/20 hover:shadow-lg hover:shadow-black/5 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none dark:hover:shadow-black/30"
      style={{ animationDelay: `${Math.min(index, 12) * 35}ms` }}
    >
      <div className="relative h-28 border-b bg-muted/40 p-3">
        {preview ?? <RendererGlyph kind={meta.renderer} className="h-full w-full" />}
      </div>
      <div className="flex flex-1 flex-col gap-1.5 p-4">
        <div className="flex items-baseline justify-between gap-2">
          <h3 className="font-medium tracking-tight">{meta.name}</h3>
          <span className="shrink-0 font-mono text-[11px] text-muted-foreground">{meta.complexity.time.average}</span>
        </div>
        <p className="line-clamp-2 text-[13px] leading-snug text-muted-foreground">{firstSentence(meta.description)}</p>
      </div>
    </Link>
  );
}
