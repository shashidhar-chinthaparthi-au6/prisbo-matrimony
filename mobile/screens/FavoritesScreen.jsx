import { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, Image } from 'react-native';
import { useQuery } from 'react-query';
import { getFavorites, removeFavorite } from '../services/favoriteService';
import { getCurrentSubscription } from '../services/subscriptionService';
import { getImageUrl } from '../config/api';
import SubscriptionRequiredModal from '../components/SubscriptionRequiredModal';

const FavoritesScreen = ({ navigation }) => {
  const [favorites, setFavorites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [count, setCount] = useState(0);
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);

  const { data: subscriptionData } = useQuery('current-subscription', getCurrentSubscription);
  const hasActiveSubscription = subscriptionData?.hasActiveSubscription;

  useEffect(() => {
    // Always show modal if user doesn't have active subscription
    if (subscriptionData && !hasActiveSubscription) {
      setShowSubscriptionModal(true);
    } else if (hasActiveSubscription) {
      loadFavorites();
      const interval = setInterval(loadFavorites, 5000);
      return () => clearInterval(interval);
    }
  }, [subscriptionData, hasActiveSubscription]);

  const loadFavorites = async () => {
    if (!hasActiveSubscription) {
      setShowSubscriptionModal(true);
      return;
    }
    setLoading(true);
    try {
      const response = await getFavorites();
      setFavorites(response.favorites || []);
      setCount(response.count || 0);
    } catch (error) {
      if (error.response?.status === 403 || error.response?.data?.requiresSubscription) {
        setShowSubscriptionModal(true);
      } else {
      alert(error.response?.data?.message || 'Failed to load favorites');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRemove = async (profileId) => {
    try {
      await removeFavorite(profileId);
      alert('Removed from favorites');
      loadFavorites();
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to remove favorite');
    }
  };

  const renderFavoriteItem = ({ item }) => {
    const profile = item.profileId;
    
    return (
      <View style={styles.favoriteCard}>
        <View style={styles.imageContainer}>
          {profile.photos?.[0]?.url ? (
            <Image
              source={{ uri: getImageUrl(profile.photos[0].url) }}
              style={styles.profileImage}
            />
          ) : (
            <View style={styles.imagePlaceholder}>
              <Text style={styles.placeholderText}>No Photo</Text>
            </View>
          )}
        </View>
        <View style={styles.cardContent}>
          <Text style={styles.profileName}>
            {profile.personalInfo?.firstName} {profile.personalInfo?.lastName}
          </Text>
          <Text style={styles.profileInfo}>
            {profile.personalInfo?.age} years, {profile.location?.city}
          </Text>
          <View style={styles.cardActions}>
            <TouchableOpacity
              style={[styles.actionButton, styles.viewButton]}
              onPress={() => navigation.navigate('ProfileDetail', { id: profile._id })}
            >
              <Text style={styles.actionButtonText}>View Profile</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionButton, styles.removeButton]}
              onPress={() => handleRemove(profile._id)}
            >
              <Text style={styles.actionButtonText}>Remove</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" style={styles.loader} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      
      {favorites.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>You haven't added any favorites yet.</Text>
        </View>
      ) : (
        <FlatList
          data={favorites}
          renderItem={renderFavoriteItem}
          keyExtractor={(item) => item._id}
          numColumns={2}
          columnWrapperStyle={styles.row}
          contentContainerStyle={styles.listContent}
        />
      )}

      <SubscriptionRequiredModal
        isOpen={showSubscriptionModal}
        onSubscribe={() => navigation.navigate('Subscription')}
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
    fontSize: 24,
    fontWeight: 'bold',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  loader: {
    marginTop: 50,
  },
  listContent: {
    padding: 10,
  },
  row: {
    justifyContent: 'space-between',
  },
  favoriteCard: {
    width: '48%',
    backgroundColor: '#fff',
    borderRadius: 8,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    overflow: 'hidden',
  },
  imageContainer: {
    height: 180,
    backgroundColor: '#e0e0e0',
  },
  profileImage: {
    width: '100%',
    height: '100%',
  },
  imagePlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: {
    color: '#999',
    fontSize: 14,
  },
  cardContent: {
    padding: 12,
  },
  profileName: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  profileInfo: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
  },
  cardActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderRadius: 6,
    alignItems: 'center',
  },
  viewButton: {
    backgroundColor: '#ef4444',
  },
  removeButton: {
    backgroundColor: '#dc2626',
  },
  actionButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 12,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 50,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
});

export default FavoritesScreen;

