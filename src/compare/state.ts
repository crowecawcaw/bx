import { create } from 'zustand';

/** The four sanctuaries shown side by side. */
export type Shrine = 'tabernacle' | 'solomon' | 'second' | 'ezekiel';
export type Focus = 'all' | Shrine;

interface CompareState {
  focus: Focus;
  /** Bumped on every focus request, so asking again for the same one flies back to it. */
  focusTick: number;
  setFocus: (f: Focus) => void;
  /** The camera circles on its own. */
  orbit: boolean;
  toggleOrbit: () => void;
  /** Only the houses, drawn together on a common floor; otherwise the courts too. */
  housesOnly: boolean;
  toggleHouses: () => void;
  facts: boolean;
  showFacts: (v: boolean) => void;
}

export const useCompare = create<CompareState>((set) => ({
  focus: 'all',
  focusTick: 0,
  setFocus: (focus) => set((s) => ({ focus, focusTick: s.focusTick + 1 })),
  orbit: true,
  toggleOrbit: () => set((s) => ({ orbit: !s.orbit })),
  housesOnly: false,
  toggleHouses: () => set((s) => ({ housesOnly: !s.housesOnly, focusTick: s.focusTick + 1 })),
  facts: false,
  showFacts: (facts) => set({ facts }),
}));
