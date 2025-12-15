import { useState, useEffect } from 'react';
import { useQuery } from 'react-query';
import { useNavigate } from 'react-router-dom';
import { searchProfiles } from '../services/searchService';
import { getMyProfile } from '../services/profileService';
import { getOrCreateChat } from '../services/chatService';
import { getImageUrl } from '../config/api';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';

const Search = () => {
  const navigate = useNavigate();
  const [filters, setFilters] = useState({
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
  const [showFilters, setShowFilters] = useState(false);

  const { data: profileData } = useQuery('myProfile', getMyProfile);
  const { data, isLoading, refetch, error } = useQuery(
    ['search', filters],
    () => searchProfiles(filters),
    { enabled: false }
  );

  useEffect(() => {
    refetch();
  }, [filters.page]);

  const handleSearch = () => {
    refetch();
  };

  const handleFilterChange = (key, value) => {
    setFilters({ ...filters, [key]: value, page: 1 });
  };

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

      {isLoading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
        </div>
      ) : data?.profiles?.length > 0 ? (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {data.profiles.map((profile) => (
              <div key={profile._id} className="bg-white rounded-lg shadow overflow-hidden">
                <div className="h-48 bg-gray-200 relative">
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
                  <h3 className="font-semibold text-lg">
                    {profile.personalInfo?.firstName} {profile.personalInfo?.lastName}
                  </h3>
                  <p className="text-gray-600 text-sm">
                    {profile.personalInfo?.age} years, {profile.location?.city}
                  </p>
                  <div className="mt-4 flex space-x-2">
                    <Link
                      to={`/profiles/${profile._id}`}
                      className="text-primary-600 hover:text-primary-700 text-sm font-medium"
                    >
                      View Profile →
                    </Link>
                    {profile.interestStatus === 'accepted' && (
                      <button
                        onClick={() => handleChat(profile.userId._id)}
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
            <div className="mt-6 flex justify-center space-x-2">
              <button
                onClick={() => setFilters({ ...filters, page: filters.page - 1 })}
                disabled={filters.page === 1}
                className="px-4 py-2 bg-gray-200 rounded-md disabled:opacity-50"
              >
                Previous
              </button>
              <span className="px-4 py-2">
                Page {data.pagination.page} of {data.pagination.pages}
              </span>
              <button
                onClick={() => setFilters({ ...filters, page: filters.page + 1 })}
                disabled={filters.page >= data.pagination.pages}
                className="px-4 py-2 bg-gray-200 rounded-md disabled:opacity-50"
              >
                Next
              </button>
            </div>
          )}
        </>
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
        <div className="text-center py-12 text-gray-500">
          No profiles found. Try adjusting your filters.
        </div>
      )}
    </div>
  );
};

export default Search;

