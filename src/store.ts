import { create } from 'zustand';
import { SITE } from './sites';

/** A curtain or door that can be tapped open (ids come from the site definition). */
export type CurtainId = string;
export type Panel = null | 'specs' | 'scripture' | 'help';

interface State {
  open: Record<CurtainId, boolean>;
  toggleCurtain: (id: CurtainId) => void;
  /** Number of the four coverings currently shown (4 = all, 0 = bare frame). */
  layers: number;
  cycleLayers: () => void;
  selected: string | null;
  select: (id: string | null) => void;
  discovered: string[];
  panel: Panel;
  scriptureQuery: string;
  openPanel: (p: Panel) => void;
  showScripture: (ref: string) => void;
  region: string;
  setRegion: (r: string) => void;
  /** Bumped whenever the walkable grid needs rebuilding. */
  navVersion: number;
}

export const useStore = create<State>((set) => ({
  open: Object.fromEntries(SITE.curtains.map((id) => [id, false])),
  toggleCurtain: (id) =>
    set((s) => ({ open: { ...s.open, [id]: !s.open[id] }, navVersion: s.navVersion + 1 })),
  layers: 4,
  cycleLayers: () => set((s) => ({ layers: s.layers === 0 ? 4 : s.layers - 1 })),
  selected: null,
  select: (id) =>
    set((s) => ({
      selected: id,
      discovered: id && !s.discovered.includes(id) ? [...s.discovered, id] : s.discovered,
    })),
  discovered: [],
  panel: null,
  scriptureQuery: SITE.scripture,
  openPanel: (panel) => set({ panel }),
  showScripture: (ref) => set({ panel: 'scripture', scriptureQuery: ref }),
  region: SITE.regionOf(SITE.start.x, SITE.start.z),
  setRegion: (region) => set({ region }),
  navVersion: 0,
}));
