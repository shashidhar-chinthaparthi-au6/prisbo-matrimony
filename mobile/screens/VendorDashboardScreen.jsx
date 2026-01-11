import { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator, FlatList, Alert, TextInput, Modal } from 'react-native';
import {
  getMyProfiles,
  getMyStats,
  deleteMyProfile,
  approveProfile,
  rejectProfile,
  updateProfileStatus,
  createProfileForPerson,
} from '../services/vendorService';
import { indianStates, stateCities } from '../utils/indianLocations';
import { religions, casteCategories } from '../utils/religionData';
import Dropdown from '../components/Dropdown';

const VendorDashboardScreen = ({ navigation }) => {
  const [activeTab, setActiveTab] = useState('profiles');
  const [loading, setLoading] = useState(false);
  const [profiles, setProfiles] = useState([]);
  const [stats, setStats] = useState(null);
  const [page, setPage] = useState(1);
  const [rejectingProfile, setRejectingProfile] = useState(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [creatingProfile, setCreatingProfile] = useState(false);
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
    userId: '',
  });

  useEffect(() => {
    if (activeTab === 'profiles') {
      loadProfiles();
    } else if (activeTab === 'stats') {
      loadStats();
    }
  }, [activeTab, page]);

  const loadProfiles = async () => {
    setLoading(true);
    try {
      const response = await getMyProfiles({ page, limit: 20 });
      setProfiles(response.profiles || []);
    } catch (error) {
      Alert.alert('Error', error.response?.data?.message || 'Failed to load profiles');
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    setLoading(true);
    try {
      const response = await getMyStats();
      setStats(response.stats);
    } catch (error) {
      Alert.alert('Error', error.response?.data?.message || 'Failed to load statistics');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = (id) => {
    Alert.alert(
      'Delete Profile',
      'Are you sure you want to delete this profile?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteMyProfile(id);
              Alert.alert('Success', 'Profile deleted successfully');
              loadProfiles();
              loadStats();
            } catch (error) {
              Alert.alert('Error', error.response?.data?.message || 'Failed to delete profile');
            }
          },
        },
      ]
    );
  };

  const handleApprove = async (id) => {
    Alert.alert(
      'Approve Profile',
      'Are you sure you want to approve this profile?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Approve',
          onPress: async () => {
            try {
              await approveProfile(id);
              Alert.alert('Success', 'Profile approved successfully');
              loadProfiles();
              loadStats();
            } catch (error) {
              Alert.alert('Error', error.response?.data?.message || 'Failed to approve profile');
            }
          },
        },
      ]
    );
  };

  const handleReject = async () => {
    if (!rejectionReason.trim()) {
      Alert.alert('Error', 'Please provide a rejection reason');
      return;
    }
    try {
      await rejectProfile(rejectingProfile._id, rejectionReason);
      Alert.alert('Success', 'Profile rejected successfully');
      setRejectingProfile(null);
      setRejectionReason('');
      loadProfiles();
      loadStats();
    } catch (error) {
      Alert.alert('Error', error.response?.data?.message || 'Failed to reject profile');
    }
  };

  const handleStatusToggle = async (profile) => {
    try {
      await updateProfileStatus(profile._id, !profile.isActive);
      Alert.alert('Success', `Profile ${!profile.isActive ? 'activated' : 'deactivated'} successfully`);
      loadProfiles();
      loadStats();
    } catch (error) {
      Alert.alert('Error', error.response?.data?.message || 'Failed to update profile status');
    }
  };

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

  const handleSubmit = async () => {
    // Validate required fields
    if (!formData.personalInfo?.firstName || !formData.personalInfo?.lastName) {
      Alert.alert('Error', 'First name and last name are required');
      return;
    }
    if (!formData.personalInfo?.dateOfBirth) {
      Alert.alert('Error', 'Date of birth is required');
      return;
    }
    if (!formData.location?.city || !formData.location?.state) {
      Alert.alert('Error', 'City and state are required');
      return;
    }
    if (!formData.type) {
      Alert.alert('Error', 'Profile type (bride/groom) is required');
      return;
    }

    setCreatingProfile(true);
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

      await createProfileForPerson(profilePayload);
      Alert.alert('Success', 'Profile created successfully!');
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
      loadProfiles();
      loadStats();
    } catch (error) {
      Alert.alert('Error', error.response?.data?.message || 'Failed to create profile');
    } finally {
      setCreatingProfile(false);
    }
  };

  const renderProfileItem = ({ item }) => (
    <View style={styles.profileCard}>
      <View style={styles.profileHeader}>
        <Text style={styles.profileName}>
          {item.personalInfo?.firstName} {item.personalInfo?.lastName}
        </Text>
        <View style={styles.badgeContainer}>
          <View style={[styles.badge, styles.typeBadge]}>
            <Text style={styles.badgeText}>{item.type}</Text>
          </View>
        </View>
      </View>
      
      <View style={styles.profileInfo}>
        <View style={styles.statusRow}>
          <Text style={styles.label}>Status:</Text>
          <View style={[styles.badge, item.isActive ? styles.activeBadge : styles.inactiveBadge]}>
            <Text style={styles.badgeText}>{item.isActive ? 'Active' : 'Inactive'}</Text>
          </View>
        </View>
        
        <View style={styles.statusRow}>
          <Text style={styles.label}>Verification:</Text>
          <View style={[
            styles.badge,
            item.verificationStatus === 'approved' ? styles.approvedBadge :
            item.verificationStatus === 'rejected' ? styles.rejectedBadge :
            styles.pendingBadge
          ]}>
            <Text style={styles.badgeText}>{item.verificationStatus}</Text>
          </View>
        </View>
      </View>

      <View style={styles.actionButtons}>
        <TouchableOpacity
          style={[styles.actionButton, styles.viewButton]}
          onPress={() => navigation.navigate('ProfileDetail', { id: item._id })}
        >
          <Text style={styles.viewButtonText}>View</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionButton, styles.editButton]}
          onPress={() => {
            Alert.alert('Edit Profile', 'Profile editing form would be implemented here');
          }}
        >
          <Text style={styles.editButtonText}>Edit</Text>
        </TouchableOpacity>
        {item.verificationStatus === 'pending' && (
          <>
            <TouchableOpacity
              style={[styles.actionButton, styles.approveButton]}
              onPress={() => handleApprove(item._id)}
            >
              <Text style={styles.approveButtonText}>Approve</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionButton, styles.rejectButton]}
              onPress={() => setRejectingProfile(item)}
            >
              <Text style={styles.rejectButtonText}>Reject</Text>
            </TouchableOpacity>
          </>
        )}
        <TouchableOpacity
          style={[styles.actionButton, item.isActive ? styles.deactivateButton : styles.activateButton]}
          onPress={() => handleStatusToggle(item)}
        >
          <Text style={item.isActive ? styles.deactivateButtonText : styles.activateButtonText}>
            {item.isActive ? 'Deactivate' : 'Activate'}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionButton, styles.deleteButton]}
          onPress={() => handleDelete(item._id)}
        >
          <Text style={styles.deleteButtonText}>Delete</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Vendor Dashboard</Text>
        <Text style={styles.subtitle}>Manage profiles you've created</Text>
      </View>

      {/* Tabs */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'profiles' && styles.activeTab]}
          onPress={() => setActiveTab('profiles')}
        >
          <Text style={[styles.tabText, activeTab === 'profiles' && styles.activeTabText]}>
            My Profiles
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'stats' && styles.activeTab]}
          onPress={() => setActiveTab('stats')}
        >
          <Text style={[styles.tabText, activeTab === 'stats' && styles.activeTabText]}>
            Statistics
          </Text>
        </TouchableOpacity>
      </View>

      {/* Stats Tab */}
      {activeTab === 'stats' && (
        <ScrollView style={styles.content}>
          {loading ? (
            <ActivityIndicator size="large" style={styles.loader} />
          ) : stats ? (
            <View style={styles.statsContainer}>
              <View style={[styles.statCard, styles.blueCard]}>
                <Text style={styles.statLabel}>Total Profiles</Text>
                <Text style={styles.statValue}>{stats.totalProfiles}</Text>
              </View>
              <View style={[styles.statCard, styles.greenCard]}>
                <Text style={styles.statLabel}>Active Profiles</Text>
                <Text style={styles.statValue}>{stats.activeProfiles}</Text>
              </View>
              <View style={[styles.statCard, styles.yellowCard]}>
                <Text style={styles.statLabel}>Pending Verification</Text>
                <Text style={styles.statValue}>{stats.pendingProfiles}</Text>
              </View>
              <View style={[styles.statCard, styles.purpleCard]}>
                <Text style={styles.statLabel}>Approved Profiles</Text>
                <Text style={styles.statValue}>{stats.approvedProfiles}</Text>
              </View>
            </View>
          ) : null}
        </ScrollView>
      )}

      {/* Profiles Tab */}
      {activeTab === 'profiles' && (
        <View style={styles.content}>
          <View style={styles.profilesHeader}>
            <Text style={styles.sectionTitle}>My Profiles</Text>
            <TouchableOpacity
              style={styles.createButton}
              onPress={() => setShowCreateForm(true)}
            >
              <Text style={styles.createButtonText}>Create New</Text>
            </TouchableOpacity>
          </View>

          {loading ? (
            <ActivityIndicator size="large" style={styles.loader} />
          ) : profiles.length > 0 ? (
            <FlatList
              data={profiles}
              renderItem={renderProfileItem}
              keyExtractor={(item) => item._id}
              contentContainerStyle={styles.listContainer}
              refreshing={loading}
              onRefresh={loadProfiles}
            />
          ) : (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No profiles found. Create your first profile!</Text>
            </View>
          )}
        </View>
      )}

      {/* Reject Profile Modal */}
      <Modal
        visible={!!rejectingProfile}
        transparent={true}
        animationType="slide"
        onRequestClose={() => {
          setRejectingProfile(null);
          setRejectionReason('');
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Reject Profile</Text>
            <Text style={styles.modalSubtitle}>Please provide a reason for rejecting this profile.</Text>
            <TextInput
              style={styles.reasonInput}
              value={rejectionReason}
              onChangeText={setRejectionReason}
              placeholder="Enter rejection reason..."
              multiline
              numberOfLines={4}
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => {
                  setRejectingProfile(null);
                  setRejectionReason('');
                }}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.confirmButton]}
                onPress={handleReject}
                disabled={!rejectionReason.trim()}
              >
                <Text style={styles.confirmButtonText}>Reject</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Create Profile Modal */}
      <Modal
        visible={showCreateForm}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowCreateForm(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.createModalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Create New Profile</Text>
              <TouchableOpacity
                onPress={() => {
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
              >
                <Text style={styles.closeButton}>✕</Text>
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.formScrollView} showsVerticalScrollIndicator={true}>
              {/* Profile Type */}
              <View style={styles.formSection}>
                <Text style={styles.sectionLabel}>Profile Type <Text style={styles.required}>*</Text></Text>
                <View style={styles.radioGroup}>
                  <TouchableOpacity
                    style={[styles.radioOption, formData.type === 'bride' && styles.radioSelected]}
                    onPress={() => handleFieldChange('root', 'type', 'bride')}
                  >
                    <Text style={[styles.radioText, formData.type === 'bride' && styles.radioTextSelected]}>Bride</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.radioOption, formData.type === 'groom' && styles.radioSelected]}
                    onPress={() => handleFieldChange('root', 'type', 'groom')}
                  >
                    <Text style={[styles.radioText, formData.type === 'groom' && styles.radioTextSelected]}>Groom</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* User Account Info */}
              <View style={styles.formSection}>
                <Text style={styles.sectionLabel}>User Account (Optional)</Text>
                <Text style={styles.sectionHint}>If person has account, enter User ID. Otherwise provide email/phone.</Text>
                <TextInput
                  style={styles.input}
                  value={formData.userId}
                  onChangeText={(value) => handleFieldChange('root', 'userId', value)}
                  placeholder="User ID (if exists)"
                />
                <TextInput
                  style={styles.input}
                  value={formData.email}
                  onChangeText={(value) => handleFieldChange('root', 'email', value)}
                  placeholder="Email"
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
                <TextInput
                  style={styles.input}
                  value={formData.phone}
                  onChangeText={(value) => handleFieldChange('root', 'phone', value)}
                  placeholder="Phone"
                  keyboardType="phone-pad"
                />
              </View>

              {/* Personal Information */}
              <View style={styles.formSection}>
                <Text style={styles.sectionLabel}>Personal Information</Text>
                <TextInput
                  style={styles.input}
                  value={formData.personalInfo?.firstName || ''}
                  onChangeText={(value) => handleFieldChange('personalInfo', 'firstName', value)}
                  placeholder="First Name *"
                />
                <TextInput
                  style={styles.input}
                  value={formData.personalInfo?.lastName || ''}
                  onChangeText={(value) => handleFieldChange('personalInfo', 'lastName', value)}
                  placeholder="Last Name *"
                />
                <Text style={styles.inputLabel}>Date of Birth <Text style={styles.required}>*</Text></Text>
                <TextInput
                  style={styles.input}
                  value={formData.personalInfo?.dateOfBirth || ''}
                  onChangeText={(value) => handleFieldChange('personalInfo', 'dateOfBirth', value)}
                  placeholder="YYYY-MM-DD"
                />
                <TextInput
                  style={styles.input}
                  value={formData.personalInfo?.height || ''}
                  onChangeText={(value) => handleFieldChange('personalInfo', 'height', value)}
                  placeholder="Height (e.g., 5'6&quot; or 168 cm)"
                />
                <TextInput
                  style={styles.input}
                  value={formData.personalInfo?.weight || ''}
                  onChangeText={(value) => handleFieldChange('personalInfo', 'weight', value)}
                  placeholder="Weight (e.g., 65 kg)"
                />
                <Dropdown
                  options={[
                    { label: 'Select', value: '' },
                    { label: 'Never Married', value: 'Never Married' },
                    { label: 'Divorced', value: 'Divorced' },
                    { label: 'Widowed', value: 'Widowed' },
                  ]}
                  value={formData.personalInfo?.maritalStatus || ''}
                  onSelect={(value) => handleFieldChange('personalInfo', 'maritalStatus', value)}
                  placeholder="Marital Status"
                  style={styles.input}
                />
                <Dropdown
                  options={[
                    { label: 'Select', value: '' },
                    { label: 'Fair', value: 'Fair' },
                    { label: 'Wheatish', value: 'Wheatish' },
                    { label: 'Wheatish Brown', value: 'Wheatish Brown' },
                    { label: 'Dark', value: 'Dark' },
                  ]}
                  value={formData.personalInfo?.complexion || ''}
                  onSelect={(value) => handleFieldChange('personalInfo', 'complexion', value)}
                  placeholder="Complexion"
                  style={styles.input}
                />
                <TextInput
                  style={styles.input}
                  value={formData.personalInfo?.motherTongue || ''}
                  onChangeText={(value) => handleFieldChange('personalInfo', 'motherTongue', value)}
                  placeholder="Mother Tongue"
                />
              </View>

              {/* Location */}
              <View style={styles.formSection}>
                <Text style={styles.sectionLabel}>Location</Text>
                <Dropdown
                  options={[
                    { label: 'Select State', value: '' },
                    ...indianStates.map((state) => ({ label: state, value: state })),
                  ]}
                  value={formData.location?.state || ''}
                  onSelect={(value) => {
                    handleFieldChange('location', 'state', value);
                    handleFieldChange('location', 'city', '');
                  }}
                  placeholder="State *"
                  style={styles.input}
                />
                <Dropdown
                  options={[
                    { label: 'Select City', value: '' },
                    ...(formData.location?.state && stateCities[formData.location.state]
                      ? stateCities[formData.location.state].map((city) => ({ label: city, value: city }))
                      : []),
                  ]}
                  value={formData.location?.city || ''}
                  onSelect={(value) => handleFieldChange('location', 'city', value)}
                  placeholder="City *"
                  style={styles.input}
                  disabled={!formData.location?.state}
                />
                <TextInput
                  style={styles.input}
                  value={formData.location?.country || 'India'}
                  onChangeText={(value) => handleFieldChange('location', 'country', value)}
                  placeholder="Country"
                />
              </View>

              {/* Religion */}
              <View style={styles.formSection}>
                <Text style={styles.sectionLabel}>Religion</Text>
                <Dropdown
                  options={[
                    { label: 'Select Religion', value: '' },
                    ...religions.map((religion) => ({ label: religion, value: religion })),
                  ]}
                  value={formData.religion?.religion || ''}
                  onSelect={(value) => {
                    handleFieldChange('religion', 'religion', value);
                    handleFieldChange('religion', 'caste', '');
                  }}
                  placeholder="Religion"
                  style={styles.input}
                />
                <Dropdown
                  options={[
                    { label: 'Select Caste', value: '' },
                    ...(formData.religion?.religion && casteCategories[formData.religion.religion]
                      ? casteCategories[formData.religion.religion].map((caste) => ({ label: caste, value: caste }))
                      : []),
                  ]}
                  value={formData.religion?.caste || ''}
                  onSelect={(value) => handleFieldChange('religion', 'caste', value)}
                  placeholder="Caste"
                  style={styles.input}
                  disabled={!formData.religion?.religion}
                />
              </View>

              {/* Education */}
              <View style={styles.formSection}>
                <Text style={styles.sectionLabel}>Education</Text>
                <TextInput
                  style={styles.input}
                  value={formData.education?.level || ''}
                  onChangeText={(value) => handleFieldChange('education', 'level', value)}
                  placeholder="Education Level (e.g., B.Tech, MBA)"
                />
                <TextInput
                  style={styles.input}
                  value={formData.education?.institution || ''}
                  onChangeText={(value) => handleFieldChange('education', 'institution', value)}
                  placeholder="Institution"
                />
              </View>

              {/* Career */}
              <View style={styles.formSection}>
                <Text style={styles.sectionLabel}>Career</Text>
                <TextInput
                  style={styles.input}
                  value={formData.career?.occupation || ''}
                  onChangeText={(value) => handleFieldChange('career', 'occupation', value)}
                  placeholder="Occupation"
                />
                <TextInput
                  style={styles.input}
                  value={formData.career?.income || ''}
                  onChangeText={(value) => handleFieldChange('career', 'income', value)}
                  placeholder="Annual Income (e.g., 5-10 Lakhs)"
                />
              </View>

              {/* Family Info */}
              <View style={styles.formSection}>
                <Text style={styles.sectionLabel}>Family Information</Text>
                <TextInput
                  style={styles.input}
                  value={formData.familyInfo?.fatherName || ''}
                  onChangeText={(value) => handleFieldChange('familyInfo', 'fatherName', value)}
                  placeholder="Father's Name"
                />
                <TextInput
                  style={styles.input}
                  value={formData.familyInfo?.fatherOccupation || ''}
                  onChangeText={(value) => handleFieldChange('familyInfo', 'fatherOccupation', value)}
                  placeholder="Father's Occupation"
                />
                <TextInput
                  style={styles.input}
                  value={formData.familyInfo?.motherName || ''}
                  onChangeText={(value) => handleFieldChange('familyInfo', 'motherName', value)}
                  placeholder="Mother's Name"
                />
                <TextInput
                  style={styles.input}
                  value={formData.familyInfo?.motherOccupation || ''}
                  onChangeText={(value) => handleFieldChange('familyInfo', 'motherOccupation', value)}
                  placeholder="Mother's Occupation"
                />
              </View>

              {/* Submit Button */}
              <View style={styles.formActions}>
                <TouchableOpacity
                  style={[styles.submitButton, creatingProfile && styles.submitButtonDisabled]}
                  onPress={handleSubmit}
                  disabled={creatingProfile}
                >
                  {creatingProfile ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.submitButtonText}>Create Profile</Text>
                  )}
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#fff',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  tab: {
    flex: 1,
    padding: 15,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTab: {
    borderBottomColor: '#ef4444',
  },
  tabText: {
    fontSize: 16,
    color: '#666',
  },
  activeTabText: {
    color: '#ef4444',
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
  },
  loader: {
    marginTop: 50,
  },
  statsContainer: {
    padding: 15,
    gap: 15,
  },
  statCard: {
    padding: 20,
    borderRadius: 10,
    marginBottom: 10,
  },
  blueCard: {
    backgroundColor: '#dbeafe',
  },
  greenCard: {
    backgroundColor: '#dcfce7',
  },
  yellowCard: {
    backgroundColor: '#fef3c7',
  },
  purpleCard: {
    backgroundColor: '#f3e8ff',
  },
  statLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
  },
  statValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
  },
  profilesHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  createButton: {
    backgroundColor: '#ef4444',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 6,
  },
  createButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
  },
  listContainer: {
    padding: 15,
  },
  profileCard: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 15,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  profileHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  profileName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
  },
  badgeContainer: {
    flexDirection: 'row',
    gap: 5,
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  typeBadge: {
    backgroundColor: '#dbeafe',
  },
  activeBadge: {
    backgroundColor: '#dcfce7',
  },
  inactiveBadge: {
    backgroundColor: '#fee2e2',
  },
  approvedBadge: {
    backgroundColor: '#dcfce7',
  },
  rejectedBadge: {
    backgroundColor: '#fee2e2',
  },
  pendingBadge: {
    backgroundColor: '#fef3c7',
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#333',
  },
  profileInfo: {
    marginTop: 10,
    gap: 8,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  label: {
    fontSize: 14,
    color: '#666',
    minWidth: 100,
  },
  actionButtons: {
    flexDirection: 'row',
    marginTop: 15,
    gap: 10,
  },
  actionButton: {
    flex: 1,
    padding: 10,
    borderRadius: 6,
    alignItems: 'center',
  },
  editButton: {
    backgroundColor: '#ef4444',
  },
  deleteButton: {
    backgroundColor: '#dc2626',
  },
  editButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  deleteButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  viewButton: {
    backgroundColor: '#3b82f6',
  },
  viewButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  approveButton: {
    backgroundColor: '#10b981',
  },
  approveButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  rejectButton: {
    backgroundColor: '#ef4444',
  },
  rejectButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  activateButton: {
    backgroundColor: '#10b981',
  },
  activateButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  deactivateButton: {
    backgroundColor: '#f59e0b',
  },
  deactivateButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 20,
    width: '90%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#333',
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 15,
  },
  reasonInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 10,
    minHeight: 100,
    textAlignVertical: 'top',
    marginBottom: 20,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  modalButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 5,
  },
  cancelButton: {
    backgroundColor: '#e5e7eb',
  },
  cancelButtonText: {
    color: '#333',
    fontWeight: 'bold',
  },
  confirmButton: {
    backgroundColor: '#ef4444',
  },
  confirmButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  createModalContent: {
    backgroundColor: '#fff',
    borderRadius: 10,
    width: '95%',
    maxHeight: '90%',
    padding: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    paddingBottom: 10,
  },
  closeButton: {
    fontSize: 24,
    color: '#666',
    fontWeight: 'bold',
  },
  formScrollView: {
    maxHeight: '85%',
  },
  formSection: {
    marginBottom: 20,
  },
  sectionLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  sectionHint: {
    fontSize: 12,
    color: '#666',
    marginBottom: 10,
    fontStyle: 'italic',
  },
  required: {
    color: '#ef4444',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    marginBottom: 10,
    fontSize: 14,
    backgroundColor: '#fff',
  },
  inputLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
  },
  radioGroup: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 5,
  },
  radioOption: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  radioSelected: {
    borderColor: '#ef4444',
    backgroundColor: '#fee2e2',
  },
  radioText: {
    fontSize: 14,
    color: '#666',
  },
  radioTextSelected: {
    color: '#ef4444',
    fontWeight: 'bold',
  },
  formActions: {
    marginTop: 20,
    marginBottom: 20,
  },
  submitButton: {
    backgroundColor: '#ef4444',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default VendorDashboardScreen;

