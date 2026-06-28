import { create } from "zustand";

export const useAuthStore = create((set) => ({
  // Access token lives in memory only (never localStorage)
  accessToken: null,
  user: null,
  // true while we're silently checking /me on app load
  isHydrating: true,

  setAccessToken: (token) => set({ accessToken: token }),

  setUser: (user) => set({ user }),

  setHydrated: () => set({ isHydrating: false }),

  // Called after successful login — set both at once
  setAuth: (token, user) => set({ accessToken: token, user }),

  logout: () => set({ accessToken: null, user: null }),
}));