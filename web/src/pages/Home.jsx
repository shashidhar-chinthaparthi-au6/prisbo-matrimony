import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import SuperAdminLanding from './SuperAdminLanding';
import VendorLanding from './VendorLanding';
import UserLanding from './UserLanding';

const Home = () => {
  const { user } = useAuth();

  // If not logged in, show public landing
  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-gray-100 flex items-center justify-center">
        <div className="text-center max-w-2xl mx-auto px-4">
          <h1 className="text-5xl font-bold text-gray-900 mb-4">
            Welcome to Prisbo
          </h1>
          <p className="text-xl text-gray-600 mb-8">
            Your trusted matrimony platform - Find your perfect match
          </p>
          <div className="space-x-4">
            <a
              href="/register"
              className="inline-block px-8 py-3 bg-red-600 text-white rounded-md hover:bg-red-700 font-medium"
            >
              Get Started
            </a>
            <a
              href="/login"
              className="inline-block px-8 py-3 bg-white text-gray-700 rounded-md hover:bg-gray-50 font-medium border border-gray-300"
            >
              Login
            </a>
          </div>
        </div>
      </div>
    );
  }

  // Redirect to role-specific landing pages
  if (user.role === 'super_admin') {
    return <SuperAdminLanding />;
  } else if (user.role === 'vendor') {
    return <VendorLanding />;
  } else {
    return <UserLanding />;
  }
};

export default Home;

