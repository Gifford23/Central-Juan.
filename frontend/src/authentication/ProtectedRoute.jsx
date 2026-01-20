import { Navigate } from 'react-router-dom';
import { useSession } from '../context/SessionContext';

const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user } = useSession();

  if (!user || !user.isLoggedIn || !user.role) {
    return <Navigate to="/login" replace />;
  }

  // ✅ Check normalized role
  if (allowedRoles && !allowedRoles.includes(user.role.toUpperCase())) {
    return <Navigate to="/unauthorized" replace />;
  }

  return children;
};

export default ProtectedRoute;
