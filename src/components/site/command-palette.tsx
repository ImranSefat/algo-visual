"use client";

import { Columns2, Home, Keyboard, Moon, Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from "@/components/ui/command";
import { Kbd, KbdGroup } from "@/components/ui/kbd";
import { useUI } from "@/store/ui";

/** Plain data passed from the server layout, so the palette never pulls the algorithm code into the bundle. */
export type PaletteItem = { name: string; href: string; group: string; complexity: string };

export function CommandPalette({ items }: { items: PaletteItem[] }) {
  const open = useUI((s) => s.paletteOpen);
  const setOpen = useUI((s) => s.setPaletteOpen);
  const setShortcutsOpen = useUI((s) => s.setShortcutsOpen);
  const router = useRouter();

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen(!useUI.getState().paletteOpen);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [setOpen]);

  const groups = [...new Set(items.map((i) => i.group))];
  const run = (action: () => void) => {
    setOpen(false);
    action();
  };

  return (
    <CommandDialog open={open} onOpenChange={setOpen} title="Search algorithms" description="Jump to any algorithm or page">
      <Command>
        <CommandInput placeholder="Search algorithms…" />
        <CommandList>
          <CommandEmpty>No algorithm matches.</CommandEmpty>
          {groups.map((group) => (
            <CommandGroup key={group} heading={group}>
              {items
                .filter((i) => i.group === group)
                .map((item) => (
                  <CommandItem key={item.href} value={`${item.name} ${group}`} onSelect={() => run(() => router.push(item.href))}>
                    {item.name}
                    <CommandShortcut className="font-mono">{item.complexity}</CommandShortcut>
                  </CommandItem>
                ))}
            </CommandGroup>
          ))}
          <CommandSeparator />
          <CommandGroup heading="Go to">
            <CommandItem value="home landing" onSelect={() => run(() => router.push("/"))}>
              <Home /> Home
            </CommandItem>
            <CommandItem value="compare side by side" onSelect={() => run(() => router.push("/compare"))}>
              <Columns2 /> Compare two algorithms
            </CommandItem>
            <CommandItem value="keyboard shortcuts help" onSelect={() => run(() => setShortcutsOpen(true))}>
              <Keyboard /> Keyboard shortcuts
            </CommandItem>
            <CommandItem
              value="toggle theme dark light"
              onSelect={() =>
                run(() => {
                  const dark = !document.documentElement.classList.contains("dark");
                  document.documentElement.classList.toggle("dark", dark);
                  try {
                    localStorage.setItem("theme", dark ? "dark" : "light");
                  } catch {
                    // Storage unavailable: the toggle still applies to this page view.
                  }
                })
              }
            >
              <Moon /> Toggle dark mode
            </CommandItem>
          </CommandGroup>
        </CommandList>
      </Command>
    </CommandDialog>
  );
}

export function SearchButton() {
  const setOpen = useUI((s) => s.setPaletteOpen);
  return (
    <Button
      variant="outline"
      onClick={() => setOpen(true)}
      className="h-8 gap-2 pr-1.5 text-muted-foreground sm:w-56 sm:justify-between"
      aria-label="Search algorithms"
    >
      <span className="flex items-center gap-2">
        <Search /> <span className="hidden sm:inline">Search algorithms…</span>
      </span>
      <KbdGroup className="hidden sm:inline-flex">
        <Kbd>⌘</Kbd>
        <Kbd>K</Kbd>
      </KbdGroup>
    </Button>
  );
}
