import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useCurrentUser } from "../context/CurrentUserContext";

export default function ProtectedRoute() {
  const { user, isLoading } = useCurrentUser();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-canvas text-body-strong">
        <div className="text-sm font-medium">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/" replace state={{ from: location.pathname }} />;
  }

  return <Outlet />;
}