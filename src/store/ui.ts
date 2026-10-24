import { create } from "zustand";

/** Site-wide UI state (dialogs). Not per-visualizer. */
type UIState = {
  shortcutsOpen: boolean;
  paletteOpen: boolean;
  setShortcutsOpen(open: boolean): void;
  setPaletteOpen(open: boolean): void;
};

export const useUI = create<UIState>()((set) => ({
  shortcutsOpen: false,
  paletteOpen: false,
  setShortcutsOpen: (shortcutsOpen) => set({ shortcutsOpen }),
  setPaletteOpen: (paletteOpen) => set({ paletteOpen }),
}));
