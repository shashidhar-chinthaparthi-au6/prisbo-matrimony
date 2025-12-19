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
} from '../services/adminService';
import toast from 'react-hot-toast';

const Admin = () => {
  const [activeTab, setActiveTab] = useState('stats');
  const [page, setPage] = useState(1);

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

