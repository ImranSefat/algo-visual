import { categoryById } from "@/algorithms/categories";
import { algorithmList, getAlgorithm } from "@/algorithms/registry";
import { ogImage, ogSize } from "@/lib/og";

export const size = ogSize;
export const contentType = "image/png";
export const alt = "Algorithm visualisation";

export function generateStaticParams() {
  return algorithmList.map(({ category, slug }) => ({ category, slug }));
}

export default async function Image({ params }: { params: Promise<{ category: string; slug: string }> }) {
  const { slug } = await params;
  const meta = getAlgorithm(slug)!.meta;
  const { time, space } = meta.complexity;
  return ogImage({
    eyebrow: categoryById[meta.category].name,
    title: meta.name,
    chips: [`avg ${time.average}`, `worst ${time.worst}`, `space ${space}`],
  });
}
