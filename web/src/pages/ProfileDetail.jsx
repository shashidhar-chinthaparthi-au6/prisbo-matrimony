import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from 'react-query';
import { getProfileById, getMyProfile } from '../services/profileService';
import { getCurrentSubscription } from '../services/subscriptionService';
import { sendInterest } from '../services/interestService';
import { addFavorite, removeFavorite } from '../services/favoriteService';
import { getOrCreateChat } from '../services/chatService';
import { getImageUrl } from '../config/api';
import toast from 'react-hot-toast';
import SubscriptionRequiredModal from '../components/SubscriptionRequiredModal';

const ProfileDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [isFavorite, setIsFavorite] = useState(false);
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);

  const { data, isLoading, refetch } = useQuery(['profile', id], () => getProfileById(id));
  const { data: myProfileData } = useQuery('myProfile', getMyProfile);
  const { data: subscriptionData } = useQuery('current-subscription', getCurrentSubscription);

  const hasActiveSubscription = subscriptionData?.hasActiveSubscription;
  const isMyProfile = myProfileData?.profile?.userId?._id === data?.profile?.userId?._id;

  useEffect(() => {
    // Check if subscription is required when profile loads
    if (data?.profile && !isMyProfile && !hasActiveSubscription) {
      setShowSubscriptionModal(true);
    }
  }, [data, isMyProfile, hasActiveSubscription]);

  const handleSendInterest = async () => {
    if (!hasActiveSubscription) {
      setShowSubscriptionModal(true);
      return;
    }
    try {
      const response = await sendInterest({ toUserId: data.profile.userId._id });
      if (response.success) {
      toast.success('Interest sent successfully!');
      refetch(); // Refetch to update interest status
      }
    } catch (error) {
      // Handle "Interest already exists" case
      if (error.response?.data?.message === 'Interest already exists' && error.response?.data?.interest) {
        const interest = error.response.data.interest;
        // Update the profile's interest status
        if (data?.profile) {
          data.profile.interestStatus = interest.status;
        }
        toast.info('Interest already sent. Status: ' + interest.status);
        refetch(); // Refetch to update interest status
      } else if (error.response?.data?.requiresSubscription) {
        setShowSubscriptionModal(true);
      } else {
      toast.error(error.response?.data?.message || 'Failed to send interest');
      }
    }
  };

  const handleFavorite = async () => {
    if (!hasActiveSubscription) {
      setShowSubscriptionModal(true);
      return;
    }
    try {
      if (isFavorite) {
        await removeFavorite(id);
        setIsFavorite(false);
        toast.success('Removed from favorites');
      } else {
        await addFavorite(id);
        setIsFavorite(true);
        toast.success('Added to favorites');
      }
    } catch (error) {
      if (error.response?.data?.requiresSubscription) {
        setShowSubscriptionModal(true);
      } else {
      toast.error(error.response?.data?.message || 'Failed to update favorite');
      }
    }
  };

  const handleChat = async () => {
    try {
      const response = await getOrCreateChat(data.profile.userId._id);
      navigate('/chats', { state: { chatId: response.chat._id } });
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to start chat');
    }
  };

  if (isLoading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
      </div>
    );
  }

  if (!data?.profile) {
    return <div className="text-center py-12">Profile not found</div>;
  }

  const profile = data.profile;

  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {/* Photos */}
        <div className="grid grid-cols-2 gap-2 p-4">
          {profile.photos?.map((photo, index) => (
            <img
              key={index}
              src={getImageUrl(photo.url)}
              alt={`Photo ${index + 1}`}
              className="w-full h-64 object-cover rounded"
            />
          ))}
        </div>

        {/* Basic Info */}
        <div className="p-6">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h1 className="text-3xl font-bold">
                {profile.personalInfo?.firstName} {profile.personalInfo?.lastName}
              </h1>
              <p className="text-gray-600">
                {profile.personalInfo?.age} years • {profile.location?.city}, {profile.location?.state}
              </p>
            </div>
            <div className="flex space-x-2">
              <button
                onClick={handleFavorite}
                className={`px-4 py-2 rounded-md ${
                  isFavorite
                    ? 'bg-yellow-500 text-white'
                    : 'bg-gray-200 text-gray-700'
                }`}
              >
                ⭐
              </button>
              {profile.interestStatus === 'accepted' ? (
                <button
                  onClick={handleChat}
                  className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700"
                >
                  Chat
                </button>
              ) : profile.interestStatus === 'pending' ? (
                <button
                  disabled
                  className="px-4 py-2 bg-gray-400 text-white rounded-md cursor-not-allowed"
                >
                  Interest Sent
                </button>
              ) : (
                <button
                  onClick={handleSendInterest}
                  className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700"
                >
                  Send Interest
                </button>
              )}
            </div>
          </div>

          {/* Personal Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
            <div>
              <h2 className="text-xl font-semibold mb-4">Personal Information</h2>
              <div className="space-y-2">
                <p><strong>Height:</strong> {profile.personalInfo?.height || 'N/A'}</p>
                <p><strong>Weight:</strong> {profile.personalInfo?.weight || 'N/A'}</p>
                <p><strong>Marital Status:</strong> {profile.personalInfo?.maritalStatus || 'N/A'}</p>
                <p><strong>Mother Tongue:</strong> {profile.personalInfo?.motherTongue || 'N/A'}</p>
                <p><strong>Physical Status:</strong> {profile.personalInfo?.physicalStatus || 'N/A'}</p>
              </div>
            </div>

            <div>
              <h2 className="text-xl font-semibold mb-4">Education & Career</h2>
              <div className="space-y-2">
                <p><strong>Education:</strong> {profile.education?.highestEducation || 'N/A'}</p>
                <p><strong>College:</strong> {profile.education?.college || 'N/A'}</p>
                <p><strong>Occupation:</strong> {profile.career?.occupation || 'N/A'}</p>
                <p><strong>Company:</strong> {profile.career?.company || 'N/A'}</p>
                <p><strong>Income:</strong> {profile.career?.annualIncome || 'N/A'}</p>
              </div>
            </div>

            <div>
              <h2 className="text-xl font-semibold mb-4">Family Information</h2>
              <div className="space-y-2">
                <p><strong>Father:</strong> {profile.familyInfo?.fatherName || 'N/A'}</p>
                <p><strong>Mother:</strong> {profile.familyInfo?.motherName || 'N/A'}</p>
                <p><strong>Family Type:</strong> {profile.familyInfo?.familyType || 'N/A'}</p>
                <p><strong>Family Status:</strong> {profile.familyInfo?.familyStatus || 'N/A'}</p>
              </div>
            </div>

            <div>
              <h2 className="text-xl font-semibold mb-4">Religion & Caste</h2>
              <div className="space-y-2">
                <p><strong>Religion:</strong> {profile.religion?.religion || 'N/A'}</p>
                <p><strong>Caste:</strong> {profile.religion?.caste || 'N/A'}</p>
                <p><strong>Sub Caste:</strong> {profile.religion?.subCaste || 'N/A'}</p>
              </div>
            </div>
          </div>

          {profile.personalInfo?.about && (
            <div className="mt-6">
              <h2 className="text-xl font-semibold mb-2">About</h2>
              <p className="text-gray-700">{profile.personalInfo.about}</p>
            </div>
          )}
        </div>
      </div>

      <SubscriptionRequiredModal
        isOpen={showSubscriptionModal}
        onClose={() => setShowSubscriptionModal(false)}
      />
    </div>
  );
};

export default ProfileDetail;

