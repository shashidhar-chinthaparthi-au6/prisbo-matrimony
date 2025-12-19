import { useState, useEffect } from 'react';
import { useQuery } from 'react-query';
import { getFavorites, removeFavorite } from '../services/favoriteService';
import { getCurrentSubscription } from '../services/subscriptionService';
import { getImageUrl } from '../config/api';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import SubscriptionRequiredModal from '../components/SubscriptionRequiredModal';

const Favorites = () => {
  const navigate = useNavigate();
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);
  
  const { data: subscriptionData } = useQuery('current-subscription', getCurrentSubscription);
  const { data, refetch } = useQuery('favorites', getFavorites, {
    retry: false,
    onError: (error) => {
      if (error.response?.status === 403 || error.response?.data?.requiresSubscription) {
        setShowSubscriptionModal(true);
      }
    }
  });

  const hasActiveSubscription = subscriptionData?.hasActiveSubscription;

  useEffect(() => {
    if (subscriptionData && !hasActiveSubscription) {
      setShowSubscriptionModal(true);
    }
  }, [subscriptionData, hasActiveSubscription]);

  const handleRemove = async (profileId) => {
    try {
      await removeFavorite(profileId);
      toast.success('Removed from favorites');
      refetch();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to remove favorite');
    }
  };

  if (!data?.favorites?.length) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">You haven't added any favorites yet.</p>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Favorites ({data.count})</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {data.favorites.map((favorite) => {
          const profile = favorite.profileId;
          return (
            <div key={favorite._id} className="bg-white rounded-lg shadow overflow-hidden">
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
                    className="flex-1 text-center px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700"
                  >
                    View Profile
                  </Link>
                  <button
                    onClick={() => handleRemove(profile._id)}
                    className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
                  >
                    Remove
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <SubscriptionRequiredModal
        isOpen={showSubscriptionModal}
        onClose={() => setShowSubscriptionModal(false)}
      />
    </div>
  );
};

export default Favorites;

