import { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator, FlatList, Alert, Linking } from 'react-native';
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
    }
  }, [activeTab, page]);

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
});

export default AdminScreen;

