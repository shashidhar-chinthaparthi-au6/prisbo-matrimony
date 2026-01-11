import { useState, useEffect } from 'react';
import { useQuery } from 'react-query';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { searchProfiles } from '../services/searchService';
import { getMyProfile } from '../services/profileService';
import { getCurrentSubscription } from '../services/subscriptionService';
import { getOrCreateChat } from '../services/chatService';
import { getImageUrl } from '../config/api';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import SubscriptionRequiredModal from '../components/SubscriptionRequiredModal';
import ProfileIncompleteModal from '../components/ProfileIncompleteModal';
import LoadingSkeleton from '../components/LoadingSkeleton';
import { isProfileComplete } from '../utils/profileUtils';

const Search = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  
  // Load saved search preferences from localStorage
  const loadSavedPreferences = () => {
    try {
      const saved = localStorage.getItem('searchPreferences');
      if (saved) {
        const parsed = JSON.parse(saved);
        return { ...parsed, page: 1 }; // Reset page when loading saved preferences
      }
    } catch (error) {
      console.error('Failed to load search preferences:', error);
    }
    return {
      name: '',
      minAge: '',
      maxAge: '',
      city: '',
      state: '',
      education: '',
      occupation: '',
      religion: '',
      caste: '',
      vendorProfilesOnly: false,
      page: 1,
    };
  };

  const [filters, setFilters] = useState(loadSavedPreferences);
  const [showFilters, setShowFilters] = useState(false);
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);
  const [showProfileIncompleteModal, setShowProfileIncompleteModal] = useState(false);
  const [savedSearches, setSavedSearches] = useState([]);

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
  const { data, isLoading, refetch, error } = useQuery(
    ['search', filters],
    () => searchProfiles(filters),
    { 
      enabled: false,
      retry: false,
      onError: (error) => {
        if (error.response?.status === 403 || error.response?.data?.requiresSubscription) {
          setShowSubscriptionModal(true);
        }
      }
    }
  );

  const hasActiveSubscription = subscriptionData?.hasActiveSubscription;

  useEffect(() => {
    // Skip subscription checks for super_admin and vendor
    if (user?.role === 'super_admin' || user?.role === 'vendor') {
      setShowSubscriptionModal(false);
      setShowProfileIncompleteModal(false);
      // Refetch for vendors and super_admin
      refetch();
      return;
    }

    // Show subscription modal if user doesn't have active subscription
    if (subscriptionData && !hasActiveSubscription) {
      setShowSubscriptionModal(true);
      setShowProfileIncompleteModal(false);
    } else if (hasActiveSubscription && subscriptionData) {
      // Check if profile exists and is complete
      if (!profileData?.profile || !isProfileComplete(profileData.profile)) {
        setShowProfileIncompleteModal(true);
        setShowSubscriptionModal(false);
      } else {
        setShowProfileIncompleteModal(false);
        // Only refetch if user has active subscription and profile is complete
        refetch();
      }
    }
  }, [filters.page, hasActiveSubscription, subscriptionData, profileData, user]);

  const handleSearch = () => {
    // Skip subscription check for super_admin and vendor
    if (user?.role !== 'super_admin' && user?.role !== 'vendor' && !hasActiveSubscription) {
      setShowSubscriptionModal(true);
      return;
    }
    refetch();
  };

  const handleViewProfile = (profileId) => {
    // Skip subscription check for super_admin and vendor
    if (user?.role !== 'super_admin' && user?.role !== 'vendor' && !hasActiveSubscription) {
      setShowSubscriptionModal(true);
      return;
    }
    navigate(`/profiles/${profileId}`);
  };

  const handleFilterChange = (key, value) => {
    const newFilters = { ...filters, [key]: value, page: 1 };
    setFilters(newFilters);
    // Auto-save search preferences
    try {
      const { page, ...preferences } = newFilters;
      localStorage.setItem('searchPreferences', JSON.stringify(preferences));
    } catch (error) {
      console.error('Failed to save search preferences:', error);
    }
  };

  const handleSaveSearch = () => {
    const searchName = prompt('Enter a name for this search:');
    if (searchName) {
      try {
        const saved = JSON.parse(localStorage.getItem('savedSearches') || '[]');
        const { page, ...preferences } = filters;
        const newSearch = {
          id: Date.now(),
          name: searchName,
          filters: preferences,
          createdAt: new Date().toISOString(),
        };
        saved.push(newSearch);
        localStorage.setItem('savedSearches', JSON.stringify(saved));
        setSavedSearches(saved);
        toast.success('Search saved successfully!');
      } catch (error) {
        toast.error('Failed to save search');
      }
    }
  };

  const handleLoadSavedSearch = (savedSearch) => {
    setFilters({ ...savedSearch.filters, page: 1 });
    toast.success(`Loaded search: ${savedSearch.name}`);
  };

  const handleDeleteSavedSearch = (id) => {
    try {
      const saved = JSON.parse(localStorage.getItem('savedSearches') || '[]');
      const filtered = saved.filter(s => s.id !== id);
      localStorage.setItem('savedSearches', JSON.stringify(filtered));
      setSavedSearches(filtered);
      toast.success('Search deleted');
    } catch (error) {
      toast.error('Failed to delete search');
    }
  };

  // Load saved searches on mount
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('savedSearches') || '[]');
      setSavedSearches(saved);
    } catch (error) {
      console.error('Failed to load saved searches:', error);
    }
  }, []);

  const handleChat = async (userId) => {
    try {
      const response = await getOrCreateChat(userId);
      navigate('/chats', { state: { chatId: response.chat._id } });
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to start chat');
    }
  };

  // Check if user has created profile
  const hasProfile = profileData?.profile !== null && profileData?.profile !== undefined;

  // Show create profile message if no profile exists
  if (!hasProfile && !isLoading) {
    return (
      <div className="text-center py-12">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md mx-auto">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Create Your Profile First</h2>
          <p className="text-gray-600 mb-6">
            You need to create your profile before you can search for matches.
          </p>
            <button
              onClick={() => navigate('/profile?create=true')}
              className="inline-block px-6 py-3 bg-primary-600 text-white rounded-md hover:bg-primary-700 font-medium"
            >
              Create Profile
            </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Search Profiles</h1>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="px-4 py-2 bg-gray-200 rounded-md hover:bg-gray-300"
        >
          {showFilters ? 'Hide' : 'Show'} Filters
        </button>
      </div>

      {showFilters && (
        <div className="bg-white p-6 rounded-lg shadow mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="md:col-span-2 lg:col-span-3">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Search by Name/Keyword
              </label>
              <input
                type="text"
                value={filters.name}
                onChange={(e) => handleFilterChange('name', e.target.value)}
                placeholder="Enter name or keyword to search..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Min Age
              </label>
              <input
                type="number"
                value={filters.minAge}
                onChange={(e) => handleFilterChange('minAge', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Max Age
              </label>
              <input
                type="number"
                value={filters.maxAge}
                onChange={(e) => handleFilterChange('maxAge', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                City
              </label>
              <input
                type="text"
                value={filters.city}
                onChange={(e) => handleFilterChange('city', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                State
              </label>
              <input
                type="text"
                value={filters.state}
                onChange={(e) => handleFilterChange('state', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Education
              </label>
              <input
                type="text"
                value={filters.education}
                onChange={(e) => handleFilterChange('education', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Occupation
              </label>
              <input
                type="text"
                value={filters.occupation}
                onChange={(e) => handleFilterChange('occupation', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Religion
              </label>
              <input
                type="text"
                value={filters.religion}
                onChange={(e) => handleFilterChange('religion', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Caste
              </label>
              <input
                type="text"
                value={filters.caste}
                onChange={(e) => handleFilterChange('caste', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Verification Status
              </label>
              <select
                value={filters.verificationStatus}
                onChange={(e) => handleFilterChange('verificationStatus', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              >
                <option value="">All</option>
                <option value="approved">Verified Only</option>
                <option value="pending">Pending</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Min Income (Lakhs)
              </label>
              <input
                type="number"
                value={filters.minIncome}
                onChange={(e) => handleFilterChange('minIncome', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                placeholder="e.g., 5"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Max Income (Lakhs)
              </label>
              <input
                type="number"
                value={filters.maxIncome}
                onChange={(e) => handleFilterChange('maxIncome', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                placeholder="e.g., 20"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Sort By
              </label>
              <select
                value={filters.sortBy}
                onChange={(e) => handleFilterChange('sortBy', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              >
                <option value="newest">Newest First</option>
                <option value="oldest">Oldest First</option>
                <option value="ageAsc">Age: Low to High</option>
                <option value="ageDesc">Age: High to Low</option>
                <option value="location">Location</option>
                <option value="name">Name (A-Z)</option>
              </select>
            </div>
            {/* Vendor Profiles Only Filter */}
            {profileData?.profile?.isVendorCreated || user?.registeredViaVendor ? (
              <div className="md:col-span-2 lg:col-span-3">
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={filters.vendorProfilesOnly || false}
                    onChange={(e) => handleFilterChange('vendorProfilesOnly', e.target.checked)}
                    className="h-4 w-4 text-red-600 focus:ring-red-500 border-gray-300 rounded"
                  />
                  <span className="text-sm font-medium text-gray-700">
                    Show vendor profiles only
                    {profileData?.profile?.isVendorCreated && (
                      <span className="text-xs text-gray-500 ml-2">
                        (Profiles from your vendor)
                      </span>
                    )}
                  </span>
                </label>
              </div>
            ) : (
              <div className="md:col-span-2 lg:col-span-3">
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={filters.vendorProfilesOnly || false}
                    onChange={(e) => handleFilterChange('vendorProfilesOnly', e.target.checked)}
                    className="h-4 w-4 text-red-600 focus:ring-red-500 border-gray-300 rounded"
                  />
                  <span className="text-sm font-medium text-gray-700">
                    Show vendor profiles only
                  </span>
                </label>
              </div>
            )}
          </div>
          <div className="mt-4">
            <button
              onClick={handleSearch}
              className="px-6 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700"
            >
              Search
            </button>
          </div>
        </div>
      )}

      {!hasActiveSubscription && subscriptionData && user?.role !== 'super_admin' && user?.role !== 'vendor' ? (
        <div className="text-center py-12">
          <div className="bg-white rounded-lg shadow p-8 max-w-md mx-auto">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Subscription Required</h2>
            <p className="text-gray-600 mb-6">
              You need an active subscription to search and view profiles. Please subscribe to continue.
            </p>
            <button
              onClick={() => navigate('/subscription')}
              className="inline-block px-6 py-3 bg-red-600 text-white rounded-md hover:bg-red-700 font-medium"
            >
              Subscribe Now
            </button>
          </div>
        </div>
      ) : isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <LoadingSkeleton type="card" count={6} />
        </div>
      ) : data?.profiles?.length > 0 ? (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {data.profiles.map((profile) => (
              <div key={profile._id} className="bg-white rounded-lg shadow overflow-hidden cursor-pointer hover:shadow-lg transition-shadow">
                <div 
                  className="h-48 bg-gray-200 relative cursor-pointer"
                  onClick={() => handleViewProfile(profile._id)}
                >
                  {profile.photos?.[0]?.url ? (
                    <img
                      src={getImageUrl(profile.photos[0].url)}
                      alt={profile.personalInfo?.firstName}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="flex items-center justify-center h-full text-gray-400">
                      No Photo
                    </div>
                  )}
                </div>
                <div className="p-4">
                  <h3 
                    className="font-semibold text-lg cursor-pointer hover:text-primary-600 transition-colors"
                    onClick={() => handleViewProfile(profile._id)}
                  >
                    {profile.personalInfo?.firstName} {profile.personalInfo?.lastName}
                  </h3>
                  <p className="text-gray-600 text-sm">
                    {profile.personalInfo?.age} years, {profile.location?.city}
                  </p>
                  <div className="mt-4 flex space-x-2">
                    <button
                      onClick={() => handleViewProfile(profile._id)}
                      className="text-primary-600 hover:text-primary-700 text-sm font-medium"
                    >
                      View Profile →
                    </button>
                    {profile.interestStatus === 'accepted' && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleChat(profile.userId._id);
                        }}
                        className="text-primary-600 hover:text-primary-700 text-sm font-medium"
                      >
                        Chat →
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
          {data.pagination && (
            <div className="mt-6 flex flex-col items-center space-y-4">
              <div className="flex justify-center space-x-2">
                <button
                  onClick={() => setFilters({ ...filters, page: filters.page - 1 })}
                  disabled={filters.page === 1}
                  className="px-4 py-2 bg-gray-200 rounded-md disabled:opacity-50 hover:bg-gray-300 transition-colors"
                >
                  Previous
                </button>
                <span className="px-4 py-2 flex items-center">
                  Page {data.pagination.page} of {data.pagination.pages}
                </span>
                <button
                  onClick={() => setFilters({ ...filters, page: filters.page + 1 })}
                  disabled={filters.page >= data.pagination.pages}
                  className="px-4 py-2 bg-gray-200 rounded-md disabled:opacity-50 hover:bg-gray-300 transition-colors"
                >
                  Next
                </button>
              </div>
              {data.pagination.pages > 1 && (
                <button
                  onClick={() => {
                    const nextPage = filters.page + 1;
                    if (nextPage <= data.pagination.pages) {
                      setFilters({ ...filters, page: nextPage });
                    }
                  }}
                  disabled={filters.page >= data.pagination.pages}
                  className="px-6 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Load More
                </button>
              )}
            </div>
          )}
        </>
      ) : data?.profiles?.length === 0 ? (
        <div className="text-center py-12">
          <div className="bg-white rounded-lg shadow p-8 max-w-md mx-auto">
            <div className="text-6xl mb-4">🔍</div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">No Profiles Found</h2>
            <p className="text-gray-600 mb-4">
              We couldn't find any profiles matching your search criteria.
            </p>
            <div className="text-sm text-gray-500 mb-6 space-y-1">
              <p>Try:</p>
              <ul className="list-disc list-inside text-left max-w-xs mx-auto">
                <li>Adjusting your filters</li>
                <li>Removing some search criteria</li>
                <li>Searching with a different keyword</li>
                <li>Checking your spelling</li>
              </ul>
            </div>
            <button
              onClick={() => {
                setFilters({
                  name: '',
                  minAge: '',
                  maxAge: '',
                  city: '',
                  state: '',
                  education: '',
                  occupation: '',
                  religion: '',
                  caste: '',
                  page: 1,
                });
                refetch();
              }}
              className="inline-block px-6 py-3 bg-primary-600 text-white rounded-md hover:bg-primary-700 font-medium"
            >
              Clear Filters & Search Again
            </button>
          </div>
        </div>
      ) : data?.message ? (
        <div className="text-center py-12">
          <div className="bg-white rounded-lg shadow p-8 max-w-md mx-auto">
            <p className="text-gray-600 mb-6">{data.message}</p>
            <button
              onClick={() => navigate('/profile?create=true')}
              className="inline-block px-6 py-3 bg-primary-600 text-white rounded-md hover:bg-primary-700 font-medium"
            >
              Create Profile
            </button>
          </div>
        </div>
      ) : (
        <div className="text-center py-12">
          <div className="bg-white rounded-lg shadow p-8 max-w-md mx-auto">
            <div className="text-6xl mb-4">🔍</div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">No Profiles Found</h2>
            <p className="text-gray-600 mb-6">
              We couldn't find any profiles matching your search criteria. Try:
            </p>
            <ul className="text-left text-gray-600 mb-6 space-y-2">
              <li>• Adjusting your age range</li>
              <li>• Expanding your location filters</li>
              <li>• Removing some filters to see more results</li>
              <li>• Trying different search terms</li>
            </ul>
            <button
              onClick={() => {
                setFilters({
                  minAge: '',
                  maxAge: '',
                  city: '',
                  state: '',
                  education: '',
                  occupation: '',
                  religion: '',
                  caste: '',
                  verificationStatus: '',
                  minIncome: '',
                  maxIncome: '',
                  sortBy: 'newest',
                  page: 1,
                });
                setTimeout(() => refetch(), 100);
              }}
              className="px-6 py-3 bg-primary-600 text-white rounded-md hover:bg-primary-700 font-medium"
            >
              Clear Filters & Search Again
            </button>
          </div>
        </div>
      )}

      <SubscriptionRequiredModal
        isOpen={showSubscriptionModal}
      />
      <ProfileIncompleteModal
        isOpen={showProfileIncompleteModal}
      />
    </div>
  );
};

export default Search;

