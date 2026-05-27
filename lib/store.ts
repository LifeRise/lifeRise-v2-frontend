import { create } from "zustand";
import type { User } from "@supabase/supabase-js";
import type { Profile } from "@/lib/auth/hooks";

export type Role = "resident" | "vendor" | "manager" | null;

interface AppStore {
  role: Role;
  isOnline: boolean;
  activeCategory: string;
  user: User | null;
  profile: Profile | null;
  isAuthLoading: boolean;
  setRole: (role: Role) => void;
  setIsOnline: (v: boolean) => void;
  setActiveCategory: (cat: string) => void;
  setUser: (user: User | null) => void;
  setProfile: (profile: Profile | null) => void;
  setAuthLoading: (loading: boolean) => void;
  signOut: () => Promise<void>;
}

export const useAppStore = create<AppStore>()((set) => ({
  role: null,
  isOnline: true,
  activeCategory: "All",
  user: null,
  profile: null,
  isAuthLoading: true,
  setRole: (role) => set({ role }),
  setIsOnline: (isOnline) => set({ isOnline }),
  setActiveCategory: (activeCategory) => set({ activeCategory }),
  setUser: (user) => set({ user }),
  setProfile: (profile) => set({ profile }),
  setAuthLoading: (isAuthLoading) => set({ isAuthLoading }),
  signOut: async () => {
    const { createClient } = await import("@/lib/supabase/client");
    const supabase = createClient();
    await supabase.auth.signOut();
    set({ user: null, profile: null, role: null });
  },
}));

/** Selector hooks for granular subscription and reduced re-renders */
export const useRole = () => useAppStore((state) => state.role);
export const useIsOnline = () => useAppStore((state) => state.isOnline);
export const useSetIsOnline = () => useAppStore((state) => state.setIsOnline);
export const useActiveCategory = () => useAppStore((state) => state.activeCategory);
export const useSetActiveCategory = () => useAppStore((state) => state.setActiveCategory);
export const useUser = () => useAppStore((state) => state.user);
export const useProfile = () => useAppStore((state) => state.profile);
export const useAuthLoading = () => useAppStore((state) => state.isAuthLoading);
