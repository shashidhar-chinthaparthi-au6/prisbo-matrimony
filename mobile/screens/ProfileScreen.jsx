import { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, Image, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { getMyProfile, createProfile, updateProfile, uploadPhotos } from '../services/profileService';
import { useAuth } from '../context/AuthContext';
import { getImageUrl } from '../config/api';
import * as ImagePicker from 'expo-image-picker';

const ProfileScreen = ({ route, navigation }) => {
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState({});
  const [profile, setProfile] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const { user, logout } = useAuth();

  useEffect(() => {
    loadProfile();
  }, []);

  // Auto-open create form if coming from search page
  useEffect(() => {
    const shouldCreate = route.params?.create;
    if (shouldCreate && !profile && !editing && !isLoading) {
      const profileType = user?.profileType || 'bride';
      setEditing(true);
      setFormData({
        type: profileType,
        personalInfo: {},
        location: {},
        education: {},
        career: {},
      });
    }
  }, [route.params, profile, editing, isLoading, user]);

  const loadProfile = async () => {
    setIsLoading(true);
    try {
      const response = await getMyProfile();
      if (response.profile) {
        setProfile(response.profile);
        setFormData(response.profile);
      }
    } catch (error) {
      console.error('Failed to load profile:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async () => {
    try {
      if (profile) {
        await updateProfile(profile._id, formData);
        alert('Profile updated successfully!');
      } else {
        await createProfile(formData);
        alert('Profile created successfully!');
      }
      setEditing(false);
      loadProfile();
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to save profile');
    }
  };

  const handlePickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      quality: 0.8,
    });

    if (!result.canceled) {
      try {
        // If no profile exists, create it first with minimal data
        if (!profile) {
          const profileType = user?.profileType || 'bride';
          await createProfile({
            type: profileType,
            personalInfo: {
              firstName: formData.personalInfo?.firstName || '',
              lastName: formData.personalInfo?.lastName || '',
              dateOfBirth: formData.personalInfo?.dateOfBirth || new Date().toISOString().split('T')[0],
            },
            location: {
              city: formData.location?.city || '',
              state: formData.location?.state || '',
            },
          });
          await loadProfile();
        }
        
        const files = result.assets.map((asset) => ({
          uri: asset.uri,
          type: 'image/jpeg',
          fileName: asset.fileName || 'photo.jpg',
        }));
        await uploadPhotos(files);
        loadProfile();
        alert('Photos uploaded successfully!');
      } catch (error) {
        alert(error.response?.data?.message || 'Failed to upload photos');
      }
    }
  };

  if (isLoading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (!profile && !editing) {
    return (
      <View style={styles.centerContainer}>
        <View style={styles.emptyCard}>
          <Text style={styles.emptyTitle}>Create Your Profile</Text>
          <Text style={styles.emptyText}>You haven't created your profile yet. Fill in your details to get started.</Text>
          <TouchableOpacity
            style={styles.button}
            onPress={() => {
              // Get type from user data (from API) - fixed, cannot be changed
              const profileType = user?.profileType || 'bride';
              setEditing(true);
              setFormData({
                type: profileType, // Set from API, user cannot change
                personalInfo: {},
                location: {},
                education: {},
                career: {},
              });
            }}
          >
            <Text style={styles.buttonText}>Create Profile</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const displayProfile = profile || {};

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        {!editing && (
          <TouchableOpacity style={styles.editButton} onPress={() => setEditing(true)}>
            <Text style={styles.editButtonText}>Edit</Text>
          </TouchableOpacity>
        )}
      </View>

      {editing ? (
        <View style={styles.form}>
          {!profile && user?.profileType && (
            <View style={styles.typeSelector}>
              <Text style={styles.label}>Profile Type</Text>
              <View style={styles.typeDisplay}>
                <Text style={styles.typeText}>
                  {user.profileType === 'bride' ? 'Bride' : 'Groom'}
                </Text>
                <Text style={styles.typeSubtext}>
                  {user.profileType === 'bride' ? 'Looking for a groom' : 'Looking for a bride'}
                </Text>
              </View>
            </View>
          )}
          <TextInput
            style={styles.input}
            placeholder="First Name *"
            value={formData.personalInfo?.firstName || ''}
            onChangeText={(text) =>
              setFormData({
                ...formData,
                personalInfo: { ...formData.personalInfo, firstName: text },
              })
            }
          />
          <TextInput
            style={styles.input}
            placeholder="Last Name *"
            value={formData.personalInfo?.lastName || ''}
            onChangeText={(text) =>
              setFormData({
                ...formData,
                personalInfo: { ...formData.personalInfo, lastName: text },
              })
            }
          />
          <TextInput
            style={styles.input}
            placeholder="Date of Birth (YYYY-MM-DD) *"
            value={formData.personalInfo?.dateOfBirth ? new Date(formData.personalInfo.dateOfBirth).toISOString().split('T')[0] : ''}
            onChangeText={(text) =>
              setFormData({
                ...formData,
                personalInfo: { ...formData.personalInfo, dateOfBirth: text },
              })
            }
          />
          <TextInput
            style={styles.input}
            placeholder="City *"
            value={formData.location?.city || ''}
            onChangeText={(text) =>
              setFormData({
                ...formData,
                location: { ...formData.location, city: text },
              })
            }
          />
          <TextInput
            style={styles.input}
            placeholder="State *"
            value={formData.location?.state || ''}
            onChangeText={(text) =>
              setFormData({
                ...formData,
                location: { ...formData.location, state: text },
              })
            }
          />
          <TouchableOpacity style={styles.button} onPress={handlePickImage}>
            <Text style={styles.buttonText}>Upload Photos</Text>
          </TouchableOpacity>
          <View style={styles.buttonRow}>
            <TouchableOpacity style={styles.button} onPress={handleSubmit}>
              <Text style={styles.buttonText}>Save</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.button, styles.buttonSecondary]}
              onPress={() => {
                setEditing(false);
                if (profile) setFormData(profile);
                else setFormData({});
              }}
            >
              <Text style={styles.buttonTextSecondary}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <View style={styles.profileView}>
          {displayProfile.photos?.[0]?.url && (
            <Image source={{ uri: getImageUrl(displayProfile.photos[0].url) }} style={styles.profileImage} />
          )}
          <Text style={styles.name}>
            {displayProfile.personalInfo?.firstName} {displayProfile.personalInfo?.lastName}
          </Text>
          <Text style={styles.details}>
            {displayProfile.personalInfo?.age} years • {displayProfile.location?.city}, {displayProfile.location?.state}
          </Text>
          <Text style={styles.info}>Education: {displayProfile.education?.highestEducation || 'N/A'}</Text>
          <Text style={styles.info}>Occupation: {displayProfile.career?.occupation || 'N/A'}</Text>
          <TouchableOpacity 
            style={styles.logoutButton} 
            onPress={async () => {
              await logout();
            }}
          >
            <Text style={styles.logoutButtonText}>Logout</Text>
          </TouchableOpacity>
        </View>
      )}
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
    padding: 20,
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
  editButton: {
    padding: 8,
  },
  editButtonText: {
    color: '#ef4444',
    fontWeight: 'bold',
  },
  form: {
    padding: 15,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    marginBottom: 15,
    backgroundColor: '#fff',
  },
  button: {
    backgroundColor: '#ef4444',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 10,
  },
  buttonSecondary: {
    backgroundColor: '#f0f0f0',
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  buttonTextSecondary: {
    color: '#333',
    fontWeight: 'bold',
  },
  profileView: {
    padding: 15,
    alignItems: 'center',
  },
  profileImage: {
    width: 150,
    height: 150,
    borderRadius: 75,
    marginBottom: 20,
  },
  name: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  details: {
    fontSize: 16,
    color: '#666',
    marginBottom: 20,
  },
  info: {
    fontSize: 14,
    color: '#666',
    marginBottom: 10,
  },
  logoutButton: {
    backgroundColor: '#dc2626',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 30,
    marginBottom: 20,
  },
  logoutButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    marginBottom: 20,
  },
  emptyCard: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'center',
  },
  typeSelector: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 10,
    color: '#333',
  },
  toggleContainer: {
    flexDirection: 'row',
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
    padding: 4,
  },
  toggleButton: {
    flex: 1,
    padding: 12,
    borderRadius: 6,
    alignItems: 'center',
  },
  toggleButtonActive: {
    backgroundColor: '#ef4444',
  },
  toggleText: {
    fontSize: 16,
    color: '#666',
  },
  toggleTextActive: {
    color: '#fff',
    fontWeight: 'bold',
  },
  typeDisplay: {
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
    borderRadius: 8,
    padding: 15,
    alignItems: 'center',
  },
  typeText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ef4444',
    marginBottom: 5,
    textTransform: 'capitalize',
  },
  typeSubtext: {
    fontSize: 14,
    color: '#666',
  },
});

export default ProfileScreen;

