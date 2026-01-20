import { Navigate, Outlet } from "react-router-dom";
import { useSession } from "../context/SessionContext";

const ProtectedRoute = ({ allowedRoles, children }) => {
  const { user } = useSession();

  // If no user → redirect to login
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Normalize case for safety
  const userRole = user.role?.toLowerCase();
  const allowed = allowedRoles.map(r => r.toLowerCase());

  // If role not allowed → redirect unauthorized
  if (!allowed.includes(userRole)) {
    return <Navigate to="/unauthorized" replace />;
  }

  // ✅ Works with <Outlet> (nested routes) or direct children
  return children ? children : <Outlet />;
};

export default ProtectedRoute;
