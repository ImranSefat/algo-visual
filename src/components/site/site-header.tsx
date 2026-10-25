import Link from "next/link";
import { categories } from "@/algorithms/categories";
import { byCategory } from "@/algorithms/registry";
import { SearchButton } from "./command-palette";
import { MobileNav, type NavLink } from "./mobile-nav";
import { ShortcutsButton } from "./shortcuts-dialog";
import { ThemeToggle } from "./theme";

const shortName = (id: string, name: string) => (id === "dp" ? "DP" : id === "structures" ? "Structures" : name);

const categoryLinks: NavLink[] = categories.map((c) => ({
  href: `/#${c.id}`,
  label: c.name,
  hint: String(byCategory[c.id].length),
}));

const pageLinks: NavLink[] = [
  { href: "/compare", label: "Compare" },
  { href: "/about", label: "About" },
];

const linkClass = "rounded-md px-2.5 py-1.5 transition-colors hover:bg-muted hover:text-foreground";

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
        <nav aria-label="Main" className="hidden items-center gap-1 text-sm text-muted-foreground lg:flex">
          {categories.map((c) => (
            <Link key={c.id} href={`/#${c.id}`} className={linkClass}>
              {shortName(c.id, c.name)}
            </Link>
          ))}
          {pageLinks.map((p) => (
            <Link key={p.href} href={p.href} className={linkClass}>
              {p.label}
            </Link>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-1">
          <SearchButton />
          <ShortcutsButton className="hidden sm:inline-flex" />
          <ThemeToggle />
          <MobileNav categories={categoryLinks} pages={pageLinks} />
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
