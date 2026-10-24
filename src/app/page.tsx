import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { categories } from "@/algorithms/categories";
import { algorithmList, byCategory } from "@/algorithms/registry";
import { Button } from "@/components/ui/button";
import { AlgorithmCard } from "@/components/site/algorithm-card";

export default function Home() {
  let cardIndex = 0;
  return (
    <main className="mx-auto w-full max-w-[1440px] flex-1 px-4 pb-24 sm:px-6">
      <section className="relative py-16 sm:py-24">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 -top-10 -z-10 h-80 bg-[radial-gradient(ellipse_at_top,var(--brand)_0%,transparent_65%)] opacity-[0.12]"
        />
        <p className="font-mono text-xs tracking-widest text-muted-foreground uppercase">
          {algorithmList.length} algorithms · step through every line
        </p>
        <h1 className="mt-4 max-w-3xl text-4xl font-semibold tracking-tight text-balance sm:text-6xl">
          See algorithms <span className="text-brand">think</span>.
        </h1>
        <p className="mt-5 max-w-xl text-base text-pretty text-muted-foreground sm:text-lg">
          Smooth, scrubbable animations of every comparison, swap and pointer move — with the real source code
          highlighted line by line as it runs.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Button asChild size="lg" className="h-10 px-4">
            <Link href="/sorting/quick-sort">
              Start with Quick Sort <ArrowRight />
            </Link>
          </Button>
          <Button asChild size="lg" variant="outline" className="h-10 px-4">
            <Link href="#sorting">Browse all</Link>
          </Button>
        </div>
      </section>

      <div className="flex flex-col gap-16">
        {categories.map((c) => {
          const list = byCategory[c.id];
          if (list.length === 0) return null;
          return (
            <section key={c.id} id={c.id} className="scroll-mt-20">
              <div className="mb-5 flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
                <h2 className="text-xl font-semibold tracking-tight">{c.name}</h2>
                <p className="text-sm text-muted-foreground">{c.blurb}</p>
              </div>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {list.map((meta) => (
                  <AlgorithmCard key={meta.slug} meta={meta} index={cardIndex++} />
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </main>
  );
}
