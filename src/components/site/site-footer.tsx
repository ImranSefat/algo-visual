import Link from "next/link";
import { AUTHOR, SocialIcons } from "./author";

/** Minimal credit line: who built it, why, and a way into the full story on /about. */
export function SiteFooter() {
  return (
    <footer className="border-t">
      <div className="mx-auto flex w-full max-w-[1440px] flex-col gap-4 px-4 py-8 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div className="space-y-1.5">
          <p className="text-sm text-pretty">
            Built by{" "}
            <a href={AUTHOR.portfolio} target="_blank" rel="noopener noreferrer" className="font-medium underline-offset-4 hover:underline">
              {AUTHOR.name}
            </a>{" "}
            so students can watch algorithms run step by step and change the inputs themselves, instead of only reading about them.
          </p>
          <p className="text-xs text-muted-foreground">
            Next.js · TypeScript · motion · Shiki ·{" "}
            <Link href="/about" className="text-foreground underline-offset-4 hover:underline">
              About the project →
            </Link>
          </p>
        </div>
        <SocialIcons className="-ml-2.5 sm:ml-0" />
      </div>
    </footer>
  );
}
