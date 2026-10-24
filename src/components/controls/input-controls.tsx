"use client";

import { ChevronDown, RotateCcw } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useInput } from "@/store/input";
import { ArrayControls, TargetControl } from "./array-controls";

/** Collapsible input panel; renders the editor for the current algorithm's input kind. */
export function InputControls({ className }: { className?: string }) {
  const spec = useInput((s) => s.spec);
  const setSpec = useInput((s) => s.setSpec);
  const randomise = useInput((s) => s.randomise);
  const reset = useInput((s) => s.reset);
  const [open, setOpen] = useState(true);

  let editor: React.ReactNode = null;
  switch (spec.kind) {
    case "array":
      editor = <ArrayControls key={spec.seed} spec={spec} onChange={setSpec} onRandomise={randomise} />;
      break;
    case "search":
      editor = (
        <div className="grid gap-4">
          <ArrayControls
            key={spec.array.seed}
            spec={spec.array}
            onChange={(array) => setSpec({ ...spec, array })}
            onRandomise={randomise}
          />
          <TargetControl target={spec.target} array={spec.array} onChange={(target) => setSpec({ ...spec, target })} />
        </div>
      );
      break;
  }

  return (
    <section className={cn("rounded-2xl border bg-card", className)}>
      <header className="flex h-11 items-center justify-between gap-2 px-4">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          className="flex items-center gap-1.5 text-xs font-medium tracking-wide text-muted-foreground uppercase"
        >
          <ChevronDown className={cn("size-3.5 transition-transform", !open && "-rotate-90")} />
          Input
        </button>
        <Button variant="ghost" size="sm" onClick={reset} className="text-muted-foreground">
          <RotateCcw /> Default
        </Button>
      </header>
      {open && editor && <div className="border-t px-4 py-4">{editor}</div>}
    </section>
  );
}
