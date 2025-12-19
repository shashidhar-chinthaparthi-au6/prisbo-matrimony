import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import {
  getAllUsers,
  getAllProfiles,
  getStats,
  blockUser,
  updateProfileStatus,
  getAllSubscriptions,
  getPendingSubscriptions,
  approveSubscription,
  rejectSubscription,
  cancelSubscription,
  reactivateSubscription,
  getSubscriptionStats,
  getPendingProfiles,
  getProfileById,
  approveProfile,
  rejectProfile,
  updateProfileField,
  deleteProfilePhoto,
  getVerificationStats,
} from '../services/adminService';
import toast from 'react-hot-toast';

const Admin = () => {
  const [activeTab, setActiveTab] = useState('stats');
  const [page, setPage] = useState(1);
  const [selectedProfile, setSelectedProfile] = useState(null);

  const queryClient = useQueryClient();

  const { data: statsData, isLoading: statsLoading } = useQuery(
    ['adminStats'],
    getStats,
    { enabled: activeTab === 'stats' }
  );

  const { data: usersData, isLoading: usersLoading } = useQuery(
    ['adminUsers', page],
    () => getAllUsers({ page, limit: 20 }),
    { enabled: activeTab === 'users' }
  );

  const { data: profilesData, isLoading: profilesLoading } = useQuery(
    ['adminProfiles', page],
    () => getAllProfiles({ page, limit: 20 }),
    { enabled: activeTab === 'profiles' }
  );

  const { data: subscriptionsData, isLoading: subscriptionsLoading } = useQuery(
    ['adminSubscriptions', page],
    () => getAllSubscriptions({ page, limit: 20 }),
    { enabled: activeTab === 'subscriptions' }
  );

  const { data: pendingSubscriptionsData } = useQuery(
    'pendingSubscriptions',
    getPendingSubscriptions,
    { enabled: activeTab === 'subscriptions' }
  );

  const { data: subscriptionStatsData } = useQuery(
    'subscriptionStats',
    getSubscriptionStats,
    { enabled: activeTab === 'subscriptions' }
  );

  const { data: pendingProfilesData, isLoading: pendingProfilesLoading } = useQuery(
    ['pendingProfiles', page],
    () => getPendingProfiles({ page, limit: 20 }),
    { enabled: activeTab === 'verification' }
  );

  const { data: verificationStatsData } = useQuery(
    'verificationStats',
    getVerificationStats,
    { enabled: activeTab === 'verification' }
  );

  const { data: selectedProfileData } = useQuery(
    ['profile', selectedProfile],
    () => getProfileById(selectedProfile),
    { enabled: !!selectedProfile }
  );

  const blockUserMutation = useMutation(
    ({ id, isActive }) => blockUser(id, { isActive: !isActive }),
    {
      onSuccess: () => {
        toast.success('User status updated successfully');
        queryClient.invalidateQueries(['adminUsers']);
      },
      onError: (error) => {
        toast.error(error.response?.data?.message || 'Failed to update user');
      },
    }
  );

  const updateProfileMutation = useMutation(
    ({ id, isActive }) => updateProfileStatus(id, { isActive: !isActive }),
    {
      onSuccess: () => {
        toast.success('Profile status updated successfully');
        queryClient.invalidateQueries(['adminProfiles']);
      },
      onError: (error) => {
        toast.error(error.response?.data?.message || 'Failed to update profile');
      },
    }
  );

  const handleBlockUser = (userId, isActive) => {
    blockUserMutation.mutate({ id: userId, isActive });
  };

  const handleUpdateProfile = (profileId, isActive) => {
    updateProfileMutation.mutate({ id: profileId, isActive });
  };

  const approveSubscriptionMutation = useMutation(
    ({ id, data }) => approveSubscription(id, data),
    {
      onSuccess: () => {
        toast.success('Subscription approved successfully');
        queryClient.invalidateQueries(['adminSubscriptions']);
        queryClient.invalidateQueries('pendingSubscriptions');
      },
      onError: (error) => {
        toast.error(error.response?.data?.message || 'Failed to approve subscription');
      },
    }
  );

  const rejectSubscriptionMutation = useMutation(
    ({ id, data }) => rejectSubscription(id, data),
    {
      onSuccess: () => {
        toast.success('Subscription rejected');
        queryClient.invalidateQueries(['adminSubscriptions']);
        queryClient.invalidateQueries('pendingSubscriptions');
      },
      onError: (error) => {
        toast.error(error.response?.data?.message || 'Failed to reject subscription');
      },
    }
  );

  const cancelSubscriptionMutation = useMutation(cancelSubscription, {
    onSuccess: () => {
      toast.success('Subscription cancelled successfully');
      queryClient.invalidateQueries(['adminSubscriptions']);
      queryClient.invalidateQueries('pendingSubscriptions');
      queryClient.invalidateQueries('subscriptionStats');
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to cancel subscription');
    },
  });

  const reactivateSubscriptionMutation = useMutation(reactivateSubscription, {
    onSuccess: () => {
      toast.success('Subscription reactivated successfully');
      queryClient.invalidateQueries(['adminSubscriptions']);
      queryClient.invalidateQueries('pendingSubscriptions');
      queryClient.invalidateQueries('subscriptionStats');
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to reactivate subscription');
    },
  });

  const handleApproveSubscription = (id, cashReceivedDate, cashReceivedBy) => {
    approveSubscriptionMutation.mutate({
      id,
      data: { cashReceivedDate, cashReceivedBy },
    });
  };

  const handleRejectSubscription = (id) => {
    const reason = prompt('Enter rejection reason:');
    if (reason) {
      rejectSubscriptionMutation.mutate({ id, data: { rejectionReason: reason } });
    }
  };

  // Profile Verification Mutations
  const approveProfileMutation = useMutation(approveProfile, {
    onSuccess: () => {
      toast.success('Profile approved successfully');
      queryClient.invalidateQueries(['pendingProfiles']);
      queryClient.invalidateQueries('verificationStats');
      setSelectedProfile(null);
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to approve profile');
    },
  });

  const rejectProfileMutation = useMutation(
    ({ id, rejectionReason }) => rejectProfile(id, rejectionReason),
    {
      onSuccess: () => {
        toast.success('Profile rejected');
        queryClient.invalidateQueries(['pendingProfiles']);
        queryClient.invalidateQueries('verificationStats');
        setSelectedProfile(null);
      },
      onError: (error) => {
        toast.error(error.response?.data?.message || 'Failed to reject profile');
      },
    }
  );

  const updateProfileFieldMutation = useMutation(
    ({ id, field, value, section }) => updateProfileField(id, field, value, section),
    {
      onSuccess: () => {
        toast.success('Profile field updated successfully');
        queryClient.invalidateQueries(['profile', selectedProfile]);
        queryClient.invalidateQueries(['pendingProfiles']);
      },
      onError: (error) => {
        toast.error(error.response?.data?.message || 'Failed to update profile field');
      },
    }
  );

  const deletePhotoMutation = useMutation(
    ({ profileId, photoId }) => deleteProfilePhoto(profileId, photoId),
    {
      onSuccess: () => {
        toast.success('Photo deleted successfully');
        queryClient.invalidateQueries(['profile', selectedProfile]);
        queryClient.invalidateQueries(['pendingProfiles']);
      },
      onError: (error) => {
        toast.error(error.response?.data?.message || 'Failed to delete photo');
      },
    }
  );

  const handleApproveProfile = (id) => {
    if (window.confirm('Are you sure you want to approve this profile?')) {
      approveProfileMutation.mutate(id);
    }
  };

  const handleRejectProfile = (id) => {
    const reason = prompt('Enter rejection reason:');
    if (reason) {
      rejectProfileMutation.mutate({ id, rejectionReason: reason });
    }
  };

  const handleDeletePhoto = (profileId, photoId) => {
    if (window.confirm('Are you sure you want to delete this photo?')) {
      deletePhotoMutation.mutate({ profileId, photoId });
    }
  };

  const handleUpdateField = (field, value, section) => {
    updateProfileFieldMutation.mutate({
      id: selectedProfile,
      field,
      value,
      section,
    });
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">Admin Dashboard</h1>

        {/* Tabs */}
        <div className="border-b border-gray-200 mb-6">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('stats')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'stats'
                  ? 'border-red-500 text-red-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Statistics
            </button>
            <button
              onClick={() => setActiveTab('users')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'users'
                  ? 'border-red-500 text-red-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Users
            </button>
            <button
              onClick={() => setActiveTab('profiles')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'profiles'
                  ? 'border-red-500 text-red-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Profiles
            </button>
            <button
              onClick={() => setActiveTab('verification')}
              className={`py-4 px-1 border-b-2 font-medium text-sm relative ${
                activeTab === 'verification'
                  ? 'border-red-500 text-red-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Profile Verification
              {verificationStatsData?.stats?.pending > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                  {verificationStatsData.stats.pending}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab('subscriptions')}
              className={`py-4 px-1 border-b-2 font-medium text-sm relative ${
                activeTab === 'subscriptions'
                  ? 'border-red-500 text-red-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Subscriptions
              {pendingSubscriptionsData?.count > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                  {pendingSubscriptionsData.count}
                </span>
              )}
            </button>
          </nav>
        </div>

        {/* Content */}
        {activeTab === 'stats' && (
          <div>
            {statsLoading ? (
              <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600"></div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-white rounded-lg shadow p-6">
                  <div className="text-3xl font-bold text-red-600 mb-2">
                    {statsData?.stats?.totalUsers || 0}
                  </div>
                  <div className="text-gray-600">Total Users</div>
                </div>
                <div className="bg-white rounded-lg shadow p-6">
                  <div className="text-3xl font-bold text-red-600 mb-2">
                    {statsData?.stats?.totalProfiles || 0}
                  </div>
                  <div className="text-gray-600">Total Profiles</div>
                </div>
                <div className="bg-white rounded-lg shadow p-6">
                  <div className="text-3xl font-bold text-red-600 mb-2">
                    {statsData?.stats?.activeProfiles || 0}
                  </div>
                  <div className="text-gray-600">Active Profiles</div>
                </div>
                <div className="bg-white rounded-lg shadow p-6">
                  <div className="text-3xl font-bold text-red-600 mb-2">
                    {statsData?.stats?.brideProfiles || 0}
                  </div>
                  <div className="text-gray-600">Bride Profiles</div>
                </div>
                <div className="bg-white rounded-lg shadow p-6">
                  <div className="text-3xl font-bold text-red-600 mb-2">
                    {statsData?.stats?.groomProfiles || 0}
                  </div>
                  <div className="text-gray-600">Groom Profiles</div>
                </div>
                <div className="bg-white rounded-lg shadow p-6">
                  <div className="text-3xl font-bold text-red-600 mb-2">
                    {statsData?.stats?.totalInterests || 0}
                  </div>
                  <div className="text-gray-600">Total Interests</div>
                </div>
                <div className="bg-white rounded-lg shadow p-6">
                  <div className="text-3xl font-bold text-red-600 mb-2">
                    {statsData?.stats?.acceptedInterests || 0}
                  </div>
                  <div className="text-gray-600">Accepted Interests</div>
                </div>
                <div className="bg-white rounded-lg shadow p-6">
                  <div className="text-3xl font-bold text-red-600 mb-2">
                    {statsData?.stats?.premiumProfiles || 0}
                  </div>
                  <div className="text-gray-600">Premium Profiles</div>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'users' && (
          <div>
            {usersLoading ? (
              <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600"></div>
              </div>
            ) : (
              <div className="bg-white rounded-lg shadow overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Email
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Phone
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Role
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {usersData?.users?.map((user) => (
                      <tr key={user._id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {user.email}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {user.phone}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {user.role}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                              user.isActive
                                ? 'bg-green-100 text-green-800'
                                : 'bg-red-100 text-red-800'
                            }`}
                          >
                            {user.isActive ? 'Active' : 'Blocked'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <button
                            onClick={() => handleBlockUser(user._id, user.isActive)}
                            className={`${
                              user.isActive
                                ? 'text-red-600 hover:text-red-900'
                                : 'text-green-600 hover:text-green-900'
                            }`}
                          >
                            {user.isActive ? 'Block' : 'Unblock'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {activeTab === 'profiles' && (
          <div>
            {profilesLoading ? (
              <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600"></div>
              </div>
            ) : (
              <div className="bg-white rounded-lg shadow overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Name
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Type
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Age
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {profilesData?.profiles?.map((profile) => (
                      <tr key={profile._id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {profile.personalInfo?.firstName} {profile.personalInfo?.lastName}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {profile.type}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {profile.personalInfo?.age}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                              profile.isActive
                                ? 'bg-green-100 text-green-800'
                                : 'bg-red-100 text-red-800'
                            }`}
                          >
                            {profile.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <button
                            onClick={() => handleUpdateProfile(profile._id, profile.isActive)}
                            className={`${
                              profile.isActive
                                ? 'text-red-600 hover:text-red-900'
                                : 'text-green-600 hover:text-green-900'
                            }`}
                          >
                            {profile.isActive ? 'Deactivate' : 'Activate'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {activeTab === 'verification' && (
          <div>
            {/* Verification Stats */}
            {verificationStatsData && (
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
                <div className="bg-white rounded-lg shadow p-6">
                  <div className="text-3xl font-bold text-yellow-600 mb-2">
                    {verificationStatsData.stats?.pending || 0}
                  </div>
                  <div className="text-gray-600">Pending</div>
                </div>
                <div className="bg-white rounded-lg shadow p-6">
                  <div className="text-3xl font-bold text-green-600 mb-2">
                    {verificationStatsData.stats?.approved || 0}
                  </div>
                  <div className="text-gray-600">Approved</div>
                </div>
                <div className="bg-white rounded-lg shadow p-6">
                  <div className="text-3xl font-bold text-red-600 mb-2">
                    {verificationStatsData.stats?.rejected || 0}
                  </div>
                  <div className="text-gray-600">Rejected</div>
                </div>
                <div className="bg-white rounded-lg shadow p-6">
                  <div className="text-3xl font-bold text-blue-600 mb-2">
                    {verificationStatsData.stats?.total || 0}
                  </div>
                  <div className="text-gray-600">Total</div>
                </div>
              </div>
            )}

            {/* Pending Profiles List */}
            {pendingProfilesLoading ? (
              <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600"></div>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Pending Profiles List */}
                <div className="lg:col-span-1">
                  <div className="bg-white rounded-lg shadow">
                    <div className="p-4 border-b border-gray-200">
                      <h3 className="font-semibold text-gray-900">
                        Pending Profiles ({pendingProfilesData?.pagination?.total || 0})
                      </h3>
                    </div>
                    <div className="divide-y divide-gray-200 max-h-[600px] overflow-y-auto">
                      {pendingProfilesData?.profiles?.length > 0 ? (
                        pendingProfilesData.profiles.map((profile) => (
                          <div
                            key={profile._id}
                            onClick={() => setSelectedProfile(profile._id)}
                            className={`p-4 cursor-pointer hover:bg-gray-50 ${
                              selectedProfile === profile._id ? 'bg-red-50 border-l-4 border-red-500' : ''
                            }`}
                          >
                            <div className="font-medium text-gray-900">
                              {profile.personalInfo?.firstName} {profile.personalInfo?.lastName}
                            </div>
                            <div className="text-sm text-gray-500 mt-1">
                              {profile.type} • Age: {profile.personalInfo?.age}
                            </div>
                            {profile.userId && (
                              <>
                                <div className="text-xs text-gray-500 mt-1">
                                  📧 {profile.userId.email} | 📱 {profile.userId.phone}
                                </div>
                                <div className="text-xs mt-1">
                                  <span className={`px-2 py-0.5 rounded-full ${
                                    profile.userId.isActive !== false
                                      ? 'bg-green-100 text-green-800'
                                      : 'bg-red-100 text-red-800'
                                  }`}>
                                    {profile.userId.isActive !== false ? 'Active' : 'Blocked'}
                                  </span>
                                </div>
                              </>
                            )}
                            <div className="text-xs text-gray-400 mt-1">
                              {new Date(profile.createdAt).toLocaleDateString()}
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="p-4 text-center text-gray-500">No pending profiles</div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Profile Details */}
                <div className="lg:col-span-2">
                  {selectedProfile ? (
                    selectedProfileData?.profile ? (
                      <div className="bg-white rounded-lg shadow p-6">
                        <div className="flex justify-between items-start mb-6">
                          <div>
                            <h2 className="text-2xl font-bold text-gray-900">
                              {selectedProfileData.profile.personalInfo?.firstName}{' '}
                              {selectedProfileData.profile.personalInfo?.lastName}
                            </h2>
                            <p className="text-gray-600">
                              {selectedProfileData.profile.type} • Age: {selectedProfileData.profile.personalInfo?.age}
                            </p>
                            {/* Contact Information */}
                            <div className="mt-2 space-y-1">
                              <p className="text-sm text-gray-600">
                                <span className="font-medium">Email:</span> {selectedProfileData.profile.userId?.email || 'N/A'}
                              </p>
                              <p className="text-sm text-gray-600">
                                <span className="font-medium">Phone:</span> {selectedProfileData.profile.userId?.phone || 'N/A'}
                              </p>
                              {selectedProfileData.profile.userId && (
                                <p className="text-sm">
                                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                    selectedProfileData.profile.userId.isActive !== false
                                      ? 'bg-green-100 text-green-800'
                                      : 'bg-red-100 text-red-800'
                                  }`}>
                                    {selectedProfileData.profile.userId.isActive !== false ? 'Account Active' : 'Account Blocked'}
                                  </span>
                                </p>
                              )}
                            </div>
                          </div>
                          <div className="flex gap-2 flex-col">
                            <div className="flex gap-2">
                              <button
                                onClick={() => handleApproveProfile(selectedProfile)}
                                className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
                              >
                                Approve
                              </button>
                              <button
                                onClick={() => handleRejectProfile(selectedProfile)}
                                className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
                              >
                                Reject
                              </button>
                            </div>
                            {selectedProfileData.profile.userId && (
                              <button
                                onClick={() => {
                                  const userId = selectedProfileData.profile.userId._id;
                                  const isActive = selectedProfileData.profile.userId.isActive !== false;
                                  handleBlockUser(userId, isActive);
                                  // Refetch profile data after blocking
                                  queryClient.invalidateQueries(['profile', selectedProfile]);
                                }}
                                className={`px-4 py-2 rounded text-sm font-medium ${
                                  selectedProfileData.profile.userId.isActive !== false
                                    ? 'bg-red-600 text-white hover:bg-red-700'
                                    : 'bg-green-600 text-white hover:bg-green-700'
                                }`}
                              >
                                {selectedProfileData.profile.userId.isActive !== false ? 'Block Login' : 'Unblock Login'}
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Photos */}
                        {selectedProfileData.profile.photos?.length > 0 && (
                          <div className="mb-6">
                            <h3 className="text-lg font-semibold mb-3">Photos</h3>
                            <div className="grid grid-cols-3 gap-4">
                              {selectedProfileData.profile.photos.map((photo) => (
                                <div key={photo._id} className="relative group">
                                  <img
                                    src={photo.url.startsWith('http') ? photo.url : `http://localhost:5000${photo.url}`}
                                    alt="Profile"
                                    className="w-full h-48 object-cover rounded"
                                  />
                                  {photo.isPrimary && (
                                    <span className="absolute top-2 left-2 bg-blue-500 text-white text-xs px-2 py-1 rounded">
                                      Primary
                                    </span>
                                  )}
                                  <button
                                    onClick={() => handleDeletePhoto(selectedProfile, photo._id)}
                                    className="absolute top-2 right-2 bg-red-600 text-white px-2 py-1 rounded text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                                  >
                                    Delete
                                  </button>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Personal Information */}
                        <div className="mb-6">
                          <h3 className="text-lg font-semibold mb-3">Personal Information</h3>
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label className="block text-sm font-medium text-gray-700">First Name</label>
                              <input
                                type="text"
                                value={selectedProfileData.profile.personalInfo?.firstName || ''}
                                onChange={(e) => handleUpdateField('firstName', e.target.value, 'personalInfo')}
                                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700">Last Name</label>
                              <input
                                type="text"
                                value={selectedProfileData.profile.personalInfo?.lastName || ''}
                                onChange={(e) => handleUpdateField('lastName', e.target.value, 'personalInfo')}
                                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700">Date of Birth</label>
                              <input
                                type="date"
                                value={
                                  selectedProfileData.profile.personalInfo?.dateOfBirth
                                    ? new Date(selectedProfileData.profile.personalInfo.dateOfBirth).toISOString().split('T')[0]
                                    : ''
                                }
                                onChange={(e) => handleUpdateField('dateOfBirth', e.target.value, 'personalInfo')}
                                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700">Age</label>
                              <input
                                type="text"
                                value={selectedProfileData.profile.personalInfo?.age || ''}
                                readOnly
                                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 bg-gray-100"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700">Height</label>
                              <input
                                type="text"
                                value={selectedProfileData.profile.personalInfo?.height || ''}
                                onChange={(e) => handleUpdateField('height', e.target.value, 'personalInfo')}
                                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700">Weight</label>
                              <input
                                type="text"
                                value={selectedProfileData.profile.personalInfo?.weight || ''}
                                onChange={(e) => handleUpdateField('weight', e.target.value, 'personalInfo')}
                                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700">Blood Group</label>
                              <input
                                type="text"
                                value={selectedProfileData.profile.personalInfo?.bloodGroup || ''}
                                onChange={(e) => handleUpdateField('bloodGroup', e.target.value, 'personalInfo')}
                                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700">Complexion</label>
                              <input
                                type="text"
                                value={selectedProfileData.profile.personalInfo?.complexion || ''}
                                onChange={(e) => handleUpdateField('complexion', e.target.value, 'personalInfo')}
                                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700">Physical Status</label>
                              <input
                                type="text"
                                value={selectedProfileData.profile.personalInfo?.physicalStatus || ''}
                                onChange={(e) => handleUpdateField('physicalStatus', e.target.value, 'personalInfo')}
                                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700">Marital Status</label>
                              <input
                                type="text"
                                value={selectedProfileData.profile.personalInfo?.maritalStatus || ''}
                                onChange={(e) => handleUpdateField('maritalStatus', e.target.value, 'personalInfo')}
                                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700">Mother Tongue</label>
                              <input
                                type="text"
                                value={selectedProfileData.profile.personalInfo?.motherTongue || ''}
                                onChange={(e) => handleUpdateField('motherTongue', e.target.value, 'personalInfo')}
                                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700">Eating Habits</label>
                              <input
                                type="text"
                                value={selectedProfileData.profile.personalInfo?.eatingHabits || ''}
                                onChange={(e) => handleUpdateField('eatingHabits', e.target.value, 'personalInfo')}
                                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700">Drinking Habits</label>
                              <input
                                type="text"
                                value={selectedProfileData.profile.personalInfo?.drinkingHabits || ''}
                                onChange={(e) => handleUpdateField('drinkingHabits', e.target.value, 'personalInfo')}
                                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700">Smoking Habits</label>
                              <input
                                type="text"
                                value={selectedProfileData.profile.personalInfo?.smokingHabits || ''}
                                onChange={(e) => handleUpdateField('smokingHabits', e.target.value, 'personalInfo')}
                                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                              />
                            </div>
                            <div className="col-span-2">
                              <label className="block text-sm font-medium text-gray-700">About</label>
                              <textarea
                                value={selectedProfileData.profile.personalInfo?.about || ''}
                                onChange={(e) => handleUpdateField('about', e.target.value, 'personalInfo')}
                                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                                rows="3"
                              />
                            </div>
                          </div>
                        </div>

                        {/* Family Information */}
                        <div className="mb-6">
                          <h3 className="text-lg font-semibold mb-3">Family Information</h3>
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label className="block text-sm font-medium text-gray-700">Father Name</label>
                              <input
                                type="text"
                                value={selectedProfileData.profile.familyInfo?.fatherName || ''}
                                onChange={(e) => handleUpdateField('fatherName', e.target.value, 'familyInfo')}
                                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700">Father Occupation</label>
                              <input
                                type="text"
                                value={selectedProfileData.profile.familyInfo?.fatherOccupation || ''}
                                onChange={(e) => handleUpdateField('fatherOccupation', e.target.value, 'familyInfo')}
                                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700">Mother Name</label>
                              <input
                                type="text"
                                value={selectedProfileData.profile.familyInfo?.motherName || ''}
                                onChange={(e) => handleUpdateField('motherName', e.target.value, 'familyInfo')}
                                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700">Mother Occupation</label>
                              <input
                                type="text"
                                value={selectedProfileData.profile.familyInfo?.motherOccupation || ''}
                                onChange={(e) => handleUpdateField('motherOccupation', e.target.value, 'familyInfo')}
                                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700">Siblings</label>
                              <input
                                type="text"
                                value={selectedProfileData.profile.familyInfo?.siblings || ''}
                                onChange={(e) => handleUpdateField('siblings', e.target.value, 'familyInfo')}
                                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700">Family Type</label>
                              <input
                                type="text"
                                value={selectedProfileData.profile.familyInfo?.familyType || ''}
                                onChange={(e) => handleUpdateField('familyType', e.target.value, 'familyInfo')}
                                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700">Family Status</label>
                              <input
                                type="text"
                                value={selectedProfileData.profile.familyInfo?.familyStatus || ''}
                                onChange={(e) => handleUpdateField('familyStatus', e.target.value, 'familyInfo')}
                                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                              />
                            </div>
                            <div className="col-span-2">
                              <label className="block text-sm font-medium text-gray-700">Family Values</label>
                              <textarea
                                value={selectedProfileData.profile.familyInfo?.familyValues || ''}
                                onChange={(e) => handleUpdateField('familyValues', e.target.value, 'familyInfo')}
                                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                                rows="2"
                              />
                            </div>
                          </div>
                        </div>

                        {/* Education */}
                        <div className="mb-6">
                          <h3 className="text-lg font-semibold mb-3">Education</h3>
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label className="block text-sm font-medium text-gray-700">Highest Education</label>
                              <input
                                type="text"
                                value={selectedProfileData.profile.education?.highestEducation || ''}
                                onChange={(e) => handleUpdateField('highestEducation', e.target.value, 'education')}
                                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700">College</label>
                              <input
                                type="text"
                                value={selectedProfileData.profile.education?.college || ''}
                                onChange={(e) => handleUpdateField('college', e.target.value, 'education')}
                                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700">Degree</label>
                              <input
                                type="text"
                                value={selectedProfileData.profile.education?.degree || ''}
                                onChange={(e) => handleUpdateField('degree', e.target.value, 'education')}
                                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700">Specialization</label>
                              <input
                                type="text"
                                value={selectedProfileData.profile.education?.specialization || ''}
                                onChange={(e) => handleUpdateField('specialization', e.target.value, 'education')}
                                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                              />
                            </div>
                          </div>
                        </div>

                        {/* Career */}
                        <div className="mb-6">
                          <h3 className="text-lg font-semibold mb-3">Career</h3>
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label className="block text-sm font-medium text-gray-700">Occupation</label>
                              <input
                                type="text"
                                value={selectedProfileData.profile.career?.occupation || ''}
                                onChange={(e) => handleUpdateField('occupation', e.target.value, 'career')}
                                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700">Company</label>
                              <input
                                type="text"
                                value={selectedProfileData.profile.career?.company || ''}
                                onChange={(e) => handleUpdateField('company', e.target.value, 'career')}
                                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700">Annual Income</label>
                              <input
                                type="text"
                                value={selectedProfileData.profile.career?.annualIncome || ''}
                                onChange={(e) => handleUpdateField('annualIncome', e.target.value, 'career')}
                                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700">Working Location</label>
                              <input
                                type="text"
                                value={selectedProfileData.profile.career?.workingLocation || ''}
                                onChange={(e) => handleUpdateField('workingLocation', e.target.value, 'career')}
                                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                              />
                            </div>
                          </div>
                        </div>

                        {/* Location */}
                        <div className="mb-6">
                          <h3 className="text-lg font-semibold mb-3">Location</h3>
                          <div className="grid grid-cols-3 gap-4">
                            <div>
                              <label className="block text-sm font-medium text-gray-700">City</label>
                              <input
                                type="text"
                                value={selectedProfileData.profile.location?.city || ''}
                                onChange={(e) => handleUpdateField('city', e.target.value, 'location')}
                                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700">State</label>
                              <input
                                type="text"
                                value={selectedProfileData.profile.location?.state || ''}
                                onChange={(e) => handleUpdateField('state', e.target.value, 'location')}
                                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700">Country</label>
                              <input
                                type="text"
                                value={selectedProfileData.profile.location?.country || ''}
                                onChange={(e) => handleUpdateField('country', e.target.value, 'location')}
                                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700">Pincode</label>
                              <input
                                type="text"
                                value={selectedProfileData.profile.location?.pincode || ''}
                                onChange={(e) => handleUpdateField('pincode', e.target.value, 'location')}
                                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                              />
                            </div>
                          </div>
                        </div>

                        {/* Religion & Astrology */}
                        <div className="mb-6">
                          <h3 className="text-lg font-semibold mb-3">Religion & Astrology</h3>
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label className="block text-sm font-medium text-gray-700">Religion</label>
                              <input
                                type="text"
                                value={selectedProfileData.profile.religion?.religion || ''}
                                onChange={(e) => handleUpdateField('religion', e.target.value, 'religion')}
                                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700">Caste</label>
                              <input
                                type="text"
                                value={selectedProfileData.profile.religion?.caste || ''}
                                onChange={(e) => handleUpdateField('caste', e.target.value, 'religion')}
                                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700">Sub-Caste</label>
                              <input
                                type="text"
                                value={selectedProfileData.profile.religion?.subCaste || ''}
                                onChange={(e) => handleUpdateField('subCaste', e.target.value, 'religion')}
                                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700">Gothra</label>
                              <input
                                type="text"
                                value={selectedProfileData.profile.religion?.gothra || ''}
                                onChange={(e) => handleUpdateField('gothra', e.target.value, 'religion')}
                                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700">Star</label>
                              <input
                                type="text"
                                value={selectedProfileData.profile.religion?.star || ''}
                                onChange={(e) => handleUpdateField('star', e.target.value, 'religion')}
                                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700">Raasi</label>
                              <input
                                type="text"
                                value={selectedProfileData.profile.religion?.raasi || ''}
                                onChange={(e) => handleUpdateField('raasi', e.target.value, 'religion')}
                                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                              />
                            </div>
                          </div>
                        </div>

                        {/* Verification Status */}
                        <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                          <h3 className="text-lg font-semibold mb-3">Verification Status</h3>
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label className="block text-sm font-medium text-gray-700">Status</label>
                              <div className="mt-1">
                                <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                                  selectedProfileData.profile.verificationStatus === 'approved' 
                                    ? 'bg-green-100 text-green-800' 
                                    : selectedProfileData.profile.verificationStatus === 'rejected'
                                    ? 'bg-red-100 text-red-800'
                                    : 'bg-yellow-100 text-yellow-800'
                                }`}>
                                  {selectedProfileData.profile.verificationStatus?.toUpperCase() || 'PENDING'}
                                </span>
                              </div>
                            </div>
                            {selectedProfileData.profile.verifiedAt && (
                              <div>
                                <label className="block text-sm font-medium text-gray-700">Verified At</label>
                                <div className="mt-1 text-sm text-gray-600">
                                  {new Date(selectedProfileData.profile.verifiedAt).toLocaleString()}
                                </div>
                              </div>
                            )}
                            {selectedProfileData.profile.rejectionReason && (
                              <div className="col-span-2">
                                <label className="block text-sm font-medium text-gray-700">Rejection Reason</label>
                                <div className="mt-1 text-sm text-red-600">
                                  {selectedProfileData.profile.rejectionReason}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="bg-white rounded-lg shadow p-6 text-center text-gray-500">
                        Loading profile details...
                      </div>
                    )
                  ) : (
                    <div className="bg-white rounded-lg shadow p-6 text-center text-gray-500">
                      Select a profile to review
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'subscriptions' && (
          <div>
            {/* Subscription Stats */}
            {subscriptionStatsData && (
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
                <div className="bg-white rounded-lg shadow p-6">
                  <div className="text-3xl font-bold text-red-600 mb-2">
                    {subscriptionStatsData.stats?.activeSubscriptions || 0}
                  </div>
                  <div className="text-gray-600">Active</div>
                </div>
                <div className="bg-white rounded-lg shadow p-6">
                  <div className="text-3xl font-bold text-yellow-600 mb-2">
                    {subscriptionStatsData.stats?.pendingSubscriptions || 0}
                  </div>
                  <div className="text-gray-600">Pending</div>
                </div>
                <div className="bg-white rounded-lg shadow p-6">
                  <div className="text-3xl font-bold text-green-600 mb-2">
                    ₹{subscriptionStatsData.stats?.totalRevenue?.toLocaleString('en-IN') || 0}
                  </div>
                  <div className="text-gray-600">Total Revenue</div>
                </div>
                <div className="bg-white rounded-lg shadow p-6">
                  <div className="text-3xl font-bold text-blue-600 mb-2">
                    {subscriptionStatsData.stats?.expiringSubscriptions || 0}
                  </div>
                  <div className="text-gray-600">Expiring (7 days)</div>
                </div>
              </div>
            )}

            {/* Pending Subscriptions */}
            {pendingSubscriptionsData?.subscriptions?.length > 0 && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
                <h3 className="font-semibold text-yellow-800 mb-2">
                  Pending Approvals ({pendingSubscriptionsData.count})
                </h3>
                <div className="space-y-3">
                  {pendingSubscriptionsData.subscriptions.map((sub) => (
                    <div
                      key={sub._id}
                      className="bg-white rounded p-4 flex justify-between items-center"
                    >
                      <div>
                        <div className="font-medium">
                          {sub.userId?.email} - {sub.planName}
                        </div>
                        <div className="text-sm text-gray-600">
                          Payment: {sub.paymentMethod} | Amount: ₹{sub.amount}
                        </div>
                        {sub.upiScreenshot && (
                          <a
                            href={sub.upiScreenshot}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 text-sm hover:underline"
                          >
                            View Payment Screenshot
                          </a>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() =>
                            handleApproveSubscription(
                              sub._id,
                              sub.paymentMethod === 'cash' || sub.paymentMethod === 'mixed'
                                ? new Date().toISOString()
                                : undefined,
                              sub.paymentMethod === 'cash' || sub.paymentMethod === 'mixed'
                                ? 'Admin'
                                : undefined
                            )
                          }
                          className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => handleRejectSubscription(sub._id)}
                          className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
                        >
                          Reject
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* All Subscriptions */}
            {subscriptionsLoading ? (
              <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600"></div>
              </div>
            ) : (
              <div className="bg-white rounded-lg shadow overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        User
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Plan
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Payment Method
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Amount
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Expires
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {subscriptionsData?.subscriptions?.map((sub) => (
                      <tr key={sub._id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {sub.userId?.email}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {sub.planName}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {sub.paymentMethod}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          ₹{sub.amount}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                              sub.status === 'approved'
                                ? 'bg-green-100 text-green-800'
                                : sub.status === 'pending'
                                ? 'bg-yellow-100 text-yellow-800'
                                : sub.status === 'rejected'
                                ? 'bg-red-100 text-red-800'
                                : sub.status === 'cancelled'
                                ? 'bg-orange-100 text-orange-800'
                                : 'bg-gray-100 text-gray-800'
                            }`}
                          >
                            {sub.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {sub.endDate ? new Date(sub.endDate).toLocaleDateString() : '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <div className="flex flex-col gap-1">
                            {sub.status === 'pending' && (
                              <div className="flex gap-2">
                                <button
                                  onClick={() =>
                                    handleApproveSubscription(
                                      sub._id,
                                      sub.paymentMethod === 'cash' || sub.paymentMethod === 'mixed'
                                        ? new Date().toISOString()
                                        : undefined,
                                      sub.paymentMethod === 'cash' || sub.paymentMethod === 'mixed'
                                        ? 'Admin'
                                        : undefined
                                    )
                                  }
                                  className="text-green-600 hover:text-green-900"
                                >
                                  Approve
                                </button>
                                <button
                                  onClick={() => handleRejectSubscription(sub._id)}
                                  className="text-red-600 hover:text-red-900"
                                >
                                  Reject
                                </button>
                              </div>
                            )}
                            {sub.status === 'approved' && (
                              <button
                                onClick={() => {
                                  if (window.confirm('Are you sure you want to cancel this subscription?')) {
                                    cancelSubscriptionMutation.mutate(sub._id);
                                  }
                                }}
                                className="text-orange-600 hover:text-orange-900"
                              >
                                Cancel
                              </button>
                            )}
                            {(sub.status === 'cancelled' || sub.status === 'expired') && (
                              <button
                                onClick={() => {
                                  if (window.confirm('Are you sure you want to reactivate this subscription?')) {
                                    reactivateSubscriptionMutation.mutate(sub._id);
                                  }
                                }}
                                className="text-green-600 hover:text-green-900"
                              >
                                Reactivate
                              </button>
                            )}
                            {sub.upiScreenshot && (
                              <a
                                href={sub.upiScreenshot}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-600 hover:text-blue-900 text-xs"
                              >
                                View Proof
                              </a>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Admin;

