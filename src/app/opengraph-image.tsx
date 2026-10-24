import { algorithmList } from "@/algorithms/registry";
import { ogImage, ogSize } from "@/lib/og";

export const size = ogSize;
export const contentType = "image/png";
export const alt = "algo·visual — see algorithms think";

export default function Image() {
  return ogImage({
    eyebrow: `${algorithmList.length} algorithms`,
    title: "See algorithms think.",
    chips: ["sorting", "graphs", "trees", "dynamic programming"],
  });
}
