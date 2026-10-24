import type { Metadata } from "next";
import { ComparePane } from "@/components/compare/compare-pane";
import { CompareRoot } from "@/components/compare/compare-root";
import { InputControls } from "@/components/controls/input-controls";
import { Transport } from "@/components/visualizer/transport";

export const metadata: Metadata = {
  title: "Compare",
  description: "Run two algorithms side by side on the same input with one shared clock.",
};

export default function ComparePage() {
  return (
    <main className="mx-auto flex w-full max-w-[1440px] flex-1 flex-col gap-4 px-4 py-5 sm:px-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Compare</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Same input, one clock. Pick any two algorithms that take the same kind of input.
        </p>
      </div>
      <CompareRoot a="bubble-sort" b="quick-sort">
        <div className="grid gap-4 lg:grid-cols-2">
          <ComparePane side="a" />
          <ComparePane side="b" />
        </div>
        <section className="rounded-2xl border bg-card p-4">
          <Transport />
        </section>
        <InputControls />
      </CompareRoot>
    </main>
  );
}
