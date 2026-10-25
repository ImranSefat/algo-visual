import { ArrowRight, ArrowUpRight, BookOpen, Bug, Columns2, Keyboard, Lightbulb, ListPlus, Pause, Rewind, Shuffle } from "lucide-react";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { categories } from "@/algorithms/categories";
import type { SequenceInputSpec } from "@/algorithms/core/input";
import { algorithmList } from "@/algorithms/registry";
import { AUTHOR, GitHubMark, REPO, SOCIAL_LINKS } from "@/components/site/author";
import { CREDIT_GROUPS, INSPIRATION, type Credit } from "@/components/site/credits";
import { SiteFooter } from "@/components/site/site-footer";
import { Button } from "@/components/ui/button";
import { Kbd } from "@/components/ui/kbd";

export const metadata: Metadata = {
  title: "About",
  description: `Why algo·visual exists, how to use it, how it is built and what it is built on. Made by ${AUTHOR.name}.`,
};

/** `?in=` value for inputs that travel as JSON (see lib/url-state). */
const inParam = (spec: SequenceInputSpec) => encodeURIComponent(JSON.stringify(spec));
const sortedInserts: SequenceInputSpec = {
  kind: "sequence",
  initial: [],
  ops: Array.from({ length: 10 }, (_, i) => ({ op: "insert", value: (i + 1) * 10 })),
};
const collidingKeys: SequenceInputSpec = {
  kind: "sequence",
  initial: [],
  ops: [...[7, 14, 21, 28, 35].map((value) => ({ op: "insert" as const, value })), { op: "search", value: 35 }],
};

const EXPERIMENTS = [
  {
    title: "Break quick sort",
    body: "Feed it an array that is already reversed. Every pivot is the worst one possible, and the comparison counter climbs towards n².",
    href: "/sorting/quick-sort?n=32&seed=7&dist=reversed",
  },
  {
    title: "Watch insertion sort cruise",
    body: "On nearly sorted input each key barely moves. Count the shifts, then give bubble sort the same input.",
    href: "/sorting/insertion-sort?n=40&seed=3&dist=nearly-sorted",
  },
  {
    title: "Why balancing matters",
    body: "Insert 10, 20, 30 and so on into a plain BST and an AVL tree side by side. The BST turns into a linked list. The AVL tree rotates to stay short.",
    href: `/compare?a=bst&b=avl-tree&in=${inParam(sortedInserts)}`,
  },
  {
    title: "BFS vs A*",
    body: "Same maze, same clock. A* reaches the flag after exploring a fraction of the cells. Draw your own walls and race them again.",
    href: "/compare?a=bfs-grid&b=a-star",
  },
  {
    title: "Make every key collide",
    body: "With m = 7, the keys 7, 14, 21, 28 and 35 all hash to bucket 0. The O(1) average turns into a walk down one long chain.",
    href: `/structures/hash-table?in=${inParam(collidingKeys)}`,
  },
  {
    title: "Pay for the shortcut",
    body: "Dijkstra treats the shaded cells as mud that costs 5 to cross. The cheapest path happily takes the long way round.",
    href: "/graphs/dijkstra-grid",
  },
];

const HOW_TO = [
  { Icon: Pause, title: "Play, pause, step", body: "Space plays and pauses, and the arrow keys move one step. Each step explains itself in a sentence.", keys: ["Space", "←", "→"] },
  { Icon: Rewind, title: "Scrub backwards", body: "Drag the timeline anywhere. Every step is saved as a snapshot, so going back is as easy as going forward.", keys: ["Home", "End"] },
  { Icon: Shuffle, title: "Change the input", body: "Randomise it, type your own values, build a list of operations or draw walls on a grid.", keys: ["R"] },
  { Icon: Columns2, title: "Compare two", body: "Run two algorithms on the same input with one shared clock and see which one finishes first.", keys: [] },
];

const CONTRIBUTE = [
  {
    Icon: ListPlus,
    title: "Request an algorithm",
    body: "Tell me which algorithm or data structure you want and what should happen on screen.",
    href: REPO.requestAlgorithm,
  },
  {
    Icon: Lightbulb,
    title: "Suggest a feature",
    body: "A new control, a clearer explanation or something that would help in a class.",
    href: REPO.suggestFeature,
  },
  {
    Icon: Bug,
    title: "Report a bug",
    body: "Paste the page URL. It records the exact input and step, so the problem is easy to reproduce.",
    href: REPO.reportBug,
  },
];

