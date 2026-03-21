import { Navigate, useLocation } from "react-router-dom";

/**
 * Route guard — redirects unauthenticated users to /login.
 *
 * Checks for JWT access_token in localStorage. If absent,
 * redirects to /login with the original path in `state.from`
 * so login can redirect back after authentication.
 *
 * This is a fast client-side check — the token may be expired,
 * but apiFetch handles 401 → refresh → retry. This guard prevents
 * the unnecessary API call + loading flash for clearly unauthenticated users.
 */
export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const hasToken = !!localStorage.getItem("access_token");

  if (!hasToken) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  return <>{children}</>;
}
