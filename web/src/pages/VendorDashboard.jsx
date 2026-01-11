import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { useNavigate } from 'react-router-dom';
import {
  getMyProfiles,
  getMyStats,
  createProfileForPerson,
  updateMyProfile,
  deleteMyProfile,
  approveProfile,
  rejectProfile,
  updateProfileStatus,
  getMyProfileById,
  getMySubscriptions,
  approveSubscription,
  rejectSubscription,
} from '../services/vendorService';
import { getImageUrl } from '../config/api';
import toast from 'react-hot-toast';
import { indianStates, stateCities } from '../utils/indianLocations';
import { religions, casteCategories, casteSubCastes } from '../utils/religionData';

const VendorDashboard = () => {
  const [activeTab, setActiveTab] = useState('profiles');
  const [page, setPage] = useState(1);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingProfile, setEditingProfile] = useState(null);
  const [rejectingProfile, setRejectingProfile] = useState(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [profileModalId, setProfileModalId] = useState(null);
  const [subscriptionsPage, setSubscriptionsPage] = useState(1);
  const [subscriptionsSearch, setSubscriptionsSearch] = useState('');
  const [subscriptionsFilter, setSubscriptionsFilter] = useState({ status: '' });
  const [rejectingSubscription, setRejectingSubscription] = useState(null);
  const [subscriptionRejectionReason, setSubscriptionRejectionReason] = useState('');
  const [formData, setFormData] = useState({
    type: 'bride',
    personalInfo: {},
    familyInfo: {},
    location: {},
    education: {},
    career: {},
    religion: {},
    preferences: {},
    email: '',
    phone: '',
    userId: '', // Optional: if person already has account
  });
  const navigate = useNavigate();

  const queryClient = useQueryClient();

  const { data: profilesData, isLoading: profilesLoading } = useQuery(
    ['vendorProfiles', page],
    () => getMyProfiles({ page, limit: 20 }),
    { enabled: activeTab === 'profiles' }
  );

  const { data: profileModalData, isLoading: profileModalLoading } = useQuery(
    ['vendorProfileModal', profileModalId],
    () => getMyProfileById(profileModalId),
    { 
      enabled: !!profileModalId && showProfileModal,
      retry: false,
    }
  );

  const { data: statsData, isLoading: statsLoading } = useQuery(
    ['vendorStats'],
    getMyStats,
    { enabled: activeTab === 'stats' }
  );

  const { data: subscriptionsData, isLoading: subscriptionsLoading } = useQuery(
    ['vendorSubscriptions', subscriptionsPage, subscriptionsSearch, subscriptionsFilter],
    () => getMySubscriptions({ 
      page: subscriptionsPage, 
      limit: 20,
      search: subscriptionsSearch,
      status: subscriptionsFilter.status || undefined,
    }),
    { enabled: activeTab === 'subscriptions' }
  );

  const deleteProfileMutation = useMutation(
    (id) => deleteMyProfile(id),
    {
      onSuccess: () => {
        toast.success('Profile deleted successfully');
        queryClient.invalidateQueries(['vendorProfiles']);
        queryClient.invalidateQueries(['vendorStats']);
      },
      onError: (error) => {
        toast.error(error.response?.data?.message || 'Failed to delete profile');
      },
    }
  );

  const approveProfileMutation = useMutation(
    (id) => approveProfile(id),
    {
      onSuccess: () => {
        toast.success('Profile approved successfully');
        queryClient.invalidateQueries(['vendorProfiles']);
        queryClient.invalidateQueries(['vendorStats']);
      },
      onError: (error) => {
        toast.error(error.response?.data?.message || 'Failed to approve profile');
      },
    }
  );

  const rejectProfileMutation = useMutation(
    ({ id, reason }) => rejectProfile(id, reason),
    {
      onSuccess: () => {
        toast.success('Profile rejected successfully');
        setRejectingProfile(null);
        setRejectionReason('');
        queryClient.invalidateQueries(['vendorProfiles']);
        queryClient.invalidateQueries(['vendorStats']);
      },
      onError: (error) => {
        toast.error(error.response?.data?.message || 'Failed to reject profile');
      },
    }
  );

  const updateStatusMutation = useMutation(
    ({ id, isActive }) => updateProfileStatus(id, isActive),
    {
      onSuccess: () => {
        toast.success('Profile status updated successfully');
        queryClient.invalidateQueries(['vendorProfiles']);
        queryClient.invalidateQueries(['vendorStats']);
      },
      onError: (error) => {
        toast.error(error.response?.data?.message || 'Failed to update profile status');
      },
    }
  );

  const handleDelete = (id) => {
    if (window.confirm('Are you sure you want to delete this profile?')) {
      deleteProfileMutation.mutate(id);
    }
  };

  const handleApprove = (id) => {
    if (window.confirm('Are you sure you want to approve this profile?')) {
      approveProfileMutation.mutate(id);
    }
  };

  const handleReject = () => {
    if (!rejectionReason.trim()) {
      toast.error('Please provide a rejection reason');
      return;
    }
    rejectProfileMutation.mutate({ id: rejectingProfile._id, reason: rejectionReason });
  };

  const handleStatusToggle = (profile) => {
    updateStatusMutation.mutate({ id: profile._id, isActive: !profile.isActive });
  };

  const approveSubscriptionMutation = useMutation(
    ({ id, data }) => approveSubscription(id, data),
    {
      onSuccess: () => {
        toast.success('Subscription approved successfully');
        queryClient.invalidateQueries(['vendorSubscriptions']);
        queryClient.invalidateQueries(['vendorStats']);
        // Invalidate current-subscription for all users (the subscribed user will refetch)
        queryClient.invalidateQueries('current-subscription');
      },
      onError: (error) => {
        toast.error(error.response?.data?.message || 'Failed to approve subscription');
      },
    }
  );

  const rejectSubscriptionMutation = useMutation(
    ({ id, reason }) => rejectSubscription(id, reason),
    {
      onSuccess: () => {
        toast.success('Subscription rejected successfully');
        setRejectingSubscription(null);
        setSubscriptionRejectionReason('');
        queryClient.invalidateQueries(['vendorSubscriptions']);
        queryClient.invalidateQueries(['vendorStats']);
        // Invalidate current-subscription for all users (the subscribed user will refetch)
        queryClient.invalidateQueries('current-subscription');
      },
      onError: (error) => {
        toast.error(error.response?.data?.message || 'Failed to reject subscription');
      },
    }
  );

  const createProfileMutation = useMutation(
    (data) => createProfileForPerson(data),
    {
      onSuccess: () => {
        toast.success('Profile created successfully!');
        queryClient.invalidateQueries(['vendorProfiles']);
        queryClient.invalidateQueries(['vendorStats']);
        setShowCreateForm(false);
        setFormData({
          type: 'bride',
          personalInfo: {},
          familyInfo: {},
          location: {},
          education: {},
          career: {},
          religion: {},
          preferences: {},
          email: '',
          phone: '',
          userId: '',
        });
      },
      onError: (error) => {
        toast.error(error.response?.data?.message || 'Failed to create profile');
      },
    }
  );

  const handleFieldChange = (section, field, value) => {
    if (section === 'root') {
      setFormData((prev) => ({
        ...prev,
        [field]: value,
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        [section]: {
          ...prev[section],
          [field]: value,
        },
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate required fields
    if (!formData.personalInfo?.firstName || !formData.personalInfo?.lastName) {
      toast.error('First name and last name are required');
      return;
    }
    if (!formData.personalInfo?.dateOfBirth) {
      toast.error('Date of birth is required');
      return;
    }
    if (!formData.location?.city || !formData.location?.state) {
      toast.error('City and state are required');
      return;
    }
    if (!formData.type) {
      toast.error('Profile type (bride/groom) is required');
      return;
    }

    try {
      const profilePayload = {
        type: formData.type,
        personalInfo: formData.personalInfo,
        familyInfo: formData.familyInfo || {},
        location: formData.location,
        education: formData.education || {},
        career: formData.career || {},
        religion: formData.religion || {},
        preferences: formData.preferences || {},
      };

      // If userId is provided, use it; otherwise include email/phone for account creation
      if (formData.userId) {
        profilePayload.userId = formData.userId;
      } else if (formData.email || formData.phone) {
        profilePayload.email = formData.email;
        profilePayload.phone = formData.phone;
      }

      await createProfileMutation.mutateAsync(profilePayload);
    } catch (error) {
      // Error is handled by mutation
    }
  };

  const handleApproveSubscription = (id) => {
    if (window.confirm('Are you sure you want to approve this subscription?')) {
      approveSubscriptionMutation.mutate({ id, data: {} });
    }
  };

  const handleRejectSubscription = () => {
    if (!subscriptionRejectionReason.trim()) {
      toast.error('Please provide a rejection reason');
      return;
    }
    rejectSubscriptionMutation.mutate({ id: rejectingSubscription._id, reason: subscriptionRejectionReason });
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Vendor Dashboard</h1>
          <p className="mt-2 text-sm text-gray-600">Manage profiles you've created</p>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200 mb-6">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('profiles')}
              className={`${
                activeTab === 'profiles'
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
            >
              My Profiles
            </button>
            <button
              onClick={() => setActiveTab('stats')}
              className={`${
                activeTab === 'stats'
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
            >
              Statistics
            </button>
            <button
              onClick={() => setActiveTab('subscriptions')}
              className={`${
                activeTab === 'subscriptions'
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
            >
              Subscriptions
            </button>
          </nav>
        </div>

        {/* Stats Tab */}
        {activeTab === 'stats' && (
          <div className="bg-white shadow rounded-lg p-6">
            {statsLoading ? (
              <div className="text-center py-8">Loading statistics...</div>
            ) : statsData?.stats ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <div className="text-sm font-medium text-blue-600">Total Profiles</div>
                  <div className="text-2xl font-bold text-blue-900 mt-1">
                    {statsData.stats.totalProfiles}
                  </div>
                </div>
                <div className="bg-green-50 p-4 rounded-lg">
                  <div className="text-sm font-medium text-green-600">Active Profiles</div>
                  <div className="text-2xl font-bold text-green-900 mt-1">
                    {statsData.stats.activeProfiles}
                  </div>
                </div>
                <div className="bg-yellow-50 p-4 rounded-lg">
                  <div className="text-sm font-medium text-yellow-600">Pending Verification</div>
                  <div className="text-2xl font-bold text-yellow-900 mt-1">
                    {statsData.stats.pendingProfiles}
                  </div>
                </div>
                <div className="bg-purple-50 p-4 rounded-lg">
                  <div className="text-sm font-medium text-purple-600">Approved Profiles</div>
                  <div className="text-2xl font-bold text-purple-900 mt-1">
                    {statsData.stats.approvedProfiles}
                  </div>
                </div>
                {statsData.stats.pendingSubscriptions !== undefined && (
                  <div className="bg-orange-50 p-4 rounded-lg">
                    <div className="text-sm font-medium text-orange-600">Pending Subscriptions</div>
                    <div className="text-2xl font-bold text-orange-900 mt-1">
                      {statsData.stats.pendingSubscriptions}
                    </div>
                  </div>
                )}
                {statsData.stats.approvedSubscriptions !== undefined && (
                  <div className="bg-teal-50 p-4 rounded-lg">
                    <div className="text-sm font-medium text-teal-600">Approved Subscriptions</div>
                    <div className="text-2xl font-bold text-teal-900 mt-1">
                      {statsData.stats.approvedSubscriptions}
                    </div>
                  </div>
                )}
              </div>
            ) : null}
          </div>
        )}

        {/* Profiles Tab */}
        {activeTab === 'profiles' && (
          <div>
            <div className="mb-4 flex justify-between items-center">
              <h2 className="text-xl font-semibold text-gray-900">My Profiles</h2>
              <button
                onClick={() => {
                  setShowCreateForm(true);
                  setEditingProfile(null);
                }}
                className="bg-primary-600 text-white px-4 py-2 rounded-md hover:bg-primary-700"
              >
                Create New Profile
              </button>
            </div>

            {profilesLoading ? (
              <div className="text-center py-8">Loading profiles...</div>
            ) : profilesData?.profiles?.length > 0 ? (
              <div className="bg-white shadow rounded-lg overflow-hidden">
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
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Verification
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {profilesData.profiles.map((profile) => (
                      <tr key={profile._id}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <button
                            onClick={() => {
                              setProfileModalId(profile._id);
                              setShowProfileModal(true);
                            }}
                            className="text-sm font-medium text-blue-600 hover:text-blue-800 hover:underline cursor-pointer"
                          >
                            {profile.personalInfo?.firstName} {profile.personalInfo?.lastName}
                          </button>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                            {profile.type}
                          </span>
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
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                              profile.verificationStatus === 'approved'
                                ? 'bg-green-100 text-green-800'
                                : profile.verificationStatus === 'rejected'
                                ? 'bg-red-100 text-red-800'
                                : 'bg-yellow-100 text-yellow-800'
                            }`}
                          >
                            {profile.verificationStatus}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {/* Pagination */}
                {profilesData.pagination && profilesData.pagination.pages > 1 && (
                  <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
                    <div className="flex-1 flex justify-between sm:hidden">
                      <button
                        onClick={() => setPage(Math.max(1, page - 1))}
                        disabled={page === 1}
                        className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                      >
                        Previous
                      </button>
                      <button
                        onClick={() => setPage(Math.min(profilesData.pagination.pages, page + 1))}
                        disabled={page === profilesData.pagination.pages}
                        className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                      >
                        Next
                      </button>
                    </div>
                    <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                      <div>
                        <p className="text-sm text-gray-700">
                          Showing{' '}
                          <span className="font-medium">
                            {(page - 1) * profilesData.pagination.limit + 1}
                          </span>{' '}
                          to{' '}
                          <span className="font-medium">
                            {Math.min(page * profilesData.pagination.limit, profilesData.pagination.total)}
                          </span>{' '}
                          of <span className="font-medium">{profilesData.pagination.total}</span> results
                        </p>
                      </div>
                      <div>
                        <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                          <button
                            onClick={() => setPage(Math.max(1, page - 1))}
                            disabled={page === 1}
                            className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                          >
                            Previous
                          </button>
                          <button
                            onClick={() => setPage(Math.min(profilesData.pagination.pages, page + 1))}
                            disabled={page === profilesData.pagination.pages}
                            className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                          >
                            Next
                          </button>
                        </nav>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-white shadow rounded-lg p-8 text-center">
                <p className="text-gray-500">No profiles found. Create your first profile!</p>
              </div>
            )}
          </div>
        )}

        {/* Subscriptions Tab */}
        {activeTab === 'subscriptions' && (
          <div>
            <div className="mb-4 flex justify-between items-center flex-wrap gap-4">
              <h2 className="text-xl font-semibold text-gray-900">Subscriptions</h2>
              <div className="flex gap-2 flex-wrap">
                <input
                  type="text"
                  placeholder="Search by email or phone..."
                  value={subscriptionsSearch}
                  onChange={(e) => setSubscriptionsSearch(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
                <select
                  value={subscriptionsFilter.status}
                  onChange={(e) => setSubscriptionsFilter({ ...subscriptionsFilter, status: e.target.value })}
                  className="px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="">All Status</option>
                  <option value="pending">Pending</option>
                  <option value="approved">Approved</option>
                  <option value="rejected">Rejected</option>
                  <option value="cancelled">Cancelled</option>
                  <option value="expired">Expired</option>
                </select>
              </div>
            </div>

            {subscriptionsLoading ? (
              <div className="text-center py-8">Loading subscriptions...</div>
            ) : subscriptionsData?.subscriptions?.length > 0 ? (
              <div className="bg-white shadow rounded-lg overflow-hidden">
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
                        Amount
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Payment Method
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Start Date
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        End Date
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {subscriptionsData.subscriptions.map((sub) => (
                      <tr key={sub._id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {sub.userId?.email || sub.userId?.phone || 'N/A'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {sub.planName}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          ₹{sub.amount}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {sub.paymentMethod}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                              sub.status === 'approved'
                                ? 'bg-green-100 text-green-800'
                                : sub.status === 'rejected'
                                ? 'bg-red-100 text-red-800'
                                : sub.status === 'pending'
                                ? 'bg-yellow-100 text-yellow-800'
                                : sub.status === 'expired'
                                ? 'bg-gray-100 text-gray-800'
                                : 'bg-orange-100 text-orange-800'
                            }`}
                          >
                            {sub.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {sub.startDate ? new Date(sub.startDate).toLocaleDateString() : 'N/A'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {sub.endDate ? new Date(sub.endDate).toLocaleDateString() : 'N/A'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          {sub.status === 'pending' && (
                            <div className="flex gap-2">
                              <button
                                onClick={() => handleApproveSubscription(sub._id)}
                                className="text-green-600 hover:text-green-900"
                                disabled={approveSubscriptionMutation.isLoading}
                              >
                                Approve
                              </button>
                              <button
                                onClick={() => setRejectingSubscription(sub)}
                                className="text-red-600 hover:text-red-900"
                              >
                                Reject
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {/* Pagination */}
                {subscriptionsData.pagination && subscriptionsData.pagination.pages > 1 && (
                  <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
                    <div className="flex-1 flex justify-between sm:hidden">
                      <button
                        onClick={() => setSubscriptionsPage(Math.max(1, subscriptionsPage - 1))}
                        disabled={subscriptionsPage === 1}
                        className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                      >
                        Previous
                      </button>
                      <button
                        onClick={() => setSubscriptionsPage(Math.min(subscriptionsData.pagination.pages, subscriptionsPage + 1))}
                        disabled={subscriptionsPage === subscriptionsData.pagination.pages}
                        className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                      >
                        Next
                      </button>
                    </div>
                    <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                      <div>
                        <p className="text-sm text-gray-700">
                          Showing{' '}
                          <span className="font-medium">
                            {(subscriptionsPage - 1) * subscriptionsData.pagination.limit + 1}
                          </span>{' '}
                          to{' '}
                          <span className="font-medium">
                            {Math.min(subscriptionsPage * subscriptionsData.pagination.limit, subscriptionsData.pagination.total)}
                          </span>{' '}
                          of <span className="font-medium">{subscriptionsData.pagination.total}</span> results
                        </p>
                      </div>
                      <div>
                        <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                          <button
                            onClick={() => setSubscriptionsPage(Math.max(1, subscriptionsPage - 1))}
                            disabled={subscriptionsPage === 1}
                            className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                          >
                            Previous
                          </button>
                          <button
                            onClick={() => setSubscriptionsPage(Math.min(subscriptionsData.pagination.pages, subscriptionsPage + 1))}
                            disabled={subscriptionsPage === subscriptionsData.pagination.pages}
                            className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                          >
                            Next
                          </button>
                        </nav>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-white shadow rounded-lg p-8 text-center">
                <p className="text-gray-500">No subscriptions found for your members.</p>
              </div>
            )}
          </div>
        )}

        {/* Profile View Modal */}
        {showProfileModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
              <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center">
                <h2 className="text-2xl font-bold text-gray-900">Profile Details</h2>
                <button
                  onClick={() => {
                    setShowProfileModal(false);
                    setProfileModalId(null);
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div className="p-6">
                {profileModalLoading ? (
                  <div className="flex justify-center items-center h-64">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
                  </div>
                ) : profileModalData?.profile ? (
                  <div>
                    {/* Header */}
                    <div className="flex justify-between items-start mb-6">
                      <div>
                        <h3 className="text-2xl font-bold text-gray-900">
                          {profileModalData.profile.personalInfo?.firstName}{' '}
                          {profileModalData.profile.personalInfo?.lastName}
                        </h3>
                        <p className="text-gray-600">
                          {profileModalData.profile.type} • Age: {profileModalData.profile.personalInfo?.age}
                        </p>
                        <div className="mt-2 space-y-1">
                          <p className="text-sm text-gray-600">
                            <span className="font-medium">Email:</span> {profileModalData.profile.userId?.email || 'N/A'}
                          </p>
                          <p className="text-sm text-gray-600">
                            <span className="font-medium">Phone:</span> {profileModalData.profile.userId?.phone || 'N/A'}
                          </p>
                          <p className="text-sm text-gray-600">
                            <span className="font-medium">Status:</span>{' '}
                            <span className={`px-2 py-1 rounded-full text-xs ${
                              profileModalData.profile.isActive
                                ? 'bg-green-100 text-green-800'
                                : 'bg-red-100 text-red-800'
                            }`}>
                              {profileModalData.profile.isActive ? 'Active' : 'Inactive'}
                            </span>
                          </p>
                          <p className="text-sm text-gray-600">
                            <span className="font-medium">Verification:</span>{' '}
                            <span className={`px-2 py-1 rounded-full text-xs ${
                              profileModalData.profile.verificationStatus === 'approved'
                                ? 'bg-green-100 text-green-800'
                                : profileModalData.profile.verificationStatus === 'rejected'
                                ? 'bg-red-100 text-red-800'
                                : 'bg-yellow-100 text-yellow-800'
                            }`}>
                              {profileModalData.profile.verificationStatus}
                            </span>
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            const profileId = profileModalData.profile._id?.toString() || profileModalData.profile._id;
                            queryClient.invalidateQueries(['vendorProfiles']);
                            queryClient.invalidateQueries(['vendorProfileModal']);
                            setShowProfileModal(false);
                            setProfileModalId(null);
                            navigate(`/profiles/${profileId}`);
                          }}
                          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                        >
                          View Full Profile
                        </button>
                      </div>
                    </div>

                    {/* Photos */}
                    {profileModalData.profile.photos?.length > 0 && (
                      <div className="mb-6">
                        <h4 className="text-lg font-semibold mb-3">Photos</h4>
                        <div className="grid grid-cols-3 gap-4">
                          {profileModalData.profile.photos.slice(0, 3).map((photo) => (
                            <div key={photo._id} className="relative">
                              <img
                                src={getImageUrl(photo.url)}
                                alt="Profile"
                                className="w-full h-48 object-cover rounded"
                              />
                              {photo.isPrimary && (
                                <span className="absolute top-2 right-2 bg-blue-600 text-white text-xs px-2 py-1 rounded">
                                  Primary
                                </span>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Personal Info */}
                    {profileModalData.profile.personalInfo && (
                      <div className="mb-6">
                        <h4 className="text-lg font-semibold mb-3">Personal Information</h4>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <span className="text-sm font-medium text-gray-700">Height:</span>
                            <p className="text-gray-900">{profileModalData.profile.personalInfo?.height || 'N/A'}</p>
                          </div>
                          <div>
                            <span className="text-sm font-medium text-gray-700">Weight:</span>
                            <p className="text-gray-900">{profileModalData.profile.personalInfo?.weight || 'N/A'}</p>
                          </div>
                          <div>
                            <span className="text-sm font-medium text-gray-700">Marital Status:</span>
                            <p className="text-gray-900">{profileModalData.profile.personalInfo?.maritalStatus || 'N/A'}</p>
                          </div>
                        </div>
                        {profileModalData.profile.personalInfo?.about && (
                          <div className="mt-4">
                            <span className="text-sm font-medium text-gray-700">About:</span>
                            <p className="text-gray-900 mt-1">{profileModalData.profile.personalInfo.about}</p>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Location */}
                    {profileModalData.profile.location && (
                      <div className="mb-6">
                        <h4 className="text-lg font-semibold mb-3">Location</h4>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <span className="text-sm font-medium text-gray-700">City:</span>
                            <p className="text-gray-900">{profileModalData.profile.location.city || 'N/A'}</p>
                          </div>
                          <div>
                            <span className="text-sm font-medium text-gray-700">State:</span>
                            <p className="text-gray-900">{profileModalData.profile.location.state || 'N/A'}</p>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Religion */}
                    {profileModalData.profile.religion && (
                      <div className="mb-6">
                        <h4 className="text-lg font-semibold mb-3">Religion</h4>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <span className="text-sm font-medium text-gray-700">Religion:</span>
                            <p className="text-gray-900">{profileModalData.profile.religion.religion || 'N/A'}</p>
                          </div>
                          <div>
                            <span className="text-sm font-medium text-gray-700">Caste:</span>
                            <p className="text-gray-900">{profileModalData.profile.religion.caste || 'N/A'}</p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <p className="text-gray-500">Profile not found</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Reject Subscription Modal */}
        {rejectingSubscription && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-1/2 shadow-lg rounded-md bg-white">
              <div className="mt-3">
                <h3 className="text-lg font-medium text-gray-900 mb-4">
                  Reject Subscription
                </h3>
                <p className="text-sm text-gray-500 mb-4">
                  Please provide a reason for rejecting this subscription.
                </p>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Rejection Reason
                  </label>
                  <textarea
                    value={subscriptionRejectionReason}
                    onChange={(e) => setSubscriptionRejectionReason(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                    rows={4}
                    placeholder="Enter rejection reason..."
                  />
                </div>
                <div className="flex justify-end space-x-3">
                  <button
                    onClick={() => {
                      setRejectingSubscription(null);
                      setSubscriptionRejectionReason('');
                    }}
                    className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleRejectSubscription}
                    disabled={rejectSubscriptionMutation.isLoading || !subscriptionRejectionReason.trim()}
                    className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50"
                  >
                    {rejectSubscriptionMutation.isLoading ? 'Rejecting...' : 'Reject Subscription'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Reject Profile Modal */}
        {rejectingProfile && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-1/2 shadow-lg rounded-md bg-white">
              <div className="mt-3">
                <h3 className="text-lg font-medium text-gray-900 mb-4">
                  Reject Profile
                </h3>
                <p className="text-sm text-gray-500 mb-4">
                  Please provide a reason for rejecting this profile.
                </p>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Rejection Reason
                  </label>
                  <textarea
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                    rows={4}
                    placeholder="Enter rejection reason..."
                  />
                </div>
                <div className="flex justify-end space-x-3">
                  <button
                    onClick={() => {
                      setRejectingProfile(null);
                      setRejectionReason('');
                    }}
                    className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleReject}
                    disabled={rejectProfileMutation.isLoading || !rejectionReason.trim()}
                    className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50"
                  >
                    {rejectProfileMutation.isLoading ? 'Rejecting...' : 'Reject Profile'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Create/Edit Profile Modal */}
        {showCreateForm && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-10 mx-auto p-5 border w-11/12 md:w-4/5 lg:w-3/4 shadow-lg rounded-md bg-white max-h-[90vh] overflow-y-auto">
              <div className="mt-3">
                <h3 className="text-lg font-medium text-gray-900 mb-4">
                  Create New Profile
                </h3>
                <form onSubmit={handleSubmit} className="space-y-6">
                  {/* Profile Type */}
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Profile Type <span className="text-red-500">*</span>
                    </label>
                    <div className="flex gap-4">
                      <label className="flex items-center">
                        <input
                          type="radio"
                          value="bride"
                          checked={formData.type === 'bride'}
                          onChange={(e) => handleFieldChange('root', 'type', e.target.value)}
                          className="mr-2"
                          required
                        />
                        <span>Bride</span>
                      </label>
                      <label className="flex items-center">
                        <input
                          type="radio"
                          value="groom"
                          checked={formData.type === 'groom'}
                          onChange={(e) => handleFieldChange('root', 'type', e.target.value)}
                          className="mr-2"
                        />
                        <span>Groom</span>
                      </label>
                    </div>
                  </div>

                  {/* User Account Info (Optional) */}
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h4 className="text-sm font-medium text-gray-700 mb-3">User Account (Optional)</h4>
                    <p className="text-xs text-gray-500 mb-3">
                      If the person already has an account, enter their User ID. Otherwise, provide email/phone to create a new account.
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          User ID (if exists)
                        </label>
                        <input
                          type="text"
                          value={formData.userId || ''}
                          onChange={(e) => handleFieldChange('root', 'userId', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md"
                          placeholder="User ID"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Email
                        </label>
                        <input
                          type="email"
                          value={formData.email || ''}
                          onChange={(e) => handleFieldChange('root', 'email', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md"
                          placeholder="Email"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Phone
                        </label>
                        <input
                          type="tel"
                          value={formData.phone || ''}
                          onChange={(e) => handleFieldChange('root', 'phone', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md"
                          placeholder="Phone"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Personal Information */}
                  <div className="bg-white border rounded-lg p-4">
                    <h4 className="text-sm font-medium text-gray-700 mb-3">Personal Information</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          First Name <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          value={formData.personalInfo?.firstName || ''}
                          onChange={(e) => handleFieldChange('personalInfo', 'firstName', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Last Name <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          value={formData.personalInfo?.lastName || ''}
                          onChange={(e) => handleFieldChange('personalInfo', 'lastName', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Date of Birth <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="date"
                          value={formData.personalInfo?.dateOfBirth || ''}
                          onChange={(e) => handleFieldChange('personalInfo', 'dateOfBirth', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Height
                        </label>
                        <input
                          type="text"
                          value={formData.personalInfo?.height || ''}
                          onChange={(e) => handleFieldChange('personalInfo', 'height', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md"
                          placeholder="e.g., 5'6&quot; or 168 cm"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Weight
                        </label>
                        <input
                          type="text"
                          value={formData.personalInfo?.weight || ''}
                          onChange={(e) => handleFieldChange('personalInfo', 'weight', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md"
                          placeholder="e.g., 65 kg"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Marital Status
                        </label>
                        <select
                          value={formData.personalInfo?.maritalStatus || ''}
                          onChange={(e) => handleFieldChange('personalInfo', 'maritalStatus', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md"
                        >
                          <option value="">Select</option>
                          <option value="Never Married">Never Married</option>
                          <option value="Divorced">Divorced</option>
                          <option value="Widowed">Widowed</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Complexion
                        </label>
                        <select
                          value={formData.personalInfo?.complexion || ''}
                          onChange={(e) => handleFieldChange('personalInfo', 'complexion', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md"
                        >
                          <option value="">Select</option>
                          <option value="Fair">Fair</option>
                          <option value="Wheatish">Wheatish</option>
                          <option value="Wheatish Brown">Wheatish Brown</option>
                          <option value="Dark">Dark</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Mother Tongue
                        </label>
                        <input
                          type="text"
                          value={formData.personalInfo?.motherTongue || ''}
                          onChange={(e) => handleFieldChange('personalInfo', 'motherTongue', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md"
                          placeholder="e.g., Hindi, English"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Location */}
                  <div className="bg-white border rounded-lg p-4">
                    <h4 className="text-sm font-medium text-gray-700 mb-3">Location</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          State <span className="text-red-500">*</span>
                        </label>
                        <select
                          value={formData.location?.state || ''}
                          onChange={(e) => {
                            handleFieldChange('location', 'state', e.target.value);
                            handleFieldChange('location', 'city', ''); // Reset city when state changes
                          }}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md"
                          required
                        >
                          <option value="">Select State</option>
                          {indianStates.map((state) => (
                            <option key={state} value={state}>
                              {state}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          City <span className="text-red-500">*</span>
                        </label>
                        <select
                          value={formData.location?.city || ''}
                          onChange={(e) => handleFieldChange('location', 'city', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md"
                          required
                          disabled={!formData.location?.state}
                        >
                          <option value="">Select City</option>
                          {formData.location?.state && stateCities[formData.location.state]?.map((city) => (
                            <option key={city} value={city}>
                              {city}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Country
                        </label>
                        <input
                          type="text"
                          value={formData.location?.country || 'India'}
                          onChange={(e) => handleFieldChange('location', 'country', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Religion */}
                  <div className="bg-white border rounded-lg p-4">
                    <h4 className="text-sm font-medium text-gray-700 mb-3">Religion</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Religion
                        </label>
                        <select
                          value={formData.religion?.religion || ''}
                          onChange={(e) => {
                            handleFieldChange('religion', 'religion', e.target.value);
                            handleFieldChange('religion', 'caste', ''); // Reset caste when religion changes
                          }}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md"
                        >
                          <option value="">Select Religion</option>
                          {religions.map((religion) => (
                            <option key={religion} value={religion}>
                              {religion}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Caste
                        </label>
                        <select
                          value={formData.religion?.caste || ''}
                          onChange={(e) => handleFieldChange('religion', 'caste', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md"
                          disabled={!formData.religion?.religion}
                        >
                          <option value="">Select Caste</option>
                          {formData.religion?.religion && casteCategories[formData.religion.religion]?.map((caste) => (
                            <option key={caste} value={caste}>
                              {caste}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Education */}
                  <div className="bg-white border rounded-lg p-4">
                    <h4 className="text-sm font-medium text-gray-700 mb-3">Education</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Education Level
                        </label>
                        <input
                          type="text"
                          value={formData.education?.level || ''}
                          onChange={(e) => handleFieldChange('education', 'level', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md"
                          placeholder="e.g., B.Tech, MBA"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Institution
                        </label>
                        <input
                          type="text"
                          value={formData.education?.institution || ''}
                          onChange={(e) => handleFieldChange('education', 'institution', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md"
                          placeholder="College/University"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Career */}
                  <div className="bg-white border rounded-lg p-4">
                    <h4 className="text-sm font-medium text-gray-700 mb-3">Career</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Occupation
                        </label>
                        <input
                          type="text"
                          value={formData.career?.occupation || ''}
                          onChange={(e) => handleFieldChange('career', 'occupation', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md"
                          placeholder="e.g., Software Engineer"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Annual Income
                        </label>
                        <input
                          type="text"
                          value={formData.career?.income || ''}
                          onChange={(e) => handleFieldChange('career', 'income', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md"
                          placeholder="e.g., 5-10 Lakhs"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Family Info */}
                  <div className="bg-white border rounded-lg p-4">
                    <h4 className="text-sm font-medium text-gray-700 mb-3">Family Information</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Father's Name
                        </label>
                        <input
                          type="text"
                          value={formData.familyInfo?.fatherName || ''}
                          onChange={(e) => handleFieldChange('familyInfo', 'fatherName', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Father's Occupation
                        </label>
                        <input
                          type="text"
                          value={formData.familyInfo?.fatherOccupation || ''}
                          onChange={(e) => handleFieldChange('familyInfo', 'fatherOccupation', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Mother's Name
                        </label>
                        <input
                          type="text"
                          value={formData.familyInfo?.motherName || ''}
                          onChange={(e) => handleFieldChange('familyInfo', 'motherName', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Mother's Occupation
                        </label>
                        <input
                          type="text"
                          value={formData.familyInfo?.motherOccupation || ''}
                          onChange={(e) => handleFieldChange('familyInfo', 'motherOccupation', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Form Actions */}
                  <div className="flex justify-end space-x-3 pt-4 border-t">
                    <button
                      type="button"
                      onClick={() => {
                        setShowCreateForm(false);
                        setFormData({
                          type: 'bride',
                          personalInfo: {},
                          familyInfo: {},
                          location: {},
                          education: {},
                          career: {},
                          religion: {},
                          preferences: {},
                          email: '',
                          phone: '',
                          userId: '',
                        });
                      }}
                      className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={createProfileMutation.isLoading}
                      className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:opacity-50"
                    >
                      {createProfileMutation.isLoading ? 'Creating...' : 'Create Profile'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default VendorDashboard;

