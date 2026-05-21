import { create } from "zustand";

export type Role = "resident" | "vendor" | "manager" | null;

interface AppStore {
  role: Role;
  isOnline: boolean;
  activeCategory: string;
  setRole: (role: Role) => void;
  setIsOnline: (v: boolean) => void;
  setActiveCategory: (cat: string) => void;
}

export const useAppStore = create<AppStore>()((set) => ({
  role: null,
  isOnline: true,
  activeCategory: "All",
  setRole: (role) => set({ role }),
  setIsOnline: (isOnline) => set({ isOnline }),
  setActiveCategory: (activeCategory) => set({ activeCategory }),
}));

/** Selector hooks for granular subscription and reduced re-renders */
export const useRole = () => useAppStore((state) => state.role);
export const useIsOnline = () => useAppStore((state) => state.isOnline);
export const useSetIsOnline = () => useAppStore((state) => state.setIsOnline);
export const useActiveCategory = () => useAppStore((state) => state.activeCategory);
export const useSetActiveCategory = () => useAppStore((state) => state.setActiveCategory);
