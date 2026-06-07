import { create } from 'zustand';
import type { BackendProfile } from '@/lib/api/types';

export type Role = 'resident' | 'vendor' | 'manager' | 'admin' | null;

export interface AuthUser {
  id: string | number;
  email?: string;
  userType: 'customer' | 'user';
  roles: string[];
}

interface AppStore {
  role: Role;
  isOnline: boolean;
  activeCategory: string;
  profile: BackendProfile | null;
  authUser: AuthUser | null;
  isAuthLoading: boolean;
  unreadCount: number;
  setRole: (role: Role) => void;
  setIsOnline: (v: boolean) => void;
  setActiveCategory: (cat: string) => void;
  setProfile: (profile: BackendProfile | null) => void;
  setAuthUser: (user: AuthUser | null) => void;
  setAuthLoading: (loading: boolean) => void;
  setUnreadCount: (count: number) => void;
  signOut: () => Promise<void>;
}

export const useAppStore = create<AppStore>()((set) => ({
  role: null,
  isOnline: true,
  activeCategory: 'All',
  profile: null,
  authUser: null,
  isAuthLoading: true,
  unreadCount: 0,
  setRole: (role) => set({ role }),
  setIsOnline: (isOnline) => set({ isOnline }),
  setActiveCategory: (activeCategory) => set({ activeCategory }),
  setProfile: (profile) => set({ profile }),
  setAuthUser: (authUser) => set({ authUser }),
  setAuthLoading: (isAuthLoading) => set({ isAuthLoading }),
  setUnreadCount: (unreadCount) => set({ unreadCount }),
  signOut: async () => {
    const { clearTokens } = await import('@/lib/api/client');
    clearTokens();
    set({ profile: null, authUser: null, role: null, unreadCount: 0 });
  },
}));

/** Selector hooks for granular subscription and reduced re-renders */
export const useRole = () => useAppStore((state) => state.role);
export const useIsOnline = () => useAppStore((state) => state.isOnline);
export const useSetIsOnline = () => useAppStore((state) => state.setIsOnline);
export const useActiveCategory = () => useAppStore((state) => state.activeCategory);
export const useSetActiveCategory = () => useAppStore((state) => state.setActiveCategory);
export const useProfile = () => useAppStore((state) => state.profile);
export const useAuthLoading = () => useAppStore((state) => state.isAuthLoading);
export const useUnreadCount = () => useAppStore((state) => state.unreadCount);
export const useSetUnreadCount = () => useAppStore((state) => state.setUnreadCount);