const PIPELINE = [
  {
    step: "1",
    title: "Algorithm",
    body: "Each algorithm is a plain TypeScript generator. It runs once and saves a snapshot whenever something worth seeing happens: the data, what is highlighted, the current line of code, the live variables and a one-line explanation.",
  },
  {
    step: "2",
    title: "Timeline",
    body: "The snapshots go into an array. Play, pause, rewind, jump to the end and compare mode only change which snapshot is on screen, so nothing ever runs twice.",
  },
  {
    step: "3",
    title: "Renderer",
    body: "A renderer draws one snapshot. Every element keeps a stable id, so going from one snapshot to the next turns into a spring animation without any per-algorithm animation code.",
  },
];

/** Decorative bar skyline for the profile banner: fixed heights, so server and client agree. */
const BANNER_BARS = Array.from({ length: 48 }, (_, i) => {
  const h = 0.25 + 0.55 * Math.abs(Math.sin(i * 1.7) * Math.cos(i * 0.45));
  const tone = i % 11 === 3 ? "bg-viz-compare" : i % 13 === 7 ? "bg-viz-sorted" : i % 17 === 5 ? "bg-viz-current" : "bg-viz-default";
  return { h, tone };
});

function SectionTitle({ eyebrow, title }: { eyebrow: string; title: string }) {
  return (
    <div className="mb-6">
      <p className="font-mono text-xs tracking-widest text-muted-foreground uppercase">{eyebrow}</p>
      <h2 className="mt-2 text-2xl font-semibold tracking-tight text-balance">{title}</h2>
    </div>
  );
}

function CreditRow({ credit }: { credit: Credit }) {
  return (
    <li className="flex items-start justify-between gap-4 border-t py-2.5 first:border-t-0 first:pt-0 last:pb-0">
      <div className="min-w-0">
        <a
          href={credit.href}
          target="_blank"
          rel="noopener noreferrer"
          className="group inline-flex items-center gap-1 text-sm font-medium underline-offset-4 hover:underline"
        >
          {credit.name}
          <ArrowUpRight className="size-3.5 text-muted-foreground transition-transform group-hover:-translate-y-px group-hover:translate-x-px" />
        </a>
        <p className="text-xs text-muted-foreground">{credit.role}</p>
      </div>
      {credit.license !== "Inspiration" && (
        <span className="mt-0.5 shrink-0 rounded-md border px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
          {credit.license}
        </span>
      )}
    </li>
  );
}

