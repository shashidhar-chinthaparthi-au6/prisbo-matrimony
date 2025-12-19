import { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator, FlatList, Alert, Linking, Image, TextInput } from 'react-native';
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

const AdminScreen = ({ navigation }) => {
  const [activeTab, setActiveTab] = useState('stats');
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [profiles, setProfiles] = useState([]);
  const [subscriptions, setSubscriptions] = useState([]);
  const [pendingSubscriptions, setPendingSubscriptions] = useState([]);
  const [subscriptionStats, setSubscriptionStats] = useState(null);
  const [page, setPage] = useState(1);
  const [pendingProfiles, setPendingProfiles] = useState([]);
  const [verificationStats, setVerificationStats] = useState(null);
  const [selectedProfile, setSelectedProfile] = useState(null);
  const [selectedProfileData, setSelectedProfileData] = useState(null);

  useEffect(() => {
    if (activeTab === 'stats') {
      loadStats();
    } else if (activeTab === 'users') {
      loadUsers();
    } else if (activeTab === 'profiles') {
      loadProfiles();
    } else if (activeTab === 'subscriptions') {
      loadSubscriptions();
      loadPendingSubscriptions();
      loadSubscriptionStats();
    } else if (activeTab === 'verification') {
      loadPendingProfiles();
      loadVerificationStats();
    }
  }, [activeTab, page]);

  useEffect(() => {
    if (selectedProfile) {
      loadProfileDetails(selectedProfile);
    }
  }, [selectedProfile]);

  const loadStats = async () => {
    setLoading(true);
    try {
      const response = await getStats();
      setStats(response.stats);
    } catch (error) {
      Alert.alert('Error', error.response?.data?.message || 'Failed to load statistics');
    } finally {
      setLoading(false);
    }
  };

  const loadUsers = async () => {
    setLoading(true);
    try {
      const response = await getAllUsers({ page, limit: 20 });
      setUsers(response.users || []);
    } catch (error) {
      Alert.alert('Error', error.response?.data?.message || 'Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const loadProfiles = async () => {
    setLoading(true);
    try {
      const response = await getAllProfiles({ page, limit: 20 });
      setProfiles(response.profiles || []);
    } catch (error) {
      Alert.alert('Error', error.response?.data?.message || 'Failed to load profiles');
    } finally {
      setLoading(false);
    }
  };

  const handleBlockUser = async (userId, isActive) => {
    try {
      await blockUser(userId, { isActive: !isActive });
      Alert.alert('Success', `User ${!isActive ? 'unblocked' : 'blocked'} successfully`);
      loadUsers();
    } catch (error) {
      Alert.alert('Error', error.response?.data?.message || 'Failed to update user');
    }
  };

  const handleUpdateProfileStatus = async (profileId, isActive) => {
    try {
      await updateProfileStatus(profileId, { isActive: !isActive });
      Alert.alert('Success', `Profile ${!isActive ? 'activated' : 'deactivated'} successfully`);
      loadProfiles();
    } catch (error) {
      Alert.alert('Error', error.response?.data?.message || 'Failed to update profile');
    }
  };

  const loadSubscriptions = async () => {
    setLoading(true);
    try {
      const response = await getAllSubscriptions({ page, limit: 20 });
      setSubscriptions(response.subscriptions || []);
    } catch (error) {
      Alert.alert('Error', error.response?.data?.message || 'Failed to load subscriptions');
    } finally {
      setLoading(false);
    }
  };

  const loadPendingSubscriptions = async () => {
    try {
      const response = await getPendingSubscriptions();
      setPendingSubscriptions(response.subscriptions || []);
    } catch (error) {
      // Silently fail
    }
  };

  const loadSubscriptionStats = async () => {
    try {
      const response = await getSubscriptionStats();
      setSubscriptionStats(response.stats);
    } catch (error) {
      // Silently fail
    }
  };

  const loadPendingProfiles = async () => {
    setLoading(true);
    try {
      const response = await getPendingProfiles({ page, limit: 20 });
      setPendingProfiles(response.profiles || []);
    } catch (error) {
      Alert.alert('Error', error.response?.data?.message || 'Failed to load pending profiles');
    } finally {
      setLoading(false);
    }
  };

  const loadVerificationStats = async () => {
    try {
      const response = await getVerificationStats();
      setVerificationStats(response.stats);
    } catch (error) {
      // Silently fail
    }
  };

  const loadProfileDetails = async (profileId) => {
    try {
      const response = await getProfileById(profileId);
      setSelectedProfileData(response.profile);
    } catch (error) {
      Alert.alert('Error', error.response?.data?.message || 'Failed to load profile details');
    }
  };

  const handleApproveProfile = async (id) => {
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
              setSelectedProfile(null);
              setSelectedProfileData(null);
              loadPendingProfiles();
              loadVerificationStats();
            } catch (error) {
              Alert.alert('Error', error.response?.data?.message || 'Failed to approve profile');
            }
          },
        },
      ]
    );
  };

  const handleRejectProfile = async (id) => {
    Alert.prompt(
      'Reject Profile',
      'Enter rejection reason:',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reject',
          onPress: async (reason) => {
            if (reason) {
              try {
                await rejectProfile(id, reason);
                Alert.alert('Success', 'Profile rejected');
                setSelectedProfile(null);
                setSelectedProfileData(null);
                loadPendingProfiles();
                loadVerificationStats();
              } catch (error) {
                Alert.alert('Error', error.response?.data?.message || 'Failed to reject profile');
              }
            }
          },
        },
      ],
      'plain-text'
    );
  };

  const handleUpdateField = async (field, value, section) => {
    try {
      await updateProfileField(selectedProfile, { field, value, section });
      // Reload profile details to get updated data
      loadProfileDetails(selectedProfile);
    } catch (error) {
      Alert.alert('Error', error.response?.data?.message || 'Failed to update field');
    }
  };

  const handleDeletePhoto = async (profileId, photoId) => {
    Alert.alert(
      'Delete Photo',
      'Are you sure you want to delete this photo?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteProfilePhoto(profileId, photoId);
              Alert.alert('Success', 'Photo deleted successfully');
              loadProfileDetails(profileId);
              loadPendingProfiles();
            } catch (error) {
              Alert.alert('Error', error.response?.data?.message || 'Failed to delete photo');
            }
          },
        },
      ]
    );
  };

  const handleApproveSubscription = async (id, cashReceivedDate, cashReceivedBy) => {
    try {
      await approveSubscription(id, { cashReceivedDate, cashReceivedBy });
      Alert.alert('Success', 'Subscription approved successfully');
      loadSubscriptions();
      loadPendingSubscriptions();
    } catch (error) {
      Alert.alert('Error', error.response?.data?.message || 'Failed to approve subscription');
    }
  };

  const handleRejectSubscription = async (id) => {
    Alert.prompt(
      'Reject Subscription',
      'Enter rejection reason:',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reject',
          onPress: async (reason) => {
            if (reason) {
              try {
                await rejectSubscription(id, { rejectionReason: reason });
                Alert.alert('Success', 'Subscription rejected');
                loadSubscriptions();
                loadPendingSubscriptions();
              } catch (error) {
                Alert.alert('Error', error.response?.data?.message || 'Failed to reject subscription');
              }
            }
          },
        },
      ],
      'plain-text'
    );
  };

  const handleCancelSubscription = async (id) => {
    Alert.alert(
      'Cancel Subscription',
      'Are you sure you want to cancel this subscription?',
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Yes',
          onPress: async () => {
            try {
              await cancelSubscription(id);
              Alert.alert('Success', 'Subscription cancelled successfully');
              loadSubscriptions();
              loadPendingSubscriptions();
              loadSubscriptionStats();
            } catch (error) {
              Alert.alert('Error', error.response?.data?.message || 'Failed to cancel subscription');
            }
          },
        },
      ]
    );
  };

  const handleReactivateSubscription = async (id) => {
    Alert.alert(
      'Reactivate Subscription',
      'Are you sure you want to reactivate this subscription?',
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Yes',
          onPress: async () => {
            try {
              await reactivateSubscription(id);
              Alert.alert('Success', 'Subscription reactivated successfully');
              loadSubscriptions();
              loadPendingSubscriptions();
              loadSubscriptionStats();
            } catch (error) {
              Alert.alert('Error', error.response?.data?.message || 'Failed to reactivate subscription');
            }
          },
        },
      ]
    );
  };

  const renderStats = () => (
    <View style={styles.statsContainer}>
      <View style={styles.statCard}>
        <Text style={styles.statValue}>{stats?.totalUsers || 0}</Text>
        <Text style={styles.statLabel}>Total Users</Text>
      </View>
      <View style={styles.statCard}>
        <Text style={styles.statValue}>{stats?.totalProfiles || 0}</Text>
        <Text style={styles.statLabel}>Total Profiles</Text>
      </View>
      <View style={styles.statCard}>
        <Text style={styles.statValue}>{stats?.activeProfiles || 0}</Text>
        <Text style={styles.statLabel}>Active Profiles</Text>
      </View>
      <View style={styles.statCard}>
        <Text style={styles.statValue}>{stats?.brideProfiles || 0}</Text>
        <Text style={styles.statLabel}>Bride Profiles</Text>
      </View>
      <View style={styles.statCard}>
        <Text style={styles.statValue}>{stats?.groomProfiles || 0}</Text>
        <Text style={styles.statLabel}>Groom Profiles</Text>
      </View>
      <View style={styles.statCard}>
        <Text style={styles.statValue}>{stats?.totalInterests || 0}</Text>
        <Text style={styles.statLabel}>Total Interests</Text>
      </View>
      <View style={styles.statCard}>
        <Text style={styles.statValue}>{stats?.acceptedInterests || 0}</Text>
        <Text style={styles.statLabel}>Accepted Interests</Text>
      </View>
    </View>
  );

  const renderUser = ({ item }) => (
    <View style={styles.itemCard}>
      <View style={styles.itemInfo}>
        <Text style={styles.itemTitle}>{item.email}</Text>
        <Text style={styles.itemSubtitle}>Phone: {item.phone}</Text>
        <Text style={styles.itemSubtitle}>Role: {item.role}</Text>
        <Text style={styles.itemSubtitle}>
          Status: {item.isActive ? 'Active' : 'Blocked'}
        </Text>
      </View>
      <TouchableOpacity
        style={[styles.actionButton, item.isActive ? styles.blockButton : styles.unblockButton]}
        onPress={() => handleBlockUser(item._id, item.isActive)}
      >
        <Text style={styles.actionButtonText}>
          {item.isActive ? 'Block' : 'Unblock'}
        </Text>
      </TouchableOpacity>
    </View>
  );

  const renderProfile = ({ item }) => (
    <View style={styles.itemCard}>
      <View style={styles.itemInfo}>
        <Text style={styles.itemTitle}>
          {item.personalInfo?.firstName} {item.personalInfo?.lastName}
        </Text>
        <Text style={styles.itemSubtitle}>Type: {item.type}</Text>
        <Text style={styles.itemSubtitle}>Age: {item.personalInfo?.age}</Text>
        <Text style={styles.itemSubtitle}>
          Status: {item.isActive ? 'Active' : 'Inactive'}
        </Text>
      </View>
      <TouchableOpacity
        style={[styles.actionButton, item.isActive ? styles.blockButton : styles.unblockButton]}
        onPress={() => handleUpdateProfileStatus(item._id, item.isActive)}
      >
        <Text style={styles.actionButtonText}>
          {item.isActive ? 'Deactivate' : 'Activate'}
        </Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'stats' && styles.activeTab]}
          onPress={() => setActiveTab('stats')}
        >
          <Text style={[styles.tabText, activeTab === 'stats' && styles.activeTabText]}>
            Stats
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'users' && styles.activeTab]}
          onPress={() => setActiveTab('users')}
        >
          <Text style={[styles.tabText, activeTab === 'users' && styles.activeTabText]}>
            Users
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'profiles' && styles.activeTab]}
          onPress={() => setActiveTab('profiles')}
        >
          <Text style={[styles.tabText, activeTab === 'profiles' && styles.activeTabText]}>
            Profiles
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'subscriptions' && styles.activeTab]}
          onPress={() => setActiveTab('subscriptions')}
        >
          <View style={{ position: 'relative' }}>
            <Text style={[styles.tabText, activeTab === 'subscriptions' && styles.activeTabText]}>
              Subscriptions
            </Text>
            {pendingSubscriptions.length > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{pendingSubscriptions.length}</Text>
              </View>
            )}
          </View>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'verification' && styles.activeTab]}
          onPress={() => setActiveTab('verification')}
        >
          <View style={{ position: 'relative' }}>
            <Text style={[styles.tabText, activeTab === 'verification' && styles.activeTabText]}>
              Verification
            </Text>
            {pendingProfiles.length > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{pendingProfiles.length}</Text>
              </View>
            )}
          </View>
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator size="large" style={styles.loader} />
      ) : (
        <>
          {activeTab === 'stats' && stats && (
            <ScrollView style={styles.content}>
              {renderStats()}
            </ScrollView>
          )}
          {activeTab === 'users' && (
            <FlatList
              style={styles.content}
              data={users}
              renderItem={renderUser}
              keyExtractor={(item) => item._id}
              ListEmptyComponent={<Text style={styles.emptyText}>No users found</Text>}
            />
          )}
          {activeTab === 'profiles' && (
            <FlatList
              style={styles.content}
              data={profiles}
              renderItem={renderProfile}
              keyExtractor={(item) => item._id}
              ListEmptyComponent={<Text style={styles.emptyText}>No profiles found</Text>}
            />
          )}
          {activeTab === 'verification' && (
            <ScrollView style={styles.content}>
              {/* Verification Stats */}
              {verificationStats && (
                <View style={styles.statsContainer}>
                  <View style={styles.statCard}>
                    <Text style={styles.statValue}>{verificationStats.pending || 0}</Text>
                    <Text style={styles.statLabel}>Pending</Text>
                  </View>
                  <View style={styles.statCard}>
                    <Text style={styles.statValue}>{verificationStats.approved || 0}</Text>
                    <Text style={styles.statLabel}>Approved</Text>
                  </View>
                  <View style={styles.statCard}>
                    <Text style={styles.statValue}>{verificationStats.rejected || 0}</Text>
                    <Text style={styles.statLabel}>Rejected</Text>
                  </View>
                  <View style={styles.statCard}>
                    <Text style={styles.statValue}>{verificationStats.total || 0}</Text>
                    <Text style={styles.statLabel}>Total</Text>
                  </View>
                </View>
              )}

              {/* Pending Profiles List */}
              {selectedProfile ? (
                <View style={styles.section}>
                  <TouchableOpacity
                    onPress={() => {
                      setSelectedProfile(null);
                      setSelectedProfileData(null);
                    }}
                    style={styles.backButton}
                  >
                    <Text style={styles.backButtonText}>← Back to List</Text>
                  </TouchableOpacity>
                  {selectedProfileData && (
                    <View style={styles.profileDetailCard}>
                      <Text style={styles.profileDetailTitle}>
                        {selectedProfileData.personalInfo?.firstName} {selectedProfileData.personalInfo?.lastName}
                      </Text>
                      <Text style={styles.profileDetailSubtitle}>
                        {selectedProfileData.type} • Age: {selectedProfileData.personalInfo?.age}
                      </Text>
                      
                      {/* Contact Information */}
                      {selectedProfileData.userId && (
                        <View style={styles.contactInfo}>
                          <Text style={styles.contactLabel}>📧 Email: {selectedProfileData.userId.email}</Text>
                          <Text style={styles.contactLabel}>📱 Phone: {selectedProfileData.userId.phone}</Text>
                          <View style={styles.statusBadge}>
                            <Text style={[
                              styles.statusText,
                              selectedProfileData.userId.isActive !== false ? styles.statusActive : styles.statusBlocked
                            ]}>
                              {selectedProfileData.userId.isActive !== false ? 'Account Active' : 'Account Blocked'}
                            </Text>
                          </View>
                        </View>
                      )}

                      {/* Action Buttons */}
                      <View style={styles.actionButtons}>
                        <TouchableOpacity
                          style={[styles.actionButton, styles.approveButton]}
                          onPress={() => handleApproveProfile(selectedProfile)}
                        >
                          <Text style={styles.actionButtonText}>Approve</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[styles.actionButton, styles.rejectButton]}
                          onPress={() => handleRejectProfile(selectedProfile)}
                        >
                          <Text style={styles.actionButtonText}>Reject</Text>
                        </TouchableOpacity>
                        {selectedProfileData.userId && (
                          <TouchableOpacity
                            style={[
                              styles.actionButton,
                              selectedProfileData.userId.isActive !== false ? styles.blockButton : styles.unblockButton
                            ]}
                            onPress={async () => {
                              const userId = selectedProfileData.userId._id;
                              const isActive = selectedProfileData.userId.isActive !== false;
                              await handleBlockUser(userId, isActive);
                              loadProfileDetails(selectedProfile);
                            }}
                          >
                            <Text style={styles.actionButtonText}>
                              {selectedProfileData.userId.isActive !== false ? 'Block Login' : 'Unblock Login'}
                            </Text>
                          </TouchableOpacity>
                        )}
                      </View>

                      {/* Photos */}
                      {selectedProfileData.photos?.length > 0 && (
                        <View style={styles.photosSection}>
                          <Text style={styles.sectionTitle}>Photos</Text>
                          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                            {selectedProfileData.photos.map((photo) => (
                              <View key={photo._id} style={styles.photoContainer}>
                                <Image
                                  source={{ uri: photo.url.startsWith('http') ? photo.url : `http://localhost:5000${photo.url}` }}
                                  style={styles.photo}
                                />
                                {photo.isPrimary && (
                                  <View style={styles.primaryBadge}>
                                    <Text style={styles.primaryBadgeText}>Primary</Text>
                                  </View>
                                )}
                                <TouchableOpacity
                                  style={styles.deletePhotoButton}
                                  onPress={() => handleDeletePhoto(selectedProfile, photo._id)}
                                >
                                  <Text style={styles.deletePhotoText}>Delete</Text>
                                </TouchableOpacity>
                              </View>
                            ))}
                          </ScrollView>
                        </View>
                      )}

                      {/* Profile Details - All Fields */}
                      <ScrollView style={styles.detailsSection}>
                        {/* Personal Information */}
                        <View style={styles.fieldSection}>
                          <Text style={styles.sectionTitle}>Personal Information</Text>
                          <View style={styles.fieldRow}>
                            <Text style={styles.fieldLabel}>First Name</Text>
                            <TextInput
                              style={styles.fieldInput}
                              value={selectedProfileData.personalInfo?.firstName || ''}
                              onChangeText={(value) => handleUpdateField('firstName', value, 'personalInfo')}
                            />
                          </View>
                          <View style={styles.fieldRow}>
                            <Text style={styles.fieldLabel}>Last Name</Text>
                            <TextInput
                              style={styles.fieldInput}
                              value={selectedProfileData.personalInfo?.lastName || ''}
                              onChangeText={(value) => handleUpdateField('lastName', value, 'personalInfo')}
                            />
                          </View>
                          <View style={styles.fieldRow}>
                            <Text style={styles.fieldLabel}>Date of Birth</Text>
                            <TextInput
                              style={styles.fieldInput}
                              value={selectedProfileData.personalInfo?.dateOfBirth ? new Date(selectedProfileData.personalInfo.dateOfBirth).toISOString().split('T')[0] : ''}
                              onChangeText={(value) => handleUpdateField('dateOfBirth', value, 'personalInfo')}
                              placeholder="YYYY-MM-DD"
                            />
                          </View>
                          <View style={styles.fieldRow}>
                            <Text style={styles.fieldLabel}>Age</Text>
                            <TextInput
                              style={[styles.fieldInput, styles.readOnlyInput]}
                              value={selectedProfileData.personalInfo?.age?.toString() || ''}
                              editable={false}
                            />
                          </View>
                          <View style={styles.fieldRow}>
                            <Text style={styles.fieldLabel}>Height</Text>
                            <TextInput
                              style={styles.fieldInput}
                              value={selectedProfileData.personalInfo?.height || ''}
                              onChangeText={(value) => handleUpdateField('height', value, 'personalInfo')}
                            />
                          </View>
                          <View style={styles.fieldRow}>
                            <Text style={styles.fieldLabel}>Weight</Text>
                            <TextInput
                              style={styles.fieldInput}
                              value={selectedProfileData.personalInfo?.weight || ''}
                              onChangeText={(value) => handleUpdateField('weight', value, 'personalInfo')}
                            />
                          </View>
                          <View style={styles.fieldRow}>
                            <Text style={styles.fieldLabel}>Blood Group</Text>
                            <TextInput
                              style={styles.fieldInput}
                              value={selectedProfileData.personalInfo?.bloodGroup || ''}
                              onChangeText={(value) => handleUpdateField('bloodGroup', value, 'personalInfo')}
                            />
                          </View>
                          <View style={styles.fieldRow}>
                            <Text style={styles.fieldLabel}>Complexion</Text>
                            <TextInput
                              style={styles.fieldInput}
                              value={selectedProfileData.personalInfo?.complexion || ''}
                              onChangeText={(value) => handleUpdateField('complexion', value, 'personalInfo')}
                            />
                          </View>
                          <View style={styles.fieldRow}>
                            <Text style={styles.fieldLabel}>Physical Status</Text>
                            <TextInput
                              style={styles.fieldInput}
                              value={selectedProfileData.personalInfo?.physicalStatus || ''}
                              onChangeText={(value) => handleUpdateField('physicalStatus', value, 'personalInfo')}
                            />
                          </View>
                          <View style={styles.fieldRow}>
                            <Text style={styles.fieldLabel}>Marital Status</Text>
                            <TextInput
                              style={styles.fieldInput}
                              value={selectedProfileData.personalInfo?.maritalStatus || ''}
                              onChangeText={(value) => handleUpdateField('maritalStatus', value, 'personalInfo')}
                            />
                          </View>
                          <View style={styles.fieldRow}>
                            <Text style={styles.fieldLabel}>Mother Tongue</Text>
                            <TextInput
                              style={styles.fieldInput}
                              value={selectedProfileData.personalInfo?.motherTongue || ''}
                              onChangeText={(value) => handleUpdateField('motherTongue', value, 'personalInfo')}
                            />
                          </View>
                          <View style={styles.fieldRow}>
                            <Text style={styles.fieldLabel}>Eating Habits</Text>
                            <TextInput
                              style={styles.fieldInput}
                              value={selectedProfileData.personalInfo?.eatingHabits || ''}
                              onChangeText={(value) => handleUpdateField('eatingHabits', value, 'personalInfo')}
                            />
                          </View>
                          <View style={styles.fieldRow}>
                            <Text style={styles.fieldLabel}>Drinking Habits</Text>
                            <TextInput
                              style={styles.fieldInput}
                              value={selectedProfileData.personalInfo?.drinkingHabits || ''}
                              onChangeText={(value) => handleUpdateField('drinkingHabits', value, 'personalInfo')}
                            />
                          </View>
                          <View style={styles.fieldRow}>
                            <Text style={styles.fieldLabel}>Smoking Habits</Text>
                            <TextInput
                              style={styles.fieldInput}
                              value={selectedProfileData.personalInfo?.smokingHabits || ''}
                              onChangeText={(value) => handleUpdateField('smokingHabits', value, 'personalInfo')}
                            />
                          </View>
                          <View style={styles.fieldRow}>
                            <Text style={styles.fieldLabel}>About</Text>
                            <TextInput
                              style={[styles.fieldInput, styles.textAreaInput]}
                              value={selectedProfileData.personalInfo?.about || ''}
                              onChangeText={(value) => handleUpdateField('about', value, 'personalInfo')}
                              multiline
                              numberOfLines={3}
                            />
                          </View>
                        </View>

                        {/* Family Information */}
                        <View style={styles.fieldSection}>
                          <Text style={styles.sectionTitle}>Family Information</Text>
                          <View style={styles.fieldRow}>
                            <Text style={styles.fieldLabel}>Father Name</Text>
                            <TextInput
                              style={styles.fieldInput}
                              value={selectedProfileData.familyInfo?.fatherName || ''}
                              onChangeText={(value) => handleUpdateField('fatherName', value, 'familyInfo')}
                            />
                          </View>
                          <View style={styles.fieldRow}>
                            <Text style={styles.fieldLabel}>Father Occupation</Text>
                            <TextInput
                              style={styles.fieldInput}
                              value={selectedProfileData.familyInfo?.fatherOccupation || ''}
                              onChangeText={(value) => handleUpdateField('fatherOccupation', value, 'familyInfo')}
                            />
                          </View>
                          <View style={styles.fieldRow}>
                            <Text style={styles.fieldLabel}>Mother Name</Text>
                            <TextInput
                              style={styles.fieldInput}
                              value={selectedProfileData.familyInfo?.motherName || ''}
                              onChangeText={(value) => handleUpdateField('motherName', value, 'familyInfo')}
                            />
                          </View>
                          <View style={styles.fieldRow}>
                            <Text style={styles.fieldLabel}>Mother Occupation</Text>
                            <TextInput
                              style={styles.fieldInput}
                              value={selectedProfileData.familyInfo?.motherOccupation || ''}
                              onChangeText={(value) => handleUpdateField('motherOccupation', value, 'familyInfo')}
                            />
                          </View>
                          <View style={styles.fieldRow}>
                            <Text style={styles.fieldLabel}>Siblings</Text>
                            <TextInput
                              style={styles.fieldInput}
                              value={selectedProfileData.familyInfo?.siblings || ''}
                              onChangeText={(value) => handleUpdateField('siblings', value, 'familyInfo')}
                            />
                          </View>
                          <View style={styles.fieldRow}>
                            <Text style={styles.fieldLabel}>Family Type</Text>
                            <TextInput
                              style={styles.fieldInput}
                              value={selectedProfileData.familyInfo?.familyType || ''}
                              onChangeText={(value) => handleUpdateField('familyType', value, 'familyInfo')}
                            />
                          </View>
                          <View style={styles.fieldRow}>
                            <Text style={styles.fieldLabel}>Family Status</Text>
                            <TextInput
                              style={styles.fieldInput}
                              value={selectedProfileData.familyInfo?.familyStatus || ''}
                              onChangeText={(value) => handleUpdateField('familyStatus', value, 'familyInfo')}
                            />
                          </View>
                          <View style={styles.fieldRow}>
                            <Text style={styles.fieldLabel}>Family Values</Text>
                            <TextInput
                              style={[styles.fieldInput, styles.textAreaInput]}
                              value={selectedProfileData.familyInfo?.familyValues || ''}
                              onChangeText={(value) => handleUpdateField('familyValues', value, 'familyInfo')}
                              multiline
                              numberOfLines={2}
                            />
                          </View>
                        </View>

                        {/* Education */}
                        <View style={styles.fieldSection}>
                          <Text style={styles.sectionTitle}>Education</Text>
                          <View style={styles.fieldRow}>
                            <Text style={styles.fieldLabel}>Highest Education</Text>
                            <TextInput
                              style={styles.fieldInput}
                              value={selectedProfileData.education?.highestEducation || ''}
                              onChangeText={(value) => handleUpdateField('highestEducation', value, 'education')}
                            />
                          </View>
                          <View style={styles.fieldRow}>
                            <Text style={styles.fieldLabel}>College</Text>
                            <TextInput
                              style={styles.fieldInput}
                              value={selectedProfileData.education?.college || ''}
                              onChangeText={(value) => handleUpdateField('college', value, 'education')}
                            />
                          </View>
                          <View style={styles.fieldRow}>
                            <Text style={styles.fieldLabel}>Degree</Text>
                            <TextInput
                              style={styles.fieldInput}
                              value={selectedProfileData.education?.degree || ''}
                              onChangeText={(value) => handleUpdateField('degree', value, 'education')}
                            />
                          </View>
                          <View style={styles.fieldRow}>
                            <Text style={styles.fieldLabel}>Specialization</Text>
                            <TextInput
                              style={styles.fieldInput}
                              value={selectedProfileData.education?.specialization || ''}
                              onChangeText={(value) => handleUpdateField('specialization', value, 'education')}
                            />
                          </View>
                        </View>

                        {/* Career */}
                        <View style={styles.fieldSection}>
                          <Text style={styles.sectionTitle}>Career</Text>
                          <View style={styles.fieldRow}>
                            <Text style={styles.fieldLabel}>Occupation</Text>
                            <TextInput
                              style={styles.fieldInput}
                              value={selectedProfileData.career?.occupation || ''}
                              onChangeText={(value) => handleUpdateField('occupation', value, 'career')}
                            />
                          </View>
                          <View style={styles.fieldRow}>
                            <Text style={styles.fieldLabel}>Company</Text>
                            <TextInput
                              style={styles.fieldInput}
                              value={selectedProfileData.career?.company || ''}
                              onChangeText={(value) => handleUpdateField('company', value, 'career')}
                            />
                          </View>
                          <View style={styles.fieldRow}>
                            <Text style={styles.fieldLabel}>Annual Income</Text>
                            <TextInput
                              style={styles.fieldInput}
                              value={selectedProfileData.career?.annualIncome || ''}
                              onChangeText={(value) => handleUpdateField('annualIncome', value, 'career')}
                            />
                          </View>
                          <View style={styles.fieldRow}>
                            <Text style={styles.fieldLabel}>Working Location</Text>
                            <TextInput
                              style={styles.fieldInput}
                              value={selectedProfileData.career?.workingLocation || ''}
                              onChangeText={(value) => handleUpdateField('workingLocation', value, 'career')}
                            />
                          </View>
                        </View>

                        {/* Location */}
                        <View style={styles.fieldSection}>
                          <Text style={styles.sectionTitle}>Location</Text>
                          <View style={styles.fieldRow}>
                            <Text style={styles.fieldLabel}>Country</Text>
                            <TextInput
                              style={styles.fieldInput}
                              value={selectedProfileData.location?.country || ''}
                              onChangeText={(value) => handleUpdateField('country', value, 'location')}
                            />
                          </View>
                          <View style={styles.fieldRow}>
                            <Text style={styles.fieldLabel}>State</Text>
                            <TextInput
                              style={styles.fieldInput}
                              value={selectedProfileData.location?.state || ''}
                              onChangeText={(value) => handleUpdateField('state', value, 'location')}
                            />
                          </View>
                          <View style={styles.fieldRow}>
                            <Text style={styles.fieldLabel}>City</Text>
                            <TextInput
                              style={styles.fieldInput}
                              value={selectedProfileData.location?.city || ''}
                              onChangeText={(value) => handleUpdateField('city', value, 'location')}
                            />
                          </View>
                          <View style={styles.fieldRow}>
                            <Text style={styles.fieldLabel}>Pincode</Text>
                            <TextInput
                              style={styles.fieldInput}
                              value={selectedProfileData.location?.pincode || ''}
                              onChangeText={(value) => handleUpdateField('pincode', value, 'location')}
                            />
                          </View>
                        </View>

                        {/* Religion & Astrology */}
                        <View style={styles.fieldSection}>
                          <Text style={styles.sectionTitle}>Religion & Astrology</Text>
                          <View style={styles.fieldRow}>
                            <Text style={styles.fieldLabel}>Religion</Text>
                            <TextInput
                              style={styles.fieldInput}
                              value={selectedProfileData.religion?.religion || ''}
                              onChangeText={(value) => handleUpdateField('religion', value, 'religion')}
                            />
                          </View>
                          <View style={styles.fieldRow}>
                            <Text style={styles.fieldLabel}>Caste</Text>
                            <TextInput
                              style={styles.fieldInput}
                              value={selectedProfileData.religion?.caste || ''}
                              onChangeText={(value) => handleUpdateField('caste', value, 'religion')}
                            />
                          </View>
                          <View style={styles.fieldRow}>
                            <Text style={styles.fieldLabel}>Sub-Caste</Text>
                            <TextInput
                              style={styles.fieldInput}
                              value={selectedProfileData.religion?.subCaste || ''}
                              onChangeText={(value) => handleUpdateField('subCaste', value, 'religion')}
                            />
                          </View>
                          <View style={styles.fieldRow}>
                            <Text style={styles.fieldLabel}>Gothra</Text>
                            <TextInput
                              style={styles.fieldInput}
                              value={selectedProfileData.religion?.gothra || ''}
                              onChangeText={(value) => handleUpdateField('gothra', value, 'religion')}
                            />
                          </View>
                          <View style={styles.fieldRow}>
                            <Text style={styles.fieldLabel}>Star</Text>
                            <TextInput
                              style={styles.fieldInput}
                              value={selectedProfileData.religion?.star || ''}
                              onChangeText={(value) => handleUpdateField('star', value, 'religion')}
                            />
                          </View>
                          <View style={styles.fieldRow}>
                            <Text style={styles.fieldLabel}>Raasi</Text>
                            <TextInput
                              style={styles.fieldInput}
                              value={selectedProfileData.religion?.raasi || ''}
                              onChangeText={(value) => handleUpdateField('raasi', value, 'religion')}
                            />
                          </View>
                        </View>
                      </ScrollView>
                    </View>
                  )}
                </View>
              ) : (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Pending Profiles ({pendingProfiles.length})</Text>
                  {pendingProfiles.length === 0 ? (
                    <Text style={styles.emptyText}>No pending profiles</Text>
                  ) : (
                    pendingProfiles.map((profile) => (
                      <TouchableOpacity
                        key={profile._id}
                        style={styles.pendingProfileCard}
                        onPress={() => setSelectedProfile(profile._id)}
                      >
                        <Text style={styles.pendingProfileName}>
                          {profile.personalInfo?.firstName} {profile.personalInfo?.lastName}
                        </Text>
                        <Text style={styles.pendingProfileInfo}>
                          {profile.type} • Age: {profile.personalInfo?.age}
                        </Text>
                        {profile.userId && (
                          <>
                            <Text style={styles.pendingProfileContact}>
                              📧 {profile.userId.email} | 📱 {profile.userId.phone}
                            </Text>
                            <View style={styles.statusBadge}>
                              <Text style={[
                                styles.statusText,
                                profile.userId.isActive !== false ? styles.statusActive : styles.statusBlocked
                              ]}>
                                {profile.userId.isActive !== false ? 'Active' : 'Blocked'}
                              </Text>
                            </View>
                          </>
                        )}
                        <Text style={styles.pendingProfileDate}>
                          {new Date(profile.createdAt).toLocaleDateString()}
                        </Text>
                      </TouchableOpacity>
                    ))
                  )}
                </View>
              )}
            </ScrollView>
          )}
          {activeTab === 'subscriptions' && (
            <ScrollView style={styles.content}>
              {/* Subscription Stats */}
              {subscriptionStats && (
                <View style={styles.statsContainer}>
                  <View style={styles.statCard}>
                    <Text style={styles.statValue}>{subscriptionStats.activeSubscriptions || 0}</Text>
                    <Text style={styles.statLabel}>Active</Text>
                  </View>
                  <View style={styles.statCard}>
                    <Text style={styles.statValue}>{subscriptionStats.pendingSubscriptions || 0}</Text>
                    <Text style={styles.statLabel}>Pending</Text>
                  </View>
                  <View style={styles.statCard}>
                    <Text style={styles.statValue}>₹{subscriptionStats.totalRevenue || 0}</Text>
                    <Text style={styles.statLabel}>Revenue</Text>
                  </View>
                  <View style={styles.statCard}>
                    <Text style={styles.statValue}>{subscriptionStats.expiringSubscriptions || 0}</Text>
                    <Text style={styles.statLabel}>Expiring</Text>
                  </View>
                </View>
              )}

              {/* Pending Subscriptions */}
              {pendingSubscriptions.length > 0 && (
                <View style={styles.pendingSection}>
                  <Text style={styles.sectionTitle}>
                    Pending Approvals ({pendingSubscriptions.length})
                  </Text>
                  {pendingSubscriptions.map((sub) => (
                    <View key={sub._id} style={styles.pendingCard}>
                      <View style={styles.pendingInfo}>
                        <Text style={styles.pendingUser}>{sub.userId?.email}</Text>
                        <Text style={styles.pendingPlan}>{sub.planName}</Text>
                        <Text style={styles.pendingDetails}>
                          {sub.paymentMethod} | ₹{sub.amount}
                        </Text>
                        {sub.upiScreenshot && (
                          <TouchableOpacity
                            onPress={() => Linking.openURL(sub.upiScreenshot)}
                            style={styles.linkButton}
                          >
                            <Text style={styles.linkText}>View Payment Screenshot</Text>
                          </TouchableOpacity>
                        )}
                      </View>
                      <View style={styles.pendingActions}>
                        <TouchableOpacity
                          style={[styles.actionButton, styles.approveButton]}
                          onPress={() =>
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
                        >
                          <Text style={styles.actionButtonText}>Approve</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[styles.actionButton, styles.rejectButton]}
                          onPress={() => handleRejectSubscription(sub._id)}
                        >
                          <Text style={styles.actionButtonText}>Reject</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  ))}
                </View>
              )}

              {/* All Subscriptions */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>All Subscriptions</Text>
                {subscriptions.length === 0 ? (
                  <Text style={styles.emptyText}>No subscriptions found</Text>
                ) : (
                  subscriptions.map((sub) => (
                    <View key={sub._id} style={styles.itemCard}>
                      <View style={styles.itemInfo}>
                        <Text style={styles.itemTitle}>{sub.userId?.email}</Text>
                        <Text style={styles.itemSubtitle}>{sub.planName}</Text>
                        <Text style={styles.itemSubtitle}>
                          {sub.paymentMethod} | ₹{sub.amount}
                        </Text>
                        <Text style={styles.itemSubtitle}>
                          Status: {sub.status} | Expires:{' '}
                          {sub.endDate ? new Date(sub.endDate).toLocaleDateString() : '-'}
                        </Text>
                        {sub.upiScreenshot && (
                          <TouchableOpacity
                            onPress={() => Linking.openURL(sub.upiScreenshot)}
                            style={styles.linkButton}
                          >
                            <Text style={styles.linkText}>View Proof</Text>
                          </TouchableOpacity>
                        )}
                      </View>
                      {sub.status === 'pending' && (
                        <View style={styles.subscriptionActions}>
                          <TouchableOpacity
                            style={[styles.actionButton, styles.approveButton]}
                            onPress={() =>
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
                          >
                            <Text style={styles.actionButtonText}>Approve</Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={[styles.actionButton, styles.rejectButton]}
                            onPress={() => handleRejectSubscription(sub._id)}
                          >
                            <Text style={styles.actionButtonText}>Reject</Text>
                          </TouchableOpacity>
                        </View>
                      )}
                      {sub.status === 'approved' && (
                        <TouchableOpacity
                          style={[styles.actionButton, { backgroundColor: '#f97316' }]}
                          onPress={() => handleCancelSubscription(sub._id)}
                        >
                          <Text style={styles.actionButtonText}>Cancel</Text>
                        </TouchableOpacity>
                      )}
                      {(sub.status === 'cancelled' || sub.status === 'expired') && (
                        <TouchableOpacity
                          style={[styles.actionButton, styles.approveButton]}
                          onPress={() => handleReactivateSubscription(sub._id)}
                        >
                          <Text style={styles.actionButtonText}>Reactivate</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  ))
                )}
              </View>
            </ScrollView>
          )}
        </>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  tabContainer: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
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
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  statCard: {
    width: '48%',
    backgroundColor: '#f9f9f9',
    padding: 20,
    borderRadius: 8,
    marginBottom: 15,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#ef4444',
    marginBottom: 5,
  },
  statLabel: {
    fontSize: 14,
    color: '#666',
  },
  itemCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  itemInfo: {
    flex: 1,
  },
  itemTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  itemSubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 2,
  },
  actionButton: {
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 6,
  },
  blockButton: {
    backgroundColor: '#dc2626',
  },
  unblockButton: {
    backgroundColor: '#16a34a',
  },
  actionButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 12,
  },
  emptyText: {
    textAlign: 'center',
    marginTop: 50,
    color: '#666',
  },
  badge: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: '#ef4444',
    borderRadius: 10,
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  pendingSection: {
    marginBottom: 20,
    padding: 15,
    backgroundColor: '#fef3c7',
    borderRadius: 8,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
  },
  pendingCard: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 15,
    marginBottom: 10,
  },
  pendingInfo: {
    marginBottom: 10,
  },
  pendingUser: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  pendingPlan: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
  },
  pendingDetails: {
    fontSize: 12,
    color: '#666',
  },
  pendingActions: {
    flexDirection: 'row',
    gap: 10,
  },
  subscriptionActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 10,
  },
  approveButton: {
    backgroundColor: '#16a34a',
  },
  rejectButton: {
    backgroundColor: '#dc2626',
  },
  linkButton: {
    marginTop: 5,
  },
  linkText: {
    color: '#2563eb',
    fontSize: 12,
    textDecorationLine: 'underline',
  },
  // Profile Verification Styles
  backButton: {
    padding: 10,
    marginBottom: 10,
  },
  backButtonText: {
    color: '#ef4444',
    fontSize: 16,
    fontWeight: 'bold',
  },
  profileDetailCard: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 15,
    marginBottom: 15,
  },
  profileDetailTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  profileDetailSubtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 15,
  },
  contactInfo: {
    backgroundColor: '#f9f9f9',
    padding: 15,
    borderRadius: 8,
    marginBottom: 15,
  },
  contactLabel: {
    fontSize: 14,
    color: '#333',
    marginBottom: 5,
  },
  statusBadge: {
    marginTop: 10,
  },
  statusText: {
    fontSize: 12,
    fontWeight: 'bold',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    overflow: 'hidden',
  },
  statusActive: {
    backgroundColor: '#dcfce7',
    color: '#166534',
  },
  statusBlocked: {
    backgroundColor: '#fee2e2',
    color: '#991b1b',
  },
  actionButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 15,
  },
  photosSection: {
    marginBottom: 20,
  },
  photoContainer: {
    marginRight: 10,
    position: 'relative',
  },
  photo: {
    width: 150,
    height: 150,
    borderRadius: 8,
  },
  primaryBadge: {
    position: 'absolute',
    top: 5,
    left: 5,
    backgroundColor: '#2563eb',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  primaryBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  deletePhotoButton: {
    position: 'absolute',
    bottom: 5,
    right: 5,
    backgroundColor: '#dc2626',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  deletePhotoText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  detailsSection: {
    marginTop: 15,
    maxHeight: 600,
  },
  fieldSection: {
    marginBottom: 20,
    padding: 15,
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  fieldRow: {
    marginBottom: 15,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 5,
  },
  fieldInput: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 6,
    padding: 10,
    fontSize: 14,
    backgroundColor: '#fff',
    color: '#1f2937',
  },
  readOnlyInput: {
    backgroundColor: '#f3f4f6',
    color: '#6b7280',
  },
  textAreaInput: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  detailRow: {
    flexDirection: 'row',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  detailLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    width: 100,
    color: '#666',
  },
  detailValue: {
    fontSize: 14,
    color: '#333',
    flex: 1,
  },
  pendingProfileCard: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 15,
    marginBottom: 10,
    borderLeftWidth: 4,
    borderLeftColor: '#ef4444',
  },
  pendingProfileName: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  pendingProfileInfo: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
  },
  pendingProfileContact: {
    fontSize: 12,
    color: '#666',
    marginBottom: 5,
  },
  pendingProfileDate: {
    fontSize: 11,
    color: '#999',
    marginTop: 5,
  },
});

export default AdminScreen;

