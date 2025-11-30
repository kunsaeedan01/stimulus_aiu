import { Navigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";

export default function RequireAdmin({ children }) {
  const { user } = useAuth();

  if (!user?.is_staff) {
    return <Navigate to="/applications" replace />;
  }

  return children;
}
