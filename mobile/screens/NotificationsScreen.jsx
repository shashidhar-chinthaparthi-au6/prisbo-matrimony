import { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, RefreshControl } from 'react-native';
import { useQuery } from 'react-query';
import { getCurrentSubscription } from '../services/subscriptionService';
import { getMyProfile } from '../services/profileService';
import { getNotifications, markAsRead, markAllAsRead, deleteNotification, deleteAllNotifications, getNotificationPreferences, updateNotificationPreferences } from '../services/notificationService';
import SubscriptionRequiredModal from '../components/SubscriptionRequiredModal';
import ProfileIncompleteModal from '../components/ProfileIncompleteModal';
import { isProfileComplete } from '../utils/profileUtils';
import { useAuth } from '../context/AuthContext';

const NotificationsScreen = ({ navigation }) => {
  const { user } = useAuth();
  const [filter, setFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);
  const [showProfileIncompleteModal, setShowProfileIncompleteModal] = useState(false);
  const [showPreferences, setShowPreferences] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const { data: subscriptionData } = useQuery('current-subscription', getCurrentSubscription);
  const { data: profileData } = useQuery('myProfile', getMyProfile);
  const hasActiveSubscription = subscriptionData?.hasActiveSubscription;

  const loadNotifications = async () => {
    // Skip subscription check for super_admin and vendor
    if (user?.role !== 'super_admin' && user?.role !== 'vendor' && !hasActiveSubscription) {
      setShowSubscriptionModal(true);
      return;
    }
    try {
      const response = await getNotifications({ 
        unreadOnly: filter === 'unread',
        type: typeFilter !== 'all' ? typeFilter : undefined,
      });
      setNotifications(response.notifications || []);
      setUnreadCount(response.unreadCount || 0);
    } catch (error) {
      // Skip subscription modal for super_admin and vendor
      if (user?.role !== 'super_admin' && user?.role !== 'vendor' && (error.response?.status === 403 || error.response?.data?.requiresSubscription)) {
        setShowSubscriptionModal(true);
      } else {
        alert(error.response?.data?.message || 'Failed to load notifications');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Skip subscription checks for super_admin and vendor
    if (user?.role === 'super_admin' || user?.role === 'vendor') {
      setShowSubscriptionModal(false);
      setShowProfileIncompleteModal(false);
      loadNotifications();
      const interval = setInterval(loadNotifications, 5000);
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
        loadNotifications();
        const interval = setInterval(loadNotifications, 5000);
        return () => clearInterval(interval);
      }
    }
  }, [filter, subscriptionData, hasActiveSubscription, profileData, user]);

  const handleNotificationPress = async (notification) => {
    if (!notification.isRead) {
      try {
        await markAsRead(notification._id);
        // Update local state immediately
        setNotifications(prev => 
          prev.map(n => n._id === notification._id ? { ...n, isRead: true } : n)
        );
        setUnreadCount(prev => Math.max(0, prev - 1));
        loadNotifications();
      } catch (error) {
        alert(error.response?.data?.message || 'Failed to mark as read');
        return;
      }
    }

    // Navigate based on notification type
    if (notification.type === 'new_message' || notification.type === 'support_message') {
      if (notification.relatedChatId) {
        navigation.navigate('Chats', { chatId: notification.relatedChatId });
      } else {
        navigation.navigate('Chats');
      }
    } else if (notification.type === 'interest_sent' || notification.type === 'interest_accepted' || notification.type === 'interest_rejected') {
      navigation.navigate('Interests');
    } else if (notification.relatedProfileId) {
      navigation.navigate('ProfileDetail', { id: notification.relatedProfileId });
    } else if (notification.type === 'subscription_approved' || notification.type === 'subscription_rejected' || notification.type === 'subscription_expiring' || notification.type === 'subscription_expired') {
      navigation.navigate('Subscription');
    } else if (notification.type === 'profile_approved' || notification.type === 'profile_rejected') {
      navigation.navigate('Profile');
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await markAllAsRead();
      alert('All notifications marked as read');
      loadNotifications();
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to mark all as read');
    }
  };

  const handleDelete = async (id) => {
    try {
      await deleteNotification(id);
      loadNotifications();
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to delete notification');
    }
  };

  const handleClearAll = () => {
    Alert.alert(
      'Clear All Notifications',
      'Are you sure you want to delete all notifications? This action cannot be undone.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Clear All',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteAllNotifications();
              alert('All notifications cleared');
              loadNotifications();
            } catch (error) {
              alert(error.response?.data?.message || 'Failed to clear all notifications');
            }
          },
        },
      ]
    );
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'interest_sent':
        return '💝';
      case 'interest_accepted':
        return '✅';
      case 'interest_rejected':
        return '❌';
      case 'new_message':
      case 'support_message':
        return '💬';
      case 'profile_approved':
        return '✓';
      case 'profile_rejected':
        return '✗';
      case 'subscription_approved':
        return '💰';
      case 'subscription_rejected':
        return '❌';
      case 'subscription_expiring':
      case 'subscription_expired':
        return '⏰';
      default:
        return '🔔';
    }
  };

  const notificationTypes = [
    { value: 'all', label: 'All' },
    { value: 'interest_sent', label: 'Interests' },
    { value: 'interest_accepted', label: 'Accepted' },
    { value: 'new_message', label: 'Messages' },
    { value: 'support_message', label: 'Support' },
    { value: 'profile_approved', label: 'Profile' },
    { value: 'subscription_approved', label: 'Subscription' },
  ];

  const { data: preferencesData, refetch: refetchPreferences } = useQuery(
    'notification-preferences',
    getNotificationPreferences
  );

  const handleUpdatePreferences = async (preferences) => {
    try {
      await updateNotificationPreferences(preferences);
      Alert.alert('Success', 'Notification preferences updated');
      refetchPreferences();
    } catch (error) {
      Alert.alert('Error', error.response?.data?.message || 'Failed to update preferences');
    }
  };

  const renderNotification = ({ item }) => (
    <TouchableOpacity
      style={[
        styles.notificationItem, 
        !item.isRead && styles.unreadNotification,
        item.isRead && styles.readNotification
      ]}
      onPress={() => handleNotificationPress(item)}
    >
      <View style={styles.notificationContent}>
        <Text style={styles.notificationIcon}>{getNotificationIcon(item.type)}</Text>
        <View style={styles.notificationText}>
          <Text style={[
            styles.notificationTitle,
            item.isRead && styles.readNotificationTitle
          ]}>
            {item.title}
          </Text>
          <Text style={[
            styles.notificationMessage,
            item.isRead && styles.readNotificationMessage
          ]}>
            {item.message}
          </Text>
          <Text style={styles.notificationTime}>
            {new Date(item.createdAt).toLocaleString()}
          </Text>
        </View>
        {!item.isRead && <View style={styles.unreadDot} />}
        <TouchableOpacity
          onPress={() => handleDelete(item._id)}
          style={styles.deleteButton}
        >
          <Text style={styles.deleteButtonText}>✕</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <Text style={styles.title}>Notifications</Text>
          <TouchableOpacity
            onPress={() => setShowPreferences(!showPreferences)}
            style={styles.preferencesButton}
          >
            <Text style={styles.preferencesButtonText}>⚙️</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={[styles.filterButton, filter === 'unread' && styles.filterButtonActive]}
            onPress={() => setFilter(filter === 'all' ? 'unread' : 'all')}
          >
            <Text style={[styles.filterButtonText, filter === 'unread' && styles.filterButtonTextActive]}>
              {filter === 'all' ? 'Unread' : 'All'}
            </Text>
          </TouchableOpacity>
          {unreadCount > 0 && (
            <TouchableOpacity style={styles.markAllButton} onPress={handleMarkAllAsRead}>
              <Text style={styles.markAllButtonText}>Mark All Read</Text>
            </TouchableOpacity>
          )}
          {notifications.length > 0 && (
            <TouchableOpacity style={styles.clearAllButton} onPress={handleClearAll}>
              <Text style={styles.clearAllButtonText}>Clear All</Text>
            </TouchableOpacity>
          )}
        </View>
        {/* Type Filter */}
        <View style={styles.typeFilterContainer}>
          <FlatList
            horizontal
            showsHorizontalScrollIndicator={false}
            data={notificationTypes}
            keyExtractor={(item) => item.value}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[
                  styles.typeFilterButton,
                  typeFilter === item.value && styles.typeFilterButtonActive
                ]}
                onPress={() => setTypeFilter(item.value)}
              >
                <Text style={[
                  styles.typeFilterButtonText,
                  typeFilter === item.value && styles.typeFilterButtonTextActive
                ]}>
                  {item.label}
                </Text>
              </TouchableOpacity>
            )}
          />
        </View>
      </View>

      {/* Preferences Modal */}
      {showPreferences && preferencesData && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Notification Preferences</Text>
              <TouchableOpacity onPress={() => setShowPreferences(false)}>
                <Text style={styles.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>
            
            <View style={styles.preferencesContent}>
              <Text style={styles.preferencesSectionTitle}>Email Notifications</Text>
              {Object.keys(preferencesData.preferences.email).map((key) => (
                <View key={key} style={styles.preferenceItem}>
                  <Text style={styles.preferenceLabel}>{key.charAt(0).toUpperCase() + key.slice(1)}</Text>
                  <TouchableOpacity
                    style={[styles.checkbox, preferencesData.preferences.email[key] && styles.checkboxChecked]}
                    onPress={() => {
                      const newPrefs = {
                        ...preferencesData.preferences,
                        email: {
                          ...preferencesData.preferences.email,
                          [key]: !preferencesData.preferences.email[key],
                        },
                      };
                      handleUpdatePreferences(newPrefs);
                    }}
                  >
                    {preferencesData.preferences.email[key] && <Text style={styles.checkmark}>✓</Text>}
                  </TouchableOpacity>
                </View>
              ))}
              
              <Text style={styles.preferencesSectionTitle}>Push Notifications</Text>
              {Object.keys(preferencesData.preferences.push).map((key) => (
                <View key={key} style={styles.preferenceItem}>
                  <Text style={styles.preferenceLabel}>{key.charAt(0).toUpperCase() + key.slice(1)}</Text>
                  <TouchableOpacity
                    style={[styles.checkbox, preferencesData.preferences.push[key] && styles.checkboxChecked]}
                    onPress={() => {
                      const newPrefs = {
                        ...preferencesData.preferences,
                        push: {
                          ...preferencesData.preferences.push,
                          [key]: !preferencesData.preferences.push[key],
                        },
                      };
                      handleUpdatePreferences(newPrefs);
                    }}
                  >
                    {preferencesData.preferences.push[key] && <Text style={styles.checkmark}>✓</Text>}
                  </TouchableOpacity>
                </View>
              ))}
              
              <View style={styles.preferenceItem}>
                <Text style={styles.preferenceLabel}>Sound</Text>
                <TouchableOpacity
                  style={[styles.checkbox, preferencesData.preferences.sound && styles.checkboxChecked]}
                  onPress={() => {
                    const newPrefs = {
                      ...preferencesData.preferences,
                      sound: !preferencesData.preferences.sound,
                    };
                    handleUpdatePreferences(newPrefs);
                  }}
                >
                  {preferencesData.preferences.sound && <Text style={styles.checkmark}>✓</Text>}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      )}

      {loading ? (
        <ActivityIndicator size="large" style={styles.loader} />
      ) : notifications.filter(n => {
        const matchesFilter = filter === 'all' || !n.isRead;
        const matchesType = typeFilter === 'all' || n.type === typeFilter;
        return matchesFilter && matchesType;
      }).length > 0 ? (
        <FlatList
          data={notifications.filter(n => {
            const matchesFilter = filter === 'all' || !n.isRead;
            const matchesType = typeFilter === 'all' || n.type === typeFilter;
            return matchesFilter && matchesType;
          })}
          renderItem={renderNotification}
          keyExtractor={(item) => item._id}
          ListEmptyComponent={
            <Text style={styles.emptyText}>No notifications found</Text>
          }
        />
      ) : (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyEmoji}>🔔</Text>
          <Text style={styles.emptyTitle}>
            {filter === 'unread' ? 'No Unread Notifications' : 'No Notifications'}
          </Text>
          <Text style={styles.emptyText}>
            {filter === 'unread' 
              ? "You're all caught up! No unread notifications."
              : "You don't have any notifications yet. You'll be notified about interests, matches, and other important updates."}
          </Text>
        </View>
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
  header: {
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  headerActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  filterButton: {
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
  },
  filterButtonActive: {
    backgroundColor: '#ef4444',
  },
  filterButtonText: {
    color: '#666',
    fontWeight: 'bold',
  },
  filterButtonTextActive: {
    color: '#fff',
  },
  markAllButton: {
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#ef4444',
    marginRight: 10,
  },
  markAllButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  clearAllButton: {
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#dc2626',
  },
  clearAllButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  notificationItem: {
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  unreadNotification: {
    backgroundColor: '#f9f9f9',
    borderLeftWidth: 4,
    borderLeftColor: '#ef4444',
  },
  readNotification: {
    opacity: 0.6,
  },
  readNotificationTitle: {
    color: '#999',
  },
  readNotificationMessage: {
    color: '#bbb',
  },
  notificationContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  notificationIcon: {
    fontSize: 24,
    marginRight: 15,
  },
  notificationText: {
    flex: 1,
  },
  notificationTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  notificationMessage: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  notificationTime: {
    fontSize: 12,
    color: '#999',
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#ef4444',
    marginLeft: 10,
    marginTop: 5,
  },
  deleteButton: {
    padding: 5,
  },
  deleteButtonText: {
    fontSize: 18,
    color: '#999',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 30,
  },
  emptyEmoji: {
    fontSize: 60,
    marginBottom: 15,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#333',
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  loader: {
    marginTop: 50,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  preferencesButton: {
    padding: 8,
  },
  preferencesButtonText: {
    fontSize: 20,
  },
  typeFilterContainer: {
    marginTop: 10,
    paddingVertical: 5,
  },
  typeFilterButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#f0f0f0',
    marginRight: 8,
  },
  typeFilterButtonActive: {
    backgroundColor: '#ef4444',
  },
  typeFilterButtonText: {
    color: '#666',
    fontSize: 12,
    fontWeight: '600',
  },
  typeFilterButtonTextActive: {
    color: '#fff',
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
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    width: '90%',
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  modalClose: {
    fontSize: 24,
    color: '#999',
  },
  preferencesContent: {
    maxHeight: 400,
  },
  preferencesSectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 15,
    marginBottom: 10,
  },
  preferenceItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  preferenceLabel: {
    fontSize: 14,
    color: '#333',
  },
  checkbox: {
    width: 24,
    height: 24,
    borderWidth: 2,
    borderColor: '#ddd',
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {
    backgroundColor: '#ef4444',
    borderColor: '#ef4444',
  },
  checkmark: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
});

export default NotificationsScreen;

