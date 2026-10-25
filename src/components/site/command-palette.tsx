"use client";

import { Columns2, Home, Info, Keyboard, Moon, Search } from "lucide-react";
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
            <CommandItem value="about project author imran sefat" onSelect={() => run(() => router.push("/about"))}>
              <Info /> About this project
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
      // Icon-only until there is room for the full box next to the nav links.
      className="size-8 gap-2 p-0 text-muted-foreground xl:w-56 xl:justify-between xl:pr-1.5 xl:pl-2.5"
      aria-label="Search algorithms"
    >
      <span className="flex items-center gap-2">
        <Search /> <span className="hidden xl:inline">Search algorithms…</span>
      </span>
      <KbdGroup className="hidden xl:inline-flex">
        <Kbd>⌘</Kbd>
        <Kbd>K</Kbd>
      </KbdGroup>
    </Button>
  );
}
