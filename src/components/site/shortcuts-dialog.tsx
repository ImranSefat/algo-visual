"use client";

import { Keyboard } from "lucide-react";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Kbd, KbdGroup } from "@/components/ui/kbd";
import { isTextEntry } from "@/lib/keyboard";
import { useUI } from "@/store/ui";

const SHORTCUTS: [keys: string[], action: string][] = [
  [["Space"], "Play / pause"],
  [["→"], "Step forward"],
  [["←"], "Step back"],
  [["Home"], "First step"],
  [["End"], "Last step"],
  [["1", "to", "6"], "Speed 0.25× … 8×"],
  [["R"], "Randomise input"],
  [["⌘", "K"], "Search algorithms"],
  [["?"], "This help"],
];

/** `?` opens the shortcut sheet from anywhere on the site. */
export function ShortcutsDialog() {
  const open = useUI((s) => s.shortcutsOpen);
  const setOpen = useUI((s) => s.setShortcutsOpen);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "?" || e.metaKey || e.ctrlKey || isTextEntry(e.target)) return;
      e.preventDefault();
      setOpen(true);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [setOpen]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Keyboard shortcuts</DialogTitle>
          <DialogDescription>Work anywhere except while typing in a field.</DialogDescription>
        </DialogHeader>
        <dl className="grid grid-cols-[auto_1fr] items-center gap-x-6 gap-y-2.5 text-sm">
          {SHORTCUTS.map(([keys, action]) => (
            <div key={action} className="contents">
              <dt>
                <KbdGroup>
                  {keys.map((k) => (k === "to" ? <span key={k} className="text-xs text-muted-foreground">to</span> : <Kbd key={k}>{k}</Kbd>))}
                </KbdGroup>
              </dt>
              <dd className="text-muted-foreground">{action}</dd>
            </div>
          ))}
        </dl>
      </DialogContent>
    </Dialog>
  );
}

export function ShortcutsButton({ className }: { className?: string }) {
  const setOpen = useUI((s) => s.setShortcutsOpen);
  return (
    <Button variant="ghost" size="icon" onClick={() => setOpen(true)} aria-label="Keyboard shortcuts" className={className}>
      <Keyboard />
    </Button>
  );
}
