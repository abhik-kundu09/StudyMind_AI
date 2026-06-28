import { createContext, useContext, useEffect } from "react";
import { useAuthStore } from "../store/authStore";
import { authApi } from "../api/auth";
import { toast } from "sonner";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  // Zustand action refs are stable — selecting individually avoids re-renders
  const setAuth    = useAuthStore((s) => s.setAuth);
  const setHydrated = useAuthStore((s) => s.setHydrated);
  const clearAuth  = useAuthStore((s) => s.logout);

  // ── On mount: silently restore session via httpOnly refresh cookie ────────
  useEffect(() => {
    const hydrate = async () => {
      try {
        const data = await authApi.refresh();

        // Temporarily store the token so the /me request can attach it
        useAuthStore.getState().setAccessToken(data.access_token);

        const me = await authApi.me();
        setAuth(data.access_token, me);
      } catch {
        // No valid refresh cookie — user stays logged out, that's fine
        clearAuth();
      } finally {
        // Always unblock the app regardless of success or failure
        setHydrated();
      }
    };

    hydrate();
  }, [setAuth, clearAuth, setHydrated]);

  // ── Login ─────────────────────────────────────────────────────────────────
  const login = async ({ email, password }) => {
    const data = await authApi.login({ email, password });

    // Set token first so the subsequent /me request has it in its header
    useAuthStore.getState().setAccessToken(data.access_token);

    const me = await authApi.me();
    setAuth(data.access_token, me);
    toast.success(`Welcome back, ${me.name}!`);
    return me;
  };

  // ── Register ──────────────────────────────────────────────────────────────
  const register = async ({ name, email, password }) => {
    const data = await authApi.register({ name, email, password });

    // Set token first so the subsequent /me request has it in its header
    useAuthStore.getState().setAccessToken(data.access_token);

    const me = await authApi.me();
    setAuth(data.access_token, me);
    toast.success("Account created! Welcome to StudyMind.");
    return me;
  };

  // ── Logout ────────────────────────────────────────────────────────────────
  const logout = async () => {
    try {
      await authApi.logout();
    } catch {
      // Server-side logout failure is non-critical — clear local state anyway
    } finally {
      clearAuth();
      toast.info("Logged out.");
    }
  };

  return (
    <AuthContext.Provider value={{ login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
};