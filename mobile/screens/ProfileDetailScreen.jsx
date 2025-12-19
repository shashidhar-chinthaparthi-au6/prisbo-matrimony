import { useState, useEffect } from 'react';
import { View, Text, ScrollView, Image, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { useQuery } from 'react-query';
import { getProfileById } from '../services/profileService';
import { sendInterest } from '../services/interestService';
import { addFavorite, removeFavorite } from '../services/favoriteService';
import { getOrCreateChat } from '../services/chatService';
import { getImageUrl } from '../config/api';
import Tooltip from '../components/Tooltip';

const ProfileDetailScreen = ({ route, navigation }) => {
  const { id } = route.params;
  const [isFavorite, setIsFavorite] = useState(false);

  const { data, isLoading, refetch } = useQuery(['profile', id], () => getProfileById(id));

  const handleSendInterest = async () => {
    try {
      const response = await sendInterest({ toUserId: data.profile.userId._id });
      if (response.success) {
        alert('Interest sent successfully!');
        refetch(); // Refetch to update interest status
      }
    } catch (error) {
      // Handle "Interest already exists" case
      if (error.response?.data?.message === 'Interest already exists' && error.response?.data?.interest) {
        const interest = error.response.data.interest;
        // Update the profile's interest status
        if (data?.profile) {
          data.profile.interestStatus = interest.status;
        }
        alert('Interest already sent. Status: ' + interest.status);
        refetch(); // Refetch to update interest status
      } else {
        alert(error.response?.data?.message || 'Failed to send interest');
      }
    }
  };

  const handleFavorite = async () => {
    try {
      if (isFavorite) {
        await removeFavorite(id);
        setIsFavorite(false);
        alert('Removed from favorites');
      } else {
        await addFavorite(id);
        setIsFavorite(true);
        alert('Added to favorites');
      }
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to update favorite');
    }
  };

  const handleChat = async () => {
    try {
      const response = await getOrCreateChat(data.profile.userId._id);
      navigation.navigate('Chats', { chatId: response.chat._id });
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to start chat');
    }
  };

  if (isLoading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (!data?.profile) {
    return (
      <View style={styles.centerContainer}>
        <Text>Profile not found</Text>
      </View>
    );
  }

  const profile = data.profile;

  return (
    <ScrollView style={styles.container}>
      <View style={styles.imageContainer}>
        {profile.photos?.map((photo, index) => (
          <Image key={index} source={{ uri: getImageUrl(photo.url) }} style={styles.image} />
        ))}
      </View>

      <View style={styles.content}>
        <View style={styles.header}>
          <View>
            <Text style={styles.name}>
              {profile.personalInfo?.firstName} {profile.personalInfo?.lastName}
            </Text>
            <Text style={styles.details}>
              {profile.personalInfo?.age} years • {profile.location?.city}, {profile.location?.state}
            </Text>
          </View>
          <View style={styles.actions}>
            <Tooltip text={isFavorite ? 'Remove from Favorites' : 'Add to Favorites'}>
              <TouchableOpacity
                style={styles.iconButton}
                onPress={handleFavorite}
              >
                <Text style={styles.iconText}>
                  {isFavorite ? '⭐' : '☆'}
                </Text>
              </TouchableOpacity>
            </Tooltip>
            {profile.interestStatus === 'accepted' ? (
              <Tooltip text="Start Chat">
                <TouchableOpacity style={styles.interestButton} onPress={handleChat}>
                  <Text style={styles.interestButtonText}>Chat</Text>
                </TouchableOpacity>
              </Tooltip>
            ) : profile.interestStatus === 'pending' ? (
              <Tooltip text="Interest Already Sent">
                <TouchableOpacity style={[styles.interestButton, styles.interestButtonDisabled]} disabled>
                  <Text style={styles.interestButtonText}>Interest Sent</Text>
                </TouchableOpacity>
              </Tooltip>
            ) : (
              <Tooltip text="Send Interest">
                <TouchableOpacity style={styles.interestButton} onPress={handleSendInterest}>
                  <Text style={styles.interestButtonText}>Send Interest</Text>
                </TouchableOpacity>
              </Tooltip>
            )}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Personal Information</Text>
          <Text style={styles.info}>Height: {profile.personalInfo?.height || 'N/A'}</Text>
          <Text style={styles.info}>Weight: {profile.personalInfo?.weight || 'N/A'}</Text>
          <Text style={styles.info}>Marital Status: {profile.personalInfo?.maritalStatus || 'N/A'}</Text>
          <Text style={styles.info}>Mother Tongue: {profile.personalInfo?.motherTongue || 'N/A'}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Education & Career</Text>
          <Text style={styles.info}>Education: {profile.education?.highestEducation || 'N/A'}</Text>
          <Text style={styles.info}>College: {profile.education?.college || 'N/A'}</Text>
          <Text style={styles.info}>Occupation: {profile.career?.occupation || 'N/A'}</Text>
          <Text style={styles.info}>Company: {profile.career?.company || 'N/A'}</Text>
          <Text style={styles.info}>Income: {profile.career?.annualIncome || 'N/A'}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Family Information</Text>
          <Text style={styles.info}>Father: {profile.familyInfo?.fatherName || 'N/A'}</Text>
          <Text style={styles.info}>Mother: {profile.familyInfo?.motherName || 'N/A'}</Text>
          <Text style={styles.info}>Family Type: {profile.familyInfo?.familyType || 'N/A'}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Religion & Caste</Text>
          <Text style={styles.info}>Religion: {profile.religion?.religion || 'N/A'}</Text>
          <Text style={styles.info}>Caste: {profile.religion?.caste || 'N/A'}</Text>
          <Text style={styles.info}>Sub Caste: {profile.religion?.subCaste || 'N/A'}</Text>
        </View>

        {profile.personalInfo?.about && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>About</Text>
            <Text style={styles.about}>{profile.personalInfo.about}</Text>
          </View>
        )}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 10,
  },
  image: {
    width: '48%',
    height: 200,
    margin: '1%',
    borderRadius: 8,
  },
  content: {
    padding: 15,
  },
  header: {
    marginBottom: 20,
  },
  name: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  details: {
    fontSize: 16,
    color: '#666',
    marginBottom: 15,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  iconText: {
    fontSize: 24,
  },
  interestButton: {
    flex: 1,
    backgroundColor: '#ef4444',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  interestButtonDisabled: {
    backgroundColor: '#9ca3af',
    opacity: 0.7,
  },
  interestButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  section: {
    marginBottom: 25,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  info: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
  },
  about: {
    fontSize: 14,
    color: '#666',
    lineHeight: 22,
  },
});

export default ProfileDetailScreen;

