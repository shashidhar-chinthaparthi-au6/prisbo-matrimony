import { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, TextInput, FlatList, Image } from 'react-native';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { getVendors, updateVendor, blockUser, bulkDeleteUsers } from '../services/adminService';
import { getAllProfiles } from '../services/adminService';
import { getImageUrl } from '../config/api';
import { useAuth } from '../context/AuthContext';

const VendorDetailScreen = ({ route, navigation }) => {
  const { id } = route.params;
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
        Alert.alert('Success', 'Vendor status updated successfully');
        queryClient.invalidateQueries(['adminVendors']);
        queryClient.invalidateQueries(['vendor', id]);
        refetch();
        setShowBlockModal(false);
        setBlockReason('');
      },
      onError: (error) => {
        Alert.alert('Error', error.response?.data?.message || 'Failed to update vendor status');
      },
    }
  );

  // Delete mutation
  const deleteUserMutation = useMutation(
    (userId) => bulkDeleteUsers([userId]),
    {
      onSuccess: () => {
        Alert.alert('Success', 'Vendor deleted successfully');
        queryClient.invalidateQueries(['adminVendors']);
        navigation.goBack();
      },
      onError: (error) => {
        Alert.alert('Error', error.response?.data?.message || 'Failed to delete vendor');
      },
    }
  );

  // Update vendor mutation
  const updateVendorMutation = useMutation(
    (data) => updateVendor(id, data),
    {
      onSuccess: () => {
        Alert.alert('Success', 'Vendor updated successfully');
        queryClient.invalidateQueries(['adminVendors']);
        queryClient.invalidateQueries(['vendor', id]);
        refetch();
      },
      onError: (error) => {
        Alert.alert('Error', error.response?.data?.message || 'Failed to update vendor');
      },
    }
  );

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

  const handleSaveAll = () => {
    updateVendorMutation.mutate(editedData);
    setIsEditing(false);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditedData({});
  };

  const handleBlockVendor = () => {
    if (vendor.isActive && !blockReason.trim()) {
      Alert.alert('Error', 'Please provide a reason for blocking');
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

  if (isLoading || authLoading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (!vendor) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>Vendor Not Found</Text>
        <TouchableOpacity
          style={styles.button}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.buttonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          {isEditing ? (
            <View style={styles.editHeader}>
              <TextInput
                style={styles.nameInput}
                value={editedData.firstName || ''}
                onChangeText={(value) => handleFieldChange('firstName', value)}
                onBlur={() => handleSaveField('firstName', editedData.firstName)}
                placeholder="First Name"
              />
              <TextInput
                style={styles.nameInput}
                value={editedData.lastName || ''}
                onChangeText={(value) => handleFieldChange('lastName', value)}
                onBlur={() => handleSaveField('lastName', editedData.lastName)}
                placeholder="Last Name"
              />
              <TextInput
                style={styles.companyInput}
                value={editedData.companyName || ''}
                onChangeText={(value) => handleFieldChange('companyName', value)}
                onBlur={() => handleSaveField('companyName', editedData.companyName)}
                placeholder="Company Name"
              />
            </View>
          ) : (
            <>
              <Text style={styles.name}>
                {vendor.firstName} {vendor.lastName}
              </Text>
              <Text style={styles.company}>{vendor.companyName || 'N/A'}</Text>
            </>
          )}
          <View style={styles.badges}>
            <View style={[styles.badge, vendor.isActive ? styles.activeBadge : styles.blockedBadge]}>
              <Text style={styles.badgeText}>{vendor.isActive ? 'Active' : 'Blocked'}</Text>
            </View>
            {vendor.isVerified && (
              <View style={[styles.badge, styles.verifiedBadge]}>
                <Text style={styles.badgeText}>Verified</Text>
              </View>
            )}
          </View>
        </View>
        <View style={styles.actions}>
          {!isEditing ? (
            <TouchableOpacity
              style={[styles.actionButton, styles.editButton]}
              onPress={() => setIsEditing(true)}
            >
              <Text style={styles.actionButtonText}>✏️ Edit Vendor</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.editActions}>
              <TouchableOpacity
                style={[styles.actionButton, styles.cancelButton]}
                onPress={handleCancelEdit}
              >
                <Text style={styles.actionButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionButton, styles.saveButton]}
                onPress={handleSaveAll}
              >
                <Text style={styles.actionButtonText}>Save All</Text>
              </TouchableOpacity>
            </View>
          )}
          {profilesData?.profiles && profilesData.profiles.length > 0 && (
            <TouchableOpacity
              style={[styles.actionButton, styles.viewProfilesButton]}
              onPress={handleViewProfiles}
            >
              <Text style={styles.actionButtonText}>
                👥 View Profiles ({profilesData.profiles.length})
              </Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={[styles.actionButton, vendor.isActive ? styles.blockButton : styles.unblockButton]}
            onPress={() => setShowBlockModal(true)}
          >
            <Text style={styles.actionButtonText}>
              {vendor.isActive ? '🚫 Block Vendor' : '✅ Unblock Vendor'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionButton, styles.deleteButton]}
            onPress={() => setShowDeleteConfirm(true)}
          >
            <Text style={styles.actionButtonText}>🗑️ Delete Vendor</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Toggle between Details and Profiles */}
      {showProfiles ? (
        <>
          {/* Back to Details Button */}
          <View style={styles.section}>
            <TouchableOpacity
              style={[styles.actionButton, styles.backButton]}
              onPress={handleBackToDetails}
            >
              <Text style={styles.actionButtonText}>← Back to Details</Text>
            </TouchableOpacity>
          </View>

          {/* Profiles List */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              Profiles ({profilesData?.profiles?.length || 0})
            </Text>
            {profilesData?.profiles && profilesData.profiles.length > 0 ? (
              <FlatList
                data={profilesData.profiles}
                keyExtractor={(item) => item._id}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={styles.profileCard}
                    onPress={() => navigation.navigate('ProfileDetail', { id: item._id })}
                  >
                    <View style={styles.profileCardHeader}>
                      {item.photos && item.photos.length > 0 && (
                        <Image
                          source={{ uri: getImageUrl(item.photos.find(p => p.isPrimary)?.url || item.photos[0]?.url) }}
                          style={styles.profileImage}
                        />
                      )}
                      <View style={styles.profileCardInfo}>
                        <Text style={styles.profileName}>
                          {item.personalInfo?.firstName} {item.personalInfo?.lastName}
                        </Text>
                        <Text style={styles.profileDetails}>
                          {item.type} • Age: {item.personalInfo?.age}
                        </Text>
                        <Text style={styles.profileDetails}>
                          {item.location?.city}, {item.location?.state}
                        </Text>
                        <View style={styles.profileBadges}>
                          <View style={[styles.profileBadge, item.isActive ? styles.activeProfileBadge : styles.inactiveProfileBadge]}>
                            <Text style={[styles.profileBadgeText, item.isActive ? styles.activeBadgeText : styles.inactiveBadgeText]}>
                              {item.isActive ? 'Active' : 'Inactive'}
                            </Text>
                          </View>
                          <View style={[styles.profileBadge, 
                            item.verificationStatus === 'approved' ? styles.approvedBadge :
                            item.verificationStatus === 'rejected' ? styles.rejectedBadge :
                            styles.pendingBadge
                          ]}>
                            <Text style={[styles.profileBadgeText,
                              item.verificationStatus === 'approved' ? styles.approvedBadgeText :
                              item.verificationStatus === 'rejected' ? styles.rejectedBadgeText :
                              styles.pendingBadgeText
                            ]}>
                              {item.verificationStatus || 'pending'}
                            </Text>
                          </View>
                        </View>
                      </View>
                    </View>
                    {item.userId && (
                      <View style={styles.profileContact}>
                        <Text style={styles.profileContactText}>
                          📧 {item.userId.email}
                        </Text>
                        <Text style={styles.profileContactText}>
                          📱 {item.userId.phone}
                        </Text>
                      </View>
                    )}
                  </TouchableOpacity>
                )}
                ListEmptyComponent={
                  <View style={styles.emptyContainer}>
                    <Text style={styles.emptyText}>No profiles found</Text>
                  </View>
                }
              />
            ) : (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>No profiles found</Text>
              </View>
            )}
          </View>
        </>
      ) : (
        <>
      {/* Basic Information */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Basic Information</Text>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>First Name:</Text>
          {isEditing ? (
            <TextInput
              style={styles.input}
              value={editedData.firstName || ''}
              onChangeText={(value) => handleFieldChange('firstName', value)}
              onBlur={() => handleSaveField('firstName', editedData.firstName)}
              placeholder="First Name"
            />
          ) : (
            <Text style={styles.info}>{vendor.firstName || 'N/A'}</Text>
          )}
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Last Name:</Text>
          {isEditing ? (
            <TextInput
              style={styles.input}
              value={editedData.lastName || ''}
              onChangeText={(value) => handleFieldChange('lastName', value)}
              onBlur={() => handleSaveField('lastName', editedData.lastName)}
              placeholder="Last Name"
            />
          ) : (
            <Text style={styles.info}>{vendor.lastName || 'N/A'}</Text>
          )}
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Company Name:</Text>
          {isEditing ? (
            <TextInput
              style={styles.input}
              value={editedData.companyName || ''}
              onChangeText={(value) => handleFieldChange('companyName', value)}
              onBlur={() => handleSaveField('companyName', editedData.companyName)}
              placeholder="Company Name"
            />
          ) : (
            <Text style={styles.info}>{vendor.companyName || 'N/A'}</Text>
          )}
        </View>
      </View>

      {/* Contact Information */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Contact Information</Text>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Email:</Text>
          {isEditing ? (
            <TextInput
              style={styles.input}
              value={editedData.email || ''}
              onChangeText={(value) => handleFieldChange('email', value)}
              onBlur={() => handleSaveField('email', editedData.email)}
              placeholder="Email"
              keyboardType="email-address"
            />
          ) : (
            <Text style={styles.info}>{vendor.email || 'N/A'}</Text>
          )}
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Phone:</Text>
          {isEditing ? (
            <TextInput
              style={styles.input}
              value={editedData.phone || ''}
              onChangeText={(value) => handleFieldChange('phone', value)}
              onBlur={() => handleSaveField('phone', editedData.phone)}
              placeholder="Phone"
              keyboardType="phone-pad"
            />
          ) : (
            <Text style={styles.info}>{vendor.phone || 'N/A'}</Text>
          )}
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Contact Info:</Text>
          {isEditing ? (
            <TextInput
              style={styles.input}
              value={editedData.vendorContactInfo || ''}
              onChangeText={(value) => handleFieldChange('vendorContactInfo', value)}
              onBlur={() => handleSaveField('vendorContactInfo', editedData.vendorContactInfo)}
              placeholder="Contact Info"
            />
          ) : (
            <Text style={styles.info}>{vendor.vendorContactInfo || 'N/A'}</Text>
          )}
        </View>
      </View>

      {/* Address */}
      {(vendor.vendorAddress || isEditing) && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Address</Text>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Street:</Text>
            {isEditing ? (
              <TextInput
                style={styles.input}
                value={editedData.vendorAddress?.street || ''}
                onChangeText={(value) => handleFieldChange('street', value, 'vendorAddress')}
                onBlur={() => handleSaveField('street', editedData.vendorAddress?.street, 'vendorAddress')}
                placeholder="Street"
              />
            ) : (
              <Text style={styles.info}>{vendor.vendorAddress?.street || 'N/A'}</Text>
            )}
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>City:</Text>
            {isEditing ? (
              <TextInput
                style={styles.input}
                value={editedData.vendorAddress?.city || ''}
                onChangeText={(value) => handleFieldChange('city', value, 'vendorAddress')}
                onBlur={() => handleSaveField('city', editedData.vendorAddress?.city, 'vendorAddress')}
                placeholder="City"
              />
            ) : (
              <Text style={styles.info}>{vendor.vendorAddress?.city || 'N/A'}</Text>
            )}
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>State:</Text>
            {isEditing ? (
              <TextInput
                style={styles.input}
                value={editedData.vendorAddress?.state || ''}
                onChangeText={(value) => handleFieldChange('state', value, 'vendorAddress')}
                onBlur={() => handleSaveField('state', editedData.vendorAddress?.state, 'vendorAddress')}
                placeholder="State"
              />
            ) : (
              <Text style={styles.info}>{vendor.vendorAddress?.state || 'N/A'}</Text>
            )}
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Pincode:</Text>
            {isEditing ? (
              <TextInput
                style={styles.input}
                value={editedData.vendorAddress?.pincode || ''}
                onChangeText={(value) => handleFieldChange('pincode', value, 'vendorAddress')}
                onBlur={() => handleSaveField('pincode', editedData.vendorAddress?.pincode, 'vendorAddress')}
                placeholder="Pincode"
                keyboardType="numeric"
              />
            ) : (
              <Text style={styles.info}>{vendor.vendorAddress?.pincode || 'N/A'}</Text>
            )}
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Country:</Text>
            {isEditing ? (
              <TextInput
                style={styles.input}
                value={editedData.vendorAddress?.country || ''}
                onChangeText={(value) => handleFieldChange('country', value, 'vendorAddress')}
                onBlur={() => handleSaveField('country', editedData.vendorAddress?.country, 'vendorAddress')}
                placeholder="Country"
              />
            ) : (
              <Text style={styles.info}>{vendor.vendorAddress?.country || 'N/A'}</Text>
            )}
          </View>
        </View>
      )}

      {/* Business Details */}
      {(vendor.vendorBusinessDetails || isEditing) && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Business Details</Text>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Business Type:</Text>
            {isEditing ? (
              <TextInput
                style={styles.input}
                value={editedData.vendorBusinessDetails?.businessType || ''}
                onChangeText={(value) => handleFieldChange('businessType', value, 'vendorBusinessDetails')}
                onBlur={() => handleSaveField('businessType', editedData.vendorBusinessDetails?.businessType, 'vendorBusinessDetails')}
                placeholder="Business Type"
              />
            ) : (
              <Text style={styles.info}>{vendor.vendorBusinessDetails?.businessType || 'N/A'}</Text>
            )}
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Registration Number:</Text>
            {isEditing ? (
              <TextInput
                style={styles.input}
                value={editedData.vendorBusinessDetails?.registrationNumber || ''}
                onChangeText={(value) => handleFieldChange('registrationNumber', value, 'vendorBusinessDetails')}
                onBlur={() => handleSaveField('registrationNumber', editedData.vendorBusinessDetails?.registrationNumber, 'vendorBusinessDetails')}
                placeholder="Registration Number"
              />
            ) : (
              <Text style={styles.info}>{vendor.vendorBusinessDetails?.registrationNumber || 'N/A'}</Text>
            )}
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>GST Number:</Text>
            {isEditing ? (
              <TextInput
                style={styles.input}
                value={editedData.vendorBusinessDetails?.gstNumber || ''}
                onChangeText={(value) => handleFieldChange('gstNumber', value, 'vendorBusinessDetails')}
                onBlur={() => handleSaveField('gstNumber', editedData.vendorBusinessDetails?.gstNumber, 'vendorBusinessDetails')}
                placeholder="GST Number"
              />
            ) : (
              <Text style={styles.info}>{vendor.vendorBusinessDetails?.gstNumber || 'N/A'}</Text>
            )}
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>PAN Number:</Text>
            {isEditing ? (
              <TextInput
                style={styles.input}
                value={editedData.vendorBusinessDetails?.panNumber || ''}
                onChangeText={(value) => handleFieldChange('panNumber', value, 'vendorBusinessDetails')}
                onBlur={() => handleSaveField('panNumber', editedData.vendorBusinessDetails?.panNumber, 'vendorBusinessDetails')}
                placeholder="PAN Number"
              />
            ) : (
              <Text style={styles.info}>{vendor.vendorBusinessDetails?.panNumber || 'N/A'}</Text>
            )}
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Year Established:</Text>
            {isEditing ? (
              <TextInput
                style={styles.input}
                value={editedData.vendorBusinessDetails?.yearEstablished || ''}
                onChangeText={(value) => handleFieldChange('yearEstablished', value, 'vendorBusinessDetails')}
                onBlur={() => handleSaveField('yearEstablished', editedData.vendorBusinessDetails?.yearEstablished, 'vendorBusinessDetails')}
                placeholder="Year Established"
                keyboardType="numeric"
              />
            ) : (
              <Text style={styles.info}>{vendor.vendorBusinessDetails?.yearEstablished || 'N/A'}</Text>
            )}
          </View>
          {vendor.vendorBusinessDetails?.description && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Description:</Text>
              {isEditing ? (
                <TextInput
                  style={[styles.input, styles.textArea]}
                  value={editedData.vendorBusinessDetails?.description || ''}
                  onChangeText={(value) => handleFieldChange('description', value, 'vendorBusinessDetails')}
                  onBlur={() => handleSaveField('description', editedData.vendorBusinessDetails?.description, 'vendorBusinessDetails')}
                  placeholder="Description"
                  multiline
                  numberOfLines={3}
                />
              ) : (
                <Text style={styles.info}>{vendor.vendorBusinessDetails.description}</Text>
              )}
            </View>
          )}
        </View>
      )}

      {/* Location */}
      {(vendor.vendorLocation || isEditing) && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Location (Coordinates)</Text>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Latitude:</Text>
            {isEditing ? (
              <TextInput
                style={styles.input}
                value={editedData.vendorLocation?.latitude || ''}
                onChangeText={(value) => handleFieldChange('latitude', value, 'vendorLocation')}
                onBlur={() => handleSaveField('latitude', editedData.vendorLocation?.latitude, 'vendorLocation')}
                placeholder="Latitude"
                keyboardType="numeric"
              />
            ) : (
              <Text style={styles.info}>{vendor.vendorLocation?.latitude || 'N/A'}</Text>
            )}
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Longitude:</Text>
            {isEditing ? (
              <TextInput
                style={styles.input}
                value={editedData.vendorLocation?.longitude || ''}
                onChangeText={(value) => handleFieldChange('longitude', value, 'vendorLocation')}
                onBlur={() => handleSaveField('longitude', editedData.vendorLocation?.longitude, 'vendorLocation')}
                placeholder="Longitude"
                keyboardType="numeric"
              />
            ) : (
              <Text style={styles.info}>{vendor.vendorLocation?.longitude || 'N/A'}</Text>
            )}
          </View>
        </View>
      )}
        </>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <View style={styles.modalOverlay}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>Delete Vendor</Text>
            <Text style={styles.modalText}>
              Are you sure you want to permanently delete vendor "{vendor.companyName || vendor.email}"? This action cannot be undone.
            </Text>
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelModalButton]}
                onPress={() => setShowDeleteConfirm(false)}
              >
                <Text style={styles.modalButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.deleteModalButton]}
                onPress={handleDeleteVendor}
              >
                <Text style={styles.modalButtonText}>Delete</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

      {/* Block Modal */}
      {showBlockModal && (
        <View style={styles.modalOverlay}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>
              {vendor.isActive ? 'Block Vendor' : 'Unblock Vendor'}
            </Text>
            {vendor.isActive && (
              <>
                <Text style={styles.modalText}>Please provide a reason for blocking this vendor:</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  value={blockReason}
                  onChangeText={setBlockReason}
                  placeholder="Enter block reason..."
                  multiline
                  numberOfLines={4}
                />
              </>
            )}
            {!vendor.isActive && (
              <Text style={styles.modalText}>Are you sure you want to unblock this vendor?</Text>
            )}
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelModalButton]}
                onPress={() => {
                  setShowBlockModal(false);
                  setBlockReason('');
                }}
              >
                <Text style={styles.modalButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, vendor.isActive ? styles.blockModalButton : styles.unblockModalButton]}
                onPress={handleBlockVendor}
              >
                <Text style={styles.modalButtonText}>
                  {vendor.isActive ? 'Block Vendor' : 'Unblock Vendor'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#dc2626',
    marginBottom: 20,
  },
  header: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  name: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  company: {
    fontSize: 18,
    color: '#666',
    marginBottom: 10,
  },
  editHeader: {
    marginBottom: 10,
  },
  nameInput: {
    fontSize: 28,
    fontWeight: 'bold',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    padding: 8,
    marginBottom: 5,
    backgroundColor: '#fff',
  },
  companyInput: {
    fontSize: 18,
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    padding: 8,
    backgroundColor: '#fff',
  },
  badges: {
    flexDirection: 'row',
    marginTop: 10,
  },
  badge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 8,
  },
  activeBadge: {
    backgroundColor: '#d1fae5',
  },
  blockedBadge: {
    backgroundColor: '#fee2e2',
  },
  verifiedBadge: {
    backgroundColor: '#dbeafe',
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#065f46',
  },
  actions: {
    marginTop: 15,
    gap: 10,
  },
  actionButton: {
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 10,
  },
  editButton: {
    backgroundColor: '#3b82f6',
  },
  cancelButton: {
    backgroundColor: '#6b7280',
  },
  saveButton: {
    backgroundColor: '#10b981',
  },
  viewProfilesButton: {
    backgroundColor: '#10b981',
  },
  blockButton: {
    backgroundColor: '#f59e0b',
  },
  unblockButton: {
    backgroundColor: '#10b981',
  },
  deleteButton: {
    backgroundColor: '#dc2626',
  },
  actionButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
  },
  editActions: {
    flexDirection: 'row',
    gap: 10,
  },
  section: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 15,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  infoLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginRight: 8,
    minWidth: 150,
  },
  info: {
    flex: 1,
    fontSize: 16,
    color: '#666',
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    padding: 8,
    fontSize: 16,
    backgroundColor: '#fff',
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  modal: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    width: '90%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 15,
  },
  modalText: {
    fontSize: 16,
    color: '#666',
    marginBottom: 15,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 15,
  },
  modalButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelModalButton: {
    backgroundColor: '#6b7280',
  },
  deleteModalButton: {
    backgroundColor: '#dc2626',
  },
  blockModalButton: {
    backgroundColor: '#dc2626',
  },
  unblockModalButton: {
    backgroundColor: '#10b981',
  },
  modalButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  button: {
    backgroundColor: '#ef4444',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  backButton: {
    backgroundColor: '#6b7280',
    marginBottom: 10,
  },
  profileCard: {
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    padding: 15,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  profileCardHeader: {
    flexDirection: 'row',
    marginBottom: 10,
  },
  profileImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
    marginRight: 15,
  },
  profileCardInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 5,
  },
  profileDetails: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 3,
  },
  profileBadges: {
    flexDirection: 'row',
    marginTop: 8,
    gap: 8,
  },
  profileBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  activeProfileBadge: {
    backgroundColor: '#d1fae5',
  },
  inactiveProfileBadge: {
    backgroundColor: '#fee2e2',
  },
  approvedBadge: {
    backgroundColor: '#dbeafe',
  },
  rejectedBadge: {
    backgroundColor: '#fee2e2',
  },
  pendingBadge: {
    backgroundColor: '#fef3c7',
  },
  profileBadgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  activeBadgeText: {
    color: '#065f46',
  },
  inactiveBadgeText: {
    color: '#991b1b',
  },
  approvedBadgeText: {
    color: '#1e40af',
  },
  rejectedBadgeText: {
    color: '#991b1b',
  },
  pendingBadgeText: {
    color: '#92400e',
  },
  profileContact: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  profileContactText: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 3,
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#9ca3af',
    textAlign: 'center',
  },
});

export default VendorDetailScreen;

