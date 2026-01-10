import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import {
  getMyProfiles,
  getMyStats,
  createProfileForPerson,
  updateMyProfile,
  deleteMyProfile,
} from '../services/vendorService';
import toast from 'react-hot-toast';

const VendorDashboard = () => {
  const [activeTab, setActiveTab] = useState('profiles');
  const [page, setPage] = useState(1);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingProfile, setEditingProfile] = useState(null);

  const queryClient = useQueryClient();

  const { data: profilesData, isLoading: profilesLoading } = useQuery(
    ['vendorProfiles', page],
    () => getMyProfiles({ page, limit: 20 }),
    { enabled: activeTab === 'profiles' }
  );

  const { data: statsData, isLoading: statsLoading } = useQuery(
    ['vendorStats'],
    getMyStats,
    { enabled: activeTab === 'stats' }
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

  const handleDelete = (id) => {
    if (window.confirm('Are you sure you want to delete this profile?')) {
      deleteProfileMutation.mutate(id);
    }
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
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {profilesData.profiles.map((profile) => (
                      <tr key={profile._id}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">
                            {profile.personalInfo?.firstName} {profile.personalInfo?.lastName}
                          </div>
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
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <button
                            onClick={() => {
                              setEditingProfile(profile);
                              setShowCreateForm(true);
                            }}
                            className="text-primary-600 hover:text-primary-900 mr-4"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDelete(profile._id)}
                            className="text-red-600 hover:text-red-900"
                          >
                            Delete
                          </button>
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

        {/* Create/Edit Profile Modal */}
        {showCreateForm && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-1/2 shadow-lg rounded-md bg-white">
              <div className="mt-3">
                <h3 className="text-lg font-medium text-gray-900 mb-4">
                  {editingProfile ? 'Edit Profile' : 'Create New Profile'}
                </h3>
                <p className="text-sm text-gray-500 mb-4">
                  Note: Profile creation form would go here. This is a placeholder for the full form implementation.
                </p>
                <div className="flex justify-end space-x-3">
                  <button
                    onClick={() => {
                      setShowCreateForm(false);
                      setEditingProfile(null);
                    }}
                    className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => {
                      toast.info('Full profile creation form would be implemented here');
                      setShowCreateForm(false);
                      setEditingProfile(null);
                    }}
                    className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700"
                  >
                    {editingProfile ? 'Update' : 'Create'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default VendorDashboard;