export default function AboutPage() {
  const renderers = new Set(algorithmList.map((m) => m.renderer)).size;
  const stats = [
    { value: String(algorithmList.length), label: "algorithms" },
    { value: String(renderers), label: "renderers" },
    { value: String(categories.length), label: "categories" },
    { value: "100%", label: "static pages" },
  ];
  const [portfolio, linkedin] = SOCIAL_LINKS;

  return (
    <>
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 pb-24 sm:px-6">
        <section className="relative py-16 sm:py-24">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 -top-10 -z-10 h-72 bg-[radial-gradient(ellipse_at_top,var(--brand)_0%,transparent_65%)] opacity-[0.12]"
          />
          <p className="font-mono text-xs tracking-widest text-muted-foreground uppercase">About</p>
          <h1 className="mt-4 max-w-3xl text-4xl font-semibold tracking-tight text-balance sm:text-5xl">
            Algorithms make more sense when you can <span className="text-brand">watch them work</span>.
          </h1>
          <div className="mt-6 max-w-2xl space-y-4 text-base leading-relaxed text-pretty text-muted-foreground sm:text-lg">
            <p>
              Most people meet data structures and algorithms as pseudocode next to a diagram frozen at one moment. What happens
              between one line and the next is left to your imagination.
            </p>
            <p>
              algo·visual shows that part. Every comparison, swap, pointer change and table cell is a step you can pause on,
              rewind or replay, with the real code highlighted next to it. I made it for students, whether you are seeing this
              for the first time or revising for an exam or an interview, and for anyone who learns by poking at things.
            </p>
          </div>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button asChild size="lg" className="h-10 px-4">
              <Link href="/">
                Explore the algorithms <ArrowRight />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="h-10 px-4">
              <Link href="#made-by">Who made this</Link>
            </Button>
            <Button asChild size="lg" variant="ghost" className="h-10 px-4">
              <a href={REPO.url} target="_blank" rel="noopener noreferrer">
                <GitHubMark className="size-4" /> Source on GitHub
              </a>
            </Button>
          </div>
        </section>

        <section className="py-10">
          <SectionTitle eyebrow="How to use it" title="Four ways to play with it" />
          <div className="grid gap-4 sm:grid-cols-2">
            {HOW_TO.map(({ Icon, title, body, keys }) => (
              <div key={title} className="rounded-2xl border bg-card p-5">
                <div className="flex items-center justify-between gap-3">
                  <span className="grid size-9 place-items-center rounded-xl bg-muted">
                    <Icon className="size-4" />
                  </span>
                  {keys.length > 0 && (
                    <span className="flex gap-1">
                      {keys.map((k) => (
                        <Kbd key={k}>{k}</Kbd>
                      ))}
                    </span>
                  )}
                </div>
                <h3 className="mt-4 font-medium">{title}</h3>
                <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{body}</p>
              </div>
            ))}
          </div>
          <p className="mt-4 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground">
            <Keyboard className="size-4" /> Press <Kbd>?</Kbd> anywhere to see every shortcut, or <Kbd>⌘</Kbd>
            <Kbd>K</Kbd> to jump to an algorithm.
          </p>
        </section>

        <section className="py-10">
          <SectionTitle eyebrow="Try these" title="Six experiments worth five minutes each" />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {EXPERIMENTS.map((e, i) => (
              <Link
                key={e.title}
                href={e.href}
                className="group flex flex-col rounded-2xl border bg-card p-5 transition-[border-color,translate] hover:-translate-y-0.5 hover:border-foreground/20"
              >
                <span className="font-mono text-xs text-muted-foreground">{String(i + 1).padStart(2, "0")}</span>
                <h3 className="mt-2 font-medium">{e.title}</h3>
                <p className="mt-1 flex-1 text-sm leading-relaxed text-muted-foreground">{e.body}</p>
                <span className="mt-4 inline-flex items-center gap-1 text-sm font-medium">
                  Open it <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
                </span>
              </Link>
            ))}
          </div>
        </section>

        <section className="py-10">
          <SectionTitle eyebrow="How it's built" title="Every algorithm runs once, then you replay it" />
          <ol className="grid gap-4 md:grid-cols-3">
            {PIPELINE.map((p) => (
              <li key={p.step} className="relative rounded-2xl border bg-card p-5">
                <span className="grid size-8 place-items-center rounded-full bg-foreground font-mono text-sm text-background">
                  {p.step}
                </span>
                <h3 className="mt-4 font-medium">{p.title}</h3>
                <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{p.body}</p>
              </li>
            ))}
          </ol>
          <p className="mt-6 max-w-3xl text-sm leading-relaxed text-muted-foreground">
            The algorithms never touch the interface, so each one can be tested on its own. Every highlighted line has to exist
            in the code you see, and every result is checked against a separate reference implementation on dozens of random
            inputs. Pages are generated ahead of time, so the deployed site is plain static files. All of it is{" "}
            <a href={REPO.url} target="_blank" rel="noopener noreferrer" className="text-foreground underline underline-offset-4">
              on GitHub
            </a>
            .
          </p>
          <dl className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {stats.map((s) => (
              <div key={s.label} className="rounded-2xl border bg-card px-4 py-3">
                <dt className="text-xs text-muted-foreground">{s.label}</dt>
                <dd className="font-mono text-2xl font-semibold tabular-nums">{s.value}</dd>
              </div>
            ))}
          </dl>
        </section>

        <section id="made-by" className="scroll-mt-20 py-10">
          <p className="mb-6 font-mono text-xs tracking-widest text-muted-foreground uppercase">Made by</p>
          <div className="overflow-hidden rounded-3xl border bg-card">
            <div aria-hidden className="relative h-28 overflow-hidden border-b bg-muted/40 sm:h-32">
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_20%_120%,var(--brand)_0%,transparent_60%)] opacity-25" />
              <div className="absolute inset-x-0 bottom-0 flex h-full items-end gap-1 px-4 opacity-60">
                {BANNER_BARS.map((bar, i) => (
                  <span key={i} className={`flex-1 rounded-t-[3px] ${bar.tone}`} style={{ height: `${bar.h * 100}%` }} />
                ))}
              </div>
            </div>
            <div className="grid gap-8 px-6 pb-6 sm:px-8 sm:pb-8 lg:grid-cols-[minmax(0,1fr)_300px]">
              <div>
                <Image
                  src={AUTHOR.avatar}
                  alt={AUTHOR.name}
                  width={96}
                  height={96}
                  unoptimized
                  className="relative -mt-12 size-24 rounded-full bg-muted ring-4 ring-card"
                />
                <h2 className="mt-4 text-2xl font-semibold tracking-tight">{AUTHOR.name}</h2>
                <p className="font-mono text-sm text-muted-foreground">{AUTHOR.handle}</p>
                <p className="mt-4 max-w-xl leading-relaxed text-pretty text-muted-foreground">
                  I built algo·visual because algorithms are much easier to follow when you can watch each step happen. If it
                  helped something click for you, or there is an algorithm you would like to see here, send me a message.
                </p>
                <div className="mt-6 flex flex-wrap gap-2">
                  <Button asChild>
                    <a href={linkedin.href} target="_blank" rel="noopener noreferrer">
                      <linkedin.Icon className="size-4" /> Message me on LinkedIn
                    </a>
                  </Button>
                  <Button asChild variant="outline">
                    <a href={portfolio.href} target="_blank" rel="noopener noreferrer">
                      See more of my work <ArrowUpRight />
                    </a>
                  </Button>
                </div>
              </div>
              <ul className="grid content-start gap-3 lg:pt-8">
                {SOCIAL_LINKS.map(({ label, href, display, Icon }) => (
                  <li key={label}>
                    <a
                      href={href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group flex items-center gap-3 rounded-xl border bg-background/40 px-4 py-3 transition-colors hover:border-foreground/20 hover:bg-muted/50"
                    >
                      <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-muted">
                        <Icon className="size-4" />
                      </span>
                      <span className="min-w-0">
                        <span className="block text-sm font-medium">{label}</span>
                        <span className="block truncate font-mono text-xs text-muted-foreground">{display}</span>
                      </span>
                      <ArrowUpRight className="ml-auto size-4 text-muted-foreground transition-transform group-hover:-translate-y-px group-hover:translate-x-px" />
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        <section id="contribute" className="scroll-mt-20 py-10">
          <SectionTitle eyebrow="Open source" title="Ask for what you want to see" />
          <p className="mb-6 max-w-2xl text-sm leading-relaxed text-pretty text-muted-foreground">
            algo·visual is free and open source under the MIT license. You don&apos;t need to write code to help: ideas from
            people learning this material are the most useful kind of contribution. Each link below opens a short form on
            GitHub.
          </p>
          <div className="grid gap-4 sm:grid-cols-3">
            {CONTRIBUTE.map(({ Icon, title, body, href }) => (
              <a
                key={title}
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="group flex flex-col rounded-2xl border bg-card p-5 transition-[border-color,translate] hover:-translate-y-0.5 hover:border-foreground/20"
              >
                <span className="grid size-9 place-items-center rounded-xl bg-muted">
                  <Icon className="size-4" />
                </span>
                <h3 className="mt-4 font-medium">{title}</h3>
                <p className="mt-1 flex-1 text-sm leading-relaxed text-muted-foreground">{body}</p>
                <span className="mt-4 inline-flex items-center gap-1 text-sm font-medium">
                  Open an issue{" "}
                  <ArrowUpRight className="size-3.5 transition-transform group-hover:-translate-y-px group-hover:translate-x-px" />
                </span>
              </a>
            ))}
          </div>
          <div className="mt-4 flex flex-col gap-4 rounded-2xl border bg-card p-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-foreground text-background">
                <GitHubMark className="size-5" />
              </span>
              <div className="min-w-0">
                <p className="truncate font-mono text-sm font-medium">ImranSefat/algo-visual</p>
                <p className="text-xs text-muted-foreground">MIT licensed. Pull requests are welcome.</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button asChild variant="outline">
                <a href={REPO.contributing} target="_blank" rel="noopener noreferrer">
                  <BookOpen /> Contributing guide
                </a>
              </Button>
              <Button asChild>
                <a href={REPO.url} target="_blank" rel="noopener noreferrer">
                  <GitHubMark className="size-4" /> View on GitHub
                </a>
              </Button>
            </div>
          </div>
        </section>

        <section id="credits" className="scroll-mt-20 py-10">
          <SectionTitle eyebrow="Credits" title="Built on open source" />
          <p className="mb-6 max-w-2xl text-sm leading-relaxed text-pretty text-muted-foreground">
            Everything below is open source or free to use, and this site would not exist without the people who maintain it.
            Thank you.
          </p>
          <div className="grid gap-4 md:grid-cols-2">
            {CREDIT_GROUPS.map((group) => (
              <div key={group.title} className="rounded-2xl border bg-card p-5">
                <h3 className="mb-3 font-mono text-[11px] tracking-widest text-muted-foreground uppercase">{group.title}</h3>
                <ul>
                  {group.items.map((credit) => (
                    <CreditRow key={credit.name} credit={credit} />
                  ))}
                </ul>
              </div>
            ))}
            <div className="rounded-2xl border border-dashed bg-card/60 p-5">
              <h3 className="mb-3 font-mono text-[11px] tracking-widest text-muted-foreground uppercase">Inspiration</h3>
              <ul>
                {INSPIRATION.map((credit) => (
                  <CreditRow key={credit.name} credit={credit} />
                ))}
              </ul>
            </div>
          </div>
          <p className="mt-6 text-xs text-muted-foreground">
            The GitHub and LinkedIn marks are trademarks of their owners and only link to my profiles. Each license is the one
            the project publishes for the version this site uses.
          </p>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
