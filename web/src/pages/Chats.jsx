import { useState, useEffect, useRef } from 'react';
import { useQuery } from 'react-query';
import { useLocation } from 'react-router-dom';
import { getCurrentSubscription } from '../services/subscriptionService';
import { getChats, getMessages, sendMessage, deleteMessage, setTyping, getTyping, blockUser, unblockUser, getBlockedUsers, getMediaGallery, addReaction, removeReaction } from '../services/chatService';
import { getMyProfile } from '../services/profileService';
import { getImageUrl } from '../config/api';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import SubscriptionRequiredModal from '../components/SubscriptionRequiredModal';
import ProfileIncompleteModal from '../components/ProfileIncompleteModal';
import { isProfileComplete } from '../utils/profileUtils';

const Chats = () => {
  const location = useLocation();
  const { user } = useAuth();
  const [selectedChat, setSelectedChat] = useState(null);
  const [message, setMessage] = useState('');
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);
  const [showProfileIncompleteModal, setShowProfileIncompleteModal] = useState(false);
  const [typingUsers, setTypingUsers] = useState([]);
  const [blockedUsers, setBlockedUsers] = useState([]);
  const [showBlockMenu, setShowBlockMenu] = useState(false);
  const [chatSearch, setChatSearch] = useState('');
  const [showMediaGallery, setShowMediaGallery] = useState(false);
  const [mediaGallery, setMediaGallery] = useState([]);
  const [showReactionPicker, setShowReactionPicker] = useState(null);
  const [recording, setRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState(null);
  const typingTimeoutRef = useRef(null);
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const mediaRecorderRef = useRef(null);

  const { data: subscriptionData } = useQuery(
    'current-subscription', 
    getCurrentSubscription,
    {
      enabled: !!user && !!localStorage.getItem('token'),
      retry: false,
      onError: () => {}, // Silently handle errors
    }
  );
  const { data: profileData } = useQuery('myProfile', getMyProfile);
  const { data: chatsData, refetch: refetchChats } = useQuery('chats', getChats, {
    refetchInterval: 5000, // Refresh every 5 seconds for notifications
    retry: false,
    onError: (error) => {
      // Skip subscription modal for super_admin and vendor
      if (user?.role !== 'super_admin' && user?.role !== 'vendor' && (error.response?.status === 403 || error.response?.data?.requiresSubscription)) {
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

  // Fetch typing indicators
  const { data: typingData } = useQuery(
    ['typing', selectedChat],
    () => getTyping(selectedChat),
    { 
      enabled: !!selectedChat,
      refetchInterval: 1000, // Check typing every second
    }
  );

  // Fetch blocked users
  useQuery('blockedUsers', getBlockedUsers, {
    onSuccess: (data) => {
      setBlockedUsers(data?.blockedUsers || []);
    },
  });

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

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messagesData?.messages]);

  useEffect(() => {
    if (typingData?.typingUsers) {
      setTypingUsers(typingData.typingUsers);
    }
  }, [typingData]);

  // Handle typing indicator
  const handleTyping = () => {
    if (!selectedChat) return;
    
    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    
    // Send typing indicator
    setTyping(selectedChat).catch(() => {
      // Silently fail if typing indicator fails
    });
    
    // Clear typing indicator after 3 seconds of no typing
    typingTimeoutRef.current = setTimeout(() => {
      // Typing indicator will expire on server
    }, 3000);
  };

  const handleBlockUser = async (userId) => {
    if (!window.confirm('Are you sure you want to block this user? You will not be able to send or receive messages from them.')) {
      return;
    }
    try {
      await blockUser(userId);
      toast.success('User blocked successfully');
      setBlockedUsers([...blockedUsers, userId]);
      refetchChats();
      setShowBlockMenu(false);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to block user');
    }
  };

  const handleUnblockUser = async (userId) => {
    try {
      await unblockUser(userId);
      toast.success('User unblocked successfully');
      setBlockedUsers(blockedUsers.filter(id => id !== userId));
      refetchChats();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to unblock user');
    }
  };

  const handleDeleteMessage = async (messageId) => {
    if (!window.confirm('Are you sure you want to delete this message?')) {
      return;
    }
    try {
      await deleteMessage(selectedChat, messageId);
      toast.success('Message deleted');
      refetchMessages();
      refetchChats();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to delete message');
    }
  };

  const handleSendMessage = async (e, file = null) => {
    if (e) e.preventDefault();
    if (!message.trim() && !file) return;

    try {
      // Determine file type
      let fileData = null;
      if (file) {
        if (file.type.startsWith('audio/')) {
          fileData = { audio: file };
        } else if (file.type.startsWith('video/')) {
          fileData = { video: file };
        } else if (file.type.startsWith('image/')) {
          fileData = { image: file };
        } else {
          fileData = { file: file };
        }
      }
      
      await sendMessage(selectedChat, { content: message, ...fileData });
      setMessage('');
      if (file) {
        setAudioBlob(null);
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      }
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
          <h2 className="font-semibold mb-3">Chats</h2>
          <input
            type="text"
            placeholder="Search chats..."
            value={chatSearch}
            onChange={(e) => setChatSearch(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
          />
        </div>
        {!chatsData?.chats || chatsData.chats.length === 0 ? (
          <div className="flex items-center justify-center h-full p-8">
            <div className="text-center">
              <div className="text-6xl mb-4">💬</div>
              <h2 className="text-xl font-bold text-gray-900 mb-2">No Chats Yet</h2>
              <p className="text-gray-600 mb-6">
                You don't have any active chats. Send an interest to someone and when they accept, you can start chatting!
              </p>
              <Link
                to="/search"
                className="inline-block px-6 py-3 bg-primary-600 text-white rounded-md hover:bg-primary-700 font-medium"
              >
                Browse Profiles
              </Link>
            </div>
          </div>
        ) : (
          chatsData?.chats
            ?.filter((chat) => {
              if (!chatSearch.trim()) return true;
              const searchLower = chatSearch.toLowerCase();
              const name = `${chat.profile?.personalInfo?.firstName || ''} ${chat.profile?.personalInfo?.lastName || ''}`.toLowerCase();
              const lastMessage = (chat.lastMessage || '').toLowerCase();
              return name.includes(searchLower) || lastMessage.includes(searchLower);
            })
            .map((chat) => {
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
                  {chat.isTyping && (
                    <span className="absolute -top-1 -right-1 bg-blue-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center animate-pulse">
                      ...
                    </span>
                  )}
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
        })
        )}
      </div>

      {/* Chat Window */}
      <div className="flex-1 flex flex-col bg-gray-50">
        {selectedChat ? (
          <>
            <div className="p-4 border-b bg-white flex items-center space-x-3">
              {(() => {
                const chat = chatsData?.chats?.find(c => c._id === selectedChat);
                const profileId = chat?.profile?._id;
                return (
                  <>
                    {chat?.profile?.photos?.[0]?.url ? (
                      <img
                        src={getImageUrl(chat.profile.photos[0].url)}
                        alt="Profile"
                        className="w-10 h-10 object-cover rounded-full cursor-pointer hover:opacity-80 transition-opacity"
                        onClick={() => profileId && navigate(`/profiles/${profileId}`)}
                      />
                    ) : (
                      <div 
                        className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center cursor-pointer hover:opacity-80 transition-opacity"
                        onClick={() => profileId && navigate(`/profiles/${profileId}`)}
                      >
                        <span className="text-gray-500 text-sm font-semibold">
                          {chat?.profile?.personalInfo?.firstName?.[0] || 'U'}
                        </span>
                      </div>
                    )}
                    <div 
                      className="flex-1 cursor-pointer"
                      onClick={() => profileId && navigate(`/profiles/${profileId}`)}
                    >
                      <h2 className="font-semibold hover:text-primary-600 transition-colors">
                        {chat?.profile?.personalInfo?.firstName}{' '}
                        {chat?.profile?.personalInfo?.lastName}
                      </h2>
                      <p className={`text-xs ${chat?.isOnline ? 'text-green-500' : 'text-gray-500'}`}>
                        {chat?.isOnline ? 'Online' : 'Offline'}
                      </p>
                    </div>
                  </>
                );
              })()}
              <div className="relative">
                <button
                  onClick={() => setShowBlockMenu(!showBlockMenu)}
                  className="p-2 hover:bg-gray-100 rounded-full"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                  </svg>
                </button>
                {showBlockMenu && (
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg z-10 border">
                    {blockedUsers.some(bu => bu._id === chatsData?.chats?.find(c => c._id === selectedChat)?.otherParticipant?._id) ? (
                      <button
                        onClick={() => handleUnblockUser(chatsData?.chats?.find(c => c._id === selectedChat)?.otherParticipant?._id)}
                        className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      >
                        Unblock User
                      </button>
                    ) : (
                      <button
                        onClick={() => handleBlockUser(chatsData?.chats?.find(c => c._id === selectedChat)?.otherParticipant?._id)}
                        className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-100"
                      >
                        Block User
                      </button>
                    )}
                  </div>
                )}
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
                        className={`px-3 py-2 rounded-lg group relative ${
                          isMyMessage
                            ? 'bg-primary-600 text-white rounded-br-sm'
                            : 'bg-gray-100 text-gray-900 rounded-bl-sm'
                        }`}
                      >
                        {/* Message content based on type */}
                        {msg.type === 'image' && msg.imageUrl ? (
                          <img
                            src={getImageUrl(msg.imageUrl)}
                            alt="Shared image"
                            className="max-w-xs rounded-lg cursor-pointer hover:opacity-90"
                            onClick={() => window.open(getImageUrl(msg.imageUrl), '_blank')}
                          />
                        ) : msg.type === 'video' && msg.videoUrl ? (
                          <video
                            src={getImageUrl(msg.videoUrl)}
                            controls
                            className="max-w-xs rounded-lg"
                          />
                        ) : msg.type === 'audio' && msg.audioUrl ? (
                          <div className="flex items-center space-x-2">
                            <audio src={getImageUrl(msg.audioUrl)} controls className="max-w-xs" />
                            <span className="text-xs">🎤 Voice message</span>
                          </div>
                        ) : msg.type === 'file' && msg.fileUrl ? (
                          <div className="flex items-center space-x-2">
                            <a
                              href={getImageUrl(msg.fileUrl)}
                              download={msg.fileName}
                              className="text-blue-400 hover:text-blue-300 underline"
                            >
                              📎 {msg.fileName || 'Download file'}
                            </a>
                            {msg.fileSize && (
                              <span className="text-xs text-gray-400">
                                ({(msg.fileSize / 1024).toFixed(1)} KB)
                              </span>
                            )}
                          </div>
                        ) : (
                          <p className={`text-sm ${isMyMessage ? 'text-white' : 'text-gray-900'}`}>
                            {msg.content}
                          </p>
                        )}
                        
                        {/* Reactions */}
                        {msg.reactions && msg.reactions.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {Object.entries(
                              msg.reactions.reduce((acc, r) => {
                                if (!acc[r.emoji]) acc[r.emoji] = [];
                                acc[r.emoji].push(r);
                                return acc;
                              }, {})
                            ).map(([emoji, reactions]) => (
                              <button
                                key={emoji}
                                onClick={() => handleReaction(msg._id, emoji)}
                                className={`px-2 py-0.5 rounded-full text-xs ${
                                  reactions.some(r => r.userId === user?.id)
                                    ? 'bg-blue-200 text-blue-800'
                                    : 'bg-gray-200 text-gray-700'
                                }`}
                              >
                                {emoji} {reactions.length}
                              </button>
                            ))}
                          </div>
                        )}
                        
                        {/* Reaction picker button */}
                        <button
                          onClick={() => setShowReactionPicker(showReactionPicker === msg._id ? null : msg._id)}
                          className="absolute -bottom-6 left-0 opacity-0 group-hover:opacity-100 transition-opacity text-xs text-gray-500 hover:text-gray-700"
                        >
                          😊
                        </button>
                        
                        {/* Reaction picker */}
                        {showReactionPicker === msg._id && (
                          <div className="absolute -bottom-12 left-0 bg-white rounded-lg shadow-lg p-2 flex space-x-1 z-10">
                            {['👍', '❤️', '😂', '😮', '😢', '🙏'].map(emoji => (
                              <button
                                key={emoji}
                                onClick={() => handleReaction(msg._id, emoji)}
                                className="text-xl hover:scale-125 transition-transform"
                              >
                                {emoji}
                              </button>
                            ))}
                          </div>
                        )}
                        <div className={`flex items-center justify-end mt-1 ${isMyMessage ? 'text-primary-100' : 'text-gray-500'}`}>
                          <span className="text-xs">
                            {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                          {isMyMessage && (
                            <>
                              <span className="ml-1 text-xs">
                                {msg.isRead ? '✓✓' : '✓'}
                              </span>
                              {/* Delete button - only show on hover and if message is recent */}
                              {(() => {
                                const messageAge = Date.now() - new Date(msg.createdAt).getTime();
                                const fiveMinutes = 5 * 60 * 1000;
                                return messageAge < fiveMinutes ? (
                                  <button
                                    onClick={() => handleDeleteMessage(msg._id)}
                                    className="ml-2 opacity-0 group-hover:opacity-100 transition-opacity text-xs text-red-200 hover:text-red-100"
                                    title="Delete message"
                                  >
                                    ×
                                  </button>
                                ) : null;
                              })()}
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
              {/* Typing indicator */}
              {typingUsers.length > 0 && (
                <div className="flex justify-start mb-1">
                  <div className="px-3 py-2 bg-gray-100 rounded-lg rounded-bl-sm">
                    <p className="text-sm text-gray-500 italic">typing...</p>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
            <form onSubmit={handleSendMessage} className="p-4 border-t bg-white">
              <div className="flex space-x-2 items-center">
                {/* Media gallery button */}
                <button
                  type="button"
                  onClick={() => setShowMediaGallery(true)}
                  className="p-2 text-gray-600 hover:text-primary-600 hover:bg-gray-100 rounded-full transition-colors"
                  title="Media gallery"
                >
                  🖼️
                </button>
                
                {/* File upload button */}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="p-2 text-gray-600 hover:text-primary-600 hover:bg-gray-100 rounded-full transition-colors"
                  title="Attach file"
                >
                  📎
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*,video/*,audio/*,.pdf,.doc,.docx"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                
                {/* Voice message button */}
                <button
                  type="button"
                  onMouseDown={startRecording}
                  onMouseUp={stopRecording}
                  onTouchStart={startRecording}
                  onTouchEnd={stopRecording}
                  className={`p-2 rounded-full transition-colors ${
                    recording
                      ? 'bg-red-500 text-white animate-pulse'
                      : 'text-gray-600 hover:text-primary-600 hover:bg-gray-100'
                  }`}
                  title="Hold to record voice message"
                >
                  🎤
                </button>
                
                <input
                  type="text"
                  value={message}
                  onChange={(e) => {
                    setMessage(e.target.value);
                    handleTyping();
                  }}
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
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="text-6xl mb-4">💬</div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">No Chat Selected</h2>
              <p className="text-gray-600">
                Select a chat from the list to start messaging, or send an interest to someone to begin chatting!
              </p>
            </div>
          </div>
        )}
      </div>

      <SubscriptionRequiredModal
        isOpen={showSubscriptionModal}
      />
      <ProfileIncompleteModal
        isOpen={showProfileIncompleteModal}
      />
      
      {/* Media Gallery Modal */}
      {showMediaGallery && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-4xl w-full max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Media Gallery</h2>
              <button
                onClick={() => setShowMediaGallery(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>
            {mediaGallery.length > 0 ? (
              <div className="grid grid-cols-3 gap-4">
                {mediaGallery.map((item) => (
                  <div key={item._id} className="relative group">
                    {item.type === 'image' ? (
                      <img
                        src={getImageUrl(item.url)}
                        alt="Media"
                        className="w-full h-32 object-cover rounded-lg cursor-pointer hover:opacity-90"
                        onClick={() => window.open(getImageUrl(item.url), '_blank')}
                      />
                    ) : (
                      <video
                        src={getImageUrl(item.url)}
                        className="w-full h-32 object-cover rounded-lg"
                        controls
                      />
                    )}
                    <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 text-white text-xs p-1 rounded-b-lg opacity-0 group-hover:opacity-100 transition-opacity">
                      {new Date(item.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-gray-500 py-8">No media found in this chat</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Chats;

