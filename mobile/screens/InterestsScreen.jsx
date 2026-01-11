import { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, Image, ScrollView, RefreshControl } from 'react-native';
import { useQuery } from 'react-query';
import { getSentInterests, getReceivedInterests, getMutualMatches, acceptInterest, rejectInterest, withdrawInterest, bulkAcceptInterests, bulkRejectInterests, getInterestHistory } from '../services/interestService';
import { getCurrentSubscription } from '../services/subscriptionService';
import { getMyProfile } from '../services/profileService';
import { getOrCreateChat } from '../services/chatService';
import { getImageUrl } from '../config/api';
import { useAuth } from '../context/AuthContext';
import SubscriptionRequiredModal from '../components/SubscriptionRequiredModal';
import ProfileIncompleteModal from '../components/ProfileIncompleteModal';
import { isProfileComplete } from '../utils/profileUtils';

const InterestsScreen = ({ navigation }) => {
  const [activeTab, setActiveTab] = useState('received');
  const [selectedInterests, setSelectedInterests] = useState([]);
  const [isBulkMode, setIsBulkMode] = useState(false);
  const [sentInterests, setSentInterests] = useState([]);
  const [receivedInterests, setReceivedInterests] = useState([]);
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);
  const [showProfileIncompleteModal, setShowProfileIncompleteModal] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const { user } = useAuth();

  const { data: subscriptionData } = useQuery('current-subscription', getCurrentSubscription);
  const { data: profileData } = useQuery('myProfile', getMyProfile);
  const hasActiveSubscription = subscriptionData?.hasActiveSubscription;

  useEffect(() => {
    // Skip subscription checks for super_admin and vendor
    if (user?.role === 'super_admin' || user?.role === 'vendor') {
      setShowSubscriptionModal(false);
      setShowProfileIncompleteModal(false);
      loadData();
      const interval = setInterval(loadData, 5000);
      return () => clearInterval(interval);
    }

    // Show subscription modal if user doesn't have active subscription
    if (subscriptionData && !hasActiveSubscription) {
      setShowSubscriptionModal(true);
      setShowProfileIncompleteModal(false);
    } else if (hasActiveSubscription && subscriptionData) {
      // Check if profile exists and is complete
      if (!profileData?.profile || !isProfileComplete(profileData.profile)) {
        setShowProfileIncompleteModal(true);
        setShowSubscriptionModal(false);
      } else {
        setShowProfileIncompleteModal(false);
    loadData();
    const interval = setInterval(loadData, 5000);
    return () => clearInterval(interval);
      }
    }
  }, [activeTab, subscriptionData, hasActiveSubscription, profileData, user]);

  const loadData = async () => {
    // Skip subscription check for super_admin and vendor
    if (user?.role !== 'super_admin' && user?.role !== 'vendor' && !hasActiveSubscription) {
      setShowSubscriptionModal(true);
      return;
    }
    setLoading(true);
    try {
      if (activeTab === 'sent') {
        const response = await getSentInterests();
        setSentInterests(response.interests || []);
      } else if (activeTab === 'received') {
        const response = await getReceivedInterests();
        setReceivedInterests(response.interests || []);
      } else {
        const response = await getMutualMatches();
        setMatches(response.matches || []);
      }
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to load interests');
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = async (id) => {
    try {
      await acceptInterest(id);
      alert('Interest accepted!');
      loadData();
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to accept interest');
    }
  };

  const handleReject = async (id) => {
    try {
      await rejectInterest(id);
      alert('Interest rejected');
      loadData();
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to reject interest');
    }
  };

  const handleWithdraw = async (id) => {
    try {
      await withdrawInterest(id);
      alert('Interest withdrawn');
      loadData();
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to withdraw interest');
    }
  };

  const handleBulkAccept = async () => {
    if (selectedInterests.length === 0) {
      alert('Please select at least one interest');
      return;
    }
    try {
      await bulkAcceptInterests(selectedInterests);
      alert(`${selectedInterests.length} interest(s) accepted`);
      setSelectedInterests([]);
      setIsBulkMode(false);
      loadData();
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to accept interests');
    }
  };

  const handleBulkReject = async () => {
    if (selectedInterests.length === 0) {
      alert('Please select at least one interest');
      return;
    }
    try {
      await bulkRejectInterests(selectedInterests);
      alert(`${selectedInterests.length} interest(s) rejected`);
      setSelectedInterests([]);
      setIsBulkMode(false);
      loadData();
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to reject interests');
    }
  };

  const toggleInterestSelection = (id) => {
    setSelectedInterests(prev => 
      prev.includes(id) 
        ? prev.filter(i => i !== id)
        : [...prev, id]
    );
  };

  const handleChat = async (userId) => {
    try {
      const response = await getOrCreateChat(userId);
      navigation.navigate('Chats', { chatId: response.chat._id });
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to start chat');
    }
  };

  const renderInterestItem = ({ item }) => {
    let profile, userId;
    
    if (activeTab === 'sent') {
      profile = item.profile;
      userId = item.toUserId._id;
    } else if (activeTab === 'received') {
      profile = item.profile;
      userId = item.fromUserId._id;
    } else {
      profile = item.profile;
      const currentUserId = user?.id;
      userId = item.fromUserId._id.toString() === currentUserId 
        ? item.toUserId._id 
        : item.fromUserId._id;
    }

    return (
      <View style={styles.interestCard}>
        {isBulkMode && activeTab === 'received' && item.status === 'pending' && (
          <TouchableOpacity
            style={[styles.checkbox, isSelected && styles.checkboxSelected]}
            onPress={() => toggleInterestSelection(item._id)}
          >
            <Text style={styles.checkboxText}>
              {isSelected ? '✓' : ''}
            </Text>
          </TouchableOpacity>
        )}
        <View style={styles.interestContent}>
          <TouchableOpacity
            onPress={() => navigation.navigate('ProfileDetail', { id: profile?._id })}
            activeOpacity={0.8}
          >
            {profile?.photos?.[0]?.url ? (
              <Image
                source={{ uri: getImageUrl(profile.photos[0].url) }}
                style={styles.profileImage}
              />
            ) : (
              <View style={styles.profileImagePlaceholder}>
                <Text style={styles.profileImageText}>
                  {profile?.personalInfo?.firstName?.[0] || 'U'}
                </Text>
              </View>
            )}
          </TouchableOpacity>
          <View style={styles.interestInfo}>
            <TouchableOpacity
              onPress={() => navigation.navigate('ProfileDetail', { id: profile?._id })}
              activeOpacity={0.7}
            >
              <Text style={styles.profileName}>
                {profile?.personalInfo?.firstName} {profile?.personalInfo?.lastName}
              </Text>
            </TouchableOpacity>
            {activeTab !== 'matches' && (
              <Text style={styles.statusText}>Status: {item.status}</Text>
            )}
          </View>
        </View>
        <View style={styles.interestActions}>
          <TouchableOpacity
            style={[styles.actionButton, styles.viewButton]}
            onPress={(e) => {
              e.stopPropagation();
              navigation.navigate('ProfileDetail', { id: profile?._id });
            }}
          >
            <Text style={styles.actionButtonText}>View</Text>
          </TouchableOpacity>
          {activeTab === 'received' && item.status === 'pending' && !isBulkMode && (
            <View style={styles.actionButtons}>
              <TouchableOpacity
                style={[styles.actionButton, styles.acceptButton]}
                onPress={(e) => {
                  e.stopPropagation();
                  handleAccept(item._id);
                }}
              >
                <Text style={styles.actionButtonText}>Accept</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionButton, styles.rejectButton]}
                onPress={(e) => {
                  e.stopPropagation();
                  handleReject(item._id);
                }}
              >
                <Text style={styles.actionButtonText}>Reject</Text>
              </TouchableOpacity>
            </View>
          )}
          {activeTab === 'sent' && item.status === 'pending' && (
            <TouchableOpacity
              style={[styles.actionButton, styles.withdrawButton]}
              onPress={(e) => {
                e.stopPropagation();
                handleWithdraw(item._id);
              }}
            >
              <Text style={styles.actionButtonText}>Withdraw</Text>
            </TouchableOpacity>
          )}
          {(item.status === 'accepted' || activeTab === 'matches') && (
            <View style={styles.matchActions}>
              <TouchableOpacity
                style={[styles.actionButton, styles.historyButton]}
                onPress={async (e) => {
                  e.stopPropagation();
                  try {
                    const userId = activeTab === 'matches' 
                      ? (item.fromUserId?._id === user?.id ? item.toUserId?._id : item.fromUserId?._id)
                      : (activeTab === 'sent' ? item.toUserId?._id : item.fromUserId?._id);
                    const history = await getInterestHistory(userId);
                    Alert.alert(
                      'Interest History',
                      `Compatibility: ${history.compatibility}%\n\nTimeline:\n${history.timeline.map(t => 
                        `${new Date(t.date).toLocaleDateString()}: ${t.action.replace(/_/g, ' ')} (${t.status})`
                      ).join('\n')}`,
                      [{ text: 'OK' }]
                    );
                  } catch (error) {
                    Alert.alert('Error', 'Failed to load history');
                  }
                }}
              >
                <Text style={styles.actionButtonText}>📜 History</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionButton, styles.chatButton]}
                onPress={(e) => {
                  e.stopPropagation();
                  handleChat(userId);
                }}
              >
                <Text style={styles.actionButtonText}>Chat</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    );
  };

  const getCurrentData = () => {
    if (activeTab === 'sent') return sentInterests;
    if (activeTab === 'received') return receivedInterests;
    return matches;
  };

  return (
    <View style={styles.container}>
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'received' && styles.activeTab]}
          onPress={() => setActiveTab('received')}
        >
          <Text style={[styles.tabText, activeTab === 'received' && styles.activeTabText]}>
            Received ({receivedInterests.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'sent' && styles.activeTab]}
          onPress={() => setActiveTab('sent')}
        >
          <Text style={[styles.tabText, activeTab === 'sent' && styles.activeTabText]}>
            Sent ({sentInterests.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'matches' && styles.activeTab]}
          onPress={() => setActiveTab('matches')}
        >
          <Text style={[styles.tabText, activeTab === 'matches' && styles.activeTabText]}>
            Matches ({matches.length})
          </Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator size="large" style={styles.loader} />
      ) : (
        <FlatList
          data={getCurrentData()}
          renderItem={renderInterestItem}
          keyExtractor={(item) => item._id}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={async () => {
                setRefreshing(true);
                await loadData();
                setRefreshing(false);
              }}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              {activeTab === 'sent' ? (
                <>
                  <Text style={styles.emptyEmoji}>💌</Text>
                  <Text style={styles.emptyTitle}>No Sent Interests</Text>
                  <Text style={styles.emptyText}>
                    You haven't sent any interests yet. Browse profiles and send interests to people you're interested in!
                  </Text>
                  <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() => navigation.navigate('Search')}
                  >
                    <Text style={styles.actionButtonText}>Browse Profiles</Text>
                  </TouchableOpacity>
                </>
              ) : activeTab === 'received' ? (
                <>
                  <Text style={styles.emptyEmoji}>📬</Text>
                  <Text style={styles.emptyTitle}>No Received Interests</Text>
                  <Text style={styles.emptyText}>
                    You haven't received any interests yet. Complete your profile to increase your visibility!
                  </Text>
                  <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() => navigation.navigate('Profile', { edit: true })}
                  >
                    <Text style={styles.actionButtonText}>Complete Profile</Text>
                  </TouchableOpacity>
                </>
              ) : (
                <>
                  <Text style={styles.emptyEmoji}>💕</Text>
                  <Text style={styles.emptyTitle}>No Matches Yet</Text>
                  <Text style={styles.emptyText}>
                    You don't have any mutual matches yet. When someone accepts your interest, they'll appear here!
                  </Text>
                  <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() => navigation.navigate('Search')}
                  >
                    <Text style={styles.actionButtonText}>Browse More Profiles</Text>
                  </TouchableOpacity>
                </>
              )}
            </View>
          }
        />
      )}

      <SubscriptionRequiredModal
        isOpen={showSubscriptionModal}
        onSubscribe={() => navigation.navigate('Subscription')}
      />
      <ProfileIncompleteModal
        isOpen={showProfileIncompleteModal}
        onCompleteProfile={() => navigation.navigate('Profile', { edit: true })}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  bulkActionsContainer: {
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    backgroundColor: '#f9f9f9',
  },
  bulkActionsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  bulkActionButton: {
    flex: 1,
    padding: 10,
    borderRadius: 8,
    backgroundColor: '#ef4444',
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#9ca3af',
  },
  bulkActionButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderWidth: 2,
    borderColor: '#ef4444',
    borderRadius: 4,
    marginRight: 10,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  checkboxSelected: {
    backgroundColor: '#ef4444',
  },
  checkboxText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  tabContainer: {
    flexDirection: 'row',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  tab: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
    marginRight: 10,
    alignItems: 'center',
  },
  activeTab: {
    backgroundColor: '#ef4444',
  },
  tabText: {
    color: '#666',
    fontWeight: 'bold',
    fontSize: 12,
  },
  activeTabText: {
    color: '#fff',
  },
  loader: {
    marginTop: 50,
  },
  interestCard: {
    backgroundColor: '#fff',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkbox: {
    width: 24,
    height: 24,
    borderWidth: 2,
    borderColor: '#ef4444',
    borderRadius: 4,
    marginRight: 10,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  checkboxSelected: {
    backgroundColor: '#ef4444',
  },
  checkboxText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
  },
  interestContent: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    flex: 1,
  },
  profileImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
    marginRight: 15,
  },
  profileImagePlaceholder: {
    width: 60,
    height: 60,
    borderRadius: 8,
    backgroundColor: '#e0e0e0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  profileImageText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#666',
  },
  interestInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ef4444',
    marginBottom: 4,
  },
  statusText: {
    fontSize: 14,
    color: '#666',
  },
  interestActions: {
    alignItems: 'flex-end',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 10,
  },
  actionButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  viewButton: {
    backgroundColor: '#6b7280',
  },
  acceptButton: {
    backgroundColor: '#10b981',
  },
  rejectButton: {
    backgroundColor: '#ef4444',
  },
  chatButton: {
    backgroundColor: '#ef4444',
  },
  actionButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
  },
  emptyContainer: {
    padding: 50,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
  },
});

export default InterestsScreen;

