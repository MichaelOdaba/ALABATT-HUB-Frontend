import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "./useAuth.js";

export default function ProtectedRoute({ allowedRoles }) {
  const { user, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <main className="auth-status" aria-busy="true" aria-live="polite">
        Restoring your session...
      </main>
    );
  }

  if (!user) {
    return (
      <Navigate
        to="/login"
        state={{
          from: `${location.pathname}${location.search}${location.hash}`,
        }}
        replace
      />
    );
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/dashboard" replace />;
  }

  return <Outlet />;
}
