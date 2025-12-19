import { useState, useEffect } from 'react';
import { useQuery } from 'react-query';
import { useNavigate } from 'react-router-dom';
import { getCurrentSubscription } from '../services/subscriptionService';
import { getNotifications, markAsRead, markAllAsRead, deleteNotification, deleteAllNotifications } from '../services/notificationService';
import { getImageUrl } from '../config/api';
import toast from 'react-hot-toast';
import SubscriptionRequiredModal from '../components/SubscriptionRequiredModal';

const Notifications = () => {
  const navigate = useNavigate();
  const [filter, setFilter] = useState('all'); // 'all' or 'unread'
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);

  const { data: subscriptionData } = useQuery('current-subscription', getCurrentSubscription);
  const { data, refetch } = useQuery(
    ['notifications', filter],
    () => getNotifications({ unreadOnly: filter === 'unread' }),
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

  const hasActiveSubscription = subscriptionData?.hasActiveSubscription;

  useEffect(() => {
    if (subscriptionData && !hasActiveSubscription) {
      setShowSubscriptionModal(true);
    }
  }, [subscriptionData, hasActiveSubscription]);

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
    if (notification.type === 'new_message' && notification.relatedChatId) {
      navigate('/chats', { state: { chatId: notification.relatedChatId } });
    } else if (notification.relatedProfileId) {
      navigate(`/profiles/${notification.relatedProfileId}`);
    } else if (notification.type === 'interest_sent' || notification.type === 'interest_accepted') {
      navigate('/interests');
    }
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

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Notifications</h1>
        <div className="flex space-x-2">
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

      {data?.notifications?.length > 0 ? (
        <div className="space-y-3">
          {data.notifications
            .filter((notification) => filter === 'all' || !notification.isRead)
            .map((notification) => (
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
      ) : (
        <div className="text-center py-12 text-gray-500">
          No notifications found
        </div>
      )}

      <SubscriptionRequiredModal
        isOpen={showSubscriptionModal}
        onClose={() => setShowSubscriptionModal(false)}
      />
    </div>
  );
};

export default Notifications;

