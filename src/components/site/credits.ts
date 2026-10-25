/** Everything the site is built on, grouped for the About page. Licenses are taken from each package. */
export type Credit = { name: string; href: string; role: string; license: string };
export type CreditGroup = { title: string; items: Credit[] };

export const CREDIT_GROUPS: CreditGroup[] = [
  {
    title: "Framework and language",
    items: [
      { name: "Next.js", href: "https://nextjs.org", role: "Routing, static generation, OG images", license: "MIT" },
      { name: "React", href: "https://react.dev", role: "UI and the React Compiler", license: "MIT" },
      { name: "TypeScript", href: "https://www.typescriptlang.org", role: "Every algorithm and component", license: "Apache-2.0" },
    ],
  },
  {
    title: "Interface",
    items: [
      { name: "Tailwind CSS", href: "https://tailwindcss.com", role: "Styling and theme tokens", license: "MIT" },
      { name: "shadcn/ui", href: "https://ui.shadcn.com", role: "Buttons, dialogs, sliders, selects", license: "MIT" },
      { name: "Radix UI", href: "https://www.radix-ui.com/primitives", role: "Accessible primitives under shadcn/ui", license: "MIT" },
      { name: "cmdk", href: "https://github.com/pacocoursey/cmdk", role: "The ⌘K search", license: "MIT" },
      { name: "class-variance-authority", href: "https://github.com/joe-bell/cva", role: "Component variants", license: "Apache-2.0" },
      { name: "tw-animate-css", href: "https://github.com/Wombosvideo/tw-animate-css", role: "Dialog and card entrances", license: "MIT" },
    ],
  },
  {
    title: "Animation, state and layout",
    items: [
      { name: "Motion", href: "https://motion.dev", role: "Spring and layout animations", license: "MIT" },
      { name: "Zustand", href: "https://github.com/pmndrs/zustand", role: "Playback and input stores", license: "MIT" },
      { name: "nuqs", href: "https://nuqs.dev", role: "Shareable URL state", license: "MIT" },
      { name: "d3-hierarchy", href: "https://d3js.org/d3-hierarchy", role: "Tree layouts for BST, AVL and trie", license: "ISC" },
      { name: "d3-force", href: "https://d3js.org/d3-force", role: "Graph layouts", license: "ISC" },
    ],
  },
  {
    title: "Code, fonts and icons",
    items: [
      { name: "Shiki", href: "https://shiki.style", role: "Syntax highlighting at build time", license: "MIT" },
      { name: "GitHub VS Code themes", href: "https://github.com/primer/github-vscode-theme", role: "Code colours, light and dark", license: "MIT" },
      { name: "Geist", href: "https://vercel.com/font", role: "Interface typeface", license: "OFL-1.1" },
      { name: "JetBrains Mono", href: "https://www.jetbrains.com/lp/mono/", role: "Code and numbers", license: "OFL-1.1" },
      { name: "Lucide", href: "https://lucide.dev", role: "Icons", license: "ISC" },
      { name: "Simple Icons", href: "https://simpleicons.org", role: "LinkedIn mark", license: "CC0-1.0" },
      { name: "Octicons", href: "https://primer.style/octicons", role: "GitHub mark", license: "MIT" },
    ],
  },
  {
    title: "Testing and randomness",
    items: [
      { name: "Vitest", href: "https://vitest.dev", role: "Correctness tests for every algorithm", license: "MIT" },
      { name: "Lighthouse", href: "https://developer.chrome.com/docs/lighthouse", role: "Performance and accessibility checks", license: "Apache-2.0" },
      { name: "mulberry32", href: "https://gist.github.com/tommyettinger/46a874533244883189143505d203312c", role: "Seeded random inputs, by Tommy Ettinger", license: "Public domain" },
    ],
  },
];

export const INSPIRATION: Credit[] = [
  {
    name: "Algorithm Visualizer",
    href: "https://github.com/algorithm-visualizer/algorithm-visualizer",
    role: "The idea of recording a trace once and replaying it",
    license: "Inspiration",
  },
  {
    name: "VisuAlgo",
    href: "https://visualgo.net",
    role: "How much ground one visualizer can cover",
    license: "Inspiration",
  },
  {
    name: "Data Structure Visualizations, David Galles (University of San Francisco)",
    href: "https://www.cs.usfca.edu/~galles/visualization/Algorithms.html",
    role: "How clear pointer-level animation can be",
    license: "Inspiration",
  },
];
