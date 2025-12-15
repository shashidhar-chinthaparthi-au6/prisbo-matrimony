import { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, Image, ScrollView } from 'react-native';
import { getSentInterests, getReceivedInterests, getMutualMatches, acceptInterest, rejectInterest } from '../services/interestService';
import { getOrCreateChat } from '../services/chatService';
import { getImageUrl } from '../config/api';
import { useAuth } from '../context/AuthContext';

const InterestsScreen = ({ navigation }) => {
  const [activeTab, setActiveTab] = useState('received');
  const [sentInterests, setSentInterests] = useState([]);
  const [receivedInterests, setReceivedInterests] = useState([]);
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 5000);
    return () => clearInterval(interval);
  }, [activeTab]);

  const loadData = async () => {
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
        <View style={styles.interestContent}>
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
          <View style={styles.interestInfo}>
            <TouchableOpacity
              onPress={() => navigation.navigate('ProfileDetail', { id: profile?._id })}
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
          {activeTab === 'received' && item.status === 'pending' && (
            <View style={styles.actionButtons}>
              <TouchableOpacity
                style={[styles.actionButton, styles.acceptButton]}
                onPress={() => handleAccept(item._id)}
              >
                <Text style={styles.actionButtonText}>Accept</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionButton, styles.rejectButton]}
                onPress={() => handleReject(item._id)}
              >
                <Text style={styles.actionButtonText}>Reject</Text>
              </TouchableOpacity>
            </View>
          )}
          {(item.status === 'accepted' || activeTab === 'matches') && (
            <TouchableOpacity
              style={[styles.actionButton, styles.chatButton]}
              onPress={() => handleChat(userId)}
            >
              <Text style={styles.actionButtonText}>Chat</Text>
            </TouchableOpacity>
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
      <Text style={styles.title}>Interests</Text>
      
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
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No interests found</Text>
            </View>
          }
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
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
  },
  interestContent: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
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

