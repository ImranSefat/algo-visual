import Link from "next/link";
import { categories } from "@/algorithms/categories";
import { ShortcutsButton } from "./shortcuts-dialog";
import { ThemeToggle } from "./theme";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-[1440px] items-center gap-4 px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight">
          <Logo />
          <span>
            algo<span className="text-brand">·</span>visual
          </span>
        </Link>
        <nav aria-label="Categories" className="hidden items-center gap-1 text-sm text-muted-foreground md:flex">
          {categories.map((c) => (
            <Link key={c.id} href={`/#${c.id}`} className="rounded-md px-2.5 py-1.5 transition-colors hover:bg-muted hover:text-foreground">
              {c.id === "dp" ? "DP" : c.id === "structures" ? "Structures" : c.name}
            </Link>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-1">
          <ShortcutsButton />
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}

function Logo() {
  return (
    <svg viewBox="0 0 24 24" className="size-6" aria-hidden>
      <rect x="2" y="12" width="4" height="10" rx="1.2" className="fill-viz-default" />
      <rect x="7" y="7" width="4" height="15" rx="1.2" className="fill-viz-compare" />
      <rect x="12" y="15" width="4" height="7" rx="1.2" className="fill-viz-current" />
      <rect x="17" y="3" width="4" height="19" rx="1.2" className="fill-viz-sorted" />
    </svg>
  );
}
