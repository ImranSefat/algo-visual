"use client";

import { ChevronRight, Menu, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Dialog as DialogPrimitive } from "radix-ui";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type NavLink = { href: string; label: string; hint?: string };

/**
 * Below `lg` the header's links collapse into this panel. It is a Radix dialog, so focus is
 * trapped, Escape closes it and the page behind doesn't scroll.
 */
export function MobileNav({ categories, pages }: { categories: NavLink[]; pages: NavLink[] }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const close = () => setOpen(false);

  const item = (link: NavLink) => (
    <li key={link.href}>
      <Link
        href={link.href}
        onClick={close}
        aria-current={pathname === link.href ? "page" : undefined}
        className={cn(
          "flex items-center gap-3 rounded-xl px-3 py-3 transition-colors hover:bg-muted",
          pathname === link.href && "bg-muted",
        )}
      >
        <span className="font-medium">{link.label}</span>
        {link.hint && <span className="font-mono text-xs text-muted-foreground">{link.hint}</span>}
        <ChevronRight className="ml-auto size-4 text-muted-foreground" />
      </Link>
    </li>
  );

  return (
    <DialogPrimitive.Root open={open} onOpenChange={setOpen}>
      <DialogPrimitive.Trigger asChild>
        <Button variant="ghost" size="icon" className="lg:hidden" aria-label="Open menu">
          <Menu />
        </Button>
      </DialogPrimitive.Trigger>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/30 backdrop-blur-xs duration-150 data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0 lg:hidden" />
        <DialogPrimitive.Content className="fixed inset-x-0 top-0 z-50 max-h-dvh overflow-y-auto rounded-b-2xl border-b bg-background px-4 pt-3 pb-6 shadow-xl duration-200 outline-none data-open:animate-in data-open:fade-in-0 data-open:slide-in-from-top-6 data-closed:animate-out data-closed:fade-out-0 data-closed:slide-out-to-top-6 lg:hidden">
          <div className="flex h-8 items-center justify-between">
            <DialogPrimitive.Title className="text-sm font-medium text-muted-foreground">Menu</DialogPrimitive.Title>
            <DialogPrimitive.Close asChild>
              <Button variant="ghost" size="icon" aria-label="Close menu">
                <X />
              </Button>
            </DialogPrimitive.Close>
          </div>
          <DialogPrimitive.Description className="sr-only">Jump to a category or page</DialogPrimitive.Description>
          <nav aria-label="Mobile" className="mt-3 grid gap-5">
            <div>
              <p className="px-3 pb-1 font-mono text-[11px] tracking-widest text-muted-foreground uppercase">Categories</p>
              <ul>{categories.map(item)}</ul>
            </div>
            <div>
              <p className="px-3 pb-1 font-mono text-[11px] tracking-widest text-muted-foreground uppercase">More</p>
              <ul>{pages.map(item)}</ul>
            </div>
          </nav>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
