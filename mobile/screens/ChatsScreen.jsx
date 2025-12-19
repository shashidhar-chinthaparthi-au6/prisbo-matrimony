import { useState, useEffect } from 'react';
import { View, Text, FlatList, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Image } from 'react-native';
import { useQuery } from 'react-query';
import { getCurrentSubscription } from '../services/subscriptionService';
import { getMyProfile } from '../services/profileService';
import { getChats, getMessages, sendMessage } from '../services/chatService';
import { getImageUrl } from '../config/api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import SubscriptionRequiredModal from '../components/SubscriptionRequiredModal';
import ProfileIncompleteModal from '../components/ProfileIncompleteModal';
import { isProfileComplete } from '../utils/profileUtils';

const ChatsScreen = ({ navigation, route }) => {
  const [chats, setChats] = useState([]);
  const [selectedChat, setSelectedChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [messageText, setMessageText] = useState('');
  const [loading, setLoading] = useState(false);
  const [userId, setUserId] = useState(null);
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);
  const [showProfileIncompleteModal, setShowProfileIncompleteModal] = useState(false);

  const { data: subscriptionData } = useQuery('current-subscription', getCurrentSubscription);
  const { data: profileData } = useQuery('myProfile', getMyProfile);
  const hasActiveSubscription = subscriptionData?.hasActiveSubscription;

  useEffect(() => {
    loadUserId();
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
        loadChats();
        if (route.params?.chatId) {
          setSelectedChat(route.params.chatId);
        }
        
        // Auto-refresh chats every 5 seconds
        const chatsInterval = setInterval(() => {
          loadChats();
        }, 5000);
        
        return () => clearInterval(chatsInterval);
      }
    }
  }, [route.params, subscriptionData, hasActiveSubscription, profileData]);

  useEffect(() => {
    // Auto-select the latest chat when chats are loaded
    if (chats.length > 0 && !selectedChat && !route.params?.chatId) {
      const sortedChats = [...chats].sort((a, b) => {
        const dateA = a.lastMessageAt ? new Date(a.lastMessageAt) : new Date(a.createdAt);
        const dateB = b.lastMessageAt ? new Date(b.lastMessageAt) : new Date(b.createdAt);
        return dateB - dateA;
      });
      setSelectedChat(sortedChats[0]._id);
    }
  }, [chats.length, selectedChat, route.params?.chatId]);

  useEffect(() => {
    if (selectedChat) {
      loadMessages();
      
      // Auto-refresh messages every 3 seconds
      const messagesInterval = setInterval(() => {
        loadMessages();
      }, 3000);
      
      return () => clearInterval(messagesInterval);
    }
  }, [selectedChat]);

  const loadUserId = async () => {
    const user = await AsyncStorage.getItem('user');
    if (user) {
      const userData = JSON.parse(user);
      setUserId(userData.id);
    }
  };

  const loadChats = async () => {
    if (!hasActiveSubscription) {
      setShowSubscriptionModal(true);
      return;
    }
    setLoading(true);
    try {
      const response = await getChats();
      setChats(response.chats || []);
    } catch (error) {
      if (error.response?.status === 403 || error.response?.data?.requiresSubscription) {
        setShowSubscriptionModal(true);
      } else {
      alert(error.response?.data?.message || 'Failed to load chats');
      }
    } finally {
      setLoading(false);
    }
  };

  const loadMessages = async () => {
    try {
      const response = await getMessages(selectedChat);
      setMessages(response.messages || []);
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to load messages');
    }
  };

  const handleSendMessage = async () => {
    if (!messageText.trim()) return;

    try {
      await sendMessage(selectedChat, { content: messageText });
      setMessageText('');
      loadMessages();
      loadChats();
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to send message');
    }
  };

  const renderChat = ({ item }) => (
    <TouchableOpacity
      style={styles.chatItem}
      onPress={() => setSelectedChat(item._id)}
    >
      <View style={styles.chatAvatarContainer}>
        {item.profile?.photos?.[0]?.url ? (
          <Image
            source={{ uri: getImageUrl(item.profile.photos[0].url) }}
            style={styles.chatAvatar}
          />
        ) : (
          <View style={styles.chatAvatar}>
            <Text style={styles.chatAvatarText}>
              {item.profile?.personalInfo?.firstName?.[0] || 'U'}
            </Text>
          </View>
        )}
        {/* Availability indicator */}
        <View
          style={[
            styles.availabilityIndicator,
            item.isOnline ? styles.onlineIndicator : styles.offlineIndicator,
          ]}
        />
        {item.unreadCount > 0 && (
          <View style={styles.unreadBadge}>
            <Text style={styles.unreadBadgeText}>
              {item.unreadCount > 9 ? '9+' : item.unreadCount}
            </Text>
          </View>
        )}
      </View>
      <View style={styles.chatInfo}>
        <View style={styles.chatHeader}>
          <Text style={styles.chatName}>
            {item.profile?.personalInfo?.firstName} {item.profile?.personalInfo?.lastName}
          </Text>
          {item.lastMessageAt && (
            <Text style={styles.chatTime}>
              {new Date(item.lastMessageAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </Text>
          )}
        </View>
        <Text style={styles.chatLastMessage} numberOfLines={1}>
          {item.lastMessage || 'No messages yet'}
        </Text>
      </View>
    </TouchableOpacity>
  );

  const renderMessage = ({ item, index }) => {
    const isMyMessage = item.senderId._id === userId;
    const prevMessage = index > 0 ? messages[index - 1] : null;
    const showAvatar = !prevMessage || prevMessage.senderId._id !== item.senderId._id;
    
    return (
      <View
        style={[
          styles.messageWrapper,
          isMyMessage ? styles.myMessageWrapper : styles.otherMessageWrapper,
        ]}
      >
        {/* Avatar - only show for received messages and when sender changes */}
        {!isMyMessage && showAvatar && (
          <View style={styles.messageAvatarContainer}>
            {item.senderProfile?.photos?.[0]?.url ? (
              <Image
                source={{ uri: getImageUrl(item.senderProfile.photos[0].url) }}
                style={styles.messageAvatar}
              />
            ) : (
              <View style={styles.messageAvatar}>
                <Text style={styles.messageAvatarText}>
                  {item.senderProfile?.personalInfo?.firstName?.[0] || item.senderId?.email?.[0]?.toUpperCase() || 'U'}
                </Text>
              </View>
            )}
          </View>
        )}
        {!isMyMessage && !showAvatar && <View style={styles.messageAvatarSpacer} />}
        <View
          style={[
            styles.messageContainer,
            isMyMessage ? styles.myMessage : styles.otherMessage,
          ]}
        >
          <Text style={isMyMessage ? styles.myMessageText : styles.otherMessageText}>
            {item.content}
          </Text>
          <View style={styles.messageTimeContainer}>
            <Text style={[styles.messageTime, isMyMessage && styles.myMessageTime]}>
              {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </Text>
            {isMyMessage && <Text style={styles.checkmark}>✓</Text>}
          </View>
        </View>
      </View>
    );
  };

  if (!selectedChat) {
    return (
      <View style={styles.container}>
        {loading ? (
          <ActivityIndicator size="large" style={styles.loader} />
        ) : (
          <FlatList
            data={chats}
            renderItem={renderChat}
            keyExtractor={(item) => item._id}
            ListEmptyComponent={
              <Text style={styles.emptyText}>No chats yet</Text>
            }
          />
        )}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {(() => {
        const currentChat = chats.find(c => c._id === selectedChat);
        return (
          <View style={styles.chatHeader}>
            <TouchableOpacity onPress={() => setSelectedChat(null)}>
              <Text style={styles.backButton}>←</Text>
            </TouchableOpacity>
            {currentChat?.profile?.photos?.[0]?.url ? (
              <Image
                source={{ uri: getImageUrl(currentChat.profile.photos[0].url) }}
                style={styles.headerAvatar}
              />
            ) : (
              <View style={styles.headerAvatar}>
                <Text style={styles.headerAvatarText}>
                  {currentChat?.profile?.personalInfo?.firstName?.[0] || 'U'}
                </Text>
              </View>
            )}
            <View style={styles.headerInfo}>
              <Text style={styles.chatTitle}>
                {currentChat?.profile?.personalInfo?.firstName} {currentChat?.profile?.personalInfo?.lastName}
              </Text>
              <Text style={[
                styles.onlineStatus,
                currentChat?.isOnline ? styles.onlineText : styles.offlineText
              ]}>
                {currentChat?.isOnline ? 'Online' : 'Offline'}
              </Text>
            </View>
          </View>
        );
      })()}
      <FlatList
        data={messages}
        renderItem={({ item, index }) => renderMessage({ item, index })}
        keyExtractor={(item) => item._id}
        style={styles.messagesList}
        inverted
      />
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          value={messageText}
          onChangeText={setMessageText}
          placeholder="Type a message..."
          multiline
        />
        <TouchableOpacity style={styles.sendButton} onPress={handleSendMessage}>
          <Text style={styles.sendButtonText}>Send</Text>
        </TouchableOpacity>
      </View>

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
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  loader: {
    marginTop: 50,
  },
  chatItem: {
    flexDirection: 'row',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  chatAvatarContainer: {
    position: 'relative',
    marginRight: 15,
  },
  availabilityIndicator: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#fff',
  },
  onlineIndicator: {
    backgroundColor: '#10b981',
  },
  offlineIndicator: {
    backgroundColor: '#9ca3af',
  },
  chatAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#ef4444',
    justifyContent: 'center',
    alignItems: 'center',
  },
  chatAvatarText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  unreadBadge: {
    position: 'absolute',
    top: -5,
    right: -5,
    backgroundColor: '#ef4444',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  unreadBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  chatHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  chatTime: {
    fontSize: 11,
    color: '#999',
  },
  chatInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  chatName: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  chatLastMessage: {
    fontSize: 14,
    color: '#666',
  },
  emptyText: {
    textAlign: 'center',
    marginTop: 50,
    color: '#666',
  },
  chatHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  backButton: {
    fontSize: 24,
    color: '#ef4444',
    marginRight: 10,
    fontWeight: 'bold',
  },
  headerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#ef4444',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  headerAvatarText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  headerInfo: {
    flex: 1,
  },
  chatTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  onlineStatus: {
    fontSize: 12,
    marginTop: 2,
  },
  onlineText: {
    color: '#10b981',
  },
  offlineText: {
    color: '#999',
  },
  messagesList: {
    flex: 1,
    padding: 15,
    backgroundColor: '#f0f0f0',
  },
  messageWrapper: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginBottom: 2,
    maxWidth: '75%',
  },
  myMessageWrapper: {
    alignSelf: 'flex-end',
    flexDirection: 'row-reverse',
  },
  otherMessageWrapper: {
    alignSelf: 'flex-start',
  },
  messageAvatarContainer: {
    marginRight: 4,
    marginBottom: 2,
  },
  messageAvatarSpacer: {
    width: 24,
  },
  messageAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#e0e0e0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  messageAvatarText: {
    color: '#666',
    fontSize: 10,
    fontWeight: 'bold',
  },
  messageContainer: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
  },
  myMessage: {
    backgroundColor: '#ef4444',
    borderBottomRightRadius: 4,
  },
  otherMessage: {
    backgroundColor: '#fff',
    borderBottomLeftRadius: 4,
  },
  myMessageText: {
    color: '#fff',
    fontSize: 14,
  },
  otherMessageText: {
    color: '#333',
    fontSize: 14,
  },
  messageTimeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    justifyContent: 'flex-end',
  },
  messageTime: {
    fontSize: 10,
    color: '#999',
  },
  myMessageTime: {
    color: 'rgba(255, 255, 255, 0.8)',
  },
  checkmark: {
    fontSize: 10,
    color: 'rgba(255, 255, 255, 0.8)',
    marginLeft: 4,
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 15,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 20,
    padding: 10,
    marginRight: 10,
    maxHeight: 100,
  },
  sendButton: {
    backgroundColor: '#ef4444',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    justifyContent: 'center',
  },
  sendButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
});

export default ChatsScreen;

