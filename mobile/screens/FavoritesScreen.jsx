import { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, Image, RefreshControl, Alert } from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
import { useQuery } from 'react-query';
import { getFavorites, removeFavorite } from '../services/favoriteService';
import { getCurrentSubscription } from '../services/subscriptionService';
import { getMyProfile } from '../services/profileService';
import { getImageUrl } from '../config/api';
import SubscriptionRequiredModal from '../components/SubscriptionRequiredModal';
import ProfileIncompleteModal from '../components/ProfileIncompleteModal';
import { isProfileComplete } from '../utils/profileUtils';

const FavoritesScreen = ({ navigation }) => {
  const [favorites, setFavorites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [count, setCount] = useState(0);
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);
  const [showProfileIncompleteModal, setShowProfileIncompleteModal] = useState(false);
  const [editingFavorite, setEditingFavorite] = useState(null);
  const [editNotes, setEditNotes] = useState('');
  const [editCategory, setEditCategory] = useState('general');
  const [refreshing, setRefreshing] = useState(false);

  const { data: subscriptionData } = useQuery('current-subscription', getCurrentSubscription);
  const { data: profileData } = useQuery('myProfile', getMyProfile);
  const hasActiveSubscription = subscriptionData?.hasActiveSubscription;

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
        loadFavorites();
        const interval = setInterval(loadFavorites, 5000);
        return () => clearInterval(interval);
      }
    }
  }, [subscriptionData, hasActiveSubscription, profileData]);

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

  const handleEdit = (favorite) => {
    setEditingFavorite(favorite._id);
    setEditNotes(favorite.notes || '');
    setEditCategory(favorite.category || 'general');
  };

  const handleSaveEdit = async (profileId) => {
    try {
      await updateFavorite(profileId, {
        notes: editNotes,
        category: editCategory,
      });
      alert('Favorite updated');
      setEditingFavorite(null);
      loadFavorites();
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to update favorite');
    }
  };

  const handleExport = async (format) => {
    try {
      const response = await exportFavorites(format);
      // For mobile, we'll show the data in an alert or copy to clipboard
      // In a real app, you might use a file sharing library
      if (format === 'json') {
        const jsonStr = JSON.stringify(response, null, 2);
        alert(`Favorites exported! Data:\n\n${jsonStr.substring(0, 500)}...`);
      } else {
        alert('CSV export ready! (In production, this would download the file)');
      }
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to export favorites');
    }
  };

  const renderFavoriteItem = ({ item }) => {
    const profile = item.profileId;
    const isEditing = editingFavorite === item._id;
    
    const renderRightActions = () => (
      <View style={styles.swipeActions}>
        <TouchableOpacity
          style={[styles.swipeAction, styles.swipeEdit]}
          onPress={() => handleEdit(item)}
        >
          <Text style={styles.swipeActionText}>Edit</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.swipeAction, styles.swipeDelete]}
          onPress={() => {
            Alert.alert(
              'Remove Favorite',
              'Are you sure you want to remove this profile from favorites?',
              [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Remove', style: 'destructive', onPress: () => handleRemove(profile._id) },
              ]
            );
          }}
        >
          <Text style={styles.swipeActionText}>Remove</Text>
        </TouchableOpacity>
      </View>
    );
    
    return (
      <Swipeable renderRightActions={renderRightActions}>
        <TouchableOpacity 
          style={styles.favoriteCard}
          onPress={() => !isEditing && navigation.navigate('ProfileDetail', { id: profile._id })}
          activeOpacity={0.9}
        >
        <TouchableOpacity
          style={styles.imageContainer}
          onPress={() => navigation.navigate('ProfileDetail', { id: profile._id })}
          activeOpacity={0.8}
        >
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
        </TouchableOpacity>
        <View style={styles.cardContent}>
          <View style={styles.profileHeader}>
            <View style={styles.profileHeaderLeft}>
              <TouchableOpacity
                onPress={() => !isEditing && navigation.navigate('ProfileDetail', { id: profile._id })}
                activeOpacity={0.7}
              >
                <Text style={styles.profileName}>
                  {profile.personalInfo?.firstName} {profile.personalInfo?.lastName}
                </Text>
              </TouchableOpacity>
              <Text style={styles.profileInfo}>
                {profile.personalInfo?.age} years, {profile.location?.city}
              </Text>
            </View>
            {item.category && (
              <View style={styles.categoryBadge}>
                <Text style={styles.categoryText}>{item.category}</Text>
              </View>
            )}
          </View>
          {isEditing ? (
            <View style={styles.editContainer}>
              <TextInput
                style={styles.categoryInput}
                value={editCategory}
                onChangeText={setEditCategory}
                placeholder="Category"
              />
              <TextInput
                style={styles.notesInput}
                value={editNotes}
                onChangeText={setEditNotes}
                placeholder="Add notes..."
                multiline
                numberOfLines={3}
              />
              <View style={styles.editActions}>
                <TouchableOpacity
                  style={[styles.editButton, styles.saveButton]}
                  onPress={() => handleSaveEdit(profile._id)}
                >
                  <Text style={styles.editButtonText}>Save</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.editButton, styles.cancelButton]}
                  onPress={() => setEditingFavorite(null)}
                >
                  <Text style={styles.editButtonText}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <>
              {item.notes && (
                <Text style={styles.notesText}>"{item.notes}"</Text>
              )}
              <View style={styles.cardActions}>
                <TouchableOpacity
                  style={[styles.actionButton, styles.viewButton]}
                  onPress={() => navigation.navigate('ProfileDetail', { id: profile._id })}
                >
                  <Text style={styles.actionButtonText}>View</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.actionButton, styles.editButton]}
                  onPress={() => handleEdit(item)}
                >
                  <Text style={styles.actionButtonText}>Edit</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.actionButton, styles.removeButton]}
                  onPress={() => handleRemove(profile._id)}
                >
                  <Text style={styles.actionButtonText}>Remove</Text>
                </TouchableOpacity>
              </View>
            </>
          )}
        </View>
      </TouchableOpacity>
      </Swipeable>
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
          <Text style={styles.emptyEmoji}>⭐</Text>
          <Text style={styles.emptyTitle}>No Favorites Yet</Text>
          <Text style={styles.emptyText}>
            You haven't added any profiles to your favorites. Start exploring and add the ones you like!
          </Text>
          <TouchableOpacity
            style={styles.browseButton}
            onPress={() => navigation.navigate('Search')}
          >
            <Text style={styles.browseButtonText}>Browse Profiles</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={favorites}
          renderItem={renderFavoriteItem}
          keyExtractor={(item) => item._id}
          numColumns={2}
          columnWrapperStyle={styles.row}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={async () => {
                setRefreshing(true);
                await loadFavorites();
                setRefreshing(false);
              }}
            />
          }
        />
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
  swipeActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingRight: 10,
  },
  swipeAction: {
    justifyContent: 'center',
    alignItems: 'center',
    width: 80,
    height: '100%',
    paddingHorizontal: 10,
  },
  swipeEdit: {
    backgroundColor: '#3b82f6',
  },
  swipeDelete: {
    backgroundColor: '#dc2626',
  },
  swipeActionText: {
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

