import { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from 'react-query';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getCurrentSubscription } from '../services/subscriptionService';
import { getNotifications, markAsRead, markAllAsRead, deleteNotification, deleteAllNotifications, getNotificationPreferences, updateNotificationPreferences } from '../services/notificationService';
import { getMyProfile } from '../services/profileService';
import { getImageUrl } from '../config/api';
import toast from 'react-hot-toast';
import SubscriptionRequiredModal from '../components/SubscriptionRequiredModal';
import ProfileIncompleteModal from '../components/ProfileIncompleteModal';
import { isProfileComplete } from '../utils/profileUtils';

const Notifications = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState('all'); // 'all' or 'unread'
  const [typeFilter, setTypeFilter] = useState('all'); // 'all', 'interest_sent', 'interest_accepted', 'new_message', etc.
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);
  const [showProfileIncompleteModal, setShowProfileIncompleteModal] = useState(false);
  const [showPreferences, setShowPreferences] = useState(false);

  const { data: subscriptionData } = useQuery(
    'current-subscription', 
    getCurrentSubscription,
    {
      enabled: !!user && !!localStorage.getItem('token'),
      retry: false,
      refetchInterval: 10000, // Refetch every 10 seconds to catch subscription updates
      onError: () => {}, // Silently handle errors
    }
  );
  const { data: profileData } = useQuery('myProfile', getMyProfile);
  const { data, refetch } = useQuery(
    ['notifications', filter, typeFilter],
    () => getNotifications({ 
      unreadOnly: filter === 'unread',
      type: typeFilter !== 'all' ? typeFilter : undefined,
    }),
    {
      refetchInterval: 5000, // Refresh every 5 seconds
      retry: false,
      onError: (error) => {
        if (error.response?.status === 403 || error.response?.data?.requiresSubscription) {
          setShowSubscriptionModal(true);
        }
      }
    }
  );

  const { data: preferencesData, refetch: refetchPreferences } = useQuery(
    'notification-preferences',
    getNotificationPreferences
  );

  const hasActiveSubscription = subscriptionData?.hasActiveSubscription;

  useEffect(() => {
    // Skip subscription checks for super_admin and vendor
    if (user?.role === 'super_admin' || user?.role === 'vendor') {
      setShowSubscriptionModal(false);
      setShowProfileIncompleteModal(false);
      return;
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
      }
    }
  }, [subscriptionData, hasActiveSubscription, profileData, user]);

  const handleMarkAsRead = async (id) => {
    try {
      await markAsRead(id);
      refetch();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to mark as read');
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await markAllAsRead();
      toast.success('All notifications marked as read');
      refetch();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to mark all as read');
    }
  };

  const handleDelete = async (id) => {
    try {
      await deleteNotification(id);
      refetch();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to delete notification');
    }
  };

  const handleClearAll = async () => {
    if (window.confirm('Are you sure you want to delete all notifications?')) {
      try {
        await deleteAllNotifications();
        toast.success('All notifications cleared');
        refetch();
      } catch (error) {
        toast.error(error.response?.data?.message || 'Failed to clear all notifications');
      }
    }
  };

  const handleNotificationClick = async (notification) => {
    if (!notification.isRead) {
      try {
        await markAsRead(notification._id);
        // Optimistically update the UI
        refetch();
      } catch (error) {
        toast.error(error.response?.data?.message || 'Failed to mark as read');
        return;
      }
    }

    // Navigate based on notification type
    if (notification.type === 'new_message' || notification.type === 'support_message') {
      if (notification.relatedChatId) {
        navigate('/chats', { state: { chatId: notification.relatedChatId } });
      } else {
        navigate('/chats');
      }
    } else if (notification.type === 'interest_sent' || notification.type === 'interest_accepted' || notification.type === 'interest_rejected') {
      navigate('/interests');
    } else if (notification.relatedProfileId) {
      navigate(`/profiles/${notification.relatedProfileId}`);
    } else if (notification.type === 'subscription_approved' || notification.type === 'subscription_rejected' || notification.type === 'subscription_expiring' || notification.type === 'subscription_expired') {
      // Invalidate subscription query when subscription-related notification is clicked
      queryClient.invalidateQueries('current-subscription');
      navigate('/subscription');
    } else if (notification.type === 'profile_approved' || notification.type === 'profile_rejected') {
      navigate('/profile');
    }
  };

  // Watch for subscription-related notifications and invalidate query
  useEffect(() => {
    if (data?.notifications) {
      const hasSubscriptionNotification = data.notifications.some(
        (n) => !n.isRead && (n.type === 'subscription_approved' || n.type === 'subscription_rejected')
      );
      if (hasSubscriptionNotification) {
        queryClient.invalidateQueries('current-subscription');
      }
    }
  }, [data?.notifications, queryClient]);

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
    { value: 'all', label: 'All Types' },
    { value: 'interest_sent', label: 'Interests' },
    { value: 'interest_accepted', label: 'Accepted' },
    { value: 'interest_rejected', label: 'Rejected' },
    { value: 'new_message', label: 'Messages' },
    { value: 'support_message', label: 'Support' },
    { value: 'profile_approved', label: 'Profile Approved' },
    { value: 'profile_rejected', label: 'Profile Rejected' },
    { value: 'subscription_approved', label: 'Subscription' },
    { value: 'subscription_expiring', label: 'Expiring' },
  ];

  const handleUpdatePreferences = async (preferences) => {
    try {
      await updateNotificationPreferences(preferences);
      toast.success('Notification preferences updated');
      refetchPreferences();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update preferences');
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Notifications</h1>
        <div className="flex space-x-2">
          <button
            onClick={() => setShowPreferences(!showPreferences)}
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
          >
            ⚙️ Preferences
          </button>
          <button
            onClick={() => {
              setFilter(filter === 'all' ? 'unread' : 'all');
            }}
            className={`px-4 py-2 rounded-md ${
              filter === 'unread'
                ? 'bg-primary-600 text-white'
                : 'bg-gray-200 text-gray-700'
            }`}
          >
            {filter === 'all' ? 'Show Unread Only' : 'Show All'}
          </button>
          {data?.unreadCount > 0 && (
            <button
              onClick={handleMarkAllAsRead}
              className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700"
            >
              Mark All Read
            </button>
          )}
          {data?.notifications?.length > 0 && (
            <button
              onClick={handleClearAll}
              className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
            >
              Clear All
            </button>
          )}
        </div>
      </div>

      {/* Type Filter */}
      <div className="mb-4 flex flex-wrap gap-2">
        {notificationTypes.map((type) => (
          <button
            key={type.value}
            onClick={() => setTypeFilter(type.value)}
            className={`px-3 py-1 rounded-md text-sm ${
              typeFilter === type.value
                ? 'bg-primary-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            {type.label}
          </button>
        ))}
      </div>

      {/* Preferences Modal */}
      {showPreferences && preferencesData && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Notification Preferences</h2>
              <button
                onClick={() => setShowPreferences(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold mb-2">Email Notifications</h3>
                {Object.keys(preferencesData.preferences.email).map((key) => (
                  <label key={key} className="flex items-center justify-between mb-2">
                    <span className="capitalize">{key}</span>
                    <input
                      type="checkbox"
                      checked={preferencesData.preferences.email[key]}
                      onChange={(e) => {
                        const newPrefs = {
                          ...preferencesData.preferences,
                          email: {
                            ...preferencesData.preferences.email,
                            [key]: e.target.checked,
                          },
                        };
                        handleUpdatePreferences(newPrefs);
                      }}
                      className="w-4 h-4"
                    />
                  </label>
                ))}
              </div>
              
              <div>
                <h3 className="font-semibold mb-2">Push Notifications</h3>
                {Object.keys(preferencesData.preferences.push).map((key) => (
                  <label key={key} className="flex items-center justify-between mb-2">
                    <span className="capitalize">{key}</span>
                    <input
                      type="checkbox"
                      checked={preferencesData.preferences.push[key]}
                      onChange={(e) => {
                        const newPrefs = {
                          ...preferencesData.preferences,
                          push: {
                            ...preferencesData.preferences.push,
                            [key]: e.target.checked,
                          },
                        };
                        handleUpdatePreferences(newPrefs);
                      }}
                      className="w-4 h-4"
                    />
                  </label>
                ))}
              </div>
              
              <div>
                <label className="flex items-center justify-between">
                  <span className="font-semibold">Sound</span>
                  <input
                    type="checkbox"
                    checked={preferencesData.preferences.sound}
                    onChange={(e) => {
                      const newPrefs = {
                        ...preferencesData.preferences,
                        sound: e.target.checked,
                      };
                      handleUpdatePreferences(newPrefs);
                    }}
                    className="w-4 h-4"
                  />
                </label>
              </div>
            </div>
          </div>
        </div>
      )}

      {data?.notifications?.length > 0 ? (
        <div className="space-y-6">
          {(() => {
            const filtered = data.notifications.filter((notification) => {
              const matchesFilter = filter === 'all' || !notification.isRead;
              const matchesType = typeFilter === 'all' || notification.type === typeFilter;
              return matchesFilter && matchesType;
            });

            // Group by date
            const groups = {};
            filtered.forEach(notification => {
              const date = new Date(notification.createdAt);
              const today = new Date();
              const yesterday = new Date(today);
              yesterday.setDate(yesterday.getDate() - 1);
              
              let groupKey;
              if (date.toDateString() === today.toDateString()) {
                groupKey = 'Today';
              } else if (date.toDateString() === yesterday.toDateString()) {
                groupKey = 'Yesterday';
              } else {
                groupKey = date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
              }
              
              if (!groups[groupKey]) {
                groups[groupKey] = [];
              }
              groups[groupKey].push(notification);
            });

            return Object.keys(groups).map((groupKey) => (
              <div key={groupKey}>
                <h3 className="text-sm font-semibold text-gray-500 mb-3 sticky top-0 bg-gray-50 py-2 z-10">
                  {groupKey}
                </h3>
                <div className="space-y-3">
                  {groups[groupKey].map((notification) => (
            <div
              key={notification._id}
              onClick={() => handleNotificationClick(notification)}
              className={`bg-white p-4 rounded-lg shadow cursor-pointer hover:shadow-md transition-all ${
                !notification.isRead 
                  ? 'border-l-4 border-primary-600 opacity-100' 
                  : 'opacity-60'
              }`}
            >
              <div className="flex items-start space-x-3">
                <div className="text-2xl">{getNotificationIcon(notification.type)}</div>
                <div className="flex-1">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className={`font-semibold ${notification.isRead ? 'text-gray-500' : 'text-gray-900'}`}>
                        {notification.title}
                      </h3>
                      <p className={`text-sm mt-1 ${notification.isRead ? 'text-gray-400' : 'text-gray-600'}`}>
                        {notification.message}
                      </p>
                      <p className="text-xs text-gray-500 mt-2">
                        {new Date(notification.createdAt).toLocaleString()}
                      </p>
                    </div>
                    <div className="flex space-x-2">
                      {!notification.isRead && (
                        <span className="w-2 h-2 bg-primary-600 rounded-full mt-2"></span>
                      )}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(notification._id);
                        }}
                        className="text-gray-400 hover:text-red-500"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
                  ))}
                </div>
              </div>
            ));
          })()}
        </div>
      ) : (
        <div className="text-center py-12">
          <div className="bg-white rounded-lg shadow p-8 max-w-md mx-auto">
            <div className="text-6xl mb-4">🔔</div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">No Notifications</h2>
            <p className="text-gray-600">
              {filter === 'unread' 
                ? "You're all caught up! No unread notifications."
                : "You don't have any notifications yet. You'll be notified about interests, matches, and other important updates."}
            </p>
          </div>
        </div>
      )}

      <SubscriptionRequiredModal
        isOpen={showSubscriptionModal}
      />
      <ProfileIncompleteModal
        isOpen={showProfileIncompleteModal}
      />
    </div>
  );
};

export default Notifications;

