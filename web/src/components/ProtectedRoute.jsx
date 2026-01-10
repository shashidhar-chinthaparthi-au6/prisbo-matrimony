import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" />;
  }

  // Check terms acceptance (skip for super_admin and terms page itself)
  // Also check localStorage as fallback in case context hasn't updated yet
  const storedUser = localStorage.getItem('user');
  let termsAccepted = user.termsAccepted;
  if (!termsAccepted && storedUser) {
    try {
      const parsedUser = JSON.parse(storedUser);
      termsAccepted = parsedUser.termsAccepted;
    } catch (e) {
      // Ignore parse errors
    }
  }
  
  if (user.role !== 'super_admin' && !termsAccepted && location.pathname !== '/terms') {
    return <Navigate to="/terms" replace />;
  }

  return children;
};

export default ProtectedRoute;

