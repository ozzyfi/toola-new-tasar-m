import { Navigate, useLocation } from "react-router-dom";
import { ReactNode } from "react";
import { useAuth } from "@/contexts/AuthContext";

export const ProtectedRoute = ({
  children,
  requireManager = false,
}: {
  children: ReactNode;
  requireManager?: boolean;
}) => {
  const { user, loading, isManager } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-muted-foreground">
        Yükleniyor...
      </div>
    );
  }
  if (!user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }
  if (requireManager && !isManager) {
    return <Navigate to="/app/work-orders" replace />;
  }
  return <>{children}</>;
};
