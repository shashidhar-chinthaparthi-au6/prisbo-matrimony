import { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { useQuery } from 'react-query';
import { getCurrentSubscription } from '../services/subscriptionService';
import { getMyProfile } from '../services/profileService';
import { getNotifications, markAsRead, markAllAsRead, deleteNotification, deleteAllNotifications } from '../services/notificationService';
import SubscriptionRequiredModal from '../components/SubscriptionRequiredModal';
import ProfileIncompleteModal from '../components/ProfileIncompleteModal';
import { isProfileComplete } from '../utils/profileUtils';

const NotificationsScreen = ({ navigation }) => {
  const [filter, setFilter] = useState('all');
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);
  const [showProfileIncompleteModal, setShowProfileIncompleteModal] = useState(false);

  const { data: subscriptionData } = useQuery('current-subscription', getCurrentSubscription);
  const { data: profileData } = useQuery('myProfile', getMyProfile);
  const hasActiveSubscription = subscriptionData?.hasActiveSubscription;

  const loadNotifications = async () => {
    if (!hasActiveSubscription) {
      setShowSubscriptionModal(true);
      return;
    }
    try {
      const response = await getNotifications({ unreadOnly: filter === 'unread' });
      setNotifications(response.notifications || []);
      setUnreadCount(response.unreadCount || 0);
    } catch (error) {
      if (error.response?.status === 403 || error.response?.data?.requiresSubscription) {
        setShowSubscriptionModal(true);
      } else {
        alert(error.response?.data?.message || 'Failed to load notifications');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
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
  }, [filter, subscriptionData, hasActiveSubscription, profileData]);

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
    if (notification.type === 'new_message' && notification.relatedChatId) {
      navigation.navigate('Chats', { chatId: notification.relatedChatId });
    } else if (notification.relatedProfileId) {
      navigation.navigate('ProfileDetail', { id: notification.relatedProfileId });
    } else if (notification.type === 'interest_sent' || notification.type === 'interest_accepted') {
      // Navigate to interests screen if exists
      alert('Navigate to interests');
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
        return '💬';
      default:
        return '🔔';
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
        <Text style={styles.title}>Notifications</Text>
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
      </View>

      {loading ? (
        <ActivityIndicator size="large" style={styles.loader} />
      ) : notifications.filter(n => filter === 'all' || !n.isRead).length > 0 ? (
        <FlatList
          data={notifications.filter(n => filter === 'all' || !n.isRead)}
          renderItem={renderNotification}
          keyExtractor={(item) => item._id}
          ListEmptyComponent={
            <Text style={styles.emptyText}>No notifications found</Text>
          }
        />
      ) : (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No notifications found</Text>
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
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
  },
  loader: {
    marginTop: 50,
  },
});

export default NotificationsScreen;

