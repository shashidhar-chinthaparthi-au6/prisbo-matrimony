import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { getProfileById, getMyProfile, deleteProfile, updateProfile } from '../services/profileService';
import { 
  getProfileById as getAdminProfileById,
  approveProfile,
  rejectProfile,
  updateProfileStatus,
  updateProfileField,
  blockUser,
  bulkDeleteProfiles
} from '../services/adminService';
import { getCurrentSubscription } from '../services/subscriptionService';
import { sendInterest } from '../services/interestService';
import { addFavorite, removeFavorite } from '../services/favoriteService';
import { getOrCreateChat } from '../services/chatService';
import { getImageUrl } from '../config/api';
import toast from 'react-hot-toast';
import SubscriptionRequiredModal from '../components/SubscriptionRequiredModal';
import ProfileIncompleteModal from '../components/ProfileIncompleteModal';
import PhotoGallery from '../components/PhotoGallery';
import { isProfileComplete, getProfileCompletionPercentage } from '../utils/profileUtils';
import { useAuth } from '../context/AuthContext';
import { indianStates, stateCities, countries } from '../utils/indianLocations';
import { religions, casteCategories, casteSubCastes } from '../utils/religionData';

const ProfileDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [isFavorite, setIsFavorite] = useState(false);
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);
  const [showProfileIncompleteModal, setShowProfileIncompleteModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [showBlockModal, setShowBlockModal] = useState(false);
  const [blockReason, setBlockReason] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [editedData, setEditedData] = useState({});

  const queryClient = useQueryClient();
  
  // Debug: Log user and role
  useEffect(() => {
    console.log('ProfileDetail mounted - User:', user, 'Role:', user?.role, 'Profile ID from params:', id, 'Current URL:', window.location.pathname);
  }, [user, id]);
  
  // Log when id changes
  useEffect(() => {
    console.log('ProfileDetail - ID changed to:', id, 'URL:', window.location.pathname);
  }, [id]);
  
  // Use admin endpoint if user is super_admin, otherwise use regular endpoint
  const isAdmin = user?.role === 'super_admin';
  const fetchProfile = isAdmin 
    ? () => {
        console.log('Using admin endpoint for profile:', id, 'User role:', user?.role);
        return getAdminProfileById(id);
      }
    : () => {
        console.log('Using regular endpoint for profile:', id, 'User role:', user?.role);
        return getProfileById(id);
      };
  const { data, isLoading, refetch, error } = useQuery(
    ['profile', id, user?.role], 
    fetchProfile,
    {
      enabled: !!id && !!user && !authLoading, // Wait for user to be fully loaded
      staleTime: 0, // Always fetch fresh data
      cacheTime: 0, // Don't cache
      refetchOnMount: true, // Always refetch when component mounts
      refetchOnWindowFocus: false,
      retry: (failureCount, error) => {
        // Don't retry on 404 errors
        if (error?.response?.status === 404) {
          console.error('404 error - not retrying. Profile ID:', id, 'URL:', window.location.pathname);
          return false;
        }
        return failureCount < 3;
      },
      onError: (error) => {
        console.error('Profile query error:', error, 'Profile ID:', id, 'User role:', user?.role, 'Is Admin:', isAdmin, 'Error status:', error?.response?.status, 'Error message:', error?.response?.data?.message);
      },
      onSuccess: (data) => {
        console.log('Profile loaded successfully:', data?.profile?._id, 'Expected ID:', id, 'Match:', data?.profile?._id?.toString() === id?.toString());
      },
      onSettled: (data, error) => {
        console.log('Profile query settled - ID:', id, 'Has data:', !!data, 'Has error:', !!error, 'Error status:', error?.response?.status);
      }
    }
  );
  const { data: myProfileData } = useQuery('myProfile', getMyProfile);
  const { data: subscriptionData } = useQuery('current-subscription', getCurrentSubscription);

  const hasActiveSubscription = subscriptionData?.hasActiveSubscription;
  const isMyProfile = myProfileData?.profile?.userId?._id === data?.profile?.userId?._id;
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showPhotoGallery, setShowPhotoGallery] = useState(false);
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState(0);

  useEffect(() => {
    // Don't show modals for super_admin, vendor, or own profile
    if (user?.role === 'super_admin' || user?.role === 'vendor' || isMyProfile) {
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
      if (!myProfileData?.profile || !isProfileComplete(myProfileData.profile)) {
        setShowProfileIncompleteModal(true);
        setShowSubscriptionModal(false);
      } else {
        setShowProfileIncompleteModal(false);
      }
    }
  }, [data, isMyProfile, hasActiveSubscription, subscriptionData, myProfileData, user]);

  const handleSendInterest = async () => {
    // Skip subscription check for super_admin and vendor
    if (user?.role !== 'super_admin' && user?.role !== 'vendor' && !hasActiveSubscription) {
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
    // Skip subscription check for super_admin and vendor
    if (user?.role !== 'super_admin' && user?.role !== 'vendor' && !hasActiveSubscription) {
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

  const handleEdit = () => {
    navigate('/profile?edit=true');
  };

  const handleDelete = async () => {
    try {
      await deleteProfile(data.profile._id);
      toast.success('Profile deactivated successfully');
      queryClient.invalidateQueries('myProfile');
      navigate('/profile');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to delete profile');
    }
  };

  // Admin actions
  const handleApproveProfile = async () => {
    try {
      await approveProfile(id);
      toast.success('Profile approved successfully');
      queryClient.invalidateQueries(['profile', id, user?.role]);
      refetch();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to approve profile');
    }
  };

  const handleRejectProfile = async () => {
    if (!rejectionReason.trim()) {
      toast.error('Please provide a rejection reason');
      return;
    }
    try {
      await rejectProfile(id, rejectionReason);
      toast.success('Profile rejected successfully');
      setShowRejectModal(false);
      setRejectionReason('');
      queryClient.invalidateQueries(['profile', id, user?.role]);
      refetch();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to reject profile');
    }
  };

  const handleToggleProfileStatus = async () => {
    try {
      await updateProfileStatus(id, { 
        isActive: !profile.isActive 
      });
      toast.success(`Profile ${profile.isActive ? 'deactivated' : 'activated'} successfully`);
      queryClient.invalidateQueries(['profile', id, user?.role]);
      refetch();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update profile status');
    }
  };

  const handleBlockUser = async () => {
    if (!blockReason.trim()) {
      toast.error('Please provide a block reason');
      return;
    }
    try {
      await blockUser(profile.userId._id, { 
        isBlocked: true,
        blockReason: blockReason
      });
      toast.success('User blocked successfully');
      setShowBlockModal(false);
      setBlockReason('');
      queryClient.invalidateQueries(['profile', id, user?.role]);
      refetch();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to block user');
    }
  };

  const handleAdminDeleteProfile = async () => {
    if (!window.confirm('Are you sure you want to permanently delete this profile? This action cannot be undone.')) {
      return;
    }
    try {
      await bulkDeleteProfiles([id]);
      toast.success('Profile deleted successfully');
      navigate('/admin');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to delete profile');
    }
  };

  // Initialize edited data when entering edit mode
  useEffect(() => {
    if (isEditing && data?.profile) {
      const profile = { ...data.profile };
      // Parse height if it exists
      if (profile.personalInfo?.height) {
        const height = profile.personalInfo.height;
        const ftInMatch = height.match(/(\d+)'(\d+)"/);
        if (ftInMatch) {
          profile.personalInfo.heightUnit = 'ft';
          profile.personalInfo.heightFeet = ftInMatch[1];
          profile.personalInfo.heightInches = ftInMatch[2];
        } else {
          const cmMatch = height.match(/(\d+)\s*cm/i);
          if (cmMatch) {
            profile.personalInfo.heightUnit = 'cm';
            profile.personalInfo.heightCm = cmMatch[1];
          }
        }
      }
      // Parse weight if it exists
      if (profile.personalInfo?.weight) {
        const weight = profile.personalInfo.weight;
        const kgMatch = weight.match(/(\d+(?:\.\d+)?)\s*kg/i);
        const lbsMatch = weight.match(/(\d+(?:\.\d+)?)\s*lbs/i);
        if (kgMatch) {
          profile.personalInfo.weightUnit = 'kg';
          profile.personalInfo.weightValue = kgMatch[1];
        } else if (lbsMatch) {
          profile.personalInfo.weightUnit = 'lbs';
          profile.personalInfo.weightValue = lbsMatch[1];
        }
      }
      setEditedData({
        personalInfo: { ...profile.personalInfo },
        location: { ...profile.location },
        religion: { ...profile.religion },
        education: { ...profile.education },
        career: { ...profile.career },
        familyInfo: { ...profile.familyInfo },
      });
    }
  }, [isEditing, data?.profile]);

  // Update profile field mutation
  const updateFieldMutation = useMutation(
    ({ field, value, section }) => updateProfileField(id, field, value, section),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['profile', id, user?.role]);
        refetch();
      },
      onError: (error) => {
        toast.error(error.response?.data?.message || 'Failed to update profile');
      },
    }
  );

  const handleFieldChange = (section, field, value) => {
    setEditedData((prev) => ({
      ...prev,
      [section]: {
        ...prev[section],
        [field]: value,
      },
    }));
  };

  const handleSaveField = (field, value, section) => {
    updateFieldMutation.mutate({ field, value, section });
  };

  const handleSaveAll = () => {
    // Save all changed fields
    Object.keys(editedData).forEach((section) => {
      if (editedData[section] && data?.profile?.[section]) {
        Object.keys(editedData[section]).forEach((field) => {
          const newValue = editedData[section][field];
          const oldValue = data.profile[section]?.[field];
          if (newValue !== undefined && newValue !== oldValue) {
            handleSaveField(field, newValue, section);
          }
        });
      }
    });
    setIsEditing(false);
    toast.success('Profile updated successfully');
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditedData({});
  };

  if (isLoading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
      </div>
    );
  }

  // Handle error case (404, etc.)
  if (error) {
    console.error('Profile fetch error:', error);
    const errorMessage = error?.response?.data?.message || 'Failed to load profile';
    const is404 = error?.response?.status === 404;
    
    return (
      <div className="text-center py-12">
        <div className="text-red-600 mb-4 text-xl font-bold">
          {is404 ? 'Profile Not Found' : 'Error Loading Profile'}
        </div>
        <div className="text-gray-600 mb-4">Profile ID: {id}</div>
        <div className="text-gray-500 mb-4 text-sm">{errorMessage}</div>
        <div className="flex gap-4 justify-center">
          <button
            onClick={() => navigate(-1)}
            className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700"
          >
            Go Back
          </button>
          <button
            onClick={() => navigate('/')}
            className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
          >
            Go to Home
          </button>
        </div>
      </div>
    );
  }

  if (!data?.profile) {
    console.error('Profile not found for ID:', id, 'User role:', user?.role, 'Data:', data);
    return (
      <div className="text-center py-12">
        <div className="text-red-600 mb-4">Profile not found</div>
        <div className="text-gray-600 mb-4">Profile ID: {id}</div>
        <button
          onClick={() => navigate(-1)}
          className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700"
        >
          Go Back
        </button>
      </div>
    );
  }

  const profile = data.profile;
  const completionPercentage = isMyProfile ? getProfileCompletionPercentage(profile) : null;
  const verificationStatus = profile.verificationStatus || 'pending';

  return (
    <div className="max-w-4xl mx-auto">
      {/* Back Button */}
      <button
        onClick={() => navigate(-1)}
        className="mb-4 flex items-center text-gray-600 hover:text-gray-900 transition-colors"
      >
        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Back
      </button>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        {/* Photos */}
        <div className="grid grid-cols-2 gap-2 p-4">
          {profile.photos?.map((photo, index) => (
            <img
              key={index}
              src={getImageUrl(photo.url)}
              alt={`Photo ${index + 1}`}
              className="w-full h-64 object-cover rounded cursor-pointer hover:opacity-90 transition-opacity"
              onClick={() => {
                setSelectedPhotoIndex(index);
                setShowPhotoGallery(true);
              }}
            />
          ))}
        </div>

        {/* Basic Info */}
        <div className="p-6">
          <div className="flex justify-between items-start mb-4">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-3xl font-bold">
                  {profile.personalInfo?.firstName} {profile.personalInfo?.lastName}
                </h1>
                {/* Verification Status Badge */}
                <span
                  className={`px-3 py-1 rounded-full text-xs font-semibold ${
                    verificationStatus === 'approved'
                      ? 'bg-green-100 text-green-800'
                      : verificationStatus === 'rejected'
                      ? 'bg-red-100 text-red-800'
                      : 'bg-yellow-100 text-yellow-800'
                  }`}
                >
                  {verificationStatus === 'approved' ? '✓ Verified' : verificationStatus === 'rejected' ? '✗ Rejected' : '⏳ Pending'}
                </span>
              </div>
              {/* Rejection Reason and Re-apply */}
              {isMyProfile && verificationStatus === 'rejected' && profile.rejectionReason && (
                <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-md">
                  <p className="text-sm font-semibold text-red-800 mb-1">Verification Rejected</p>
                  <p className="text-sm text-red-700 mb-3">{profile.rejectionReason}</p>
                  <button
                    onClick={async () => {
                      try {
                        await updateProfile(profile._id, { verificationStatus: 'pending', rejectionReason: undefined });
                        toast.success('Verification re-applied successfully!');
                        refetch();
                      } catch (error) {
                        toast.error(error.response?.data?.message || 'Failed to re-apply verification');
                      }
                    }}
                    className="px-4 py-2 bg-red-600 text-white text-sm rounded-md hover:bg-red-700"
                  >
                    Re-apply for Verification
                  </button>
                </div>
              )}
              <p className="text-gray-600 mb-2">
                {profile.personalInfo?.age} years • {profile.location?.city}, {profile.location?.state}
              </p>
              {/* Profile Completion Indicator */}
              {isMyProfile && completionPercentage !== null && (
                <div className="mt-2">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm text-gray-600">Profile Completion:</span>
                    <span className="text-sm font-semibold">{completionPercentage}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full transition-all duration-300 ${
                        completionPercentage >= 80
                          ? 'bg-green-500'
                          : completionPercentage >= 50
                          ? 'bg-yellow-500'
                          : 'bg-red-500'
                      }`}
                      style={{ width: `${completionPercentage}%` }}
                    ></div>
                  </div>
                </div>
              )}
            </div>
            <div className="flex space-x-2 flex-wrap gap-2">
              {isMyProfile ? (
                <>
                  <button
                    onClick={handleEdit}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                  >
                    Edit Profile
                  </button>
                  <button
                    onClick={() => setShowDeleteConfirm(true)}
                    className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
                  >
                    Delete Profile
                  </button>
                </>
              ) : user?.role === 'super_admin' ? (
                <>
                  {/* Edit Profile */}
                  {!isEditing ? (
                    <button
                      onClick={() => setIsEditing(true)}
                      className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                    >
                      ✏️ Edit Profile
                    </button>
                  ) : (
                    <div className="flex gap-2">
                      <button
                        onClick={handleCancelEdit}
                        className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleSaveAll}
                        className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                      >
                        Save All
                      </button>
                    </div>
                  )}
                  
                  {/* Verification Actions */}
                  {profile.verificationStatus === 'pending' && (
                    <>
                      <button
                        onClick={handleApproveProfile}
                        className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                      >
                        ✓ Approve
                      </button>
                      <button
                        onClick={() => setShowRejectModal(true)}
                        className="px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700"
                      >
                        ✗ Reject
                      </button>
                    </>
                  )}
                  
                  {/* Status Actions */}
                  <button
                    onClick={handleToggleProfileStatus}
                    className={`px-4 py-2 rounded-md ${
                      profile.isActive
                        ? 'bg-yellow-600 text-white hover:bg-yellow-700'
                        : 'bg-green-600 text-white hover:bg-green-700'
                    }`}
                  >
                    {profile.isActive ? 'Deactivate' : 'Activate'}
                  </button>
                  
                  {/* User Management */}
                  <button
                    onClick={() => setShowBlockModal(true)}
                    className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
                  >
                    Block User
                  </button>
                  
                  {/* Delete Profile */}
                  <button
                    onClick={handleAdminDeleteProfile}
                    className="px-4 py-2 bg-red-800 text-white rounded-md hover:bg-red-900"
                  >
                    Delete Profile
                  </button>
                </>
              ) : user?.role !== 'vendor' ? (
                <>
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
                </>
              ) : null}
            </div>
          </div>

          {/* Profile Details - All Sections */}
          <div className="mt-6 space-y-6">
            {/* Personal Information Section */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-semibold mb-4">Personal Information</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">First Name:</label>
                  {isEditing && user?.role === 'super_admin' ? (
                    <input
                      type="text"
                      value={editedData.personalInfo?.firstName || ''}
                      onChange={(e) => handleFieldChange('personalInfo', 'firstName', e.target.value)}
                      onBlur={() => handleSaveField('firstName', editedData.personalInfo?.firstName, 'personalInfo')}
                      className="w-full px-2 py-1 border border-gray-300 rounded"
                    />
                  ) : (
                    <p className="text-gray-900">{profile.personalInfo?.firstName || 'N/A'}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Last Name:</label>
                  {isEditing && user?.role === 'super_admin' ? (
                    <input
                      type="text"
                      value={editedData.personalInfo?.lastName || ''}
                      onChange={(e) => handleFieldChange('personalInfo', 'lastName', e.target.value)}
                      onBlur={() => handleSaveField('lastName', editedData.personalInfo?.lastName, 'personalInfo')}
                      className="w-full px-2 py-1 border border-gray-300 rounded"
                    />
                  ) : (
                    <p className="text-gray-900">{profile.personalInfo?.lastName || 'N/A'}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Date of Birth:</label>
                  {isEditing && user?.role === 'super_admin' ? (
                    <input
                      type="date"
                      value={editedData.personalInfo?.dateOfBirth ? new Date(editedData.personalInfo.dateOfBirth).toISOString().split('T')[0] : ''}
                      onChange={(e) => handleFieldChange('personalInfo', 'dateOfBirth', e.target.value)}
                      onBlur={() => handleSaveField('dateOfBirth', editedData.personalInfo?.dateOfBirth, 'personalInfo')}
                      className="w-full px-2 py-1 border border-gray-300 rounded"
                    />
                  ) : (
                    <p className="text-gray-900">{profile.personalInfo?.dateOfBirth ? new Date(profile.personalInfo.dateOfBirth).toLocaleDateString() : 'N/A'}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Height:</label>
                  {isEditing && user?.role === 'super_admin' ? (
                    <div className="flex gap-2">
                      <select
                        value={editedData.personalInfo?.heightUnit || 'ft'}
                        onChange={(e) => {
                          const unit = e.target.value;
                          handleFieldChange('personalInfo', 'heightUnit', unit);
                          handleFieldChange('personalInfo', 'height', '');
                          handleFieldChange('personalInfo', 'heightFeet', '');
                          handleFieldChange('personalInfo', 'heightInches', '');
                          handleFieldChange('personalInfo', 'heightCm', '');
                        }}
                        className="px-2 py-1 border border-gray-300 rounded bg-white"
                      >
                        <option value="ft">ft/in</option>
                        <option value="cm">cm</option>
                      </select>
                      {editedData.personalInfo?.heightUnit === 'ft' ? (
                        <div className="flex gap-2 flex-1">
                          <input
                            type="number"
                            min="0"
                            max="8"
                            value={editedData.personalInfo?.heightFeet || ''}
                            onChange={(e) => {
                              const feet = e.target.value;
                              handleFieldChange('personalInfo', 'heightFeet', feet);
                              const inches = editedData.personalInfo?.heightInches || '0';
                              handleFieldChange('personalInfo', 'height', feet ? `${feet}'${inches}"` : '');
                            }}
                            onBlur={() => {
                              const feet = editedData.personalInfo?.heightFeet || '0';
                              const inches = editedData.personalInfo?.heightInches || '0';
                              handleSaveField('height', feet ? `${feet}'${inches}"` : '', 'personalInfo');
                            }}
                            className="flex-1 px-2 py-1 border border-gray-300 rounded"
                            placeholder="Feet"
                          />
                          <input
                            type="number"
                            min="0"
                            max="11"
                            value={editedData.personalInfo?.heightInches || ''}
                            onChange={(e) => {
                              const inches = e.target.value;
                              handleFieldChange('personalInfo', 'heightInches', inches);
                              const feet = editedData.personalInfo?.heightFeet || '0';
                              handleFieldChange('personalInfo', 'height', feet ? `${feet}'${inches}"` : '');
                            }}
                            onBlur={() => {
                              const feet = editedData.personalInfo?.heightFeet || '0';
                              const inches = editedData.personalInfo?.heightInches || '0';
                              handleSaveField('height', feet ? `${feet}'${inches}"` : '', 'personalInfo');
                            }}
                            className="flex-1 px-2 py-1 border border-gray-300 rounded"
                            placeholder="Inches"
                          />
                        </div>
                      ) : (
                        <input
                          type="number"
                          min="0"
                          value={editedData.personalInfo?.heightCm || ''}
                          onChange={(e) => {
                            const cm = e.target.value;
                            handleFieldChange('personalInfo', 'heightCm', cm);
                            handleFieldChange('personalInfo', 'height', cm ? `${cm} cm` : '');
                          }}
                          onBlur={() => {
                            const cm = editedData.personalInfo?.heightCm;
                            handleSaveField('height', cm ? `${cm} cm` : '', 'personalInfo');
                          }}
                          className="flex-1 px-2 py-1 border border-gray-300 rounded"
                          placeholder="Centimeters"
                        />
                      )}
                    </div>
                  ) : (
                    <p className="text-gray-900">{profile.personalInfo?.height || 'N/A'}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Weight:</label>
                  {isEditing && user?.role === 'super_admin' ? (
                    <div className="flex gap-2">
                      <select
                        value={editedData.personalInfo?.weightUnit || 'kg'}
                        onChange={(e) => {
                          const unit = e.target.value;
                          handleFieldChange('personalInfo', 'weightUnit', unit);
                          handleFieldChange('personalInfo', 'weight', '');
                          handleFieldChange('personalInfo', 'weightValue', '');
                        }}
                        className="px-2 py-1 border border-gray-300 rounded bg-white"
                      >
                        <option value="kg">kg</option>
                        <option value="lbs">lbs</option>
                      </select>
                      <input
                        type="number"
                        min="0"
                        step="0.1"
                        value={editedData.personalInfo?.weightValue || ''}
                        onChange={(e) => {
                          const value = e.target.value;
                          const unit = editedData.personalInfo?.weightUnit || 'kg';
                          handleFieldChange('personalInfo', 'weightValue', value);
                          handleFieldChange('personalInfo', 'weight', value ? `${value} ${unit}` : '');
                        }}
                        onBlur={() => {
                          const value = editedData.personalInfo?.weightValue;
                          const unit = editedData.personalInfo?.weightUnit || 'kg';
                          handleSaveField('weight', value ? `${value} ${unit}` : '', 'personalInfo');
                        }}
                        className="flex-1 px-2 py-1 border border-gray-300 rounded"
                        placeholder={`Weight in ${editedData.personalInfo?.weightUnit || 'kg'}`}
                      />
                    </div>
                  ) : (
                    <p className="text-gray-900">{profile.personalInfo?.weight || 'N/A'}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Blood Group:</label>
                  {isEditing && user?.role === 'super_admin' ? (
                    <select
                      value={editedData.personalInfo?.bloodGroup || ''}
                      onChange={(e) => handleFieldChange('personalInfo', 'bloodGroup', e.target.value)}
                      onBlur={() => handleSaveField('bloodGroup', editedData.personalInfo?.bloodGroup, 'personalInfo')}
                      className="w-full px-2 py-1 border border-gray-300 rounded"
                    >
                      <option value="">Select</option>
                      <option value="A+">A+</option>
                      <option value="A-">A-</option>
                      <option value="B+">B+</option>
                      <option value="B-">B-</option>
                      <option value="AB+">AB+</option>
                      <option value="AB-">AB-</option>
                      <option value="O+">O+</option>
                      <option value="O-">O-</option>
                    </select>
                  ) : (
                    <p className="text-gray-900">{profile.personalInfo?.bloodGroup || 'N/A'}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Complexion:</label>
                  {isEditing && user?.role === 'super_admin' ? (
                    <select
                      value={editedData.personalInfo?.complexion || ''}
                      onChange={(e) => handleFieldChange('personalInfo', 'complexion', e.target.value)}
                      onBlur={() => handleSaveField('complexion', editedData.personalInfo?.complexion, 'personalInfo')}
                      className="w-full px-2 py-1 border border-gray-300 rounded"
                    >
                      <option value="">Select</option>
                      <option value="Fair">Fair</option>
                      <option value="Wheatish">Wheatish</option>
                      <option value="Wheatish Brown">Wheatish Brown</option>
                      <option value="Dark">Dark</option>
                    </select>
                  ) : (
                    <p className="text-gray-900">{profile.personalInfo?.complexion || 'N/A'}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Physical Status:</label>
                  {isEditing && user?.role === 'super_admin' ? (
                    <select
                      value={editedData.personalInfo?.physicalStatus || ''}
                      onChange={(e) => handleFieldChange('personalInfo', 'physicalStatus', e.target.value)}
                      onBlur={() => handleSaveField('physicalStatus', editedData.personalInfo?.physicalStatus, 'personalInfo')}
                      className="w-full px-2 py-1 border border-gray-300 rounded"
                    >
                      <option value="">Select</option>
                      <option value="Normal">Normal</option>
                      <option value="Physically Challenged">Physically Challenged</option>
                    </select>
                  ) : (
                    <p className="text-gray-900">{profile.personalInfo?.physicalStatus || 'N/A'}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Marital Status:</label>
                  {isEditing && user?.role === 'super_admin' ? (
                    <select
                      value={editedData.personalInfo?.maritalStatus || ''}
                      onChange={(e) => handleFieldChange('personalInfo', 'maritalStatus', e.target.value)}
                      onBlur={() => handleSaveField('maritalStatus', editedData.personalInfo?.maritalStatus, 'personalInfo')}
                      className="w-full px-2 py-1 border border-gray-300 rounded"
                    >
                      <option value="Never Married">Never Married</option>
                      <option value="Divorced">Divorced</option>
                      <option value="Widowed">Widowed</option>
                      <option value="Awaiting Divorce">Awaiting Divorce</option>
                    </select>
                  ) : (
                    <p className="text-gray-900">{profile.personalInfo?.maritalStatus || 'N/A'}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Mother Tongue:</label>
                  {isEditing && user?.role === 'super_admin' ? (
                    <select
                      value={editedData.personalInfo?.motherTongue || ''}
                      onChange={(e) => {
                        const value = e.target.value;
                        handleFieldChange('personalInfo', 'motherTongue', value);
                        if (value !== 'Other') {
                          handleFieldChange('personalInfo', 'motherTongueCustom', '');
                        }
                      }}
                      onBlur={() => handleSaveField('motherTongue', editedData.personalInfo?.motherTongue, 'personalInfo')}
                      className="w-full px-2 py-1 border border-gray-300 rounded"
                    >
                      <option value="">Select</option>
                      <option value="Hindi">Hindi</option>
                      <option value="English">English</option>
                      <option value="Tamil">Tamil</option>
                      <option value="Telugu">Telugu</option>
                      <option value="Kannada">Kannada</option>
                      <option value="Malayalam">Malayalam</option>
                      <option value="Marathi">Marathi</option>
                      <option value="Gujarati">Gujarati</option>
                      <option value="Bengali">Bengali</option>
                      <option value="Punjabi">Punjabi</option>
                      <option value="Urdu">Urdu</option>
                      <option value="Odia">Odia</option>
                      <option value="Assamese">Assamese</option>
                      <option value="Rajasthani">Rajasthani</option>
                      <option value="Bhojpuri">Bhojpuri</option>
                      <option value="Sanskrit">Sanskrit</option>
                      <option value="Konkani">Konkani</option>
                      <option value="Tulu">Tulu</option>
                      <option value="Kashmiri">Kashmiri</option>
                      <option value="Sindhi">Sindhi</option>
                      <option value="Other">Other</option>
                    </select>
                  ) : (
                    <p className="text-gray-900">{profile.personalInfo?.motherTongue || 'N/A'}</p>
                  )}
                </div>
                {isEditing && user?.role === 'super_admin' && editedData.personalInfo?.motherTongue === 'Other' && (
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Custom Mother Tongue:</label>
                    <input
                      type="text"
                      value={editedData.personalInfo?.motherTongueCustom || ''}
                      onChange={(e) => {
                        handleFieldChange('personalInfo', 'motherTongueCustom', e.target.value);
                        handleFieldChange('personalInfo', 'motherTongue', e.target.value);
                      }}
                      onBlur={() => handleSaveField('motherTongue', editedData.personalInfo?.motherTongue, 'personalInfo')}
                      className="w-full px-2 py-1 border border-gray-300 rounded"
                      placeholder="Enter your mother tongue"
                    />
                  </div>
                )}
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">About Me:</label>
                  {isEditing && user?.role === 'super_admin' ? (
                    <textarea
                      value={editedData.personalInfo?.about || ''}
                      onChange={(e) => handleFieldChange('personalInfo', 'about', e.target.value)}
                      onBlur={() => handleSaveField('about', editedData.personalInfo?.about, 'personalInfo')}
                      className="w-full px-2 py-1 border border-gray-300 rounded"
                      rows="4"
                      placeholder="Tell us about yourself..."
                    />
                  ) : (
                    <p className="text-gray-900">{profile.personalInfo?.about || 'N/A'}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Family Information Section */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-semibold mb-4">Family Information</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Father's Name:</label>
                  {isEditing && user?.role === 'super_admin' ? (
                    <input
                      type="text"
                      value={editedData.familyInfo?.fatherName || ''}
                      onChange={(e) => handleFieldChange('familyInfo', 'fatherName', e.target.value)}
                      onBlur={() => handleSaveField('fatherName', editedData.familyInfo?.fatherName, 'familyInfo')}
                      className="w-full px-2 py-1 border border-gray-300 rounded"
                    />
                  ) : (
                    <p className="text-gray-900">{profile.familyInfo?.fatherName || 'N/A'}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Father's Occupation:</label>
                  {isEditing && user?.role === 'super_admin' ? (
                    <input
                      type="text"
                      value={editedData.familyInfo?.fatherOccupation || ''}
                      onChange={(e) => handleFieldChange('familyInfo', 'fatherOccupation', e.target.value)}
                      onBlur={() => handleSaveField('fatherOccupation', editedData.familyInfo?.fatherOccupation, 'familyInfo')}
                      className="w-full px-2 py-1 border border-gray-300 rounded"
                    />
                  ) : (
                    <p className="text-gray-900">{profile.familyInfo?.fatherOccupation || 'N/A'}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Mother's Name:</label>
                  {isEditing && user?.role === 'super_admin' ? (
                    <input
                      type="text"
                      value={editedData.familyInfo?.motherName || ''}
                      onChange={(e) => handleFieldChange('familyInfo', 'motherName', e.target.value)}
                      onBlur={() => handleSaveField('motherName', editedData.familyInfo?.motherName, 'familyInfo')}
                      className="w-full px-2 py-1 border border-gray-300 rounded"
                    />
                  ) : (
                    <p className="text-gray-900">{profile.familyInfo?.motherName || 'N/A'}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Mother's Occupation:</label>
                  {isEditing && user?.role === 'super_admin' ? (
                    <input
                      type="text"
                      value={editedData.familyInfo?.motherOccupation || ''}
                      onChange={(e) => handleFieldChange('familyInfo', 'motherOccupation', e.target.value)}
                      onBlur={() => handleSaveField('motherOccupation', editedData.familyInfo?.motherOccupation, 'familyInfo')}
                      className="w-full px-2 py-1 border border-gray-300 rounded"
                    />
                  ) : (
                    <p className="text-gray-900">{profile.familyInfo?.motherOccupation || 'N/A'}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Siblings:</label>
                  {isEditing && user?.role === 'super_admin' ? (
                    <input
                      type="text"
                      value={editedData.familyInfo?.siblings || ''}
                      onChange={(e) => handleFieldChange('familyInfo', 'siblings', e.target.value)}
                      onBlur={() => handleSaveField('siblings', editedData.familyInfo?.siblings, 'familyInfo')}
                      className="w-full px-2 py-1 border border-gray-300 rounded"
                      placeholder="e.g., 1 Brother, 1 Sister"
                    />
                  ) : (
                    <p className="text-gray-900">{profile.familyInfo?.siblings || 'N/A'}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Family Type:</label>
                  {isEditing && user?.role === 'super_admin' ? (
                    <select
                      value={editedData.familyInfo?.familyType || ''}
                      onChange={(e) => handleFieldChange('familyInfo', 'familyType', e.target.value)}
                      onBlur={() => handleSaveField('familyType', editedData.familyInfo?.familyType, 'familyInfo')}
                      className="w-full px-2 py-1 border border-gray-300 rounded"
                    >
                      <option value="">Select</option>
                      <option value="Joint">Joint</option>
                      <option value="Nuclear">Nuclear</option>
                    </select>
                  ) : (
                    <p className="text-gray-900">{profile.familyInfo?.familyType || 'N/A'}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Family Status:</label>
                  {isEditing && user?.role === 'super_admin' ? (
                    <select
                      value={editedData.familyInfo?.familyStatus || ''}
                      onChange={(e) => handleFieldChange('familyInfo', 'familyStatus', e.target.value)}
                      onBlur={() => handleSaveField('familyStatus', editedData.familyInfo?.familyStatus, 'familyInfo')}
                      className="w-full px-2 py-1 border border-gray-300 rounded"
                    >
                      <option value="">Select</option>
                      <option value="Middle Class">Middle Class</option>
                      <option value="Upper Middle Class">Upper Middle Class</option>
                      <option value="Rich">Rich</option>
                      <option value="Affluent">Affluent</option>
                    </select>
                  ) : (
                    <p className="text-gray-900">{profile.familyInfo?.familyStatus || 'N/A'}</p>
                  )}
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Family Values:</label>
                  {isEditing && user?.role === 'super_admin' ? (
                    <textarea
                      value={editedData.familyInfo?.familyValues || ''}
                      onChange={(e) => handleFieldChange('familyInfo', 'familyValues', e.target.value)}
                      onBlur={() => handleSaveField('familyValues', editedData.familyInfo?.familyValues, 'familyInfo')}
                      className="w-full px-2 py-1 border border-gray-300 rounded"
                      rows="3"
                      placeholder="Describe your family values..."
                    />
                  ) : (
                    <p className="text-gray-900">{profile.familyInfo?.familyValues || 'N/A'}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Education Section */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-semibold mb-4">Education</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Highest Education:</label>
                  {isEditing && user?.role === 'super_admin' ? (
                    <select
                      value={editedData.education?.highestEducation || ''}
                      onChange={(e) => handleFieldChange('education', 'highestEducation', e.target.value)}
                      onBlur={() => handleSaveField('highestEducation', editedData.education?.highestEducation, 'education')}
                      className="w-full px-2 py-1 border border-gray-300 rounded"
                    >
                      <option value="">Select</option>
                      <option value="School">School</option>
                      <option value="High School">High School</option>
                      <option value="Diploma">Diploma</option>
                      <option value="Bachelor's Degree">Bachelor's Degree</option>
                      <option value="Master's Degree">Master's Degree</option>
                      <option value="M.Phil">M.Phil</option>
                      <option value="Ph.D">Ph.D</option>
                      <option value="Professional Degree (CA, CS, ICWA)">Professional Degree (CA, CS, ICWA)</option>
                      <option value="Other">Other</option>
                    </select>
                  ) : (
                    <p className="text-gray-900">{profile.education?.highestEducation || 'N/A'}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">College/University:</label>
                  {isEditing && user?.role === 'super_admin' ? (
                    <input
                      type="text"
                      value={editedData.education?.college || ''}
                      onChange={(e) => handleFieldChange('education', 'college', e.target.value)}
                      onBlur={() => handleSaveField('college', editedData.education?.college, 'education')}
                      className="w-full px-2 py-1 border border-gray-300 rounded"
                    />
                  ) : (
                    <p className="text-gray-900">{profile.education?.college || 'N/A'}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Degree:</label>
                  {isEditing && user?.role === 'super_admin' ? (
                    <select
                      value={editedData.education?.degree || ''}
                      onChange={(e) => handleFieldChange('education', 'degree', e.target.value)}
                      onBlur={() => handleSaveField('degree', editedData.education?.degree, 'education')}
                      className="w-full px-2 py-1 border border-gray-300 rounded"
                    >
                      <option value="">Select</option>
                      <option value="B.Tech / B.E.">B.Tech / B.E.</option>
                      <option value="B.Sc">B.Sc</option>
                      <option value="B.Com">B.Com</option>
                      <option value="B.A">B.A</option>
                      <option value="BBA">BBA</option>
                      <option value="MBBS">MBBS</option>
                      <option value="BDS">BDS</option>
                      <option value="B.Pharm">B.Pharm</option>
                      <option value="M.Tech / M.E.">M.Tech / M.E.</option>
                      <option value="M.Sc">M.Sc</option>
                      <option value="M.Com">M.Com</option>
                      <option value="M.A">M.A</option>
                      <option value="MBA">MBA</option>
                      <option value="MD">MD</option>
                      <option value="MS">MS</option>
                      <option value="MDS">MDS</option>
                      <option value="CA">CA</option>
                      <option value="CS">CS</option>
                      <option value="ICWA">ICWA</option>
                      <option value="LLB">LLB</option>
                      <option value="LLM">LLM</option>
                      <option value="Ph.D">Ph.D</option>
                      <option value="Other">Other</option>
                    </select>
                  ) : (
                    <p className="text-gray-900">{profile.education?.degree || 'N/A'}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Specialization:</label>
                  {isEditing && user?.role === 'super_admin' ? (
                    <input
                      type="text"
                      value={editedData.education?.specialization || ''}
                      onChange={(e) => handleFieldChange('education', 'specialization', e.target.value)}
                      onBlur={() => handleSaveField('specialization', editedData.education?.specialization, 'education')}
                      className="w-full px-2 py-1 border border-gray-300 rounded"
                      placeholder="e.g., Computer Science, Finance"
                    />
                  ) : (
                    <p className="text-gray-900">{profile.education?.specialization || 'N/A'}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Career Section */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-semibold mb-4">Career</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Occupation:</label>
                  {isEditing && user?.role === 'super_admin' ? (
                    <select
                      value={editedData.career?.occupation || ''}
                      onChange={(e) => handleFieldChange('career', 'occupation', e.target.value)}
                      onBlur={() => handleSaveField('occupation', editedData.career?.occupation, 'career')}
                      className="w-full px-2 py-1 border border-gray-300 rounded"
                    >
                      <option value="">Select</option>
                      <option value="Software Engineer">Software Engineer</option>
                      <option value="Doctor">Doctor</option>
                      <option value="Engineer">Engineer</option>
                      <option value="Teacher">Teacher</option>
                      <option value="Professor">Professor</option>
                      <option value="Business">Business</option>
                      <option value="CA / CS / ICWA">CA / CS / ICWA</option>
                      <option value="Lawyer">Lawyer</option>
                      <option value="Government Employee">Government Employee</option>
                      <option value="Banking Professional">Banking Professional</option>
                      <option value="Accountant">Accountant</option>
                      <option value="Architect">Architect</option>
                      <option value="Dentist">Dentist</option>
                      <option value="Pharmacist">Pharmacist</option>
                      <option value="Nurse">Nurse</option>
                      <option value="Pilot">Pilot</option>
                      <option value="Army / Navy / Air Force">Army / Navy / Air Force</option>
                      <option value="Police">Police</option>
                      <option value="Designer">Designer</option>
                      <option value="Artist">Artist</option>
                      <option value="Scientist">Scientist</option>
                      <option value="Research Scholar">Research Scholar</option>
                      <option value="Student">Student</option>
                      <option value="Homemaker">Homemaker</option>
                      <option value="Other">Other</option>
                    </select>
                  ) : (
                    <p className="text-gray-900">{profile.career?.occupation || 'N/A'}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Company/Organization:</label>
                  {isEditing && user?.role === 'super_admin' ? (
                    <input
                      type="text"
                      value={editedData.career?.company || ''}
                      onChange={(e) => handleFieldChange('career', 'company', e.target.value)}
                      onBlur={() => handleSaveField('company', editedData.career?.company, 'career')}
                      className="w-full px-2 py-1 border border-gray-300 rounded"
                    />
                  ) : (
                    <p className="text-gray-900">{profile.career?.company || 'N/A'}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Annual Income:</label>
                  {isEditing && user?.role === 'super_admin' ? (
                    <select
                      value={editedData.career?.annualIncome || ''}
                      onChange={(e) => handleFieldChange('career', 'annualIncome', e.target.value)}
                      onBlur={() => handleSaveField('annualIncome', editedData.career?.annualIncome, 'career')}
                      className="w-full px-2 py-1 border border-gray-300 rounded"
                    >
                      <option value="">Select</option>
                      <option value="Below ₹2,00,000">Below ₹2,00,000</option>
                      <option value="₹2,00,000 - ₹5,00,000">₹2,00,000 - ₹5,00,000</option>
                      <option value="₹5,00,000 - ₹10,00,000">₹5,00,000 - ₹10,00,000</option>
                      <option value="₹10,00,000 - ₹20,00,000">₹10,00,000 - ₹20,00,000</option>
                      <option value="₹20,00,000 - ₹50,00,000">₹20,00,000 - ₹50,00,000</option>
                      <option value="₹50,00,000 - ₹1,00,00,000">₹50,00,000 - ₹1,00,00,000</option>
                      <option value="Above ₹1,00,00,000">Above ₹1,00,00,000</option>
                      <option value="Not Disclosed">Not Disclosed</option>
                    </select>
                  ) : (
                    <p className="text-gray-900">{profile.career?.annualIncome || 'N/A'}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Working Location:</label>
                  {isEditing && user?.role === 'super_admin' ? (
                    <input
                      type="text"
                      value={editedData.career?.workingLocation || ''}
                      onChange={(e) => handleFieldChange('career', 'workingLocation', e.target.value)}
                      onBlur={() => handleSaveField('workingLocation', editedData.career?.workingLocation, 'career')}
                      className="w-full px-2 py-1 border border-gray-300 rounded"
                      placeholder="City, State"
                    />
                  ) : (
                    <p className="text-gray-900">{profile.career?.workingLocation || 'N/A'}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Location Section */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-semibold mb-4">Location</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Country:</label>
                  {isEditing && user?.role === 'super_admin' ? (
                    <select
                      value={editedData.location?.country || 'India'}
                      onChange={(e) => {
                        handleFieldChange('location', 'country', e.target.value);
                        if (e.target.value !== 'India') {
                          handleFieldChange('location', 'state', '');
                          handleFieldChange('location', 'city', '');
                        }
                      }}
                      onBlur={() => handleSaveField('country', editedData.location?.country, 'location')}
                      className="w-full px-2 py-1 border border-gray-300 rounded"
                    >
                      {countries.map((country) => (
                        <option key={country} value={country}>
                          {country}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <p className="text-gray-900">{profile.location?.country || 'N/A'}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">State:</label>
                  {isEditing && user?.role === 'super_admin' ? (
                    editedData.location?.country === 'India' || !editedData.location?.country ? (
                      <select
                        value={editedData.location?.state || ''}
                        onChange={(e) => {
                          handleFieldChange('location', 'state', e.target.value);
                          handleFieldChange('location', 'city', '');
                        }}
                        onBlur={() => handleSaveField('state', editedData.location?.state, 'location')}
                        className="w-full px-2 py-1 border border-gray-300 rounded"
                      >
                        <option value="">Select State</option>
                        {indianStates.map((state) => (
                          <option key={state} value={state}>
                            {state}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <input
                        type="text"
                        value={editedData.location?.state || ''}
                        onChange={(e) => handleFieldChange('location', 'state', e.target.value)}
                        onBlur={() => handleSaveField('state', editedData.location?.state, 'location')}
                        className="w-full px-2 py-1 border border-gray-300 rounded"
                        placeholder="Enter state"
                      />
                    )
                  ) : (
                    <p className="text-gray-900">{profile.location?.state || 'N/A'}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">City:</label>
                  {isEditing && user?.role === 'super_admin' ? (
                    editedData.location?.country === 'India' || !editedData.location?.country ? (
                      editedData.location?.state && stateCities[editedData.location.state] ? (
                        <select
                          value={editedData.location?.city || ''}
                          onChange={(e) => handleFieldChange('location', 'city', e.target.value)}
                          onBlur={() => handleSaveField('city', editedData.location?.city, 'location')}
                          className="w-full px-2 py-1 border border-gray-300 rounded"
                        >
                          <option value="">Select City</option>
                          {stateCities[editedData.location.state].map((city) => (
                            <option key={city} value={city}>
                              {city}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <input
                          type="text"
                          value={editedData.location?.city || ''}
                          onChange={(e) => handleFieldChange('location', 'city', e.target.value)}
                          onBlur={() => handleSaveField('city', editedData.location?.city, 'location')}
                          className="w-full px-2 py-1 border border-gray-300 rounded"
                          placeholder="Select state first"
                          disabled
                        />
                      )
                    ) : (
                      <input
                        type="text"
                        value={editedData.location?.city || ''}
                        onChange={(e) => handleFieldChange('location', 'city', e.target.value)}
                        onBlur={() => handleSaveField('city', editedData.location?.city, 'location')}
                        className="w-full px-2 py-1 border border-gray-300 rounded"
                        placeholder="Enter city"
                      />
                    )
                  ) : (
                    <p className="text-gray-900">{profile.location?.city || 'N/A'}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Pincode:</label>
                  {isEditing && user?.role === 'super_admin' ? (
                    <input
                      type="text"
                      value={editedData.location?.pincode || ''}
                      onChange={(e) => handleFieldChange('location', 'pincode', e.target.value)}
                      onBlur={() => handleSaveField('pincode', editedData.location?.pincode, 'location')}
                      className="w-full px-2 py-1 border border-gray-300 rounded"
                      placeholder="Enter pincode"
                    />
                  ) : (
                    <p className="text-gray-900">{profile.location?.pincode || 'N/A'}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Religion Section */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-semibold mb-4">Religion & Astrology</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Religion:</label>
                  {isEditing && user?.role === 'super_admin' ? (
                    <>
                      <select
                        value={editedData.religion?.religion || ''}
                        onChange={(e) => {
                          const religion = e.target.value;
                          handleFieldChange('religion', 'religion', religion);
                          handleFieldChange('religion', 'caste', '');
                          handleFieldChange('religion', 'subCaste', '');
                          if (religion === 'Other') {
                            handleFieldChange('religion', 'religionCustom', '');
                          }
                        }}
                        onBlur={() => handleSaveField('religion', editedData.religion?.religion, 'religion')}
                        className="w-full px-2 py-1 border border-gray-300 rounded"
                      >
                        <option value="">Select Religion</option>
                        {religions.map((religion) => (
                          <option key={religion} value={religion}>
                            {religion}
                          </option>
                        ))}
                      </select>
                      {editedData.religion?.religion === 'Other' && (
                        <input
                          type="text"
                          value={editedData.religion?.religionCustom || ''}
                          onChange={(e) => {
                            handleFieldChange('religion', 'religionCustom', e.target.value);
                            handleFieldChange('religion', 'religion', e.target.value);
                          }}
                          onBlur={() => handleSaveField('religion', editedData.religion?.religion, 'religion')}
                          className="w-full px-2 py-1 border border-gray-300 rounded mt-2"
                          placeholder="Enter religion name"
                        />
                      )}
                    </>
                  ) : (
                    <p className="text-gray-900">{profile.religion?.religion || 'N/A'}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Caste:</label>
                  {isEditing && user?.role === 'super_admin' ? (
                    <>
                      <select
                        value={editedData.religion?.caste || ''}
                        onChange={(e) => {
                          const caste = e.target.value;
                          handleFieldChange('religion', 'caste', caste);
                          handleFieldChange('religion', 'subCaste', '');
                          if (caste === 'Other') {
                            handleFieldChange('religion', 'casteCustom', '');
                          }
                        }}
                        onBlur={() => handleSaveField('caste', editedData.religion?.caste, 'religion')}
                        className="w-full px-2 py-1 border border-gray-300 rounded"
                      >
                        <option value="">Select Caste</option>
                        {casteCategories.map((caste) => (
                          <option key={caste} value={caste}>
                            {caste}
                          </option>
                        ))}
                      </select>
                      {editedData.religion?.caste === 'Other' && (
                        <input
                          type="text"
                          value={editedData.religion?.casteCustom || ''}
                          onChange={(e) => {
                            handleFieldChange('religion', 'casteCustom', e.target.value);
                            handleFieldChange('religion', 'caste', e.target.value);
                          }}
                          onBlur={() => handleSaveField('caste', editedData.religion?.caste, 'religion')}
                          className="w-full px-2 py-1 border border-gray-300 rounded mt-2"
                          placeholder="Enter caste name"
                        />
                      )}
                    </>
                  ) : (
                    <p className="text-gray-900">{profile.religion?.caste || 'N/A'}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Sub-Caste:</label>
                  {isEditing && user?.role === 'super_admin' ? (
                    <>
                      {editedData.religion?.caste && casteSubCastes[editedData.religion.caste] ? (
                        <select
                          value={editedData.religion?.subCaste || ''}
                          onChange={(e) => {
                            const subCaste = e.target.value;
                            handleFieldChange('religion', 'subCaste', subCaste);
                            if (subCaste === 'Other') {
                              handleFieldChange('religion', 'subCasteCustom', '');
                            }
                          }}
                          onBlur={() => handleSaveField('subCaste', editedData.religion?.subCaste, 'religion')}
                          className="w-full px-2 py-1 border border-gray-300 rounded"
                        >
                          <option value="">Select Sub-Caste (Optional)</option>
                          {casteSubCastes[editedData.religion.caste].map((subCaste) => (
                            <option key={subCaste} value={subCaste}>
                              {subCaste}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <input
                          type="text"
                          value={editedData.religion?.subCaste || ''}
                          onChange={(e) => handleFieldChange('religion', 'subCaste', e.target.value)}
                          onBlur={() => handleSaveField('subCaste', editedData.religion?.subCaste, 'religion')}
                          className="w-full px-2 py-1 border border-gray-300 rounded"
                          placeholder={editedData.religion?.caste ? "Enter sub-caste (optional)" : "Select caste first"}
                          disabled={!editedData.religion?.caste}
                        />
                      )}
                      {editedData.religion?.subCaste === 'Other' && (
                        <input
                          type="text"
                          value={editedData.religion?.subCasteCustom || ''}
                          onChange={(e) => {
                            handleFieldChange('religion', 'subCasteCustom', e.target.value);
                            handleFieldChange('religion', 'subCaste', e.target.value);
                          }}
                          onBlur={() => handleSaveField('subCaste', editedData.religion?.subCaste, 'religion')}
                          className="w-full px-2 py-1 border border-gray-300 rounded mt-2"
                          placeholder="Enter sub-caste name"
                        />
                      )}
                    </>
                  ) : (
                    <p className="text-gray-900">{profile.religion?.subCaste || 'N/A'}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Gothra:</label>
                  {isEditing && user?.role === 'super_admin' ? (
                    <input
                      type="text"
                      value={editedData.religion?.gothra || ''}
                      onChange={(e) => handleFieldChange('religion', 'gothra', e.target.value)}
                      onBlur={() => handleSaveField('gothra', editedData.religion?.gothra, 'religion')}
                      className="w-full px-2 py-1 border border-gray-300 rounded"
                    />
                  ) : (
                    <p className="text-gray-900">{profile.religion?.gothra || 'N/A'}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Star (Nakshatra):</label>
                  {isEditing && user?.role === 'super_admin' ? (
                    <input
                      type="text"
                      value={editedData.religion?.star || ''}
                      onChange={(e) => handleFieldChange('religion', 'star', e.target.value)}
                      onBlur={() => handleSaveField('star', editedData.religion?.star, 'religion')}
                      className="w-full px-2 py-1 border border-gray-300 rounded"
                    />
                  ) : (
                    <p className="text-gray-900">{profile.religion?.star || 'N/A'}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Raasi (Rashi):</label>
                  {isEditing && user?.role === 'super_admin' ? (
                    <input
                      type="text"
                      value={editedData.religion?.raasi || ''}
                      onChange={(e) => handleFieldChange('religion', 'raasi', e.target.value)}
                      onBlur={() => handleSaveField('raasi', editedData.religion?.raasi, 'religion')}
                      className="w-full px-2 py-1 border border-gray-300 rounded"
                    />
                  ) : (
                    <p className="text-gray-900">{profile.religion?.raasi || 'N/A'}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Lifestyle Section */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-semibold mb-4">Lifestyle</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Eating Habits:</label>
                  {isEditing && user?.role === 'super_admin' ? (
                    <select
                      value={editedData.personalInfo?.eatingHabits || ''}
                      onChange={(e) => handleFieldChange('personalInfo', 'eatingHabits', e.target.value)}
                      onBlur={() => handleSaveField('eatingHabits', editedData.personalInfo?.eatingHabits, 'personalInfo')}
                      className="w-full px-2 py-1 border border-gray-300 rounded"
                    >
                      <option value="">Select</option>
                      <option value="Vegetarian">Vegetarian</option>
                      <option value="Non-Vegetarian">Non-Vegetarian</option>
                      <option value="Vegan">Vegan</option>
                      <option value="Eggetarian">Eggetarian</option>
                    </select>
                  ) : (
                    <p className="text-gray-900">{profile.personalInfo?.eatingHabits || 'N/A'}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Drinking Habits:</label>
                  {isEditing && user?.role === 'super_admin' ? (
                    <select
                      value={editedData.personalInfo?.drinkingHabits || ''}
                      onChange={(e) => handleFieldChange('personalInfo', 'drinkingHabits', e.target.value)}
                      onBlur={() => handleSaveField('drinkingHabits', editedData.personalInfo?.drinkingHabits, 'personalInfo')}
                      className="w-full px-2 py-1 border border-gray-300 rounded"
                    >
                      <option value="">Select</option>
                      <option value="Never">Never</option>
                      <option value="Occasionally">Occasionally</option>
                      <option value="Regularly">Regularly</option>
                    </select>
                  ) : (
                    <p className="text-gray-900">{profile.personalInfo?.drinkingHabits || 'N/A'}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Smoking Habits:</label>
                  {isEditing && user?.role === 'super_admin' ? (
                    <select
                      value={editedData.personalInfo?.smokingHabits || ''}
                      onChange={(e) => handleFieldChange('personalInfo', 'smokingHabits', e.target.value)}
                      onBlur={() => handleSaveField('smokingHabits', editedData.personalInfo?.smokingHabits, 'personalInfo')}
                      className="w-full px-2 py-1 border border-gray-300 rounded"
                    >
                      <option value="">Select</option>
                      <option value="Never">Never</option>
                      <option value="Occasionally">Occasionally</option>
                      <option value="Regularly">Regularly</option>
                    </select>
                  ) : (
                    <p className="text-gray-900">{profile.personalInfo?.smokingHabits || 'N/A'}</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <SubscriptionRequiredModal
        isOpen={showSubscriptionModal}
      />
      <ProfileIncompleteModal
        isOpen={showProfileIncompleteModal}
      />

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h2 className="text-xl font-bold mb-4">Delete Profile</h2>
            <p className="text-gray-600 mb-6">
              Are you sure you want to deactivate your profile? This action cannot be undone. Your profile will be hidden from search results.
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
              >
                Delete Profile
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Photo Gallery Modal */}
      <PhotoGallery
        photos={profile.photos || []}
        isOpen={showPhotoGallery}
        onClose={() => setShowPhotoGallery(false)}
        initialIndex={selectedPhotoIndex}
      />

      {/* Reject Profile Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg max-w-md w-full mx-4 p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Reject Profile</h2>
            <p className="text-gray-600 mb-4">Please provide a reason for rejecting this profile:</p>
            <textarea
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-md mb-4"
              rows="4"
              placeholder="Enter rejection reason..."
            />
            <div className="flex gap-2">
              <button
                onClick={handleRejectProfile}
                className="flex-1 px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700"
              >
                Reject Profile
              </button>
              <button
                onClick={() => {
                  setShowRejectModal(false);
                  setRejectionReason('');
                }}
                className="flex-1 px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Block User Modal */}
      {showBlockModal && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg max-w-md w-full mx-4 p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Block User</h2>
            <p className="text-gray-600 mb-4">Please provide a reason for blocking this user:</p>
            <textarea
              value={blockReason}
              onChange={(e) => setBlockReason(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-md mb-4"
              rows="4"
              placeholder="Enter block reason..."
            />
            <div className="flex gap-2">
              <button
                onClick={handleBlockUser}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
              >
                Block User
              </button>
              <button
                onClick={() => {
                  setShowBlockModal(false);
                  setBlockReason('');
                }}
                className="flex-1 px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProfileDetail;

