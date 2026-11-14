import { create } from 'zustand';

export interface GoogleUserProfile {
  id: string;
  email: string;
  name: string | null;
  photoUrl: string | null;
}

export interface AuthState {
  user: GoogleUserProfile | null;
  isSyncing: boolean;
  lastSyncedAt: string | null;
  setUser: (user: GoogleUserProfile | null) => void;
  setIsSyncing: (isSyncing: boolean) => void;
  setLastSyncedAt: (lastSyncedAt: string | null) => void;
   hydrateAuth: (user: GoogleUserProfile | null, lastSyncedAt: string | null) => void;
  clearAuth: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isSyncing: false,
  lastSyncedAt: null,

  setUser: (user) => set({ user }),
  setIsSyncing: (isSyncing) => set({ isSyncing }),
  setLastSyncedAt: (lastSyncedAt) => set({ lastSyncedAt }),

  hydrateAuth: (user, lastSyncedAt) =>
    set({
      user,
      lastSyncedAt,
    }),

  clearAuth: () =>
    set({
      user: null,
      isSyncing: false,
      lastSyncedAt: null,
    }),
}));
