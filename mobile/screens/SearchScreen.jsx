import { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, FlatList, Image, StyleSheet, ActivityIndicator } from 'react-native';
import { searchProfiles } from '../services/searchService';
import { getMyProfile } from '../services/profileService';
import { getOrCreateChat } from '../services/chatService';
import { getImageUrl } from '../config/api';

const SearchScreen = ({ navigation }) => {
  const [filters, setFilters] = useState({
    minAge: '',
    maxAge: '',
    city: '',
    state: '',
    education: '',
    occupation: '',
  });
  const [profiles, setProfiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [hasProfile, setHasProfile] = useState(true);
  const [checkingProfile, setCheckingProfile] = useState(true);

  useEffect(() => {
    checkProfile();
  }, []);

  const checkProfile = async () => {
    try {
      const response = await getMyProfile();
      setHasProfile(response.profile !== null && response.profile !== undefined);
    } catch (error) {
      setHasProfile(false);
    } finally {
      setCheckingProfile(false);
    }
  };

  const handleSearch = async () => {
    if (!hasProfile) {
      alert('Please create your profile first');
      return;
    }
    setLoading(true);
    try {
      const response = await searchProfiles(filters);
      setProfiles(response.profiles || []);
      if (response.message) {
        alert(response.message);
      }
    } catch (error) {
      alert(error.response?.data?.message || 'Search failed');
    } finally {
      setLoading(false);
    }
  };

  if (checkingProfile) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" style={styles.loader} />
      </View>
    );
  }

  if (!hasProfile) {
    return (
      <View style={styles.container}>
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyTitle}>Create Your Profile First</Text>
          <Text style={styles.emptyText}>
            You need to create your profile before you can search for matches.
          </Text>
          <TouchableOpacity
            style={styles.createButton}
            onPress={() => navigation.navigate('Profile', { create: true })}
          >
            <Text style={styles.createButtonText}>Create Profile</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const handleChat = async (userId) => {
    try {
      const response = await getOrCreateChat(userId);
      navigation.navigate('Chats', { chatId: response.chat._id });
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to start chat');
    }
  };

  const renderProfile = ({ item }) => (
    <TouchableOpacity
      style={styles.profileCard}
      onPress={() => navigation.navigate('ProfileDetail', { id: item._id })}
    >
      <Image
        source={item.photos?.[0]?.url ? { uri: getImageUrl(item.photos[0].url) } : require('../assets/placeholder.png')}
        style={styles.profileImage}
      />
      <View style={styles.profileInfo}>
        <Text style={styles.profileName}>
          {item.personalInfo?.firstName} {item.personalInfo?.lastName}
        </Text>
        <Text style={styles.profileDetails}>
          {item.personalInfo?.age} years • {item.location?.city}
        </Text>
        {item.interestStatus === 'accepted' && (
          <TouchableOpacity
            style={styles.chatButton}
            onPress={() => handleChat(item.userId._id)}
          >
            <Text style={styles.chatButtonText}>Chat</Text>
          </TouchableOpacity>
        )}
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Search Profiles</Text>
        <TouchableOpacity
          style={styles.filterButton}
          onPress={() => setShowFilters(!showFilters)}
        >
          <Text>{showFilters ? 'Hide' : 'Show'} Filters</Text>
        </TouchableOpacity>
      </View>

      {showFilters && (
        <View style={styles.filtersContainer}>
          <TextInput
            style={styles.input}
            placeholder="Min Age"
            value={filters.minAge}
            onChangeText={(text) => setFilters({ ...filters, minAge: text })}
            keyboardType="numeric"
          />
          <TextInput
            style={styles.input}
            placeholder="Max Age"
            value={filters.maxAge}
            onChangeText={(text) => setFilters({ ...filters, maxAge: text })}
            keyboardType="numeric"
          />
          <TextInput
            style={styles.input}
            placeholder="City"
            value={filters.city}
            onChangeText={(text) => setFilters({ ...filters, city: text })}
          />
          <TextInput
            style={styles.input}
            placeholder="State"
            value={filters.state}
            onChangeText={(text) => setFilters({ ...filters, state: text })}
          />
          <TextInput
            style={styles.input}
            placeholder="Education"
            value={filters.education}
            onChangeText={(text) => setFilters({ ...filters, education: text })}
          />
          <TextInput
            style={styles.input}
            placeholder="Occupation"
            value={filters.occupation}
            onChangeText={(text) => setFilters({ ...filters, occupation: text })}
          />
          <TouchableOpacity style={styles.searchButton} onPress={handleSearch}>
            <Text style={styles.searchButtonText}>Search</Text>
          </TouchableOpacity>
        </View>
      )}

      {loading ? (
        <ActivityIndicator size="large" style={styles.loader} />
      ) : (
        <FlatList
          data={profiles}
          renderItem={renderProfile}
          keyExtractor={(item) => item._id}
          ListEmptyComponent={
            <Text style={styles.emptyText}>No profiles found. Try adjusting your filters.</Text>
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  filterButton: {
    padding: 8,
    backgroundColor: '#f0f0f0',
    borderRadius: 6,
  },
  filtersContainer: {
    padding: 15,
    backgroundColor: '#f9f9f9',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    marginBottom: 10,
    backgroundColor: '#fff',
  },
  searchButton: {
    backgroundColor: '#ef4444',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
  },
  searchButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  loader: {
    marginTop: 50,
  },
  profileCard: {
    flexDirection: 'row',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  profileImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginRight: 15,
  },
  profileInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  profileName: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  profileDetails: {
    color: '#666',
  },
  chatButton: {
    marginTop: 8,
    backgroundColor: '#ef4444',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  chatButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  emptyText: {
    textAlign: 'center',
    marginTop: 50,
    color: '#666',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'center',
  },
  createButton: {
    backgroundColor: '#ef4444',
    padding: 15,
    borderRadius: 8,
    marginTop: 20,
    minWidth: 200,
    alignItems: 'center',
  },
  createButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default SearchScreen;

