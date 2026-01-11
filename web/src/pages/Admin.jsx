import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  getAllUsers,
  getVendors,
  getAllProfiles,
  getProfileByUserId,
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
  createVendor,
  bulkApproveProfiles,
  bulkRejectProfiles,
  bulkDeleteProfiles,
  getDeletedProfiles,
  restoreProfile,
  bulkRestoreProfiles,
  bulkApproveSubscriptions,
  bulkRejectSubscriptions,
  bulkDeleteSubscriptions,
  bulkBlockUsers,
  bulkDeleteUsers,
} from '../services/adminService';
import { getSupportChats, getOrCreateVendorChat, getOrCreateUserChat } from '../services/supportChatService';
import { getMessages, sendMessage } from '../services/chatService';
import toast from 'react-hot-toast';
import { getImageUrl } from '../config/api';
import { useAuth } from '../context/AuthContext';
import { exportToCSV, exportToExcel, formatDataForExport } from '../utils/exportUtils';

const Admin = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const tabFromUrl = searchParams.get('tab') || 'stats';
  const profileIdFromUrl = searchParams.get('profileId');
  const [activeTab, setActiveTab] = useState(tabFromUrl);
  const [page, setPage] = useState(1);
  const [selectedProfile, setSelectedProfile] = useState(null);
  const [selectedSupportChat, setSelectedSupportChat] = useState(null);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [profileModalId, setProfileModalId] = useState(null);
  const [showVendorModal, setShowVendorModal] = useState(false);
  const [selectedVendor, setSelectedVendor] = useState(null);
  const [selectedProfileIds, setSelectedProfileIds] = useState([]); // For verification tab
  const [selectedProfileIdsForManagement, setSelectedProfileIdsForManagement] = useState([]); // For profiles tab
  const [selectedSubscriptionIds, setSelectedSubscriptionIds] = useState([]);
  const [bulkMode, setBulkMode] = useState(false); // For verification tab
  const [bulkModeSubscriptions, setBulkModeSubscriptions] = useState(false);
  const [bulkModeProfiles, setBulkModeProfiles] = useState(false);
  const [showCreateVendorModal, setShowCreateVendorModal] = useState(false);
  const [showNewSupportChatModal, setShowNewSupportChatModal] = useState(false);
  const [supportChatSearch, setSupportChatSearch] = useState('');
  const [supportChatType, setSupportChatType] = useState('vendor'); // 'vendor' or 'user'
  const [verificationFilter, setVerificationFilter] = useState('pending'); // 'pending', 'approved', 'rejected', 'all'
  // Search states for all tabs
  const [profilesSearch, setProfilesSearch] = useState('');
  const [profilesFilter, setProfilesFilter] = useState({ type: '', status: '', verificationStatus: '', createdBy: '' });
  const [vendorsSearch, setVendorsSearch] = useState('');
  const [vendorsFilter, setVendorsFilter] = useState({ status: '' });
  const [verificationSearch, setVerificationSearch] = useState('');
  const [subscriptionsSearch, setSubscriptionsSearch] = useState('');
  const [subscriptionsFilter, setSubscriptionsFilter] = useState({ status: '', plan: '' });
  const [deletedProfilesSearch, setDeletedProfilesSearch] = useState('');
  const [deletedProfilesFilter, setDeletedProfilesFilter] = useState({ deletedBy: '' });
  const [selectedDeletedProfileIds, setSelectedDeletedProfileIds] = useState([]);
  const [bulkModeDeleted, setBulkModeDeleted] = useState(false);
  const [vendorFormData, setVendorFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    password: '',
    companyName: '',
    vendorContactInfo: '',
    vendorAddress: {
      street: '',
      city: '',
      state: '',
      pincode: '',
      country: 'India',
    },
    vendorLocation: {
      latitude: '',
      longitude: '',
    },
    vendorBusinessDetails: {
      businessType: '',
      registrationNumber: '',
      gstNumber: '',
      panNumber: '',
      yearEstablished: '',
      description: '',
    },
  });
  const [vendorProofs, setVendorProofs] = useState({
    businessRegistration: null,
    gstCertificate: null,
    panCard: null,
    aadharCard: null,
    otherDocuments: [],
  });

  const queryClient = useQueryClient();

  // Update active tab when URL query parameter changes
  useEffect(() => {
    const tab = searchParams.get('tab') || 'stats';
    setActiveTab(tab);
    
    // Auto-open profile modal if profileId is in URL
    const profileIdFromUrl = searchParams.get('profileId');
    if (profileIdFromUrl) {
      setProfileModalId(profileIdFromUrl);
      setShowProfileModal(true);
      // Remove profileId from URL after opening modal
      const newSearchParams = new URLSearchParams(searchParams);
      newSearchParams.delete('profileId');
      setSearchParams(newSearchParams, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  // Update URL when tab changes
  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setPage(1); // Reset to first page when changing tabs
    setSearchParams({ tab });
  };
  
  // Reset page when search or filters change
  useEffect(() => {
    setPage(1);
  }, [profilesSearch, vendorsSearch, verificationSearch, subscriptionsSearch, supportChatSearch, deletedProfilesSearch, profilesFilter, vendorsFilter, subscriptionsFilter, deletedProfilesFilter]);

  const { data: statsData, isLoading: statsLoading } = useQuery(
    ['adminStats'],
    getStats,
    { enabled: activeTab === 'stats' }
  );

  const { data: vendorsData, isLoading: vendorsLoading } = useQuery(
    ['adminVendors', page, vendorsSearch, vendorsFilter],
    () => getVendors({ 
      page, 
      limit: 10, 
      search: vendorsSearch,
      isActive: vendorsFilter.status === 'active' ? 'true' : vendorsFilter.status === 'blocked' ? 'false' : undefined,
    }),
    { enabled: activeTab === 'vendors' }
  );

  const { data: profilesData, isLoading: profilesLoading } = useQuery(
    ['adminProfiles', page, profilesSearch, profilesFilter],
    () => getAllProfiles({ 
      page, 
      limit: 10, 
      search: profilesSearch,
      type: profilesFilter.type || undefined,
      isActive: profilesFilter.status === 'active' ? 'true' : profilesFilter.status === 'inactive' ? 'false' : undefined,
      verificationStatus: profilesFilter.verificationStatus || undefined,
      isVendorCreated: profilesFilter.createdBy === 'vendor' ? 'true' : profilesFilter.createdBy === 'self' ? 'false' : undefined,
    }),
    { enabled: activeTab === 'profiles' }
  );

  const { data: subscriptionsData, isLoading: subscriptionsLoading } = useQuery(
    ['adminSubscriptions', page, subscriptionsSearch, subscriptionsFilter],
    () => getAllSubscriptions({ 
      page, 
      limit: 10, 
      search: subscriptionsSearch,
      status: subscriptionsFilter.status || undefined,
      planId: subscriptionsFilter.plan || undefined,
    }),
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
    ['pendingProfiles', verificationFilter, page, verificationSearch],
    () => {
      const params = { page, limit: 10, search: verificationSearch };
      if (verificationFilter === 'all') {
        return getAllProfiles({ ...params, verificationStatus: '' });
      } else if (verificationFilter === 'pending') {
        return getPendingProfiles(params);
      } else {
        return getAllProfiles({ ...params, verificationStatus: verificationFilter });
      }
    },
    { enabled: activeTab === 'verification' }
  );

  const { data: verificationStatsData } = useQuery(
    'verificationStats',
    getVerificationStats,
    { enabled: activeTab === 'verification' }
  );

  const { data: deletedProfilesData, isLoading: deletedProfilesLoading } = useQuery(
    ['deletedProfiles', page, deletedProfilesSearch],
    () => getDeletedProfiles({ page, limit: 10, search: deletedProfilesSearch }),
    { enabled: activeTab === 'deleted' }
  );

  const { data: selectedProfileData } = useQuery(
    ['profile', selectedProfile],
    () => getProfileById(selectedProfile),
    { enabled: !!selectedProfile }
  );

  const { data: profileModalData, isLoading: profileModalLoading } = useQuery(
    ['profileModal', profileModalId],
    () => getProfileById(profileModalId),
    { enabled: !!profileModalId && showProfileModal }
  );

  const { data: supportChatsData, refetch: refetchSupportChats } = useQuery(
    'supportChats',
    getSupportChats,
    { enabled: activeTab === 'support', refetchInterval: 5000 }
  );

  // Get vendors for support chat modal
  const { data: modalVendorsData } = useQuery(
    ['modalVendors', supportChatSearch],
    () => getVendors({ page: 1, limit: 100, search: supportChatSearch }),
    { enabled: showNewSupportChatModal && supportChatType === 'vendor' }
  );

  // Get users for support chat modal (only regular users, not vendors)
  const { data: usersData } = useQuery(
    ['allUsers', supportChatSearch],
    () => getAllUsers({ page: 1, limit: 100, search: supportChatSearch }),
    { enabled: showNewSupportChatModal && supportChatType === 'user' }
  );

  const { data: supportMessagesData, refetch: refetchSupportMessages } = useQuery(
    ['supportMessages', selectedSupportChat],
    () => getMessages(selectedSupportChat),
    { enabled: !!selectedSupportChat && activeTab === 'support', refetchInterval: 3000 }
  );

  const createVendorMutation = useMutation(createVendor, {
    onSuccess: () => {
      toast.success('Vendor created successfully');
      setShowCreateVendorModal(false);
      setVendorFormData({
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        password: '',
        companyName: '',
        vendorContactInfo: '',
        vendorAddress: {
          street: '',
          city: '',
          state: '',
          pincode: '',
          country: 'India',
        },
        vendorLocation: {
          latitude: '',
          longitude: '',
        },
        vendorBusinessDetails: {
          businessType: '',
          registrationNumber: '',
          gstNumber: '',
          panNumber: '',
          yearEstablished: '',
          description: '',
        },
      });
      setVendorProofs({
        businessRegistration: null,
        gstCertificate: null,
        panCard: null,
        aadharCard: null,
        otherDocuments: [],
      });
      queryClient.invalidateQueries(['adminVendors']);
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to create vendor');
    },
  });

  const sendSupportMessageMutation = useMutation(
    ({ chatId, content }) => sendMessage(chatId, { content }),
    {
      onSuccess: () => {
        refetchSupportMessages();
        refetchSupportChats();
      },
      onError: (error) => {
        toast.error(error.response?.data?.message || 'Failed to send message');
      },
    }
  );

  const blockUserMutation = useMutation(
    ({ id, isActive }) => blockUser(id, { isActive: !isActive }),
    {
      onSuccess: () => {
        toast.success('User status updated successfully');
        queryClient.invalidateQueries(['adminUsers']);
        queryClient.invalidateQueries(['adminVendors']);
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

  const deleteUserMutation = useMutation(
    (userId) => bulkDeleteUsers([userId]),
    {
      onSuccess: () => {
        toast.success('Vendor deleted successfully');
        queryClient.invalidateQueries(['adminVendors']);
        setShowVendorModal(false);
        setSelectedVendor(null);
      },
      onError: (error) => {
        toast.error(error.response?.data?.message || 'Failed to delete vendor');
      },
    }
  );

  const handleDeleteVendor = () => {
    if (!window.confirm(`Are you sure you want to permanently delete vendor "${selectedVendor.companyName || selectedVendor.email}"? This action cannot be undone.`)) {
      return;
    }
    deleteUserMutation.mutate(selectedVendor._id);
  };

  const handleBlockVendor = () => {
    handleBlockUser(selectedVendor._id, selectedVendor.isActive);
    // Refresh vendor data
    queryClient.invalidateQueries(['adminVendors']);
    // Update selected vendor state
    setSelectedVendor({ ...selectedVendor, isActive: !selectedVendor.isActive });
  };

  const handleViewVendorProfiles = async () => {
    try {
      const response = await getAllProfiles({ createdBy: selectedVendor._id, page: 1, limit: 100 });
      if (response?.profiles && response.profiles.length > 0) {
        // Switch to profiles tab and filter by vendor
        setActiveTab('profiles');
        setSearchParams({ tab: 'profiles' });
        // You could also set a filter here if you have vendor filtering
        setShowVendorModal(false);
        toast.success(`Found ${response.profiles.length} profile(s) created by this vendor`);
      } else {
        toast.info(`No profiles created by ${selectedVendor.companyName || 'this vendor'}`);
      }
    } catch (error) {
      toast.error('Failed to load vendor profiles');
    }
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
        // Invalidate current-subscription for all users (the subscribed user will refetch)
        queryClient.invalidateQueries('current-subscription');
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
        // Invalidate current-subscription for all users (the subscribed user will refetch)
        queryClient.invalidateQueries('current-subscription');
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
      queryClient.invalidateQueries(['adminProfiles']);
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
        queryClient.invalidateQueries(['adminProfiles']);
        queryClient.invalidateQueries('verificationStats');
        setSelectedProfile(null);
      },
      onError: (error) => {
        toast.error(error.response?.data?.message || 'Failed to reject profile');
      },
    }
  );

  const restoreProfileMutation = useMutation(restoreProfile, {
    onSuccess: () => {
      toast.success('Profile restored successfully');
      queryClient.invalidateQueries(['deletedProfiles']);
      queryClient.invalidateQueries(['adminProfiles']);
      queryClient.invalidateQueries(['pendingProfiles']);
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to restore profile');
    },
  });

  const bulkRestoreProfilesMutation = useMutation(bulkRestoreProfiles, {
    onSuccess: (data) => {
      toast.success(`${data.count || 0} profile(s) restored successfully`);
      queryClient.invalidateQueries(['deletedProfiles']);
      queryClient.invalidateQueries(['adminProfiles']);
      queryClient.invalidateQueries(['pendingProfiles']);
      setSelectedDeletedProfileIds([]);
      setBulkModeDeleted(false);
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to restore profiles');
    },
  });

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
    <div className="w-full">
      <h1 className="text-3xl font-bold text-gray-900 mb-6">Admin Dashboard</h1>

        {/* Tabs */}
        <div className="border-b border-gray-200 mb-6">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => handleTabChange('stats')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'stats'
                  ? 'border-red-500 text-red-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Statistics
            </button>
            <button
              onClick={() => handleTabChange('vendors')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'vendors'
                  ? 'border-red-500 text-red-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Vendors
            </button>
            <button
              onClick={() => handleTabChange('profiles')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'profiles'
                  ? 'border-red-500 text-red-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Profiles
            </button>
            <button
              onClick={() => handleTabChange('verification')}
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
              onClick={() => handleTabChange('subscriptions')}
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
            <button
              onClick={() => handleTabChange('support')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'support'
                  ? 'border-red-500 text-red-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Support Chats
            </button>
            <button
              onClick={() => handleTabChange('deleted')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'deleted'
                  ? 'border-red-500 text-red-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Deleted Profiles
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
                  <div className="text-3xl font-bold text-blue-600 mb-2">
                    {statsData?.stats?.totalUsers || 0}
                  </div>
                  <div className="text-gray-600">Total Users</div>
                </div>
                <div className="bg-white rounded-lg shadow p-6">
                  <div className="text-3xl font-bold text-purple-600 mb-2">
                    {statsData?.stats?.totalVendors || 0}
                  </div>
                  <div className="text-gray-600">Total Vendors</div>
                </div>
                <div className="bg-white rounded-lg shadow p-6">
                  <div className="text-3xl font-bold text-green-600 mb-2">
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
                  <div className="text-3xl font-bold text-pink-600 mb-2">
                    {statsData?.stats?.brideProfiles || 0}
                  </div>
                  <div className="text-gray-600">Bride Profiles</div>
                </div>
                <div className="bg-white rounded-lg shadow p-6">
                  <div className="text-3xl font-bold text-blue-600 mb-2">
                    {statsData?.stats?.groomProfiles || 0}
                  </div>
                  <div className="text-gray-600">Groom Profiles</div>
                </div>
                <div className="bg-white rounded-lg shadow p-6">
                  <div className="text-3xl font-bold text-yellow-600 mb-2">
                    {statsData?.stats?.vendorCreatedProfiles || 0}
                  </div>
                  <div className="text-gray-600">Vendor Created</div>
                </div>
                <div className="bg-white rounded-lg shadow p-6">
                  <div className="text-3xl font-bold text-indigo-600 mb-2">
                    {statsData?.stats?.totalInterests || 0}
                  </div>
                  <div className="text-gray-600">Total Interests</div>
                </div>
                <div className="bg-white rounded-lg shadow p-6">
                  <div className="text-3xl font-bold text-teal-600 mb-2">
                    {statsData?.stats?.acceptedInterests || 0}
                  </div>
                  <div className="text-gray-600">Accepted Interests</div>
                </div>
                <div className="bg-white rounded-lg shadow p-6">
                  <div className="text-3xl font-bold text-amber-600 mb-2">
                    {statsData?.stats?.premiumProfiles || 0}
                  </div>
                  <div className="text-gray-600">Premium Profiles</div>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'vendors' && (
          <div>
            <div className="mb-4 flex justify-between items-center flex-wrap gap-4">
              <h2 className="text-xl font-semibold">Vendors</h2>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Search vendors..."
                  value={vendorsSearch}
                  onChange={(e) => setVendorsSearch(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                />
                <select
                  value={vendorsFilter.status}
                  onChange={(e) => setVendorsFilter({ ...vendorsFilter, status: e.target.value })}
                  className="px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                >
                  <option value="">All Status</option>
                  <option value="active">Active</option>
                  <option value="blocked">Blocked</option>
                </select>
                <button
                  onClick={() => setShowCreateVendorModal(true)}
                  className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
                >
                  Create Vendor
                </button>
              </div>
            </div>
            {vendorsLoading ? (
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
                        Email
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Phone
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Company Name
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Contact Info
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
                    {vendorsData?.vendors?.map((vendor) => (
                      <tr key={vendor._id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {vendor.firstName || vendor.lastName ? (
                            <button
                              onClick={() => {
                                setSelectedVendor(vendor);
                                setShowVendorModal(true);
                              }}
                              className="text-left text-blue-600 hover:text-blue-800 hover:underline cursor-pointer"
                            >
                              <div className="font-semibold">
                                {vendor.firstName} {vendor.lastName}
                              </div>
                              {vendor.firstName && vendor.lastName && (
                                <div className="text-xs text-gray-400">
                                  Contact Person
                                </div>
                              )}
                            </button>
                          ) : (
                            <span className="text-gray-400">N/A</span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {vendor.email}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {vendor.phone}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {vendor.companyName || 'N/A'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {vendor.vendorContactInfo || 'N/A'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                              vendor.isActive
                                ? 'bg-green-100 text-green-800'
                                : 'bg-red-100 text-red-800'
                            }`}
                          >
                            {vendor.isActive ? 'Active' : 'Blocked'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <button
                            onClick={() => handleBlockUser(vendor._id, vendor.isActive)}
                            className={`${
                              vendor.isActive
                                ? 'text-red-600 hover:text-red-900'
                                : 'text-green-600 hover:text-green-900'
                            }`}
                          >
                            {vendor.isActive ? 'Block' : 'Unblock'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {vendorsData?.pagination && vendorsData.pagination.pages > 1 && (
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
                        onClick={() => setPage(Math.min(vendorsData.pagination.pages, page + 1))}
                        disabled={page === vendorsData.pagination.pages}
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
                            {(page - 1) * vendorsData.pagination.limit + 1}
                          </span>{' '}
                          to{' '}
                          <span className="font-medium">
                            {Math.min(page * vendorsData.pagination.limit, vendorsData.pagination.total)}
                          </span>{' '}
                          of <span className="font-medium">{vendorsData.pagination.total}</span> results
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
                            onClick={() => setPage(Math.min(vendorsData.pagination.pages, page + 1))}
                            disabled={page === vendorsData.pagination.pages}
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
            )}
          </div>
        )}

        {activeTab === 'profiles' && (
          <div>
            <div className="mb-4 flex justify-between items-center flex-wrap gap-4">
              <h2 className="text-xl font-semibold">All Profiles</h2>
              <div className="flex gap-2 flex-wrap">
                <input
                  type="text"
                  placeholder="Search profiles..."
                  value={profilesSearch}
                  onChange={(e) => setProfilesSearch(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                />
                <select
                  value={profilesFilter.type}
                  onChange={(e) => setProfilesFilter({ ...profilesFilter, type: e.target.value })}
                  className="px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                >
                  <option value="">All Types</option>
                  <option value="bride">Bride</option>
                  <option value="groom">Groom</option>
                </select>
                <select
                  value={profilesFilter.status}
                  onChange={(e) => setProfilesFilter({ ...profilesFilter, status: e.target.value })}
                  className="px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                >
                  <option value="">All Status</option>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
                <select
                  value={profilesFilter.verificationStatus}
                  onChange={(e) => setProfilesFilter({ ...profilesFilter, verificationStatus: e.target.value })}
                  className="px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                >
                  <option value="">All Verification</option>
                  <option value="pending">Pending</option>
                  <option value="approved">Approved</option>
                  <option value="rejected">Rejected</option>
                </select>
                <select
                  value={profilesFilter.createdBy}
                  onChange={(e) => setProfilesFilter({ ...profilesFilter, createdBy: e.target.value })}
                  className="px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                >
                  <option value="">All Created By</option>
                  <option value="self">Self-created</option>
                  <option value="vendor">Vendor-created</option>
                </select>
                <button
                  onClick={() => navigate('/profile?create=true')}
                  className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700"
                >
                  ➕ Create Profile
                </button>
                <button
                  onClick={() => {
                    const exportData = formatDataForExport(profilesData?.profiles || [], [
                      { key: 'Name', path: 'personalInfo.firstName' },
                      { key: 'Last Name', path: 'personalInfo.lastName' },
                      { key: 'Age', path: 'personalInfo.age' },
                      { key: 'Type', path: 'type' },
                      { key: 'City', path: 'location.city' },
                      { key: 'State', path: 'location.state' },
                      { key: 'Email', path: 'userId.email' },
                      { key: 'Phone', path: 'userId.phone' },
                      { key: 'Status', path: 'isActive' },
                      { key: 'Verification Status', path: 'verificationStatus' },
                      { key: 'Created At', path: 'createdAt' },
                    ]);
                    exportToCSV(exportData, `profiles_${new Date().toISOString().split('T')[0]}.csv`);
                    toast.success('Profiles exported successfully');
                  }}
                  className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                >
                  📥 Export CSV
                </button>
                <button
                  onClick={() => {
                    setBulkModeProfiles(!bulkModeProfiles);
                    if (bulkModeProfiles) {
                      setSelectedProfileIdsForManagement([]);
                    }
                  }}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  {bulkModeProfiles ? 'Cancel' : 'Bulk Actions'}
                </button>
              </div>
            </div>
            {bulkModeProfiles && selectedProfileIdsForManagement.length > 0 && (
              <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg flex items-center justify-between">
                <span className="text-sm font-medium text-blue-900">
                  {selectedProfileIdsForManagement.length} selected
                </span>
                <div className="flex space-x-2">
                  <button
                    onClick={async () => {
                      if (window.confirm(`Activate ${selectedProfileIdsForManagement.length} profile(s)?`)) {
                        try {
                          await Promise.all(
                            selectedProfileIdsForManagement.map(id =>
                              updateProfileStatus(id, { isActive: true })
                            )
                          );
                          toast.success(`${selectedProfileIdsForManagement.length} profile(s) activated`);
                          queryClient.invalidateQueries(['adminProfiles']);
                          setSelectedProfileIdsForManagement([]);
                          setBulkModeProfiles(false);
                        } catch (error) {
                          toast.error(error.response?.data?.message || 'Failed to activate profiles');
                        }
                      }
                    }}
                    className="px-3 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700"
                  >
                    Activate
                  </button>
                  <button
                    onClick={async () => {
                      if (window.confirm(`Deactivate ${selectedProfileIdsForManagement.length} profile(s)?`)) {
                        try {
                          await Promise.all(
                            selectedProfileIdsForManagement.map(id =>
                              updateProfileStatus(id, { isActive: false })
                            )
                          );
                          toast.success(`${selectedProfileIdsForManagement.length} profile(s) deactivated`);
                          queryClient.invalidateQueries(['adminProfiles']);
                          setSelectedProfileIdsForManagement([]);
                          setBulkModeProfiles(false);
                        } catch (error) {
                          toast.error(error.response?.data?.message || 'Failed to deactivate profiles');
                        }
                      }
                    }}
                    className="px-3 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700"
                  >
                    Deactivate
                  </button>
                  <button
                    onClick={async () => {
                      if (window.confirm(`Delete ${selectedProfileIdsForManagement.length} profile(s)? They will be moved to the deleted profiles list and can be restored later.`)) {
                        try {
                          await bulkDeleteProfiles(selectedProfileIdsForManagement);
                          toast.success(`${selectedProfileIdsForManagement.length} profile(s) deleted`);
                          queryClient.invalidateQueries(['adminProfiles']);
                          setSelectedProfileIdsForManagement([]);
                          setBulkModeProfiles(false);
                        } catch (error) {
                          toast.error(error.response?.data?.message || 'Failed to delete profiles');
                        }
                      }
                    }}
                    className="px-3 py-1 text-xs bg-gray-600 text-white rounded hover:bg-gray-700"
                  >
                    Delete
                  </button>
                </div>
              </div>
            )}
            {profilesLoading ? (
              <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600"></div>
              </div>
            ) : (
              <div className="bg-white rounded-lg shadow overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        {bulkModeProfiles && (
                          <th className="px-6 py-3 text-left">
                            <input
                              type="checkbox"
                              checked={selectedProfileIdsForManagement.length === profilesData?.profiles?.length && profilesData?.profiles?.length > 0}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedProfileIdsForManagement(profilesData?.profiles?.map(p => p._id) || []);
                                } else {
                                  setSelectedProfileIdsForManagement([]);
                                }
                              }}
                              className="w-4 h-4 text-red-600 rounded"
                            />
                          </th>
                        )}
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Name
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Email
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Phone
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Type
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Age
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Created By
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Verification Status
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider sticky right-0 bg-gray-50 z-10">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {profilesData?.profiles?.map((profile) => (
                        <tr key={profile._id}>
                          {bulkModeProfiles && (
                            <td className="px-6 py-4 whitespace-nowrap">
                              <input
                                type="checkbox"
                                checked={selectedProfileIdsForManagement.includes(profile._id)}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setSelectedProfileIdsForManagement([...selectedProfileIdsForManagement, profile._id]);
                                  } else {
                                    setSelectedProfileIdsForManagement(selectedProfileIdsForManagement.filter(id => id !== profile._id));
                                  }
                                }}
                                className="w-4 h-4 text-red-600 rounded"
                              />
                            </td>
                          )}
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            <button
                              onClick={() => {
                                setProfileModalId(profile._id);
                                setShowProfileModal(true);
                              }}
                              className="text-blue-600 hover:text-blue-800 hover:underline cursor-pointer"
                            >
                              {profile.personalInfo?.firstName} {profile.personalInfo?.lastName}
                            </button>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {profile.userId?.email || 'N/A'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {profile.userId?.phone || 'N/A'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {profile.type}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {profile.personalInfo?.age}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {profile.createdBy ? (
                              <div>
                                {profile.isVendorCreated ? (
                                  <>
                                    <div className="font-medium text-blue-600">
                                      {profile.createdBy.companyName || profile.createdBy.email || profile.createdBy.phone}
                                    </div>
                                    {profile.createdBy.firstName && profile.createdBy.lastName && (
                                      <div className="text-xs text-gray-400">
                                        {profile.createdBy.firstName} {profile.createdBy.lastName}
                                      </div>
                                    )}
                                    {!profile.createdBy.companyName && (
                                      <div className="text-xs text-gray-400">
                                        {profile.createdBy.email || profile.createdBy.phone}
                                      </div>
                                    )}
                                  </>
                                ) : (
                                  <>
                                    <div className="font-medium">
                                      {profile.createdBy.email || profile.createdBy.phone}
                                    </div>
                                    <div className="text-xs text-gray-400">Self-created</div>
                                  </>
                                )}
                              </div>
                            ) : (
                              <span className="text-gray-400">Self-created</span>
                            )}
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
                              {profile.verificationStatus === 'approved' ? '✓ Approved' : profile.verificationStatus === 'rejected' ? '✗ Rejected' : '⏳ Pending'}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium sticky right-0 bg-white z-10">
                            {!bulkModeProfiles && (
                              <div className="flex flex-col gap-1 min-w-[80px]">
                                <button
                                  onClick={() => navigate(`/profiles/${profile._id}`)}
                                  className="text-blue-600 hover:text-blue-900 text-xs whitespace-nowrap"
                                >
                                  View
                                </button>
                                {profile.verificationStatus === 'pending' && (
                                  <>
                                    <button
                                      onClick={() => handleApproveProfile(profile._id)}
                                      className="text-green-600 hover:text-green-900 text-xs whitespace-nowrap"
                                    >
                                      Approve
                                    </button>
                                    <button
                                      onClick={() => handleRejectProfile(profile._id)}
                                      className="text-red-600 hover:text-red-900 text-xs whitespace-nowrap"
                                    >
                                      Reject
                                    </button>
                                  </>
                                )}
                                <button
                                  onClick={() => handleUpdateProfile(profile._id, profile.isActive)}
                                  className={`text-xs whitespace-nowrap ${
                                    profile.isActive
                                      ? 'text-orange-600 hover:text-orange-900'
                                      : 'text-green-600 hover:text-green-900'
                                  }`}
                                >
                                  {profile.isActive ? 'Deactivate' : 'Activate'}
                                </button>
                                <button
                                  onClick={async () => {
                                    if (window.confirm('Are you sure you want to delete this profile? It will be moved to the deleted profiles list and can be restored later.')) {
                                      try {
                                        await bulkDeleteProfiles([profile._id]);
                                        toast.success('Profile deleted successfully');
                                        queryClient.invalidateQueries(['adminProfiles']);
                                        queryClient.invalidateQueries(['pendingProfiles']);
                                        queryClient.invalidateQueries('verificationStats');
                                      } catch (error) {
                                        toast.error(error.response?.data?.message || 'Failed to delete profile');
                                      }
                                    }
                                  }}
                                  className="text-red-600 hover:text-red-900 text-xs whitespace-nowrap"
                                >
                                  Delete
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {profilesData?.pagination && profilesData.pagination.pages > 1 && (
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

            {/* Verification Status Filter */}
            <div className="mb-4 bg-white rounded-lg shadow p-4">
              <div className="flex items-center space-x-4">
                <label className="text-sm font-medium text-gray-700">Filter by Status:</label>
                <select
                  value={verificationFilter}
                  onChange={(e) => setVerificationFilter(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="pending">Pending</option>
                  <option value="approved">Approved</option>
                  <option value="rejected">Rejected</option>
                  <option value="all">All</option>
                </select>
              </div>
            </div>

            {/* Profiles List */}
            {pendingProfilesLoading ? (
              <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600"></div>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Profiles List */}
                <div className="lg:col-span-1">
                  <div className="bg-white rounded-lg shadow">
                    <div className="p-4 border-b border-gray-200 flex justify-between items-center">
                      <h3 className="font-semibold text-gray-900">
                        {verificationFilter === 'pending' ? 'Pending' : verificationFilter === 'approved' ? 'Approved' : verificationFilter === 'rejected' ? 'Rejected' : 'All'} Profiles ({pendingProfilesData?.pagination?.total || pendingProfilesData?.profiles?.length || 0})
                      </h3>
                      <button
                        onClick={() => {
                          setBulkMode(!bulkMode);
                          if (bulkMode) {
                            setSelectedProfileIds([]);
                          }
                        }}
                        className="px-3 py-1 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700"
                      >
                        {bulkMode ? 'Cancel' : 'Bulk Actions'}
                      </button>
                    </div>
                    {bulkMode && selectedProfileIds.length > 0 && (
                      <div className="p-3 bg-blue-50 border-b border-blue-200 flex items-center justify-between">
                        <span className="text-sm font-medium text-blue-900">
                          {selectedProfileIds.length} selected
                        </span>
                        <div className="flex space-x-2">
                          <button
                            onClick={async () => {
                              if (window.confirm(`Approve ${selectedProfileIds.length} profile(s)?`)) {
                                try {
                                  await bulkApproveProfiles(selectedProfileIds);
                                  toast.success(`${selectedProfileIds.length} profile(s) approved`);
                                  queryClient.invalidateQueries(['pendingProfiles']);
                                  queryClient.invalidateQueries('verificationStats');
                                  setSelectedProfileIds([]);
                                  setBulkMode(false);
                                } catch (error) {
                                  toast.error(error.response?.data?.message || 'Failed to approve profiles');
                                }
                              }
                            }}
                            className="px-3 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700"
                          >
                            Approve
                          </button>
                          <button
                            onClick={async () => {
                              const reason = prompt('Enter rejection reason:');
                              if (reason) {
                                try {
                                  await bulkRejectProfiles(selectedProfileIds, reason);
                                  toast.success(`${selectedProfileIds.length} profile(s) rejected`);
                                  queryClient.invalidateQueries(['pendingProfiles']);
                                  queryClient.invalidateQueries('verificationStats');
                                  setSelectedProfileIds([]);
                                  setBulkMode(false);
                                } catch (error) {
                                  toast.error(error.response?.data?.message || 'Failed to reject profiles');
                                }
                              }
                            }}
                            className="px-3 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700"
                          >
                            Reject
                          </button>
                          <button
                            onClick={async () => {
                              if (window.confirm(`Delete ${selectedProfileIds.length} profile(s)? They will be moved to the deleted profiles list and can be restored later.`)) {
                                try {
                                  await bulkDeleteProfiles(selectedProfileIds);
                                  toast.success(`${selectedProfileIds.length} profile(s) deleted`);
                                  queryClient.invalidateQueries(['pendingProfiles']);
                                  queryClient.invalidateQueries('verificationStats');
                                  setSelectedProfileIds([]);
                                  setBulkMode(false);
                                } catch (error) {
                                  toast.error(error.response?.data?.message || 'Failed to delete profiles');
                                }
                              }
                            }}
                            className="px-3 py-1 text-xs bg-gray-600 text-white rounded hover:bg-gray-700"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    )}
                    <div className="divide-y divide-gray-200 max-h-[600px] overflow-y-auto">
                      {pendingProfilesData?.profiles?.length > 0 ? (
                        pendingProfilesData.profiles.map((profile) => (
                          <div
                            key={profile._id}
                            onClick={() => !bulkMode && setSelectedProfile(profile._id)}
                            className={`p-4 cursor-pointer hover:bg-gray-50 flex items-start space-x-2 ${
                              selectedProfile === profile._id && !bulkMode ? 'bg-red-50 border-l-4 border-red-500' : ''
                            }`}
                          >
                            {bulkMode && (
                              <input
                                type="checkbox"
                                checked={selectedProfileIds.includes(profile._id)}
                                onChange={(e) => {
                                  e.stopPropagation();
                                  if (e.target.checked) {
                                    setSelectedProfileIds([...selectedProfileIds, profile._id]);
                                  } else {
                                    setSelectedProfileIds(selectedProfileIds.filter(id => id !== profile._id));
                                  }
                                }}
                                className="mt-1 w-4 h-4 text-red-600 rounded"
                              />
                            )}
                            <div className="flex-1">
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
                          </div>
                        ))
                      ) : (
                        <div className="p-4 text-center text-gray-500">No profiles found</div>
                      )}
                    </div>
                    {pendingProfilesData?.pagination && pendingProfilesData.pagination.pages > 1 && (
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
                            onClick={() => setPage(Math.min(pendingProfilesData.pagination.pages, page + 1))}
                            disabled={page === pendingProfilesData.pagination.pages}
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
                                {(page - 1) * (pendingProfilesData.pagination.limit || 10) + 1}
                              </span>{' '}
                              to{' '}
                              <span className="font-medium">
                                {Math.min(page * (pendingProfilesData.pagination.limit || 10), pendingProfilesData.pagination.total)}
                              </span>{' '}
                              of <span className="font-medium">{pendingProfilesData.pagination.total}</span> results
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
                                onClick={() => setPage(Math.min(pendingProfilesData.pagination.pages, page + 1))}
                                disabled={page === pendingProfilesData.pagination.pages}
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
            <div className="mb-4 flex justify-between items-center flex-wrap gap-4">
              <h2 className="text-xl font-semibold">Subscriptions</h2>
              <div className="flex gap-2 flex-wrap">
                <input
                  type="text"
                  placeholder="Search subscriptions..."
                  value={subscriptionsSearch}
                  onChange={(e) => setSubscriptionsSearch(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                />
                <select
                  value={subscriptionsFilter.status}
                  onChange={(e) => setSubscriptionsFilter({ ...subscriptionsFilter, status: e.target.value })}
                  className="px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                >
                  <option value="">All Status</option>
                  <option value="pending">Pending</option>
                  <option value="approved">Approved</option>
                  <option value="rejected">Rejected</option>
                  <option value="cancelled">Cancelled</option>
                  <option value="expired">Expired</option>
                </select>
                <input
                  type="text"
                  placeholder="Plan ID..."
                  value={subscriptionsFilter.plan}
                  onChange={(e) => setSubscriptionsFilter({ ...subscriptionsFilter, plan: e.target.value })}
                  className="px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                />
              </div>
            </div>
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
                          {sub.userId ? (sub.userId.email || sub.userId.phone || 'N/A') : (
                            <span className="text-red-500">No User</span>
                          )} - {sub.planName}
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
            <div className="mb-4 flex justify-between items-center">
              <h2 className="text-xl font-semibold">All Subscriptions</h2>
              <button
                onClick={() => {
                  setBulkModeSubscriptions(!bulkModeSubscriptions);
                  if (bulkModeSubscriptions) {
                    setSelectedSubscriptionIds([]);
                  }
                }}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                {bulkModeSubscriptions ? 'Cancel' : 'Bulk Actions'}
              </button>
            </div>
            {bulkModeSubscriptions && selectedSubscriptionIds.length > 0 && (
              <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg flex items-center justify-between">
                <span className="text-sm font-medium text-blue-900">
                  {selectedSubscriptionIds.length} selected
                </span>
                <div className="flex space-x-2">
                  <button
                    onClick={async () => {
                      if (window.confirm(`Approve ${selectedSubscriptionIds.length} subscription(s)?`)) {
                        try {
                          await bulkApproveSubscriptions(
                            selectedSubscriptionIds,
                            new Date().toISOString(),
                            'Admin'
                          );
                          toast.success(`${selectedSubscriptionIds.length} subscription(s) approved`);
                          queryClient.invalidateQueries(['adminSubscriptions']);
                          queryClient.invalidateQueries('pendingSubscriptions');
                          queryClient.invalidateQueries('subscriptionStats');
                          queryClient.invalidateQueries('current-subscription');
                          setSelectedSubscriptionIds([]);
                          setBulkModeSubscriptions(false);
                        } catch (error) {
                          toast.error(error.response?.data?.message || 'Failed to approve subscriptions');
                        }
                      }
                    }}
                    className="px-3 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700"
                  >
                    Approve
                  </button>
                  <button
                    onClick={async () => {
                      const reason = prompt('Enter rejection reason:');
                      if (reason) {
                        try {
                          await bulkRejectSubscriptions(selectedSubscriptionIds, reason);
                          toast.success(`${selectedSubscriptionIds.length} subscription(s) rejected`);
                          queryClient.invalidateQueries(['adminSubscriptions']);
                          queryClient.invalidateQueries('pendingSubscriptions');
                          queryClient.invalidateQueries('subscriptionStats');
                          queryClient.invalidateQueries('current-subscription');
                          setSelectedSubscriptionIds([]);
                          setBulkModeSubscriptions(false);
                        } catch (error) {
                          toast.error(error.response?.data?.message || 'Failed to reject subscriptions');
                        }
                      }
                    }}
                    className="px-3 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700"
                  >
                    Reject
                  </button>
                  <button
                    onClick={async () => {
                      if (window.confirm(`Cancel ${selectedSubscriptionIds.length} subscription(s)?`)) {
                        try {
                          await bulkDeleteSubscriptions(selectedSubscriptionIds);
                          toast.success(`${selectedSubscriptionIds.length} subscription(s) cancelled`);
                          queryClient.invalidateQueries(['adminSubscriptions']);
                          queryClient.invalidateQueries('pendingSubscriptions');
                          queryClient.invalidateQueries('subscriptionStats');
                          setSelectedSubscriptionIds([]);
                          setBulkModeSubscriptions(false);
                        } catch (error) {
                          toast.error(error.response?.data?.message || 'Failed to cancel subscriptions');
                        }
                      }
                    }}
                    className="px-3 py-1 text-xs bg-orange-600 text-white rounded hover:bg-orange-700"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
            {subscriptionsLoading ? (
              <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600"></div>
              </div>
            ) : subscriptionsData?.subscriptions?.length === 0 ? (
              <div className="bg-white rounded-lg shadow p-12 text-center">
                <div className="text-gray-400 text-6xl mb-4">📋</div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">No subscriptions found</h3>
                <p className="text-gray-500">Try adjusting your search or filters.</p>
              </div>
            ) : (
              <div className="bg-white rounded-lg shadow overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full divide-y divide-gray-200 min-w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        {bulkModeSubscriptions && (
                          <th className="px-6 py-3 text-left">
                            <input
                              type="checkbox"
                              checked={selectedSubscriptionIds.length === subscriptionsData?.subscriptions?.length && subscriptionsData?.subscriptions?.length > 0}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedSubscriptionIds(subscriptionsData?.subscriptions?.map(s => s._id) || []);
                                } else {
                                  setSelectedSubscriptionIds([]);
                                }
                              }}
                              className="w-4 h-4 text-red-600 rounded"
                            />
                          </th>
                        )}
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
                        Start Date
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Expires
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider sticky right-0 bg-white">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {subscriptionsData?.subscriptions?.map((sub) => (
                      <tr key={sub._id}>
                        {bulkModeSubscriptions && (
                          <td className="px-6 py-4 whitespace-nowrap">
                            <input
                              type="checkbox"
                              checked={selectedSubscriptionIds.includes(sub._id)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedSubscriptionIds([...selectedSubscriptionIds, sub._id]);
                                } else {
                                  setSelectedSubscriptionIds(selectedSubscriptionIds.filter(id => id !== sub._id));
                                }
                              }}
                              className="w-4 h-4 text-red-600 rounded"
                            />
                          </td>
                        )}
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {sub.userId ? (
                            <div>
                              <div>{sub.userId.email || sub.userId.phone || 'N/A'}</div>
                              {sub.userId.companyName && (
                                <div className="text-xs text-gray-500">{sub.userId.companyName}</div>
                              )}
                            </div>
                          ) : (
                            <div>
                              <span className="text-red-500 font-semibold">No User</span>
                              <div className="text-xs text-gray-400">Orphaned subscription</div>
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {sub.planName}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          <div className="flex flex-col">
                            <span className="capitalize">{sub.paymentMethod?.replace('_', ' ')}</span>
                            {sub.paymentMethod === 'mixed' && (
                              <span className="text-xs text-gray-400">
                                UPI: ₹{sub.upiAmount || 0} | Cash: ₹{sub.cashAmount || 0}
                              </span>
                            )}
                            {sub.paymentMethod === 'upi' && sub.upiAmount && (
                              <span className="text-xs text-gray-400">₹{sub.upiAmount}</span>
                            )}
                            {sub.paymentMethod === 'cash' && sub.cashAmount && (
                              <span className="text-xs text-gray-400">₹{sub.cashAmount}</span>
                            )}
                          </div>
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
                          {sub.startDate ? new Date(sub.startDate).toLocaleDateString() : '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {sub.endDate ? new Date(sub.endDate).toLocaleDateString() : '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium sticky right-0 bg-white">
                          {!bulkModeSubscriptions && (
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
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                </div>
                {subscriptionsData?.pagination && subscriptionsData.pagination.pages > 1 && (
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
                        onClick={() => setPage(Math.min(subscriptionsData.pagination.pages, page + 1))}
                        disabled={page === subscriptionsData.pagination.pages}
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
                            {(page - 1) * subscriptionsData.pagination.limit + 1}
                          </span>{' '}
                          to{' '}
                          <span className="font-medium">
                            {Math.min(page * subscriptionsData.pagination.limit, subscriptionsData.pagination.total)}
                          </span>{' '}
                          of <span className="font-medium">{subscriptionsData.pagination.total}</span> results
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
                            onClick={() => setPage(Math.min(subscriptionsData.pagination.pages, page + 1))}
                            disabled={page === subscriptionsData.pagination.pages}
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
            )}
          </div>
        )}

        {activeTab === 'support' && (
          <div className="bg-white rounded-lg shadow">
            <div className="grid grid-cols-1 lg:grid-cols-3 h-[600px]">
              {/* Support Chats List */}
              <div className="border-r border-gray-200 overflow-y-auto">
                <div className="p-4 border-b border-gray-200">
                  <div className="flex justify-between items-center">
                    <h2 className="text-lg font-semibold">Support Chats</h2>
                    <button
                      onClick={() => setShowNewSupportChatModal(true)}
                      className="px-3 py-1.5 bg-red-600 text-white text-sm rounded-md hover:bg-red-700"
                      title="Start new support chat"
                    >
                      + New Chat
                    </button>
                  </div>
                </div>
                {supportChatsData?.chats && supportChatsData.chats.length > 0 ? (
                  <div className="divide-y divide-gray-200">
                    {supportChatsData.chats
                      .filter((chat) => {
                        if (!supportChatSearch) return true;
                        const searchLower = supportChatSearch.toLowerCase();
                        const vendorName = chat.vendor?.companyName || chat.vendor?.email || '';
                        const userName = chat.user?.email || chat.user?.phone || '';
                        const profileName = chat.profile?.personalInfo?.firstName || '';
                        return (
                          vendorName.toLowerCase().includes(searchLower) ||
                          userName.toLowerCase().includes(searchLower) ||
                          profileName.toLowerCase().includes(searchLower)
                        );
                      })
                      .map((chat) => (
                        <button
                          key={chat._id}
                          onClick={() => setSelectedSupportChat(chat._id)}
                          className={`w-full p-4 text-left hover:bg-gray-50 ${
                            selectedSupportChat === chat._id ? 'bg-red-50 border-l-4 border-red-500' : ''
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-medium text-gray-900">
                                {chat.otherParticipant?.email || chat.otherParticipant?.phone || 'Unknown'}
                              </p>
                              <p className="text-sm text-gray-500">
                                {chat.chatType === 'support_superadmin_vendor' ? 'Vendor' : 
                                 chat.chatType === 'support_superadmin_user' ? 'User' : 
                                 chat.chatType === 'support_vendor_user' ? 'User' : 'Support'}
                              </p>
                            </div>
                            {chat.unreadCount > 0 && (
                              <span className="bg-red-500 text-white text-xs rounded-full px-2 py-1">
                                {chat.unreadCount}
                              </span>
                            )}
                          </div>
                          {chat.lastMessage && (
                            <p className="text-sm text-gray-600 mt-1 truncate">{chat.lastMessage}</p>
                          )}
                        </button>
                      ))}
                  </div>
                ) : supportChatsData ? (
                  <div className="p-4 text-center text-gray-500">
                    <p className="mb-2">No support chats yet</p>
                    <button
                      onClick={() => setShowNewSupportChatModal(true)}
                      className="text-sm text-red-600 hover:text-red-700 underline"
                    >
                      Start a new chat
                    </button>
                  </div>
                ) : (
                  <div className="p-4 text-center text-gray-500">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600 mx-auto mb-2"></div>
                    <p>Loading support chats...</p>
                  </div>
                )}
              </div>

              {/* Chat Messages */}
              <div className="lg:col-span-2 flex flex-col">
                {selectedSupportChat ? (
                  <>
                    <div className="p-4 border-b border-gray-200 bg-gray-50">
                      <h3 className="font-semibold text-gray-900">
                        {supportChatsData?.chats?.find(c => c._id === selectedSupportChat)?.otherParticipant?.email || 'Chat'}
                      </h3>
                      <p className="text-sm text-gray-500">
                        {supportChatsData?.chats?.find(c => c._id === selectedSupportChat)?.chatType === 'support_superadmin_vendor' ? 'Vendor Support' : 'User Support'}
                      </p>
                    </div>
                    <div className="flex-1 overflow-y-auto p-4 bg-gray-50">
                      {supportMessagesData?.messages?.length > 0 ? (
                        supportMessagesData.messages.map((msg) => (
                        <div
                          key={msg._id}
                          className={`mb-4 ${
                            msg.senderId?._id === user?.id || msg.senderId?.id === user?.id ? 'text-right' : 'text-left'
                          }`}
                        >
                          <div
                            className={`inline-block max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                              (msg.senderId?._id === user?.id || msg.senderId?.id === user?.id || String(msg.senderId) === String(user?.id))
                                ? 'bg-red-600 text-white'
                                : 'bg-white border border-gray-200 text-gray-900'
                            }`}
                          >
                            <p className="text-sm">{msg.content}</p>
                            {msg.imageUrl && (
                              <img
                                src={getImageUrl(msg.imageUrl)}
                                alt="Message"
                                className="mt-2 rounded max-w-full"
                              />
                            )}
                            <p className="text-xs mt-1 opacity-75">
                              {new Date(msg.createdAt).toLocaleTimeString()}
                            </p>
                          </div>
                        </div>
                      ))
                      ) : (
                        <div className="flex items-center justify-center h-full text-gray-500">
                          No messages yet. Start the conversation!
                        </div>
                      )}
                    </div>
                    <div className="border-t border-gray-200 p-4">
                      <form
                        onSubmit={(e) => {
                          e.preventDefault();
                          const formData = new FormData(e.target);
                          const content = formData.get('message');
                          if (content) {
                            sendSupportMessageMutation.mutate({ chatId: selectedSupportChat, content });
                            e.target.reset();
                          }
                        }}
                        className="flex space-x-2"
                      >
                        <input
                          type="text"
                          name="message"
                          placeholder="Type a message..."
                          className="flex-1 border border-gray-300 rounded-md px-4 py-2 focus:outline-none focus:ring-2 focus:ring-red-500"
                        />
                        <button
                          type="submit"
                          disabled={sendSupportMessageMutation.isLoading}
                          className="px-6 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50"
                        >
                          Send
                        </button>
                      </form>
                    </div>
                  </>
                ) : (
                  <div className="flex items-center justify-center h-full text-gray-500">
                    Select a chat to start messaging
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'deleted' && (
          <div>
            <div className="mb-4 flex justify-between items-center flex-wrap gap-4">
              <h2 className="text-xl font-semibold">Deleted Profiles</h2>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Search deleted profiles..."
                  value={deletedProfilesSearch}
                  onChange={(e) => setDeletedProfilesSearch(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                />
                <button
                  onClick={() => {
                    setBulkModeDeleted(!bulkModeDeleted);
                    if (bulkModeDeleted) {
                      setSelectedDeletedProfileIds([]);
                    }
                  }}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  {bulkModeDeleted ? 'Cancel' : 'Bulk Actions'}
                </button>
              </div>
            </div>
            {bulkModeDeleted && selectedDeletedProfileIds.length > 0 && (
              <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg flex items-center justify-between">
                <span className="text-sm font-medium text-blue-900">
                  {selectedDeletedProfileIds.length} selected
                </span>
                <div className="flex space-x-2">
                  <button
                    onClick={() => bulkRestoreProfilesMutation.mutate(selectedDeletedProfileIds)}
                    className="px-3 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700"
                  >
                    Restore All
                  </button>
                </div>
              </div>
            )}
            {deletedProfilesLoading ? (
              <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600"></div>
              </div>
            ) : (
              <div className="bg-white rounded-lg shadow overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        {bulkModeDeleted && (
                          <th className="px-6 py-3 text-left">
                            <input
                              type="checkbox"
                              checked={selectedDeletedProfileIds.length === deletedProfilesData?.profiles?.length && deletedProfilesData?.profiles?.length > 0}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedDeletedProfileIds(deletedProfilesData?.profiles?.map(p => p._id) || []);
                                } else {
                                  setSelectedDeletedProfileIds([]);
                                }
                              }}
                              className="w-4 h-4 text-red-600 rounded"
                            />
                          </th>
                        )}
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Name
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Email
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Phone
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Vendor
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Deleted At
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Deleted By
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {deletedProfilesData?.profiles?.length > 0 ? (
                        deletedProfilesData.profiles.map((profile) => (
                          <tr key={profile._id}>
                            {bulkModeDeleted && (
                              <td className="px-6 py-4 whitespace-nowrap">
                                <input
                                  type="checkbox"
                                  checked={selectedDeletedProfileIds.includes(profile._id)}
                                  onChange={(e) => {
                                    if (e.target.checked) {
                                      setSelectedDeletedProfileIds([...selectedDeletedProfileIds, profile._id]);
                                    } else {
                                      setSelectedDeletedProfileIds(selectedDeletedProfileIds.filter(id => id !== profile._id));
                                    }
                                  }}
                                  className="w-4 h-4 text-red-600 rounded"
                                />
                              </td>
                            )}
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                              {profile.personalInfo?.firstName} {profile.personalInfo?.lastName}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {profile.userId?.email || 'N/A'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {profile.userId?.phone || 'N/A'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {profile.createdBy ? (
                                profile.isVendorCreated ? (
                                  <div>
                                    <div className="font-medium text-blue-600">
                                      {profile.createdBy.companyName || profile.createdBy.email || profile.createdBy.phone}
                                    </div>
                                    {profile.createdBy.firstName && profile.createdBy.lastName && (
                                      <div className="text-xs text-gray-400">
                                        {profile.createdBy.firstName} {profile.createdBy.lastName}
                                      </div>
                                    )}
                                  </div>
                                ) : (
                                  <span className="text-gray-400">Self-created</span>
                                )
                              ) : (
                                <span className="text-gray-400">N/A</span>
                              )}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {profile.deletedAt ? new Date(profile.deletedAt).toLocaleString() : 'N/A'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {profile.deletedBy?.email || 'N/A'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                              {!bulkModeDeleted && (
                                <button
                                  onClick={() => restoreProfileMutation.mutate(profile._id)}
                                  className="text-green-600 hover:text-green-900"
                                >
                                  Restore
                                </button>
                              )}
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={bulkModeDeleted ? 8 : 7} className="px-6 py-4 text-center text-gray-500">
                            No deleted profiles found
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
                {deletedProfilesData?.pagination && deletedProfilesData.pagination.pages > 1 && (
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
                        onClick={() => setPage(Math.min(deletedProfilesData.pagination.pages, page + 1))}
                        disabled={page === deletedProfilesData.pagination.pages}
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
                            {(page - 1) * (deletedProfilesData.pagination.limit || 10) + 1}
                          </span>{' '}
                          to{' '}
                          <span className="font-medium">
                            {Math.min(page * (deletedProfilesData.pagination.limit || 10), deletedProfilesData.pagination.total)}
                          </span>{' '}
                          of <span className="font-medium">{deletedProfilesData.pagination.total}</span> results
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
                            onClick={() => setPage(Math.min(deletedProfilesData.pagination.pages, page + 1))}
                            disabled={page === deletedProfilesData.pagination.pages}
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
            )}
          </div>
        )}

      {/* Modals - New Support Chat Modal */}
      {showNewSupportChatModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Start New Support Chat</h2>
              <button
                onClick={() => {
                  setShowNewSupportChatModal(false);
                  setSupportChatSearch('');
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>

            {/* Chat Type Selector */}
            <div className="mb-4 flex space-x-4 border-b border-gray-200 pb-4">
              <button
                onClick={() => {
                  setSupportChatType('vendor');
                  setSupportChatSearch('');
                }}
                className={`px-4 py-2 rounded-md font-medium ${
                  supportChatType === 'vendor'
                    ? 'bg-red-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Chat with Vendor
              </button>
              <button
                onClick={() => {
                  setSupportChatType('user');
                  setSupportChatSearch('');
                }}
                className={`px-4 py-2 rounded-md font-medium ${
                  supportChatType === 'user'
                    ? 'bg-red-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Chat with User
              </button>
            </div>

            {/* Search */}
            <div className="mb-4">
              <input
                type="text"
                placeholder={`Search ${supportChatType === 'vendor' ? 'vendors' : 'users'} by email or phone...`}
                value={supportChatSearch}
                onChange={(e) => setSupportChatSearch(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-4 py-2 focus:outline-none focus:ring-2 focus:ring-red-500"
              />
            </div>

            {/* Results List */}
            <div className="max-h-96 overflow-y-auto">
              {supportChatType === 'vendor' ? (
                // Vendors List
                <div className="space-y-2">
                  {modalVendorsData?.vendors && modalVendorsData.vendors.length > 0 ? (
                    modalVendorsData.vendors
                    .filter((vendor) => {
                      if (!supportChatSearch) return true;
                      const search = supportChatSearch.toLowerCase();
                      return (
                        vendor.email?.toLowerCase().includes(search) ||
                        vendor.phone?.includes(search) ||
                        vendor.companyName?.toLowerCase().includes(search) ||
                        vendor.firstName?.toLowerCase().includes(search) ||
                        vendor.lastName?.toLowerCase().includes(search)
                      );
                    })
                    .map((vendor) => (
                      <button
                        key={vendor._id}
                        onClick={async () => {
                          try {
                            const chat = await getOrCreateVendorChat(vendor._id);
                            setSelectedSupportChat(chat.chat._id);
                            setShowNewSupportChatModal(false);
                            setSupportChatSearch('');
                            handleTabChange('support');
                          } catch (error) {
                            toast.error('Failed to start chat');
                          }
                        }}
                        className="w-full p-4 bg-gray-50 hover:bg-gray-100 rounded-lg text-left transition-colors"
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium text-gray-900">{vendor.email}</p>
                            <p className="text-sm text-gray-500">
                              {vendor.companyName || vendor.phone}
                            </p>
                          </div>
                          <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded">
                            Vendor
                          </span>
                        </div>
                      </button>
                    ))
                  ) : modalVendorsData ? (
                    <div className="text-center text-gray-500 py-8">
                      {supportChatSearch ? 'No vendors found' : 'No vendors available'}
                    </div>
                  ) : (
                    <div className="text-center text-gray-500 py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600 mx-auto mb-2"></div>
                      <p>Loading vendors...</p>
                    </div>
                  )}
                </div>
              ) : (
                // Users List (only user-created profiles)
                <div className="space-y-2">
                  {usersData?.users && usersData.users.length > 0 ? (
                    usersData.users
                    .filter((user) => {
                      if (user.role !== 'user') return false;
                      if (!supportChatSearch) return true;
                      const search = supportChatSearch.toLowerCase();
                      return (
                        user.email?.toLowerCase().includes(search) ||
                        user.phone?.includes(search)
                      );
                    })
                    .map((user) => (
                      <button
                        key={user._id}
                        onClick={async () => {
                          try {
                            const chat = await getOrCreateUserChat(user._id);
                            setSelectedSupportChat(chat.chat._id);
                            setShowNewSupportChatModal(false);
                            setSupportChatSearch('');
                            handleTabChange('support');
                          } catch (error) {
                            toast.error(error.response?.data?.message || 'Failed to start chat');
                          }
                        }}
                        className="w-full p-4 bg-gray-50 hover:bg-gray-100 rounded-lg text-left transition-colors"
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium text-gray-900">{user.email}</p>
                            <p className="text-sm text-gray-500">{user.phone}</p>
                          </div>
                          <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
                            User
                          </span>
                        </div>
                      </button>
                    ))
                  ) : usersData ? (
                    <div className="text-center text-gray-500 py-8">
                      {supportChatSearch ? 'No users found' : 'No users available'}
                    </div>
                  ) : (
                    <div className="text-center text-gray-500 py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600 mx-auto mb-2"></div>
                      <p>Loading users...</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Create Vendor Modal */}
      {showCreateVendorModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 overflow-y-auto">
          <div className="bg-white rounded-lg p-6 max-w-3xl w-full mx-4 my-8 max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">Create New Vendor</h2>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData();
                
                // Basic fields
                formData.append('firstName', vendorFormData.firstName || '');
                formData.append('lastName', vendorFormData.lastName || '');
                formData.append('email', vendorFormData.email);
                formData.append('phone', vendorFormData.phone);
                formData.append('password', vendorFormData.password);
                formData.append('companyName', vendorFormData.companyName || '');
                formData.append('vendorContactInfo', vendorFormData.vendorContactInfo || '');
                
                // Address
                formData.append('vendorAddress', JSON.stringify(vendorFormData.vendorAddress));
                
                // Location
                formData.append('vendorLocation', JSON.stringify(vendorFormData.vendorLocation));
                
                // Business Details
                formData.append('vendorBusinessDetails', JSON.stringify(vendorFormData.vendorBusinessDetails));
                
                // Proofs
                if (vendorProofs.businessRegistration) {
                  formData.append('businessRegistration', vendorProofs.businessRegistration);
                }
                if (vendorProofs.gstCertificate) {
                  formData.append('gstCertificate', vendorProofs.gstCertificate);
                }
                if (vendorProofs.panCard) {
                  formData.append('panCard', vendorProofs.panCard);
                }
                if (vendorProofs.aadharCard) {
                  formData.append('aadharCard', vendorProofs.aadharCard);
                }
                vendorProofs.otherDocuments.forEach((file) => {
                  formData.append('otherDocuments', file);
                });
                
                createVendorMutation.mutate(formData);
              }}
            >
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">First Name *</label>
                    <input
                      type="text"
                      required
                      value={vendorFormData.firstName}
                      onChange={(e) => setVendorFormData({ ...vendorFormData, firstName: e.target.value })}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Last Name *</label>
                    <input
                      type="text"
                      required
                      value={vendorFormData.lastName}
                      onChange={(e) => setVendorFormData({ ...vendorFormData, lastName: e.target.value })}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-500"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                  <input
                    type="email"
                    required
                    value={vendorFormData.email}
                    onChange={(e) => setVendorFormData({ ...vendorFormData, email: e.target.value })}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phone *</label>
                  <input
                    type="tel"
                    required
                    value={vendorFormData.phone}
                    onChange={(e) => setVendorFormData({ ...vendorFormData, phone: e.target.value })}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Password *</label>
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={vendorFormData.password}
                    onChange={(e) => setVendorFormData({ ...vendorFormData, password: e.target.value })}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Company Name</label>
                  <input
                    type="text"
                    value={vendorFormData.companyName}
                    onChange={(e) => setVendorFormData({ ...vendorFormData, companyName: e.target.value })}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Contact Info</label>
                  <input
                    type="text"
                    value={vendorFormData.vendorContactInfo}
                    onChange={(e) => setVendorFormData({ ...vendorFormData, vendorContactInfo: e.target.value })}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-500"
                  />
                </div>

                {/* Address Section */}
                <div className="border-t pt-4 mt-4">
                  <h3 className="text-lg font-semibold mb-3">Address</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Street Address</label>
                      <input
                        type="text"
                        value={vendorFormData.vendorAddress.street}
                        onChange={(e) => setVendorFormData({
                          ...vendorFormData,
                          vendorAddress: { ...vendorFormData.vendorAddress, street: e.target.value }
                        })}
                        className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
                      <input
                        type="text"
                        value={vendorFormData.vendorAddress.city}
                        onChange={(e) => setVendorFormData({
                          ...vendorFormData,
                          vendorAddress: { ...vendorFormData.vendorAddress, city: e.target.value }
                        })}
                        className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">State</label>
                      <input
                        type="text"
                        value={vendorFormData.vendorAddress.state}
                        onChange={(e) => setVendorFormData({
                          ...vendorFormData,
                          vendorAddress: { ...vendorFormData.vendorAddress, state: e.target.value }
                        })}
                        className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Pincode</label>
                      <input
                        type="text"
                        value={vendorFormData.vendorAddress.pincode}
                        onChange={(e) => setVendorFormData({
                          ...vendorFormData,
                          vendorAddress: { ...vendorFormData.vendorAddress, pincode: e.target.value }
                        })}
                        className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Country</label>
                      <input
                        type="text"
                        value={vendorFormData.vendorAddress.country}
                        onChange={(e) => setVendorFormData({
                          ...vendorFormData,
                          vendorAddress: { ...vendorFormData.vendorAddress, country: e.target.value }
                        })}
                        className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-500"
                      />
                    </div>
                  </div>
                </div>

                {/* Location Section */}
                <div className="border-t pt-4 mt-4">
                  <h3 className="text-lg font-semibold mb-3">Location (Coordinates)</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Latitude</label>
                      <input
                        type="number"
                        step="any"
                        value={vendorFormData.vendorLocation.latitude}
                        onChange={(e) => setVendorFormData({
                          ...vendorFormData,
                          vendorLocation: { ...vendorFormData.vendorLocation, latitude: e.target.value }
                        })}
                        className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-500"
                        placeholder="e.g., 28.6139"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Longitude</label>
                      <input
                        type="number"
                        step="any"
                        value={vendorFormData.vendorLocation.longitude}
                        onChange={(e) => setVendorFormData({
                          ...vendorFormData,
                          vendorLocation: { ...vendorFormData.vendorLocation, longitude: e.target.value }
                        })}
                        className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-500"
                        placeholder="e.g., 77.2090"
                      />
                    </div>
                  </div>
                </div>

                {/* Business Details Section */}
                <div className="border-t pt-4 mt-4">
                  <h3 className="text-lg font-semibold mb-3">Business Details</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Business Type</label>
                      <input
                        type="text"
                        value={vendorFormData.vendorBusinessDetails.businessType}
                        onChange={(e) => setVendorFormData({
                          ...vendorFormData,
                          vendorBusinessDetails: { ...vendorFormData.vendorBusinessDetails, businessType: e.target.value }
                        })}
                        className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-500"
                        placeholder="e.g., Wedding Planner, Photographer"
                      />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Registration Number</label>
                        <input
                          type="text"
                          value={vendorFormData.vendorBusinessDetails.registrationNumber}
                          onChange={(e) => setVendorFormData({
                            ...vendorFormData,
                            vendorBusinessDetails: { ...vendorFormData.vendorBusinessDetails, registrationNumber: e.target.value }
                          })}
                          className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">GST Number</label>
                        <input
                          type="text"
                          value={vendorFormData.vendorBusinessDetails.gstNumber}
                          onChange={(e) => setVendorFormData({
                            ...vendorFormData,
                            vendorBusinessDetails: { ...vendorFormData.vendorBusinessDetails, gstNumber: e.target.value }
                          })}
                          className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">PAN Number</label>
                        <input
                          type="text"
                          value={vendorFormData.vendorBusinessDetails.panNumber}
                          onChange={(e) => setVendorFormData({
                            ...vendorFormData,
                            vendorBusinessDetails: { ...vendorFormData.vendorBusinessDetails, panNumber: e.target.value }
                          })}
                          className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Year Established</label>
                        <input
                          type="number"
                          value={vendorFormData.vendorBusinessDetails.yearEstablished}
                          onChange={(e) => setVendorFormData({
                            ...vendorFormData,
                            vendorBusinessDetails: { ...vendorFormData.vendorBusinessDetails, yearEstablished: e.target.value }
                          })}
                          className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-500"
                          placeholder="e.g., 2010"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                      <textarea
                        value={vendorFormData.vendorBusinessDetails.description}
                        onChange={(e) => setVendorFormData({
                          ...vendorFormData,
                          vendorBusinessDetails: { ...vendorFormData.vendorBusinessDetails, description: e.target.value }
                        })}
                        rows={3}
                        className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-500"
                        placeholder="Brief description of the business"
                      />
                    </div>
                  </div>
                </div>

                {/* Proofs Section */}
                <div className="border-t pt-4 mt-4">
                  <h3 className="text-lg font-semibold mb-3">Documents & Proofs</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Business Registration Document</label>
                      <input
                        type="file"
                        accept="image/*,application/pdf"
                        onChange={(e) => setVendorProofs({ ...vendorProofs, businessRegistration: e.target.files[0] })}
                        className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-500"
                      />
                      {vendorProofs.businessRegistration && (
                        <p className="text-sm text-gray-500 mt-1">{vendorProofs.businessRegistration.name}</p>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">GST Certificate</label>
                      <input
                        type="file"
                        accept="image/*,application/pdf"
                        onChange={(e) => setVendorProofs({ ...vendorProofs, gstCertificate: e.target.files[0] })}
                        className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-500"
                      />
                      {vendorProofs.gstCertificate && (
                        <p className="text-sm text-gray-500 mt-1">{vendorProofs.gstCertificate.name}</p>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">PAN Card</label>
                      <input
                        type="file"
                        accept="image/*,application/pdf"
                        onChange={(e) => setVendorProofs({ ...vendorProofs, panCard: e.target.files[0] })}
                        className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-500"
                      />
                      {vendorProofs.panCard && (
                        <p className="text-sm text-gray-500 mt-1">{vendorProofs.panCard.name}</p>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Aadhar Card</label>
                      <input
                        type="file"
                        accept="image/*,application/pdf"
                        onChange={(e) => setVendorProofs({ ...vendorProofs, aadharCard: e.target.files[0] })}
                        className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-500"
                      />
                      {vendorProofs.aadharCard && (
                        <p className="text-sm text-gray-500 mt-1">{vendorProofs.aadharCard.name}</p>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Other Documents (Multiple)</label>
                      <input
                        type="file"
                        accept="image/*,application/pdf"
                        multiple
                        onChange={(e) => setVendorProofs({ ...vendorProofs, otherDocuments: Array.from(e.target.files) })}
                        className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-500"
                      />
                      {vendorProofs.otherDocuments.length > 0 && (
                        <div className="text-sm text-gray-500 mt-1">
                          {vendorProofs.otherDocuments.map((file, idx) => (
                            <p key={idx}>{file.name}</p>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  type="button"
                  onClick={() => setShowCreateVendorModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createVendorMutation.isLoading}
                  className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50"
                >
                  {createVendorMutation.isLoading ? 'Creating...' : 'Create Vendor'}
                </button>
              </div>
            </form>
          </div>
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
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600"></div>
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
                          <span className="font-medium">Profile ID:</span> {profileModalData.profile._id}
                        </p>
                        {profileModalData.profile.createdBy && (
                          <p className="text-sm text-gray-600">
                            <span className="font-medium">Created By:</span>{' '}
                            {profileModalData.profile.isVendorCreated ? (
                              <span className="text-blue-600">
                                {profileModalData.profile.createdBy.companyName || profileModalData.profile.createdBy.email}
                              </span>
                            ) : (
                              <span>Self-created</span>
                            )}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          const profileId = profileModalData.profile._id?.toString() || profileModalData.profile._id;
                          console.log('Navigating to full profile - Profile ID:', profileId, 'Type:', typeof profileId, 'Full profile:', profileModalData.profile);
                          // Invalidate all profile queries to ensure fresh data
                          queryClient.invalidateQueries(['profile']);
                          queryClient.invalidateQueries(['profileModal']);
                          setShowProfileModal(false);
                          setProfileModalId(null);
                          // Navigate immediately
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
                        {profileModalData.profile.photos.map((photo) => (
                          <div key={photo._id} className="relative">
                            <img
                              src={getImageUrl(photo.url)}
                              alt="Profile"
                              className="w-full h-48 object-cover rounded"
                            />
                            {photo.isPrimary && (
                              <span className="absolute top-2 left-2 bg-blue-500 text-white text-xs px-2 py-1 rounded">
                                Primary
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Personal Information */}
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
                        <span className="text-sm font-medium text-gray-700">Blood Group:</span>
                        <p className="text-gray-900">{profileModalData.profile.personalInfo?.bloodGroup || 'N/A'}</p>
                      </div>
                      <div>
                        <span className="text-sm font-medium text-gray-700">Complexion:</span>
                        <p className="text-gray-900">{profileModalData.profile.personalInfo?.complexion || 'N/A'}</p>
                      </div>
                      <div>
                        <span className="text-sm font-medium text-gray-700">Mother Tongue:</span>
                        <p className="text-gray-900">{profileModalData.profile.personalInfo?.motherTongue || 'N/A'}</p>
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
                        <div>
                          <span className="text-sm font-medium text-gray-700">Country:</span>
                          <p className="text-gray-900">{profileModalData.profile.location.country || 'N/A'}</p>
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

                  {/* Education & Career */}
                  {(profileModalData.profile.education || profileModalData.profile.career) && (
                    <div className="mb-6">
                      <h4 className="text-lg font-semibold mb-3">Education & Career</h4>
                      <div className="grid grid-cols-2 gap-4">
                        {profileModalData.profile.education?.highestEducation && (
                          <div>
                            <span className="text-sm font-medium text-gray-700">Education:</span>
                            <p className="text-gray-900">{profileModalData.profile.education.highestEducation}</p>
                          </div>
                        )}
                        {profileModalData.profile.career?.occupation && (
                          <div>
                            <span className="text-sm font-medium text-gray-700">Occupation:</span>
                            <p className="text-gray-900">{profileModalData.profile.career.occupation}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-12">
                  <p className="text-gray-500">Profile not found</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Vendor Details Modal */}
      {showVendorModal && selectedVendor && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">Vendor Details</h2>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      const vendorId = selectedVendor._id?.toString() || selectedVendor._id;
                      queryClient.invalidateQueries(['vendor', vendorId]);
                      setShowVendorModal(false);
                      setSelectedVendor(null);
                      navigate(`/vendors/${vendorId}`);
                    }}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                  >
                    View Full Vendor
                  </button>
                  <button
                    onClick={() => {
                      setShowVendorModal(false);
                      setSelectedVendor(null);
                    }}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
            <div className="p-6">
              {/* Header */}
              <div className="mb-6">
                <h3 className="text-2xl font-bold text-gray-900 mb-2">
                  {selectedVendor.firstName} {selectedVendor.lastName}
                </h3>
                <p className="text-gray-600">{selectedVendor.companyName || 'N/A'}</p>
                <div className="mt-2">
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-semibold ${
                      selectedVendor.isActive
                        ? 'bg-green-100 text-green-800'
                        : 'bg-red-100 text-red-800'
                    }`}
                  >
                    {selectedVendor.isActive ? 'Active' : 'Blocked'}
                  </span>
                  {selectedVendor.isVerified && (
                    <span className="ml-2 px-3 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-800">
                      Verified
                    </span>
                  )}
                </div>
              </div>

              {/* Contact Information */}
              <div className="mb-6">
                <h4 className="text-lg font-semibold mb-3">Contact Information</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-sm font-medium text-gray-700">Email:</span>
                    <p className="text-gray-900">{selectedVendor.email || 'N/A'}</p>
                  </div>
                  <div>
                    <span className="text-sm font-medium text-gray-700">Phone:</span>
                    <p className="text-gray-900">{selectedVendor.phone || 'N/A'}</p>
                  </div>
                  <div>
                    <span className="text-sm font-medium text-gray-700">Contact Info:</span>
                    <p className="text-gray-900">{selectedVendor.vendorContactInfo || 'N/A'}</p>
                  </div>
                </div>
              </div>

              {/* Address */}
              {selectedVendor.vendorAddress && (
                <div className="mb-6">
                  <h4 className="text-lg font-semibold mb-3">Address</h4>
                  <div className="grid grid-cols-2 gap-4">
                    {selectedVendor.vendorAddress.street && (
                      <div className="col-span-2">
                        <span className="text-sm font-medium text-gray-700">Street:</span>
                        <p className="text-gray-900">{selectedVendor.vendorAddress.street}</p>
                      </div>
                    )}
                    <div>
                      <span className="text-sm font-medium text-gray-700">City:</span>
                      <p className="text-gray-900">{selectedVendor.vendorAddress.city || 'N/A'}</p>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-gray-700">State:</span>
                      <p className="text-gray-900">{selectedVendor.vendorAddress.state || 'N/A'}</p>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-gray-700">Pincode:</span>
                      <p className="text-gray-900">{selectedVendor.vendorAddress.pincode || 'N/A'}</p>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-gray-700">Country:</span>
                      <p className="text-gray-900">{selectedVendor.vendorAddress.country || 'N/A'}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Business Details */}
              {selectedVendor.vendorBusinessDetails && (
                <div className="mb-6">
                  <h4 className="text-lg font-semibold mb-3">Business Details</h4>
                  <div className="grid grid-cols-2 gap-4">
                    {selectedVendor.vendorBusinessDetails.businessType && (
                      <div>
                        <span className="text-sm font-medium text-gray-700">Business Type:</span>
                        <p className="text-gray-900">{selectedVendor.vendorBusinessDetails.businessType}</p>
                      </div>
                    )}
                    {selectedVendor.vendorBusinessDetails.registrationNumber && (
                      <div>
                        <span className="text-sm font-medium text-gray-700">Registration Number:</span>
                        <p className="text-gray-900">{selectedVendor.vendorBusinessDetails.registrationNumber}</p>
                      </div>
                    )}
                    {selectedVendor.vendorBusinessDetails.gstNumber && (
                      <div>
                        <span className="text-sm font-medium text-gray-700">GST Number:</span>
                        <p className="text-gray-900">{selectedVendor.vendorBusinessDetails.gstNumber}</p>
                      </div>
                    )}
                    {selectedVendor.vendorBusinessDetails.panNumber && (
                      <div>
                        <span className="text-sm font-medium text-gray-700">PAN Number:</span>
                        <p className="text-gray-900">{selectedVendor.vendorBusinessDetails.panNumber}</p>
                      </div>
                    )}
                    {selectedVendor.vendorBusinessDetails.yearEstablished && (
                      <div>
                        <span className="text-sm font-medium text-gray-700">Year Established:</span>
                        <p className="text-gray-900">{selectedVendor.vendorBusinessDetails.yearEstablished}</p>
                      </div>
                    )}
                    {selectedVendor.vendorBusinessDetails.description && (
                      <div className="col-span-2">
                        <span className="text-sm font-medium text-gray-700">Description:</span>
                        <p className="text-gray-900">{selectedVendor.vendorBusinessDetails.description}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Vendor Proofs */}
              {selectedVendor.vendorProofs && (
                <div className="mb-6">
                  <h4 className="text-lg font-semibold mb-3">Documents & Proofs</h4>
                  <div className="grid grid-cols-2 gap-4">
                    {selectedVendor.vendorProofs.businessRegistration && (
                      <div>
                        <span className="text-sm font-medium text-gray-700">Business Registration:</span>
                        <a
                          href={getImageUrl(selectedVendor.vendorProofs.businessRegistration)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block text-blue-600 hover:underline mt-1"
                        >
                          View Document
                        </a>
                      </div>
                    )}
                    {selectedVendor.vendorProofs.gstCertificate && (
                      <div>
                        <span className="text-sm font-medium text-gray-700">GST Certificate:</span>
                        <a
                          href={getImageUrl(selectedVendor.vendorProofs.gstCertificate)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block text-blue-600 hover:underline mt-1"
                        >
                          View Document
                        </a>
                      </div>
                    )}
                    {selectedVendor.vendorProofs.panCard && (
                      <div>
                        <span className="text-sm font-medium text-gray-700">PAN Card:</span>
                        <a
                          href={getImageUrl(selectedVendor.vendorProofs.panCard)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block text-blue-600 hover:underline mt-1"
                        >
                          View Document
                        </a>
                      </div>
                    )}
                    {selectedVendor.vendorProofs.aadharCard && (
                      <div>
                        <span className="text-sm font-medium text-gray-700">Aadhar Card:</span>
                        <a
                          href={getImageUrl(selectedVendor.vendorProofs.aadharCard)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block text-blue-600 hover:underline mt-1"
                        >
                          View Document
                        </a>
                      </div>
                    )}
                    {selectedVendor.vendorProofs.otherDocuments && selectedVendor.vendorProofs.otherDocuments.length > 0 && (
                      <div className="col-span-2">
                        <span className="text-sm font-medium text-gray-700">Other Documents:</span>
                        <div className="mt-1 space-y-1">
                          {selectedVendor.vendorProofs.otherDocuments.map((doc, index) => (
                            <a
                              key={index}
                              href={getImageUrl(doc)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="block text-blue-600 hover:underline"
                            >
                              Document {index + 1}
                            </a>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Location */}
              {selectedVendor.vendorLocation && (selectedVendor.vendorLocation.latitude || selectedVendor.vendorLocation.longitude) && (
                <div className="mb-6">
                  <h4 className="text-lg font-semibold mb-3">Location</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <span className="text-sm font-medium text-gray-700">Latitude:</span>
                      <p className="text-gray-900">{selectedVendor.vendorLocation.latitude || 'N/A'}</p>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-gray-700">Longitude:</span>
                      <p className="text-gray-900">{selectedVendor.vendorLocation.longitude || 'N/A'}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Admin;

