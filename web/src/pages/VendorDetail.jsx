import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { getVendors, updateVendor, blockUser, bulkDeleteUsers } from '../services/adminService';
import { getAllProfiles } from '../services/adminService';
import { getImageUrl } from '../config/api';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';

const VendorDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const queryClient = useQueryClient();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showBlockModal, setShowBlockModal] = useState(false);
  const [blockReason, setBlockReason] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [editedData, setEditedData] = useState({});
  const [showProfiles, setShowProfiles] = useState(false);

  // Fetch vendor data
  const { data: vendorsData, isLoading, refetch } = useQuery(
    ['adminVendors', id],
    () => getVendors({ page: 1, limit: 1000 }),
    {
      enabled: !!id && !!user && !authLoading,
      select: (data) => {
        // Find the specific vendor by ID
        const vendor = data?.vendors?.find((v) => v._id === id);
        return vendor ? { vendor } : null;
      },
    }
  );

  // Fetch profiles created by this vendor
  const { data: profilesData } = useQuery(
    ['vendorProfiles', id],
    () => getAllProfiles({ createdBy: id, page: 1, limit: 100 }),
    {
      enabled: !!id && !!user && !authLoading,
    }
  );

  const vendor = vendorsData?.vendor;

  // Block/Unblock mutation
  const blockUserMutation = useMutation(
    ({ id, isActive }) => blockUser(id, { isActive: !isActive }),
    {
      onSuccess: () => {
        toast.success('Vendor status updated successfully');
        queryClient.invalidateQueries(['adminVendors']);
        queryClient.invalidateQueries(['vendor', id]);
        refetch();
        setShowBlockModal(false);
        setBlockReason('');
      },
      onError: (error) => {
        toast.error(error.response?.data?.message || 'Failed to update vendor status');
      },
    }
  );

  // Delete mutation
  const deleteUserMutation = useMutation(
    (userId) => bulkDeleteUsers([userId]),
    {
      onSuccess: () => {
        toast.success('Vendor deleted successfully');
        queryClient.invalidateQueries(['adminVendors']);
        navigate('/admin?tab=vendors');
      },
      onError: (error) => {
        toast.error(error.response?.data?.message || 'Failed to delete vendor');
      },
    }
  );

  const handleBlockVendor = () => {
    if (vendor.isActive && !blockReason.trim()) {
      toast.error('Please provide a reason for blocking');
      return;
    }
    blockUserMutation.mutate({ id: vendor._id, isActive: vendor.isActive });
  };

  const handleDeleteVendor = () => {
    deleteUserMutation.mutate(vendor._id);
  };

  const handleViewProfiles = () => {
    setShowProfiles(true);
  };

  const handleBackToDetails = () => {
    setShowProfiles(false);
  };

  const [vendorProofs, setVendorProofs] = useState({
    businessRegistration: null,
    gstCertificate: null,
    panCard: null,
    aadharCard: null,
    otherDocuments: [],
  });

  // Initialize edited data when entering edit mode
  useEffect(() => {
    if (isEditing && vendor) {
      setEditedData({
        firstName: vendor.firstName || '',
        lastName: vendor.lastName || '',
        email: vendor.email || '',
        phone: vendor.phone || '',
        companyName: vendor.companyName || '',
        vendorContactInfo: vendor.vendorContactInfo || '',
        vendorAddress: { ...(vendor.vendorAddress || {}) },
        vendorLocation: { ...(vendor.vendorLocation || {}) },
        vendorBusinessDetails: { ...(vendor.vendorBusinessDetails || {}) },
      });
    }
  }, [isEditing, vendor]);

  // Update vendor mutation
  const updateVendorMutation = useMutation(
    (data) => updateVendor(id, data),
    {
      onSuccess: () => {
        toast.success('Vendor updated successfully');
        queryClient.invalidateQueries(['adminVendors']);
        queryClient.invalidateQueries(['vendor', id]);
        refetch();
        setIsEditing(false);
        setVendorProofs({
          businessRegistration: null,
          gstCertificate: null,
          panCard: null,
          aadharCard: null,
          otherDocuments: [],
        });
      },
      onError: (error) => {
        toast.error(error.response?.data?.message || 'Failed to update vendor');
      },
    }
  );

  const handleFieldChange = (field, value, section = null) => {
    if (section) {
      setEditedData((prev) => ({
        ...prev,
        [section]: {
          ...prev[section],
          [field]: value,
        },
      }));
    } else {
      setEditedData((prev) => ({
        ...prev,
        [field]: value,
      }));
    }
  };

  const handleSaveField = (field, value, section = null) => {
    const updateData = section ? { [section]: { [field]: value } } : { [field]: value };
    updateVendorMutation.mutate(updateData);
  };

  const handleSaveAll = async () => {
    try {
      // Check if there are any files to upload
      const hasFiles = vendorProofs.businessRegistration || 
                       vendorProofs.gstCertificate || 
                       vendorProofs.panCard || 
                       vendorProofs.aadharCard || 
                       (vendorProofs.otherDocuments && vendorProofs.otherDocuments.length > 0);

      if (hasFiles) {
        // Use FormData if there are files
        const formData = new FormData();
        
        // Append all edited data
        Object.keys(editedData).forEach((key) => {
          if (key === 'vendorAddress' || key === 'vendorLocation' || key === 'vendorBusinessDetails') {
            formData.append(key, JSON.stringify(editedData[key]));
          } else {
            formData.append(key, editedData[key] || '');
          }
        });

        // Append proof files if any
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
        if (vendorProofs.otherDocuments && vendorProofs.otherDocuments.length > 0) {
          vendorProofs.otherDocuments.forEach((file) => {
            formData.append('otherDocuments', file);
          });
        }

        updateVendorMutation.mutate(formData);
      } else {
        // Use regular JSON if no files
        updateVendorMutation.mutate(editedData);
      }
    } catch (error) {
      toast.error(error.message || 'Failed to update vendor');
    }
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditedData({});
    setVendorProofs({
      businessRegistration: null,
      gstCertificate: null,
      panCard: null,
      aadharCard: null,
      otherDocuments: [],
    });
  };

  if (isLoading || authLoading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
      </div>
    );
  }

  if (!vendor) {
    return (
      <div className="text-center py-12">
        <div className="text-red-600 mb-4 text-xl font-bold">Vendor Not Found</div>
        <button
          onClick={() => navigate('/admin?tab=vendors')}
          className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700"
        >
          Go Back to Vendors
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              {vendor.firstName} {vendor.lastName}
            </h1>
            <p className="text-gray-600 text-lg">{vendor.companyName || 'N/A'}</p>
            <div className="mt-2">
              <span
                className={`px-3 py-1 rounded-full text-xs font-semibold ${
                  vendor.isActive
                    ? 'bg-green-100 text-green-800'
                    : 'bg-red-100 text-red-800'
                }`}
              >
                {vendor.isActive ? 'Active' : 'Blocked'}
              </span>
              {vendor.isVerified && (
                <span className="ml-2 px-3 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-800">
                  Verified
                </span>
              )}
            </div>
          </div>
          <div className="flex gap-2 flex-wrap">
            {!isEditing ? (
              <button
                onClick={() => setIsEditing(true)}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                ✏️ Edit Vendor
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
            {profilesData?.profiles && profilesData.profiles.length > 0 && (
              <button
                onClick={handleViewProfiles}
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
              >
                👥 View Profiles ({profilesData.profiles.length})
              </button>
            )}
            <button
              onClick={() => setShowBlockModal(true)}
              className={`px-4 py-2 rounded-md ${
                vendor.isActive
                  ? 'bg-yellow-600 text-white hover:bg-yellow-700'
                  : 'bg-green-600 text-white hover:bg-green-700'
              }`}
            >
              {vendor.isActive ? '🚫 Block Vendor' : '✅ Unblock Vendor'}
            </button>
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="px-4 py-2 bg-red-800 text-white rounded-md hover:bg-red-900"
            >
              🗑️ Delete Vendor
            </button>
          </div>
        </div>
      </div>

      {/* Toggle between Details and Profiles */}
      {showProfiles ? (
        <>
          {/* Back to Details Button */}
          <div className="mb-6">
            <button
              onClick={handleBackToDetails}
              className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
            >
              ← Back to Details
            </button>
          </div>

          {/* Profiles List */}
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4">
              Profiles ({profilesData?.profiles?.length || 0})
            </h2>
            {profilesData?.profiles && profilesData.profiles.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {profilesData.profiles.map((profile) => (
                  <div
                    key={profile._id}
                    onClick={() => navigate(`/profiles/${profile._id}`)}
                    className="border border-gray-200 rounded-lg p-4 hover:shadow-lg cursor-pointer transition-shadow"
                  >
                    <div className="flex items-start gap-4">
                      {profile.photos && profile.photos.length > 0 && (
                        <img
                          src={getImageUrl(profile.photos.find(p => p.isPrimary)?.url || profile.photos[0]?.url)}
                          alt={profile.personalInfo?.firstName}
                          className="w-20 h-20 rounded-lg object-cover"
                        />
                      )}
                      <div className="flex-1">
                        <h3 className="font-semibold text-lg text-gray-900">
                          {profile.personalInfo?.firstName} {profile.personalInfo?.lastName}
                        </h3>
                        <p className="text-sm text-gray-600">
                          {profile.type} • Age: {profile.personalInfo?.age}
                        </p>
                        <p className="text-sm text-gray-600">
                          {profile.location?.city}, {profile.location?.state}
                        </p>
                        <div className="flex gap-2 mt-2">
                          <span
                            className={`px-2 py-1 rounded-full text-xs font-semibold ${
                              profile.isActive
                                ? 'bg-green-100 text-green-800'
                                : 'bg-red-100 text-red-800'
                            }`}
                          >
                            {profile.isActive ? 'Active' : 'Inactive'}
                          </span>
                          <span
                            className={`px-2 py-1 rounded-full text-xs font-semibold ${
                              profile.verificationStatus === 'approved'
                                ? 'bg-blue-100 text-blue-800'
                                : profile.verificationStatus === 'rejected'
                                ? 'bg-red-100 text-red-800'
                                : 'bg-yellow-100 text-yellow-800'
                            }`}
                          >
                            {profile.verificationStatus || 'pending'}
                          </span>
                        </div>
                        {profile.userId && (
                          <div className="mt-2 text-xs text-gray-500">
                            <p>📧 {profile.userId.email}</p>
                            <p>📱 {profile.userId.phone}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <p className="text-gray-500">No profiles found</p>
              </div>
            )}
          </div>
        </>
      ) : (
        <>
          {/* Basic Information */}
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4">Basic Information</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">First Name:</label>
                {isEditing ? (
                  <input
                    type="text"
                    value={editedData.firstName || ''}
                    onChange={(e) => handleFieldChange('firstName', e.target.value)}
                    onBlur={() => handleSaveField('firstName', editedData.firstName)}
                    className="w-full px-2 py-1 border border-gray-300 rounded"
                  />
                ) : (
                  <p className="text-gray-900">{vendor.firstName || 'N/A'}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Last Name:</label>
                {isEditing ? (
                  <input
                    type="text"
                    value={editedData.lastName || ''}
                    onChange={(e) => handleFieldChange('lastName', e.target.value)}
                    onBlur={() => handleSaveField('lastName', editedData.lastName)}
                    className="w-full px-2 py-1 border border-gray-300 rounded"
                  />
                ) : (
                  <p className="text-gray-900">{vendor.lastName || 'N/A'}</p>
                )}
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Company Name:</label>
                {isEditing ? (
                  <input
                    type="text"
                    value={editedData.companyName || ''}
                    onChange={(e) => handleFieldChange('companyName', e.target.value)}
                    onBlur={() => handleSaveField('companyName', editedData.companyName)}
                    className="w-full px-2 py-1 border border-gray-300 rounded"
                  />
                ) : (
                  <p className="text-gray-900">{vendor.companyName || 'N/A'}</p>
                )}
              </div>
            </div>
          </div>

          {/* Contact Information */}
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4">Contact Information</h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email:</label>
            {isEditing ? (
              <input
                type="email"
                value={editedData.email || ''}
                onChange={(e) => handleFieldChange('email', e.target.value)}
                onBlur={() => handleSaveField('email', editedData.email)}
                className="w-full px-2 py-1 border border-gray-300 rounded"
              />
            ) : (
              <p className="text-gray-900">{vendor.email || 'N/A'}</p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Phone:</label>
            {isEditing ? (
              <input
                type="text"
                value={editedData.phone || ''}
                onChange={(e) => handleFieldChange('phone', e.target.value)}
                onBlur={() => handleSaveField('phone', editedData.phone)}
                className="w-full px-2 py-1 border border-gray-300 rounded"
              />
            ) : (
              <p className="text-gray-900">{vendor.phone || 'N/A'}</p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Contact Info:</label>
            {isEditing ? (
              <input
                type="text"
                value={editedData.vendorContactInfo || ''}
                onChange={(e) => handleFieldChange('vendorContactInfo', e.target.value)}
                onBlur={() => handleSaveField('vendorContactInfo', editedData.vendorContactInfo)}
                className="w-full px-2 py-1 border border-gray-300 rounded"
              />
            ) : (
              <p className="text-gray-900">{vendor.vendorContactInfo || 'N/A'}</p>
            )}
          </div>
        </div>
      </div>

      {/* Address */}
      {(vendor.vendorAddress || isEditing) && (
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Address</h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <span className="text-sm font-medium text-gray-700">Street:</span>
              {isEditing ? (
                <input
                  type="text"
                  value={editedData.vendorAddress?.street || ''}
                  onChange={(e) => handleFieldChange('street', e.target.value, 'vendorAddress')}
                  onBlur={() => handleSaveField('street', editedData.vendorAddress?.street, 'vendorAddress')}
                  className="mt-1 w-full px-2 py-1 border border-gray-300 rounded"
                />
              ) : (
                <p className="text-gray-900">{vendor.vendorAddress?.street || 'N/A'}</p>
              )}
            </div>
            <div>
              <span className="text-sm font-medium text-gray-700">City:</span>
              {isEditing ? (
                <input
                  type="text"
                  value={editedData.vendorAddress?.city || ''}
                  onChange={(e) => handleFieldChange('city', e.target.value, 'vendorAddress')}
                  onBlur={() => handleSaveField('city', editedData.vendorAddress?.city, 'vendorAddress')}
                  className="mt-1 w-full px-2 py-1 border border-gray-300 rounded"
                />
              ) : (
                <p className="text-gray-900">{vendor.vendorAddress?.city || 'N/A'}</p>
              )}
            </div>
            <div>
              <span className="text-sm font-medium text-gray-700">State:</span>
              {isEditing ? (
                <input
                  type="text"
                  value={editedData.vendorAddress?.state || ''}
                  onChange={(e) => handleFieldChange('state', e.target.value, 'vendorAddress')}
                  onBlur={() => handleSaveField('state', editedData.vendorAddress?.state, 'vendorAddress')}
                  className="mt-1 w-full px-2 py-1 border border-gray-300 rounded"
                />
              ) : (
                <p className="text-gray-900">{vendor.vendorAddress?.state || 'N/A'}</p>
              )}
            </div>
            <div>
              <span className="text-sm font-medium text-gray-700">Pincode:</span>
              {isEditing ? (
                <input
                  type="text"
                  value={editedData.vendorAddress?.pincode || ''}
                  onChange={(e) => handleFieldChange('pincode', e.target.value, 'vendorAddress')}
                  onBlur={() => handleSaveField('pincode', editedData.vendorAddress?.pincode, 'vendorAddress')}
                  className="mt-1 w-full px-2 py-1 border border-gray-300 rounded"
                />
              ) : (
                <p className="text-gray-900">{vendor.vendorAddress?.pincode || 'N/A'}</p>
              )}
            </div>
            <div>
              <span className="text-sm font-medium text-gray-700">Country:</span>
              {isEditing ? (
                <input
                  type="text"
                  value={editedData.vendorAddress?.country || ''}
                  onChange={(e) => handleFieldChange('country', e.target.value, 'vendorAddress')}
                  onBlur={() => handleSaveField('country', editedData.vendorAddress?.country, 'vendorAddress')}
                  className="mt-1 w-full px-2 py-1 border border-gray-300 rounded"
                />
              ) : (
                <p className="text-gray-900">{vendor.vendorAddress?.country || 'N/A'}</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Business Details */}
      {(vendor.vendorBusinessDetails || isEditing) && (
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Business Details</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <span className="text-sm font-medium text-gray-700">Business Type:</span>
              {isEditing ? (
                <input
                  type="text"
                  value={editedData.vendorBusinessDetails?.businessType || ''}
                  onChange={(e) => handleFieldChange('businessType', e.target.value, 'vendorBusinessDetails')}
                  onBlur={() => handleSaveField('businessType', editedData.vendorBusinessDetails?.businessType, 'vendorBusinessDetails')}
                  className="mt-1 w-full px-2 py-1 border border-gray-300 rounded"
                />
              ) : (
                <p className="text-gray-900">{vendor.vendorBusinessDetails?.businessType || 'N/A'}</p>
              )}
            </div>
            <div>
              <span className="text-sm font-medium text-gray-700">Registration Number:</span>
              {isEditing ? (
                <input
                  type="text"
                  value={editedData.vendorBusinessDetails?.registrationNumber || ''}
                  onChange={(e) => handleFieldChange('registrationNumber', e.target.value, 'vendorBusinessDetails')}
                  onBlur={() => handleSaveField('registrationNumber', editedData.vendorBusinessDetails?.registrationNumber, 'vendorBusinessDetails')}
                  className="mt-1 w-full px-2 py-1 border border-gray-300 rounded"
                />
              ) : (
                <p className="text-gray-900">{vendor.vendorBusinessDetails?.registrationNumber || 'N/A'}</p>
              )}
            </div>
            <div>
              <span className="text-sm font-medium text-gray-700">GST Number:</span>
              {isEditing ? (
                <input
                  type="text"
                  value={editedData.vendorBusinessDetails?.gstNumber || ''}
                  onChange={(e) => handleFieldChange('gstNumber', e.target.value, 'vendorBusinessDetails')}
                  onBlur={() => handleSaveField('gstNumber', editedData.vendorBusinessDetails?.gstNumber, 'vendorBusinessDetails')}
                  className="mt-1 w-full px-2 py-1 border border-gray-300 rounded"
                />
              ) : (
                <p className="text-gray-900">{vendor.vendorBusinessDetails?.gstNumber || 'N/A'}</p>
              )}
            </div>
            <div>
              <span className="text-sm font-medium text-gray-700">PAN Number:</span>
              {isEditing ? (
                <input
                  type="text"
                  value={editedData.vendorBusinessDetails?.panNumber || ''}
                  onChange={(e) => handleFieldChange('panNumber', e.target.value, 'vendorBusinessDetails')}
                  onBlur={() => handleSaveField('panNumber', editedData.vendorBusinessDetails?.panNumber, 'vendorBusinessDetails')}
                  className="mt-1 w-full px-2 py-1 border border-gray-300 rounded"
                />
              ) : (
                <p className="text-gray-900">{vendor.vendorBusinessDetails?.panNumber || 'N/A'}</p>
              )}
            </div>
            <div>
              <span className="text-sm font-medium text-gray-700">Year Established:</span>
              {isEditing ? (
                <input
                  type="number"
                  value={editedData.vendorBusinessDetails?.yearEstablished || ''}
                  onChange={(e) => handleFieldChange('yearEstablished', e.target.value, 'vendorBusinessDetails')}
                  onBlur={() => handleSaveField('yearEstablished', editedData.vendorBusinessDetails?.yearEstablished, 'vendorBusinessDetails')}
                  className="mt-1 w-full px-2 py-1 border border-gray-300 rounded"
                />
              ) : (
                <p className="text-gray-900">{vendor.vendorBusinessDetails?.yearEstablished || 'N/A'}</p>
              )}
            </div>
            <div className="col-span-2">
              <span className="text-sm font-medium text-gray-700">Description:</span>
              {isEditing ? (
                <textarea
                  value={editedData.vendorBusinessDetails?.description || ''}
                  onChange={(e) => handleFieldChange('description', e.target.value, 'vendorBusinessDetails')}
                  onBlur={() => handleSaveField('description', editedData.vendorBusinessDetails?.description, 'vendorBusinessDetails')}
                  className="mt-1 w-full px-2 py-1 border border-gray-300 rounded"
                  rows="3"
                />
              ) : (
                <p className="text-gray-900">{vendor.vendorBusinessDetails?.description || 'N/A'}</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Vendor Proofs */}
      {(vendor.vendorProofs || isEditing) && (
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Documents & Proofs</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Business Registration Document</label>
              {isEditing ? (
                <>
                  <input
                    type="file"
                    accept="image/*,application/pdf"
                    onChange={(e) => setVendorProofs({ ...vendorProofs, businessRegistration: e.target.files[0] })}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-500"
                  />
                  {vendorProofs.businessRegistration && (
                    <p className="text-sm text-gray-500 mt-1">{vendorProofs.businessRegistration.name}</p>
                  )}
                </>
              ) : vendor.vendorProofs?.businessRegistration ? (
                <a
                  href={getImageUrl(vendor.vendorProofs.businessRegistration)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block text-blue-600 hover:underline mt-1"
                >
                  View Document
                </a>
              ) : (
                <p className="text-gray-500 mt-1">No document uploaded</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">GST Certificate</label>
              {isEditing ? (
                <>
                  <input
                    type="file"
                    accept="image/*,application/pdf"
                    onChange={(e) => setVendorProofs({ ...vendorProofs, gstCertificate: e.target.files[0] })}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-500"
                  />
                  {vendorProofs.gstCertificate && (
                    <p className="text-sm text-gray-500 mt-1">{vendorProofs.gstCertificate.name}</p>
                  )}
                </>
              ) : vendor.vendorProofs?.gstCertificate ? (
                <a
                  href={getImageUrl(vendor.vendorProofs.gstCertificate)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block text-blue-600 hover:underline mt-1"
                >
                  View Document
                </a>
              ) : (
                <p className="text-gray-500 mt-1">No document uploaded</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">PAN Card</label>
              {isEditing ? (
                <>
                  <input
                    type="file"
                    accept="image/*,application/pdf"
                    onChange={(e) => setVendorProofs({ ...vendorProofs, panCard: e.target.files[0] })}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-500"
                  />
                  {vendorProofs.panCard && (
                    <p className="text-sm text-gray-500 mt-1">{vendorProofs.panCard.name}</p>
                  )}
                </>
              ) : vendor.vendorProofs?.panCard ? (
                <a
                  href={getImageUrl(vendor.vendorProofs.panCard)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block text-blue-600 hover:underline mt-1"
                >
                  View Document
                </a>
              ) : (
                <p className="text-gray-500 mt-1">No document uploaded</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Aadhar Card</label>
              {isEditing ? (
                <>
                  <input
                    type="file"
                    accept="image/*,application/pdf"
                    onChange={(e) => setVendorProofs({ ...vendorProofs, aadharCard: e.target.files[0] })}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-500"
                  />
                  {vendorProofs.aadharCard && (
                    <p className="text-sm text-gray-500 mt-1">{vendorProofs.aadharCard.name}</p>
                  )}
                </>
              ) : vendor.vendorProofs?.aadharCard ? (
                <a
                  href={getImageUrl(vendor.vendorProofs.aadharCard)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block text-blue-600 hover:underline mt-1"
                >
                  View Document
                </a>
              ) : (
                <p className="text-gray-500 mt-1">No document uploaded</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Other Documents (Multiple)</label>
              {isEditing ? (
                <>
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
                </>
              ) : vendor.vendorProofs?.otherDocuments && vendor.vendorProofs.otherDocuments.length > 0 ? (
                <div className="mt-1 space-y-1">
                  {vendor.vendorProofs.otherDocuments.map((doc, index) => (
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
              ) : (
                <p className="text-gray-500 mt-1">No documents uploaded</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Location */}
      {(vendor.vendorLocation || isEditing) && (
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Location (Coordinates)</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <span className="text-sm font-medium text-gray-700">Latitude:</span>
              {isEditing ? (
                <input
                  type="number"
                  step="any"
                  value={editedData.vendorLocation?.latitude || ''}
                  onChange={(e) => handleFieldChange('latitude', e.target.value, 'vendorLocation')}
                  onBlur={() => handleSaveField('latitude', editedData.vendorLocation?.latitude, 'vendorLocation')}
                  className="mt-1 w-full px-2 py-1 border border-gray-300 rounded"
                  placeholder="e.g., 28.6139"
                />
              ) : (
                <p className="text-gray-900">{vendor.vendorLocation?.latitude || 'N/A'}</p>
              )}
            </div>
            <div>
              <span className="text-sm font-medium text-gray-700">Longitude:</span>
              {isEditing ? (
                <input
                  type="number"
                  step="any"
                  value={editedData.vendorLocation?.longitude || ''}
                  onChange={(e) => handleFieldChange('longitude', e.target.value, 'vendorLocation')}
                  onBlur={() => handleSaveField('longitude', editedData.vendorLocation?.longitude, 'vendorLocation')}
                  className="mt-1 w-full px-2 py-1 border border-gray-300 rounded"
                  placeholder="e.g., 77.2090"
                />
              ) : (
                <p className="text-gray-900">{vendor.vendorLocation?.longitude || 'N/A'}</p>
              )}
            </div>
          </div>
        </div>
      )}
        </>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg max-w-md w-full mx-4 p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Delete Vendor</h2>
            <p className="text-gray-600 mb-4">
              Are you sure you want to permanently delete vendor "{vendor.companyName || vendor.email}"? This action cannot be undone.
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteVendor}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Block Modal */}
      {showBlockModal && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg max-w-md w-full mx-4 p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              {vendor.isActive ? 'Block Vendor' : 'Unblock Vendor'}
            </h2>
            {vendor.isActive && (
              <>
                <p className="text-gray-600 mb-4">Please provide a reason for blocking this vendor:</p>
                <textarea
                  value={blockReason}
                  onChange={(e) => setBlockReason(e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-md mb-4"
                  rows="4"
                  placeholder="Enter block reason..."
                />
              </>
            )}
            {!vendor.isActive && (
              <p className="text-gray-600 mb-4">Are you sure you want to unblock this vendor?</p>
            )}
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setShowBlockModal(false);
                  setBlockReason('');
                }}
                className="flex-1 px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
              >
                Cancel
              </button>
              <button
                onClick={handleBlockVendor}
                className={`flex-1 px-4 py-2 rounded-md ${
                  vendor.isActive
                    ? 'bg-red-600 text-white hover:bg-red-700'
                    : 'bg-green-600 text-white hover:bg-green-700'
                }`}
              >
                {vendor.isActive ? 'Block Vendor' : 'Unblock Vendor'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default VendorDetail;

