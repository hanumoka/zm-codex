import { create } from "zustand";

const STORAGE_KEY = "zm-codex-tour-completed";
const PAGE_TOURS_KEY = "zm-codex-page-tours-completed";

function loadCompletedPageTours(): Set<string> {
  try {
    const raw = localStorage.getItem(PAGE_TOURS_KEY);
    if (raw) return new Set(JSON.parse(raw) as string[]);
  } catch { /* corrupted — start fresh */ }
  return new Set();
}

function saveCompletedPageTours(pages: Set<string>) {
  localStorage.setItem(PAGE_TOURS_KEY, JSON.stringify([...pages]));
}

interface TourState {
  isActive: boolean;
  hasCompletedOnboarding: boolean;
  activePageTour: string | null;
  completedPageTours: Set<string>;

  startTour: () => void;
  endTour: () => void;
  markCompleted: () => void;
  resetTourState: () => void;
  startPageTour: (page: string) => void;
  endPageTour: (page: string) => void;
}

export const useTourStore = create<TourState>((set, get) => ({
  isActive: false,
  hasCompletedOnboarding: localStorage.getItem(STORAGE_KEY) === "true",
  activePageTour: null,
  completedPageTours: loadCompletedPageTours(),

  startTour: () => set({ isActive: true }),
  endTour: () => set({ isActive: false }),
  markCompleted: () => {
    localStorage.setItem(STORAGE_KEY, "true");
    set({ isActive: false, hasCompletedOnboarding: true });
  },
  resetTourState: () => {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(PAGE_TOURS_KEY);
    set({ hasCompletedOnboarding: false, activePageTour: null, completedPageTours: new Set() });
  },
  startPageTour: (page: string) => set({ activePageTour: page }),
  endPageTour: (page: string) => {
    const updated = new Set(get().completedPageTours);
    updated.add(page);
    saveCompletedPageTours(updated);
    set({ activePageTour: null, completedPageTours: updated });
  },
}));
