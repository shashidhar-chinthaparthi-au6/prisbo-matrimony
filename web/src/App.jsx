import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import Profile from './pages/Profile';
import ProfileDetail from './pages/ProfileDetail';
import Search from './pages/Search';
import Interests from './pages/Interests';
import Favorites from './pages/Favorites';
import Chats from './pages/Chats';
import Notifications from './pages/Notifications';
import Admin from './pages/Admin';
import Subscription from './pages/Subscription';

const AppRoutes = () => {
  const { user } = useAuth();

  // If admin, show admin dashboard for all protected routes
  if (user?.role === 'admin') {
    return (
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route
          path="/admin"
          element={
            <ProtectedRoute>
              <Admin />
            </ProtectedRoute>
          }
        />
        <Route
          path="/*"
          element={
            <ProtectedRoute>
              <Navigate to="/admin" replace />
            </ProtectedRoute>
          }
        />
      </Routes>
    );
  }

  return (
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route
            path="/search"
            element={
              <ProtectedRoute>
                <Search />
              </ProtectedRoute>
            }
          />
          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <Profile />
              </ProtectedRoute>
            }
          />
          <Route
            path="/profiles/:id"
            element={
              <ProtectedRoute>
                <ProfileDetail />
              </ProtectedRoute>
            }
          />
          <Route
            path="/interests"
            element={
              <ProtectedRoute>
                <Interests />
              </ProtectedRoute>
            }
          />
          <Route
            path="/favorites"
            element={
              <ProtectedRoute>
                <Favorites />
              </ProtectedRoute>
            }
          />
          <Route
            path="/chats"
            element={
              <ProtectedRoute>
                <Chats />
              </ProtectedRoute>
            }
          />
          <Route
            path="/notifications"
            element={
              <ProtectedRoute>
                <Notifications />
              </ProtectedRoute>
            }
          />
      <Route
        path="/subscription"
        element={
          <ProtectedRoute>
            <Subscription />
          </ProtectedRoute>
        }
      />
        </Routes>
  );
};

function App() {
  return (
    <AuthProvider>
      <Layout>
        <AppRoutes />
      </Layout>
    </AuthProvider>
  );
}

export default App;

