import { useState, useEffect } from 'react';
import { useQuery } from 'react-query';
import { useAuth } from '../context/AuthContext';
import { getFavorites, removeFavorite, updateFavorite, exportFavorites } from '../services/favoriteService';
import { getMyProfile } from '../services/profileService';
import { getCurrentSubscription } from '../services/subscriptionService';
import { getImageUrl } from '../config/api';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import SubscriptionRequiredModal from '../components/SubscriptionRequiredModal';
import ProfileIncompleteModal from '../components/ProfileIncompleteModal';
import { isProfileComplete } from '../utils/profileUtils';

const Favorites = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);
  const [showProfileIncompleteModal, setShowProfileIncompleteModal] = useState(false);
  const [editingFavorite, setEditingFavorite] = useState(null);
  const [editNotes, setEditNotes] = useState('');
  const [editCategory, setEditCategory] = useState('general');
  
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
  const { data: profileData } = useQuery('myProfile', getMyProfile);
  const { data, refetch } = useQuery('favorites', getFavorites, {
    retry: false,
    onError: (error) => {
      // Skip subscription modal for super_admin and vendor
      if (user?.role !== 'super_admin' && user?.role !== 'vendor' && (error.response?.status === 403 || error.response?.data?.requiresSubscription)) {
        setShowSubscriptionModal(true);
      }
    }
  });

  const hasActiveSubscription = subscriptionData?.hasActiveSubscription;

  useEffect(() => {
    // Skip subscription checks for super_admin and vendor
    if (user?.role === 'super_admin' || user?.role === 'vendor') {
      setShowSubscriptionModal(false);
      setShowProfileIncompleteModal(false);
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
      }
    }
  }, [subscriptionData, hasActiveSubscription, profileData, user]);

  const handleRemove = async (profileId) => {
    try {
      await removeFavorite(profileId);
      toast.success('Removed from favorites');
      refetch();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to remove favorite');
    }
  };

  const handleEdit = (favorite) => {
    setEditingFavorite(favorite._id);
    setEditNotes(favorite.notes || '');
    setEditCategory(favorite.category || 'general');
  };

  const handleSaveEdit = async (profileId) => {
    try {
      await updateFavorite(profileId, {
        notes: editNotes,
        category: editCategory,
      });
      toast.success('Favorite updated');
      setEditingFavorite(null);
      refetch();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update favorite');
    }
  };

  const handleExport = async (format) => {
    try {
      const response = await exportFavorites(format);
      if (format === 'csv') {
        const blob = new Blob([response], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `favorites-${Date.now()}.csv`;
        a.click();
        window.URL.revokeObjectURL(url);
      } else {
        const blob = new Blob([JSON.stringify(response, null, 2)], { type: 'application/json' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `favorites-${Date.now()}.json`;
        a.click();
        window.URL.revokeObjectURL(url);
      }
      toast.success('Favorites exported successfully');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to export favorites');
    }
  };

  if (!data?.favorites?.length) {
    return (
      <div className="text-center py-12">
        <div className="bg-white rounded-lg shadow p-8 max-w-md mx-auto">
          <div className="text-6xl mb-4">⭐</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">No Favorites Yet</h2>
          <p className="text-gray-600 mb-6">
            You haven't added any profiles to your favorites list. Start exploring profiles and add the ones you like!
          </p>
          <button
            onClick={() => navigate('/search')}
            className="px-6 py-3 bg-primary-600 text-white rounded-md hover:bg-primary-700 font-medium"
          >
            Browse Profiles
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Favorites ({data.count})</h1>
        <div className="flex space-x-2">
          <button
            onClick={() => handleExport('json')}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Export JSON
          </button>
          <button
            onClick={() => handleExport('csv')}
            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
          >
            Export CSV
          </button>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {data.favorites.map((favorite) => {
          const profile = favorite.profileId;
          return (
            <div key={favorite._id} className="bg-white rounded-lg shadow overflow-hidden cursor-pointer hover:shadow-lg transition-shadow">
              <div 
                className="h-48 bg-gray-200 relative cursor-pointer"
                onClick={() => navigate(`/profiles/${profile._id}`)}
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
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h3 
                      className="font-semibold text-lg cursor-pointer hover:text-primary-600 transition-colors"
                      onClick={() => navigate(`/profiles/${profile._id}`)}
                    >
                      {profile.personalInfo?.firstName} {profile.personalInfo?.lastName}
                    </h3>
                    <p className="text-gray-600 text-sm">
                      {profile.personalInfo?.age} years, {profile.location?.city}
                    </p>
                  </div>
                  {favorite.category && (
                    <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                      {favorite.category}
                    </span>
                  )}
                </div>
                {editingFavorite === favorite._id ? (
                  <div className="mt-2 space-y-2">
                    <select
                      value={editCategory}
                      onChange={(e) => setEditCategory(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                    >
                      <option value="general">General</option>
                      <option value="shortlisted">Shortlisted</option>
                      <option value="maybe">Maybe</option>
                      <option value="contacted">Contacted</option>
                    </select>
                    <textarea
                      value={editNotes}
                      onChange={(e) => setEditNotes(e.target.value)}
                      placeholder="Add notes..."
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                      rows="2"
                    />
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleSaveEdit(profile._id)}
                        className="flex-1 px-3 py-1 bg-green-600 text-white rounded-md hover:bg-green-700 text-sm"
                      >
                        Save
                      </button>
                      <button
                        onClick={() => setEditingFavorite(null)}
                        className="flex-1 px-3 py-1 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 text-sm"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    {favorite.notes && (
                      <p className="text-sm text-gray-600 mt-2 italic">"{favorite.notes}"</p>
                    )}
                    <div className="mt-4 flex space-x-2">
                      <Link
                        to={`/profiles/${profile._id}`}
                        className="flex-1 text-center px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700"
                      >
                        View Profile
                      </Link>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEdit(favorite);
                        }}
                        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                      >
                        Edit
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemove(profile._id);
                        }}
                        className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
                      >
                        Remove
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <SubscriptionRequiredModal
        isOpen={showSubscriptionModal}
      />
      <ProfileIncompleteModal
        isOpen={showProfileIncompleteModal}
      />
    </div>
  );
};

export default Favorites;

