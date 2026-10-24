import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { algorithmList, getAlgorithm } from "@/algorithms/registry";
import { AlgorithmHeader, ComplexityCard, DescriptionCard } from "@/components/algorithm/algorithm-info";
import { CodeBlock } from "@/components/code/code-block";
import { CodePanel } from "@/components/code/code-panel";
import { CountersPanel, StepNote, VariablesPanel } from "@/components/code/step-panels";
import { InputControls } from "@/components/controls/input-controls";
import { Canvas } from "@/components/visualizer/canvas";
import { Transport } from "@/components/visualizer/transport";
import { VisualizerRoot } from "@/components/visualizer/visualizer-root";

export const dynamicParams = false;

export function generateStaticParams() {
  return algorithmList.map(({ category, slug }) => ({ category, slug }));
}

export async function generateMetadata({ params }: PageProps<"/[category]/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const algo = getAlgorithm(slug);
  return algo ? { title: algo.meta.name, description: algo.meta.description } : {};
}

export default async function AlgorithmPage({ params }: PageProps<"/[category]/[slug]">) {
  const { category, slug } = await params;
  const algo = getAlgorithm(slug);
  if (!algo || algo.meta.category !== category) notFound();
  const { meta } = algo;

  return (
    <VisualizerRoot key={slug} slug={slug}>
      <main className="mx-auto flex w-full max-w-[1440px] flex-1 flex-col gap-4 px-4 py-5 sm:px-6">
        <AlgorithmHeader meta={meta} />
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(340px,440px)]">
          <section className="flex min-w-0 flex-col gap-4 rounded-2xl border bg-card p-4 sm:p-5">
            <Canvas className="h-[clamp(240px,48vh,480px)]" />
            <StepNote />
            <Transport />
          </section>
          <aside className="flex min-w-0 flex-col gap-4">
            <CodePanel
              className="max-h-[440px]"
              code={<CodeBlock code={meta.source} />}
              pseudo={meta.pseudocode ? <CodeBlock code={meta.pseudocode} lang="pascal" /> : undefined}
            />
            <VariablesPanel />
            <CountersPanel />
          </aside>
        </div>
        <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(340px,440px)]">
          <InputControls />
          <div className="grid gap-4">
            <DescriptionCard meta={meta} />
            <ComplexityCard meta={meta} />
          </div>
        </div>
      </main>
    </VisualizerRoot>
  );
}
