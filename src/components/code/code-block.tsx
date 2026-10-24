import { codeToHtml, type ShikiTransformer } from "shiki";

/** One block-level `<span class="line" data-line="N">` per line, no newline text nodes in between. */
const lineAttributes: ShikiTransformer = {
  name: "line-attributes",
  code(node) {
    node.children = node.children.filter((child) => !(child.type === "text" && child.value === "\n"));
  },
  line(node, line) {
    node.properties["data-line"] = line;
  },
};

/** Server-only: highlights `code` with Shiki (dual theme via CSS variables) and ships plain HTML. */
export async function CodeBlock({ code, lang = "typescript" }: { code: string; lang?: string }) {
  const html = await codeToHtml(code, {
    lang,
    themes: { light: "github-light", dark: "github-dark" },
    defaultColor: false,
    transformers: [lineAttributes],
  });
  return <div className="code-block" dangerouslySetInnerHTML={{ __html: html }} />;
}
