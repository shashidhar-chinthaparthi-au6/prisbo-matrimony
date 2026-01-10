import { useState, useEffect } from 'react';
import { View, Text, ScrollView, Image, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, TextInput } from 'react-native';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { getProfileById, getMyProfile, deleteProfile } from '../services/profileService';
import { getProfileById as getAdminProfileById, updateProfileField } from '../services/adminService';
import { getCurrentSubscription } from '../services/subscriptionService';
import { sendInterest } from '../services/interestService';
import { addFavorite, removeFavorite } from '../services/favoriteService';
import { getOrCreateChat } from '../services/chatService';
import { getImageUrl } from '../config/api';
import Tooltip from '../components/Tooltip';
import SubscriptionRequiredModal from '../components/SubscriptionRequiredModal';
import ProfileIncompleteModal from '../components/ProfileIncompleteModal';
import PhotoGallery from '../components/PhotoGallery';
import { isProfileComplete } from '../utils/profileUtils';
import { useAuth } from '../context/AuthContext';
import { indianStates, stateCities, countries } from '../utils/indianLocations';
import { religions, casteCategories, casteSubCastes } from '../utils/religionData';

const ProfileDetailScreen = ({ route, navigation }) => {
  const { id } = route.params;
  const { user } = useAuth();
  const [isFavorite, setIsFavorite] = useState(false);
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);
  const [showProfileIncompleteModal, setShowProfileIncompleteModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editedData, setEditedData] = useState({});

  const queryClient = useQueryClient();
  const isAdmin = user?.role === 'super_admin';
  const fetchProfile = isAdmin ? () => getAdminProfileById(id) : () => getProfileById(id);
  const { data, isLoading, refetch } = useQuery(['profile', id, user?.role], fetchProfile);
  const { data: myProfileData } = useQuery('myProfile', getMyProfile);
  const { data: subscriptionData } = useQuery('current-subscription', getCurrentSubscription);

  const hasActiveSubscription = subscriptionData?.hasActiveSubscription;
  const isMyProfile = myProfileData?.profile?.userId?._id === data?.profile?.userId?._id;
  const [showPhotoGallery, setShowPhotoGallery] = useState(false);
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState(0);

  useEffect(() => {
    // Don't show modals for own profile
    if (isMyProfile) {
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
      if (!myProfileData?.profile || !isProfileComplete(myProfileData.profile)) {
        setShowProfileIncompleteModal(true);
        setShowSubscriptionModal(false);
      } else {
        setShowProfileIncompleteModal(false);
      }
    }
  }, [data, isMyProfile, hasActiveSubscription, subscriptionData, myProfileData]);

  const handleSendInterest = async () => {
    if (!hasActiveSubscription) {
      setShowSubscriptionModal(true);
      return;
    }
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
      } else if (error.response?.data?.requiresSubscription) {
        setShowSubscriptionModal(true);
      } else {
      alert(error.response?.data?.message || 'Failed to send interest');
      }
    }
  };

  const handleFavorite = async () => {
    if (!hasActiveSubscription) {
      setShowSubscriptionModal(true);
      return;
    }
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
      if (error.response?.data?.requiresSubscription) {
        setShowSubscriptionModal(true);
      } else {
      alert(error.response?.data?.message || 'Failed to update favorite');
      }
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

  // Initialize edited data when entering edit mode
  useEffect(() => {
    if (isEditing && data?.profile && isAdmin) {
      const profile = { ...data.profile };
      // Parse height if it exists
      if (profile.personalInfo?.height) {
        const height = profile.personalInfo.height;
        const ftInMatch = height.match(/(\d+)'(\d+)"/);
        if (ftInMatch) {
          profile.personalInfo.heightUnit = 'ft';
          profile.personalInfo.heightFeet = ftInMatch[1];
          profile.personalInfo.heightInches = ftInMatch[2];
        } else {
          const cmMatch = height.match(/(\d+)\s*cm/i);
          if (cmMatch) {
            profile.personalInfo.heightUnit = 'cm';
            profile.personalInfo.heightCm = cmMatch[1];
          }
        }
      }
      // Parse weight if it exists
      if (profile.personalInfo?.weight) {
        const weight = profile.personalInfo.weight;
        const kgMatch = weight.match(/(\d+(?:\.\d+)?)\s*kg/i);
        const lbsMatch = weight.match(/(\d+(?:\.\d+)?)\s*lbs/i);
        if (kgMatch) {
          profile.personalInfo.weightUnit = 'kg';
          profile.personalInfo.weightValue = kgMatch[1];
        } else if (lbsMatch) {
          profile.personalInfo.weightUnit = 'lbs';
          profile.personalInfo.weightValue = lbsMatch[1];
        }
      }
      setEditedData({
        personalInfo: { ...profile.personalInfo },
        location: { ...profile.location },
        religion: { ...profile.religion },
        education: { ...profile.education },
        career: { ...profile.career },
        familyInfo: { ...profile.familyInfo },
      });
    }
  }, [isEditing, data?.profile, isAdmin]);

  // Update profile field mutation
  const updateFieldMutation = useMutation(
    ({ field, value, section }) => updateProfileField(id, field, value, section),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['profile', id, user?.role]);
        refetch();
        Alert.alert('Success', 'Profile updated successfully');
      },
      onError: (error) => {
        Alert.alert('Error', error.response?.data?.message || 'Failed to update profile');
      },
    }
  );

  const handleFieldChange = (section, field, value) => {
    setEditedData((prev) => ({
      ...prev,
      [section]: {
        ...prev[section],
        [field]: value,
      },
    }));
  };

  const handleSaveField = (field, value, section) => {
    updateFieldMutation.mutate({ field, value, section });
  };

  const handleSaveAll = () => {
    // Save all changed fields
    Object.keys(editedData).forEach((section) => {
      if (editedData[section] && data?.profile?.[section]) {
        Object.keys(editedData[section]).forEach((field) => {
          const newValue = editedData[section][field];
          const oldValue = data.profile[section]?.[field];
          if (newValue !== undefined && newValue !== oldValue) {
            handleSaveField(field, newValue, section);
          }
        });
      }
    });
    setIsEditing(false);
    Alert.alert('Success', 'Profile updated successfully');
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditedData({});
  };

  const handleEdit = () => {
    if (isAdmin) {
      setIsEditing(true);
    } else {
      navigation.navigate('Profile', { edit: true });
    }
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete Profile',
      'Are you sure you want to deactivate your profile? This action cannot be undone. Your profile will be hidden from search results.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteProfile(data.profile._id);
              Alert.alert('Success', 'Profile deactivated successfully');
              queryClient.invalidateQueries('myProfile');
              navigation.navigate('Profile');
            } catch (error) {
              Alert.alert('Error', error.response?.data?.message || 'Failed to delete profile');
            }
          },
        },
      ]
    );
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
    <>
    <ScrollView style={styles.container}>
      <View style={styles.imageContainer}>
        {profile.photos?.map((photo, index) => (
          <TouchableOpacity
            key={index}
            onPress={() => {
              setSelectedPhotoIndex(index);
              setShowPhotoGallery(true);
            }}
            activeOpacity={0.9}
          >
            <Image source={{ uri: getImageUrl(photo.url) }} style={styles.image} />
          </TouchableOpacity>
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
            {isAdmin ? (
              <>
                {!isEditing ? (
                  <TouchableOpacity
                    style={[styles.interestButton, { backgroundColor: '#3b82f6', marginRight: 10 }]}
                    onPress={handleEdit}
                  >
                    <Text style={styles.interestButtonText}>✏️ Edit Profile</Text>
                  </TouchableOpacity>
                ) : (
                  <View style={{ flexDirection: 'row', gap: 10 }}>
                    <TouchableOpacity
                      style={[styles.interestButton, { backgroundColor: '#6b7280', marginRight: 10 }]}
                      onPress={handleCancelEdit}
                    >
                      <Text style={styles.interestButtonText}>Cancel</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.interestButton, { backgroundColor: '#10b981' }]}
                      onPress={handleSaveAll}
                    >
                      <Text style={styles.interestButtonText}>Save All</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </>
            ) : isMyProfile ? (
              <>
                <TouchableOpacity
                  style={[styles.interestButton, { backgroundColor: '#3b82f6', marginRight: 10 }]}
                  onPress={handleEdit}
                >
                  <Text style={styles.interestButtonText}>Edit Profile</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.interestButton, { backgroundColor: '#dc2626' }]}
                  onPress={handleDelete}
                >
                  <Text style={styles.interestButtonText}>Delete Profile</Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
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
              </>
            )}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Personal Information</Text>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Height:</Text>
            {isEditing && isAdmin ? (
              <TextInput
                style={styles.input}
                value={editedData.personalInfo?.height || ''}
                onChangeText={(value) => handleFieldChange('personalInfo', 'height', value)}
                onBlur={() => handleSaveField('height', editedData.personalInfo?.height, 'personalInfo')}
                placeholder="Height"
              />
            ) : (
              <Text style={styles.info}>{profile.personalInfo?.height || 'N/A'}</Text>
            )}
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Weight:</Text>
            {isEditing && isAdmin ? (
              <TextInput
                style={styles.input}
                value={editedData.personalInfo?.weight || ''}
                onChangeText={(value) => handleFieldChange('personalInfo', 'weight', value)}
                onBlur={() => handleSaveField('weight', editedData.personalInfo?.weight, 'personalInfo')}
                placeholder="Weight"
              />
            ) : (
              <Text style={styles.info}>{profile.personalInfo?.weight || 'N/A'}</Text>
            )}
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Marital Status:</Text>
            {isEditing && isAdmin ? (
              <TextInput
                style={styles.input}
                value={editedData.personalInfo?.maritalStatus || ''}
                onChangeText={(value) => handleFieldChange('personalInfo', 'maritalStatus', value)}
                onBlur={() => handleSaveField('maritalStatus', editedData.personalInfo?.maritalStatus, 'personalInfo')}
                placeholder="Marital Status"
              />
            ) : (
              <Text style={styles.info}>{profile.personalInfo?.maritalStatus || 'N/A'}</Text>
            )}
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Mother Tongue:</Text>
            {isEditing && isAdmin ? (
              <TextInput
                style={styles.input}
                value={editedData.personalInfo?.motherTongue || ''}
                onChangeText={(value) => handleFieldChange('personalInfo', 'motherTongue', value)}
                onBlur={() => handleSaveField('motherTongue', editedData.personalInfo?.motherTongue, 'personalInfo')}
                placeholder="Mother Tongue"
              />
            ) : (
              <Text style={styles.info}>{profile.personalInfo?.motherTongue || 'N/A'}</Text>
            )}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Education & Career</Text>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Education:</Text>
            {isEditing && isAdmin ? (
              <TextInput
                style={styles.input}
                value={editedData.education?.highestEducation || ''}
                onChangeText={(value) => handleFieldChange('education', 'highestEducation', value)}
                onBlur={() => handleSaveField('highestEducation', editedData.education?.highestEducation, 'education')}
                placeholder="Education"
              />
            ) : (
              <Text style={styles.info}>{profile.education?.highestEducation || 'N/A'}</Text>
            )}
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>College:</Text>
            {isEditing && isAdmin ? (
              <TextInput
                style={styles.input}
                value={editedData.education?.college || ''}
                onChangeText={(value) => handleFieldChange('education', 'college', value)}
                onBlur={() => handleSaveField('college', editedData.education?.college, 'education')}
                placeholder="College"
              />
            ) : (
              <Text style={styles.info}>{profile.education?.college || 'N/A'}</Text>
            )}
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Occupation:</Text>
            {isEditing && isAdmin ? (
              <TextInput
                style={styles.input}
                value={editedData.career?.occupation || ''}
                onChangeText={(value) => handleFieldChange('career', 'occupation', value)}
                onBlur={() => handleSaveField('occupation', editedData.career?.occupation, 'career')}
                placeholder="Occupation"
              />
            ) : (
              <Text style={styles.info}>{profile.career?.occupation || 'N/A'}</Text>
            )}
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Company:</Text>
            {isEditing && isAdmin ? (
              <TextInput
                style={styles.input}
                value={editedData.career?.company || ''}
                onChangeText={(value) => handleFieldChange('career', 'company', value)}
                onBlur={() => handleSaveField('company', editedData.career?.company, 'career')}
                placeholder="Company"
              />
            ) : (
              <Text style={styles.info}>{profile.career?.company || 'N/A'}</Text>
            )}
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Income:</Text>
            {isEditing && isAdmin ? (
              <TextInput
                style={styles.input}
                value={editedData.career?.annualIncome || ''}
                onChangeText={(value) => handleFieldChange('career', 'annualIncome', value)}
                onBlur={() => handleSaveField('annualIncome', editedData.career?.annualIncome, 'career')}
                placeholder="Income"
              />
            ) : (
              <Text style={styles.info}>{profile.career?.annualIncome || 'N/A'}</Text>
            )}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Family Information</Text>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Father:</Text>
            {isEditing && isAdmin ? (
              <TextInput
                style={styles.input}
                value={editedData.familyInfo?.fatherName || ''}
                onChangeText={(value) => handleFieldChange('familyInfo', 'fatherName', value)}
                onBlur={() => handleSaveField('fatherName', editedData.familyInfo?.fatherName, 'familyInfo')}
                placeholder="Father Name"
              />
            ) : (
              <Text style={styles.info}>{profile.familyInfo?.fatherName || 'N/A'}</Text>
            )}
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Mother:</Text>
            {isEditing && isAdmin ? (
              <TextInput
                style={styles.input}
                value={editedData.familyInfo?.motherName || ''}
                onChangeText={(value) => handleFieldChange('familyInfo', 'motherName', value)}
                onBlur={() => handleSaveField('motherName', editedData.familyInfo?.motherName, 'familyInfo')}
                placeholder="Mother Name"
              />
            ) : (
              <Text style={styles.info}>{profile.familyInfo?.motherName || 'N/A'}</Text>
            )}
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Family Type:</Text>
            {isEditing && isAdmin ? (
              <TextInput
                style={styles.input}
                value={editedData.familyInfo?.familyType || ''}
                onChangeText={(value) => handleFieldChange('familyInfo', 'familyType', value)}
                onBlur={() => handleSaveField('familyType', editedData.familyInfo?.familyType, 'familyInfo')}
                placeholder="Family Type"
              />
            ) : (
              <Text style={styles.info}>{profile.familyInfo?.familyType || 'N/A'}</Text>
            )}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Religion & Caste</Text>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Religion:</Text>
            {isEditing && isAdmin ? (
              <TextInput
                style={styles.input}
                value={editedData.religion?.religion || ''}
                onChangeText={(value) => handleFieldChange('religion', 'religion', value)}
                onBlur={() => handleSaveField('religion', editedData.religion?.religion, 'religion')}
                placeholder="Religion"
              />
            ) : (
              <Text style={styles.info}>{profile.religion?.religion || 'N/A'}</Text>
            )}
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Caste:</Text>
            {isEditing && isAdmin ? (
              <TextInput
                style={styles.input}
                value={editedData.religion?.caste || ''}
                onChangeText={(value) => handleFieldChange('religion', 'caste', value)}
                onBlur={() => handleSaveField('caste', editedData.religion?.caste, 'religion')}
                placeholder="Caste"
              />
            ) : (
              <Text style={styles.info}>{profile.religion?.caste || 'N/A'}</Text>
            )}
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Sub Caste:</Text>
            {isEditing && isAdmin ? (
              <TextInput
                style={styles.input}
                value={editedData.religion?.subCaste || ''}
                onChangeText={(value) => handleFieldChange('religion', 'subCaste', value)}
                onBlur={() => handleSaveField('subCaste', editedData.religion?.subCaste, 'religion')}
                placeholder="Sub Caste"
              />
            ) : (
              <Text style={styles.info}>{profile.religion?.subCaste || 'N/A'}</Text>
            )}
          </View>
        </View>

        {profile.personalInfo?.about && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>About</Text>
            <Text style={styles.about}>{profile.personalInfo.about}</Text>
          </View>
        )}
      </View>
    </ScrollView>

      <SubscriptionRequiredModal
        isOpen={showSubscriptionModal}
        onSubscribe={() => navigation.navigate('Subscription')}
      />
      <ProfileIncompleteModal
        isOpen={showProfileIncompleteModal}
        onCompleteProfile={() => navigation.navigate('Profile', { edit: true })}
      />

      <PhotoGallery
        photos={profile.photos || []}
        isOpen={showPhotoGallery}
        onClose={() => setShowPhotoGallery(false)}
        initialIndex={selectedPhotoIndex}
      />
    </>
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
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  infoLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginRight: 8,
    minWidth: 120,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    padding: 8,
    fontSize: 16,
    backgroundColor: '#fff',
  },
  about: {
    fontSize: 14,
    color: '#666',
    lineHeight: 22,
  },
});

export default ProfileDetailScreen;

