import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Home = () => {
  const { user } = useAuth();

  return (
    <div className="text-center">
      <h1 className="text-4xl font-bold text-gray-900 mb-4">
        Welcome to Prisbo
      </h1>
      <p className="text-xl text-gray-600 mb-8">
        Your trusted matrimony platform
      </p>
      {user ? (
        <div className="space-y-4">
          <Link
            to="/search"
            className="inline-block px-6 py-3 bg-primary-600 text-white rounded-md hover:bg-primary-700"
          >
            Start Searching
          </Link>
          <Link
            to="/profile"
            className="inline-block ml-4 px-6 py-3 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
          >
            View Profile
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          <Link
            to="/register"
            className="inline-block px-6 py-3 bg-primary-600 text-white rounded-md hover:bg-primary-700"
          >
            Get Started
          </Link>
          <Link
            to="/login"
            className="inline-block ml-4 px-6 py-3 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
          >
            Login
          </Link>
        </div>
      )}
    </div>
  );
};

export default Home;

