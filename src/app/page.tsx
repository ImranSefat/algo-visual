import Link from "next/link";
import { categories } from "@/algorithms/categories";
import { algorithmHref, byCategory } from "@/algorithms/registry";

export default function Home() {
  return (
    <main className="mx-auto w-full max-w-[1440px] flex-1 px-4 py-12 sm:px-6">
      <h1 className="text-4xl font-semibold tracking-tight">See algorithms think.</h1>
      <p className="mt-3 max-w-xl text-muted-foreground">
        Step through every comparison, swap and pointer move — with the real source code highlighted as it runs.
      </p>
      <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {categories.map((c) => (
          <section key={c.id} className="rounded-2xl border bg-card p-5">
            <h2 className="font-medium">{c.name}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{c.blurb}</p>
            <ul className="mt-4 space-y-1 text-sm">
              {byCategory[c.id].map((m) => (
                <li key={m.slug}>
                  <Link href={algorithmHref(m)} className="hover:underline">
                    {m.name}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </main>
  );
}
