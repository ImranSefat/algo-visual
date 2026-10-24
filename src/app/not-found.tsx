import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col items-start justify-center gap-4 px-6 py-24">
      <p className="font-mono text-sm text-muted-foreground">404 · binary search returned −1</p>
      <h1 className="text-3xl font-semibold tracking-tight">This page isn&apos;t in the array.</h1>
      <p className="text-muted-foreground">
        Try the search (<kbd className="font-mono">⌘K</kbd>) or head back to the full list of algorithms.
      </p>
      <Button asChild>
        <Link href="/">All algorithms</Link>
      </Button>
    </main>
  );
}
