import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useQuery } from 'react-query';
import { getNotifications } from '../services/notificationService';
import Breadcrumb from './Breadcrumb';

const Layout = ({ children }) => {
  const { user, logout } = useAuth();
  const location = useLocation();
  
  // Pages that should not use Layout (full-screen pages)
  const noLayoutPages = ['/login', '/register', '/forgot-password'];
  const isNoLayoutPage = noLayoutPages.some(path => location.pathname.startsWith(path));
  
  // Also don't show layout for Home page when user is not logged in
  const isPublicHome = !user && location.pathname === '/';
  
  // If this is a no-layout page or public home, render children without layout
  if (isNoLayoutPage || isPublicHome) {
    return <>{children}</>;
  }
  
  const { data: notificationsData } = useQuery(
    'notifications-count',
    () => getNotifications({ limit: 1, unreadOnly: true }),
    {
      enabled: !!user && !!localStorage.getItem('token'), // Only run if user exists and token is present
      refetchInterval: 15000, // Refresh every 15 seconds (reduced frequency to avoid rate limits)
      retry: false, // Don't retry on rate limit errors
      onError: (error) => {
        // Silently handle 401 errors (user not authenticated)
        if (error.response?.status === 401) {
          // Token might be invalid, clear it
          localStorage.removeItem('token');
          localStorage.removeItem('user');
        }
      },
    }
  );

  const unreadCount = notificationsData?.unreadCount || 0;

  const navItems = user?.role === 'super_admin' 
    ? [
        { path: '/', label: 'Home', icon: '🏠' },
        { path: '/admin', label: 'Admin', icon: '⚙️' },
      ]
    : user?.role === 'vendor'
    ? [
        { path: '/', label: 'Home', icon: '🏠' },
        { path: '/vendor', label: 'Dashboard', icon: '⚙️' },
      ]
    : [
    { path: '/', label: 'Home', icon: '🏠' },
    { path: '/search', label: 'Search', icon: '🔍' },
    { path: '/interests', label: 'Interests', icon: '💝' },
    { path: '/favorites', label: 'Favorites', icon: '⭐' },
    { path: '/chats', label: 'Chats', icon: '💬' },
        { path: '/subscription', label: 'Subscription', icon: '💳' },
    { path: '/profile', label: 'Profile', icon: '👤' },
  ];

  return (
    <div className="min-h-screen bg-gray-50 overflow-x-hidden">
      {/* Skip to main content for accessibility */}
      <a href="#main-content" className="skip-to-main">
        Skip to main content
      </a>
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-50" role="banner">
        <div className="w-full px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link to="/" className="flex flex-col items-start">
              <span className="text-2xl font-bold text-primary-600">Prisbo</span>
              <span className="text-xs text-gray-600 -mt-1">Matrimony</span>
            </Link>
            <nav className="hidden md:flex space-x-8" role="navigation" aria-label="Main navigation">
              {navItems.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`px-3 py-2 rounded-md text-sm font-medium ${
                    location.pathname === item.path
                      ? 'text-primary-600 bg-primary-50'
                      : 'text-gray-700 hover:text-primary-600'
                  }`}
                  aria-current={location.pathname === item.path ? 'page' : undefined}
                >
                  {item.label}
                </Link>
              ))}
            </nav>
            <div className="flex items-center space-x-4">
              {user ? (
                <>
                  <Link
                    to="/notifications"
                    className="relative p-2 text-gray-700 hover:text-primary-600"
                  >
                    <span className="text-2xl">🔔</span>
                    {unreadCount > 0 && (
                      <span className="absolute top-0 right-0 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">
                        {unreadCount > 9 ? '9+' : unreadCount}
                      </span>
                    )}
                  </Link>
                  <span className="text-sm text-gray-700">{user.email}</span>
                  <button
                    onClick={logout}
                    className="px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-md hover:bg-primary-700"
                  >
                    Logout
                  </button>
                </>
              ) : (
                <Link
                  to="/login"
                  className="px-4 py-2 text-sm font-medium text-primary-600 hover:text-primary-700"
                >
                  Login
                </Link>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Navigation */}
      <nav className="md:hidden bg-white border-t fixed bottom-0 left-0 right-0 z-50">
        <div className="flex justify-around items-center h-16">
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`flex flex-col items-center justify-center flex-1 ${
                location.pathname === item.path
                  ? 'text-primary-600'
                  : 'text-gray-600'
              }`}
            >
              <span className="text-xl">{item.icon}</span>
              <span className="text-xs mt-1">{item.label}</span>
            </Link>
          ))}
          <Link
            to="/notifications"
            className={`flex flex-col items-center justify-center flex-1 relative ${
              location.pathname === '/notifications'
                ? 'text-primary-600'
                : 'text-gray-600'
            }`}
          >
            <span className="text-xl">🔔</span>
            <span className="text-xs mt-1">Notifications</span>
            {unreadCount > 0 && (
              <span className="absolute top-0 right-2 bg-red-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center font-bold">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </Link>
        </div>
      </nav>

      {/* Main Content */}
      <main id="main-content" className="w-full min-h-[calc(100vh-4rem)] px-4 sm:px-6 lg:px-8 py-8 pb-20 md:pb-8" role="main">
        <Breadcrumb />
        {children}
      </main>
    </div>
  );
};

export default Layout;

