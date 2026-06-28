import { Navigate, useLocation } from "react-router-dom";
import { useAuthStore } from "../store/authStore";

export default function ProtectedRoute({ children }) {
  const accessToken  = useAuthStore((s) => s.accessToken);
  const isHydrating  = useAuthStore((s) => s.isHydrating);
  const location     = useLocation();

  // Still restoring session from cookie — don't redirect yet
  if (isHydrating) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0B0D19]">
        <div className="flex flex-col items-center gap-4">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-cyan-400/20 border-t-cyan-400" />
          <p className="text-xs tracking-widest text-cyan-400/50 uppercase">
            Restoring session…
          </p>
        </div>
      </div>
    );
  }

  if (!accessToken) {
    // Save where the user was trying to go — redirect back after login
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
}