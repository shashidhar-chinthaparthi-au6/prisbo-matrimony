import { useState, useEffect, useRef } from 'react';
import { useQuery } from 'react-query';
import { useLocation } from 'react-router-dom';
import { getCurrentSubscription } from '../services/subscriptionService';
import { getChats, getMessages, sendMessage } from '../services/chatService';
import { getImageUrl } from '../config/api';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import SubscriptionRequiredModal from '../components/SubscriptionRequiredModal';

const Chats = () => {
  const location = useLocation();
  const { user } = useAuth();
  const [selectedChat, setSelectedChat] = useState(null);
  const [message, setMessage] = useState('');
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);
  const messagesEndRef = useRef(null);

  const { data: subscriptionData } = useQuery('current-subscription', getCurrentSubscription);
  const { data: chatsData, refetch: refetchChats } = useQuery('chats', getChats, {
    refetchInterval: 5000, // Refresh every 5 seconds for notifications
    retry: false,
    onError: (error) => {
      if (error.response?.status === 403 || error.response?.data?.requiresSubscription) {
        setShowSubscriptionModal(true);
      }
    }
  });
  const { data: messagesData, refetch: refetchMessages } = useQuery(
    ['messages', selectedChat],
    () => getMessages(selectedChat),
    { 
      enabled: !!selectedChat,
      refetchInterval: 3000, // Refresh messages every 3 seconds
    }
  );

  useEffect(() => {
    if (location.state?.chatId) {
      setSelectedChat(location.state.chatId);
    } else if (chatsData?.chats?.length > 0 && !selectedChat) {
      // Auto-select the latest chat (most recent lastMessageAt)
      const sortedChats = [...chatsData.chats].sort((a, b) => {
        const dateA = a.lastMessageAt ? new Date(a.lastMessageAt) : new Date(a.createdAt);
        const dateB = b.lastMessageAt ? new Date(b.lastMessageAt) : new Date(b.createdAt);
        return dateB - dateA;
      });
      setSelectedChat(sortedChats[0]._id);
    }
  }, [location.state, chatsData, selectedChat]);

  const hasActiveSubscription = subscriptionData?.hasActiveSubscription;

  useEffect(() => {
    // Always show modal if user doesn't have active subscription
    if (subscriptionData && !hasActiveSubscription) {
      setShowSubscriptionModal(true);
    }
  }, [subscriptionData, hasActiveSubscription]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messagesData?.messages]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!message.trim()) return;

    try {
      await sendMessage(selectedChat, { content: message });
      setMessage('');
      refetchMessages();
      refetchChats();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to send message');
    }
  };

  return (
    <div className="flex h-[600px] bg-white rounded-lg shadow">
      {/* Chat List */}
      <div className="w-1/3 border-r overflow-y-auto">
        <div className="p-4 border-b">
          <h2 className="font-semibold">Chats</h2>
        </div>
        {chatsData?.chats?.map((chat) => {
          const otherParticipant = chat.otherParticipant;
          return (
            <div
              key={chat._id}
              onClick={() => setSelectedChat(chat._id)}
              className={`p-4 border-b cursor-pointer hover:bg-gray-50 relative ${
                selectedChat === chat._id ? 'bg-primary-50' : ''
              }`}
            >
              <div className="flex items-center space-x-3">
                <div className="relative">
                  {chat.profile?.photos?.[0]?.url ? (
                    <img
                      src={getImageUrl(chat.profile.photos[0].url)}
                      alt="Profile"
                      className="w-12 h-12 object-cover rounded-full"
                    />
                  ) : (
                    <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center">
                      <span className="text-gray-500 text-sm font-semibold">
                        {chat.profile?.personalInfo?.firstName?.[0] || 'U'}
                      </span>
                    </div>
                  )}
                  {/* Availability indicator */}
                  <span
                    className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white ${
                      chat.isOnline ? 'bg-green-500' : 'bg-gray-400'
                    }`}
                    title={chat.isOnline ? 'Online' : 'Offline'}
                  />
                  {chat.unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">
                      {chat.unreadCount > 9 ? '9+' : chat.unreadCount}
                    </span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className="font-semibold truncate">
                      {chat.profile?.personalInfo?.firstName} {chat.profile?.personalInfo?.lastName}
                    </p>
                    {chat.lastMessageAt && (
                      <span className="text-xs text-gray-500 ml-2">
                        {new Date(chat.lastMessageAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-600 truncate">
                    {chat.lastMessage || 'No messages yet'}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Chat Window */}
      <div className="flex-1 flex flex-col bg-gray-50">
        {selectedChat ? (
          <>
            <div className="p-4 border-b bg-white flex items-center space-x-3">
              {chatsData?.chats?.find(c => c._id === selectedChat)?.profile?.photos?.[0]?.url ? (
                <img
                  src={getImageUrl(chatsData.chats.find(c => c._id === selectedChat).profile.photos[0].url)}
                  alt="Profile"
                  className="w-10 h-10 object-cover rounded-full"
                />
              ) : (
                <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                  <span className="text-gray-500 text-sm font-semibold">
                    {chatsData?.chats?.find(c => c._id === selectedChat)?.profile?.personalInfo?.firstName?.[0] || 'U'}
                  </span>
                </div>
              )}
              <div>
                <h2 className="font-semibold">
                  {chatsData?.chats?.find(c => c._id === selectedChat)?.profile?.personalInfo?.firstName}{' '}
                  {chatsData?.chats?.find(c => c._id === selectedChat)?.profile?.personalInfo?.lastName}
                </h2>
                <p className={`text-xs ${chatsData?.chats?.find(c => c._id === selectedChat)?.isOnline ? 'text-green-500' : 'text-gray-500'}`}>
                  {chatsData?.chats?.find(c => c._id === selectedChat)?.isOnline ? 'Online' : 'Offline'}
                </p>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-1">
              {messagesData?.messages?.map((msg, index) => {
                const isMyMessage = msg.senderId._id === user?.id;
                const prevMessage = index > 0 ? messagesData.messages[index - 1] : null;
                const showAvatar = !prevMessage || prevMessage.senderId._id !== msg.senderId._id;
                
                return (
                  <div
                    key={msg._id}
                    className={`flex ${isMyMessage ? 'justify-end' : 'justify-start'} mb-1`}
                  >
                    <div className={`flex items-end ${isMyMessage ? 'flex-row-reverse' : 'flex-row'} max-w-[70%]`}>
                      {/* Avatar - only show for received messages and when sender changes */}
                      {!isMyMessage && showAvatar && (
                        <div className="flex-shrink-0 mb-1 mr-1">
                          {msg.senderProfile?.photos?.[0]?.url ? (
                            <img
                              src={getImageUrl(msg.senderProfile.photos[0].url)}
                              alt="Sender"
                              className="w-6 h-6 object-cover rounded-full"
                            />
                          ) : (
                            <div className="w-6 h-6 bg-gray-300 rounded-full flex items-center justify-center">
                              <span className="text-gray-600 text-xs font-semibold">
                                {msg.senderProfile?.personalInfo?.firstName?.[0] || 'U'}
                              </span>
                            </div>
                          )}
                        </div>
                      )}
                      {/* Message bubble */}
                      <div
                        className={`px-3 py-2 rounded-lg ${
                          isMyMessage
                            ? 'bg-primary-600 text-white rounded-br-sm'
                            : 'bg-gray-100 text-gray-900 rounded-bl-sm'
                        }`}
                      >
                        <p className={`text-sm ${isMyMessage ? 'text-white' : 'text-gray-900'}`}>
                          {msg.content}
                        </p>
                        <div className={`flex items-center justify-end mt-1 ${isMyMessage ? 'text-primary-100' : 'text-gray-500'}`}>
                          <span className="text-xs">
                            {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                          {isMyMessage && (
                            <span className="ml-1 text-xs">✓</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>
            <form onSubmit={handleSendMessage} className="p-4 border-t bg-white">
              <div className="flex space-x-2">
                <input
                  type="text"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Type a message..."
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
                <button
                  type="submit"
                  className="px-6 py-2 bg-primary-600 text-white rounded-full hover:bg-primary-700 transition-colors"
                >
                  Send
                </button>
              </div>
            </form>
          </>
        ) : (
          <div className="flex items-center justify-center h-full text-gray-500">
            Select a chat to start messaging
          </div>
        )}
      </div>

      <SubscriptionRequiredModal
        isOpen={showSubscriptionModal}
      />
    </div>
  );
};

export default Chats;

