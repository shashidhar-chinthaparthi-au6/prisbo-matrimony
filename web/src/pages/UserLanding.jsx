import { useQuery } from 'react-query';
import { Link } from 'react-router-dom';
import { getMyProfile } from '../services/profileService';
import { getCurrentSubscription } from '../services/subscriptionService';
import { useAuth } from '../context/AuthContext';
import { isProfileComplete } from '../utils/profileUtils';

const UserLanding = () => {
  const { user } = useAuth();
  const { data: profileData } = useQuery('myProfile', getMyProfile);
  const { data: subscriptionData } = useQuery(
    'current-subscription', 
    getCurrentSubscription,
    {
      enabled: !!user && !!localStorage.getItem('token'),
      retry: false,
      refetchInterval: 15000, // Refetch every 15 seconds to catch subscription updates
      onError: () => {}, // Silently handle errors
    }
  );

  const profile = profileData?.profile;
  const hasActiveSubscription = subscriptionData?.hasActiveSubscription;
  const profileComplete = profile ? isProfileComplete(profile) : false;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Welcome, {profile?.personalInfo?.firstName || user?.email?.split('@')[0] || 'User'}!
          </h1>
          <p className="text-lg text-gray-600">Find your perfect match</p>
        </div>

        {/* Status Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {/* Profile Completion Status */}
          <div className={`rounded-lg shadow-md p-6 ${profileComplete ? 'bg-green-50' : 'bg-yellow-50'}`}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Profile Status</p>
                <p className={`text-2xl font-bold mt-2 ${profileComplete ? 'text-green-600' : 'text-yellow-600'}`}>
                  {profileComplete ? 'Complete' : 'Incomplete'}
                </p>
                {!profileComplete && (
                  <Link
                    to="/profile"
                    className="text-sm text-yellow-700 hover:text-yellow-800 mt-2 inline-block"
                  >
                    Complete your profile →
                  </Link>
                )}
              </div>
              <div className={`rounded-full p-3 ${profileComplete ? 'bg-green-100' : 'bg-yellow-100'}`}>
                {profileComplete ? (
                  <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                ) : (
                  <svg className="w-8 h-8 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                )}
              </div>
            </div>
          </div>

          {/* Subscription Status */}
          <div className={`rounded-lg shadow-md p-6 ${hasActiveSubscription ? 'bg-blue-50' : 'bg-gray-50'}`}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Subscription</p>
                <p className={`text-2xl font-bold mt-2 ${hasActiveSubscription ? 'text-blue-600' : 'text-gray-600'}`}>
                  {hasActiveSubscription ? 'Active' : 'Inactive'}
                </p>
                {!hasActiveSubscription && (
                  <Link
                    to="/subscription"
                    className="text-sm text-blue-700 hover:text-blue-800 mt-2 inline-block"
                  >
                    Subscribe now →
                  </Link>
                )}
              </div>
              <div className={`rounded-full p-3 ${hasActiveSubscription ? 'bg-blue-100' : 'bg-gray-100'}`}>
                {hasActiveSubscription ? (
                  <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                ) : (
                  <svg className="w-8 h-8 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Link
            to="/search"
            className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow group text-center"
          >
            <div className="bg-blue-100 rounded-full p-4 w-16 h-16 mx-auto mb-4 group-hover:bg-blue-200 transition-colors">
              <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 group-hover:text-blue-600">Search Profiles</h3>
            <p className="text-sm text-gray-600 mt-2">Find your perfect match</p>
          </Link>

          <Link
            to="/profile"
            className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow group text-center"
          >
            <div className="bg-green-100 rounded-full p-4 w-16 h-16 mx-auto mb-4 group-hover:bg-green-200 transition-colors">
              <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 group-hover:text-green-600">My Profile</h3>
            <p className="text-sm text-gray-600 mt-2">View and edit your profile</p>
          </Link>

          <Link
            to="/interests"
            className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow group text-center"
          >
            <div className="bg-red-100 rounded-full p-4 w-16 h-16 mx-auto mb-4 group-hover:bg-red-200 transition-colors">
              <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 group-hover:text-red-600">Interests</h3>
            <p className="text-sm text-gray-600 mt-2">View received interests</p>
          </Link>

          <Link
            to="/chats"
            className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow group text-center"
          >
            <div className="bg-purple-100 rounded-full p-4 w-16 h-16 mx-auto mb-4 group-hover:bg-purple-200 transition-colors">
              <svg className="w-8 h-8 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 group-hover:text-purple-600">Messages</h3>
            <p className="text-sm text-gray-600 mt-2">Chat with matches</p>
          </Link>
        </div>

        {/* Featured Section */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Get Started</h2>
          <div className="space-y-4">
            {!profileComplete && (
              <div className="flex items-center space-x-4 p-4 bg-yellow-50 rounded-lg">
                <div className="bg-yellow-100 rounded-full p-2">
                  <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="flex-1">
                  <p className="font-medium text-gray-900">Complete your profile</p>
                  <p className="text-sm text-gray-600">Add more details to get better matches</p>
                </div>
                <Link
                  to="/profile"
                  className="px-4 py-2 bg-yellow-600 text-white rounded-md hover:bg-yellow-700 text-sm font-medium"
                >
                  Complete Now
                </Link>
              </div>
            )}

            {!hasActiveSubscription && (
              <div className="flex items-center space-x-4 p-4 bg-blue-50 rounded-lg">
                <div className="bg-blue-100 rounded-full p-2">
                  <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="flex-1">
                  <p className="font-medium text-gray-900">Subscribe to unlock features</p>
                  <p className="text-sm text-gray-600">Get access to all premium features</p>
                </div>
                <Link
                  to="/subscription"
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm font-medium"
                >
                  Subscribe
                </Link>
              </div>
            )}

            {profileComplete && hasActiveSubscription && (
              <div className="flex items-center space-x-4 p-4 bg-green-50 rounded-lg">
                <div className="bg-green-100 rounded-full p-2">
                  <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="flex-1">
                  <p className="font-medium text-gray-900">You're all set!</p>
                  <p className="text-sm text-gray-600">Start searching for your perfect match</p>
                </div>
                <Link
                  to="/search"
                  className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 text-sm font-medium"
                >
                  Start Searching
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserLanding;

