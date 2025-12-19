import { useState, useEffect, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, Image, StyleSheet, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { getMyProfile, createProfile, updateProfile, uploadPhotos, setPrimaryPhoto, deletePhoto } from '../services/profileService';
import { useAuth } from '../context/AuthContext';
import { getImageUrl } from '../config/api';
import * as ImagePicker from 'expo-image-picker';
import Dropdown from '../components/Dropdown';
import { indianStates, stateCities, countries } from '../utils/indianLocations';
import { religions, casteCategories, casteSubCastes } from '../utils/religionData';
import { isProfileComplete } from '../utils/profileUtils';

const ProfileScreen = ({ route, navigation }) => {
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState({});
  const [profile, setProfile] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState(null);
  const [expandedSections, setExpandedSections] = useState({
    personal: true,
    family: false,
    education: false,
    career: false,
    location: false,
    religion: false,
    lifestyle: false,
    photos: false,
  });
  const { user } = useAuth();
  const autoSaveTimerRef = useRef(null);
  const hasInitialDataRef = useRef(false);

  useEffect(() => {
    loadProfile();
  }, []);

  // Auto-open create/edit form if coming from search page or edit param
  useEffect(() => {
    const shouldCreate = route.params?.create;
    const shouldEdit = route.params?.edit;
    
    if (shouldCreate && !profile && !editing && !isLoading) {
      const profileType = user?.profileType || 'bride';
      setEditing(true);
      setFormData({
        type: profileType,
        personalInfo: {},
        familyInfo: {},
        location: {},
        education: {},
        career: {},
        religion: {},
      });
    } else if (shouldEdit && profile && !editing && !isLoading) {
      setEditing(true);
    }
  }, [route.params, profile, editing, isLoading, user]);

  // Auto-save functionality
  useEffect(() => {
    if (!editing || !hasInitialDataRef.current) return;
    if (!profile) return; // Don't auto-save if profile doesn't exist yet

    // Clear existing timer
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
    }

    // Set new timer for auto-save (2 seconds after user stops typing)
    autoSaveTimerRef.current = setTimeout(async () => {
      try {
        setSaving(true);
        await updateProfile(profile._id, formData);
        setLastSaved(new Date());
      } catch (error) {
        console.error('Auto-save failed:', error);
      } finally {
        setSaving(false);
      }
    }, 2000);

    return () => {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }
    };
  }, [formData, editing, profile]);

  const loadProfile = async () => {
    setIsLoading(true);
    try {
      const response = await getMyProfile();
      if (response.profile) {
        const profile = { ...response.profile };
        // Parse height if it exists
        if (profile.personalInfo?.height) {
          const height = profile.personalInfo.height;
          // Check if it's in ft/in format (e.g., "5'6"")
          const ftInMatch = height.match(/(\d+)'(\d+)"/);
          if (ftInMatch) {
            profile.personalInfo.heightUnit = 'ft';
            profile.personalInfo.heightFeet = ftInMatch[1];
            profile.personalInfo.heightInches = ftInMatch[2];
          } else {
            // Check if it's in cm format
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
          const kgMatch = weight.match(/([\d.]+)\s*kg/i);
          const lbsMatch = weight.match(/([\d.]+)\s*lbs?/i);
          if (kgMatch) {
            profile.personalInfo.weightUnit = 'kg';
            profile.personalInfo.weightValue = kgMatch[1];
          } else if (lbsMatch) {
            profile.personalInfo.weightUnit = 'lbs';
            profile.personalInfo.weightValue = lbsMatch[1];
          }
        }
        // Handle mother tongue - check if it's a standard language or custom
        if (profile.personalInfo?.motherTongue) {
          const standardLanguages = [
            'Hindi', 'English', 'Tamil', 'Telugu', 'Kannada', 'Malayalam',
            'Marathi', 'Gujarati', 'Bengali', 'Punjabi', 'Urdu', 'Odia',
            'Assamese', 'Rajasthani', 'Bhojpuri', 'Sanskrit', 'Konkani',
            'Tulu', 'Kashmiri', 'Sindhi'
          ];
          if (!standardLanguages.includes(profile.personalInfo.motherTongue)) {
            // It's a custom value
            profile.personalInfo.motherTongueCustom = profile.personalInfo.motherTongue;
            profile.personalInfo.motherTongue = 'Other';
          }
        }
        setProfile(profile);
        setFormData(profile);
        hasInitialDataRef.current = true;
      }
    } catch (error) {
      console.error('Failed to load profile:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFieldChange = (section, field, value) => {
    setFormData((prev) => ({
      ...prev,
      [section]: {
        ...prev[section],
        [field]: value,
      },
    }));
  };

  // Check if form is ready to submit (all mandatory fields + 3 photos)
  const isFormReadyToSubmit = () => {
    const personalInfo = formData.personalInfo || {};
    const location = formData.location || {};
    const religion = formData.religion || {};
    const currentPhotos = profile?.photos?.length || 0;

    const hasFirstName = personalInfo.firstName && personalInfo.firstName.trim() !== '';
    const hasLastName = personalInfo.lastName && personalInfo.lastName.trim() !== '';
    const hasDateOfBirth = personalInfo.dateOfBirth;
    const hasCity = location.city && location.city.trim() !== '';
    const hasState = location.state && location.state.trim() !== '';
    const hasReligion = religion.religion && religion.religion.trim() !== '';
    const hasCaste = religion.caste && religion.caste.trim() !== '';
    const hasMinimumPhotos = currentPhotos >= 3;

    return hasFirstName && hasLastName && hasDateOfBirth && hasCity && hasState && hasReligion && hasCaste && hasMinimumPhotos;
  };

  const handleSubmit = async () => {
    // Validate all mandatory fields
    if (!isFormReadyToSubmit()) {
      Alert.alert(
        'Incomplete Profile',
        'Please complete all mandatory fields (First Name, Last Name, Date of Birth, City, State, Religion, Caste) and upload at least 3 photos.',
        [{ text: 'OK' }]
      );
      return;
    }
    
    try {
      setSaving(true);
      if (profile) {
        await updateProfile(profile._id, formData);
        Alert.alert('Success', 'Profile submitted successfully!');
      } else {
        await createProfile(formData);
        Alert.alert('Success', 'Profile submitted successfully!');
        hasInitialDataRef.current = true;
      }
      setLastSaved(new Date());
      setEditing(false);
      loadProfile();
    } catch (error) {
      Alert.alert('Error', error.response?.data?.message || 'Failed to submit profile');
    } finally {
      setSaving(false);
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

  const toggleSection = (section) => {
    setExpandedSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
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
              const profileType = user?.profileType || 'bride';
              setEditing(true);
              setFormData({
                type: profileType,
                personalInfo: {},
                familyInfo: {},
                location: {},
                education: {},
                career: {},
                religion: {},
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
  const primaryPhoto = displayProfile.photos?.find(p => p.isPrimary) || displayProfile.photos?.[0];

  const SectionHeader = ({ title, section, icon }) => (
    <TouchableOpacity
      style={styles.sectionHeader}
      onPress={() => toggleSection(section)}
      activeOpacity={0.7}
    >
      <View style={styles.sectionHeaderContent}>
        <Text style={styles.sectionIcon}>{icon}</Text>
        <Text style={styles.sectionTitle}>{title}</Text>
      </View>
      <Text style={styles.sectionArrow}>
        {expandedSections[section] ? '▼' : '▶'}
      </Text>
    </TouchableOpacity>
  );

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>My Profile</Text>
        <View style={styles.headerRight}>
          {editing && (
            <View style={styles.saveStatus}>
              {saving ? (
                <ActivityIndicator size="small" color="#ef4444" />
              ) : lastSaved ? (
                <Text style={styles.saveStatusText}>
                  Saved {lastSaved.toLocaleTimeString()}
                </Text>
              ) : null}
            </View>
          )}
          {!editing && (
            <TouchableOpacity style={styles.editButton} onPress={() => setEditing(true)}>
              <Text style={styles.editButtonText}>Edit</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {editing ? (
        <View style={styles.form}>
          {/* Profile Type */}
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

          {/* Personal Information Section */}
          <View style={styles.section}>
            <SectionHeader title="Personal Information" section="personal" icon="👤" />
            {expandedSections.personal && (
              <View style={styles.sectionContent}>
                <TextInput
                  style={styles.input}
                  placeholder="First Name *"
                  value={formData.personalInfo?.firstName || ''}
                  onChangeText={(text) => handleFieldChange('personalInfo', 'firstName', text)}
                />
                <TextInput
                  style={styles.input}
                  placeholder="Last Name *"
                  value={formData.personalInfo?.lastName || ''}
                  onChangeText={(text) => handleFieldChange('personalInfo', 'lastName', text)}
                />
                <TextInput
                  style={styles.input}
                  placeholder="Date of Birth (YYYY-MM-DD) *"
                  value={formData.personalInfo?.dateOfBirth ? new Date(formData.personalInfo.dateOfBirth).toISOString().split('T')[0] : ''}
                  onChangeText={(text) => handleFieldChange('personalInfo', 'dateOfBirth', text)}
                />
                <View style={styles.heightWeightContainer}>
                  <Text style={styles.label}>Height</Text>
                  <View style={styles.unitInputRow}>
                    <Dropdown
                      options={[
                        { label: 'ft/in', value: 'ft' },
                        { label: 'cm', value: 'cm' },
                      ]}
                      value={formData.personalInfo?.heightUnit || 'ft'}
                      onSelect={(value) => {
                        handleFieldChange('personalInfo', 'heightUnit', value);
                        handleFieldChange('personalInfo', 'height', '');
                        handleFieldChange('personalInfo', 'heightFeet', '');
                        handleFieldChange('personalInfo', 'heightInches', '');
                        handleFieldChange('personalInfo', 'heightCm', '');
                      }}
                      placeholder="Unit"
                      style={[styles.unitSelector, { width: 80 }]}
                    />
                    {formData.personalInfo?.heightUnit === 'ft' ? (
                      <View style={styles.twoInputRow}>
                        <TextInput
                          style={[styles.input, styles.flex1]}
                          placeholder="Feet"
                          keyboardType="numeric"
                          value={formData.personalInfo?.heightFeet || ''}
                          onChangeText={(text) => {
                            handleFieldChange('personalInfo', 'heightFeet', text);
                            const inches = formData.personalInfo?.heightInches || '0';
                            handleFieldChange('personalInfo', 'height', text ? `${text}'${inches}"` : '');
                          }}
                        />
                        <TextInput
                          style={[styles.input, styles.flex1]}
                          placeholder="Inches"
                          keyboardType="numeric"
                          value={formData.personalInfo?.heightInches || ''}
                          onChangeText={(text) => {
                            handleFieldChange('personalInfo', 'heightInches', text);
                            const feet = formData.personalInfo?.heightFeet || '0';
                            handleFieldChange('personalInfo', 'height', feet ? `${feet}'${text}"` : '');
                          }}
                        />
                      </View>
                    ) : (
                      <TextInput
                        style={[styles.input, styles.flex1]}
                        placeholder="Centimeters"
                        keyboardType="numeric"
                        value={formData.personalInfo?.heightCm || ''}
                        onChangeText={(text) => {
                          handleFieldChange('personalInfo', 'heightCm', text);
                          handleFieldChange('personalInfo', 'height', text ? `${text} cm` : '');
                        }}
                      />
                    )}
                  </View>
                </View>
                <View style={styles.heightWeightContainer}>
                  <Text style={styles.label}>Weight</Text>
                  <View style={styles.unitInputRow}>
                    <Dropdown
                      options={[
                        { label: 'kg', value: 'kg' },
                        { label: 'lbs', value: 'lbs' },
                      ]}
                      value={formData.personalInfo?.weightUnit || 'kg'}
                      onSelect={(value) => {
                        handleFieldChange('personalInfo', 'weightUnit', value);
                        handleFieldChange('personalInfo', 'weight', '');
                        handleFieldChange('personalInfo', 'weightValue', '');
                      }}
                      placeholder="Unit"
                      style={[styles.unitSelector, { width: 80 }]}
                    />
                    <TextInput
                      style={[styles.input, styles.flex1]}
                      placeholder={`Weight in ${formData.personalInfo?.weightUnit || 'kg'}`}
                      keyboardType="decimal-pad"
                      value={formData.personalInfo?.weightValue || ''}
                      onChangeText={(text) => {
                        const unit = formData.personalInfo?.weightUnit || 'kg';
                        handleFieldChange('personalInfo', 'weightValue', text);
                        handleFieldChange('personalInfo', 'weight', text ? `${text} ${unit}` : '');
                      }}
                    />
                  </View>
                </View>
                <Dropdown
                  options={[
                    { label: 'Select', value: '' },
                    { label: 'A+', value: 'A+' },
                    { label: 'A-', value: 'A-' },
                    { label: 'B+', value: 'B+' },
                    { label: 'B-', value: 'B-' },
                    { label: 'AB+', value: 'AB+' },
                    { label: 'AB-', value: 'AB-' },
                    { label: 'O+', value: 'O+' },
                    { label: 'O-', value: 'O-' },
                  ]}
                  value={formData.personalInfo?.bloodGroup || ''}
                  onSelect={(value) => handleFieldChange('personalInfo', 'bloodGroup', value)}
                  placeholder="Blood Group"
                  style={styles.input}
                />
                <Dropdown
                  options={[
                    { label: 'Select', value: '' },
                    { label: 'Fair', value: 'Fair' },
                    { label: 'Wheatish', value: 'Wheatish' },
                    { label: 'Wheatish Brown', value: 'Wheatish Brown' },
                    { label: 'Dark', value: 'Dark' },
                  ]}
                  value={formData.personalInfo?.complexion || ''}
                  onSelect={(value) => handleFieldChange('personalInfo', 'complexion', value)}
                  placeholder="Complexion"
                  style={styles.input}
                />
                <Dropdown
                  options={[
                    { label: 'Select', value: '' },
                    { label: 'Normal', value: 'Normal' },
                    { label: 'Physically Challenged', value: 'Physically Challenged' },
                  ]}
                  value={formData.personalInfo?.physicalStatus || ''}
                  onSelect={(value) => handleFieldChange('personalInfo', 'physicalStatus', value)}
                  placeholder="Physical Status"
                  style={styles.input}
                />
                <Dropdown
                  options={[
                    { label: 'Never Married', value: 'Never Married' },
                    { label: 'Divorced', value: 'Divorced' },
                    { label: 'Widowed', value: 'Widowed' },
                    { label: 'Awaiting Divorce', value: 'Awaiting Divorce' },
                  ]}
                  value={formData.personalInfo?.maritalStatus || 'Never Married'}
                  onSelect={(value) => handleFieldChange('personalInfo', 'maritalStatus', value)}
                  placeholder="Marital Status"
                  style={styles.input}
                />
                <Dropdown
                  options={[
                    { label: 'Select', value: '' },
                    { label: 'Hindi', value: 'Hindi' },
                    { label: 'English', value: 'English' },
                    { label: 'Tamil', value: 'Tamil' },
                    { label: 'Telugu', value: 'Telugu' },
                    { label: 'Kannada', value: 'Kannada' },
                    { label: 'Malayalam', value: 'Malayalam' },
                    { label: 'Marathi', value: 'Marathi' },
                    { label: 'Gujarati', value: 'Gujarati' },
                    { label: 'Bengali', value: 'Bengali' },
                    { label: 'Punjabi', value: 'Punjabi' },
                    { label: 'Urdu', value: 'Urdu' },
                    { label: 'Odia', value: 'Odia' },
                    { label: 'Assamese', value: 'Assamese' },
                    { label: 'Rajasthani', value: 'Rajasthani' },
                    { label: 'Bhojpuri', value: 'Bhojpuri' },
                    { label: 'Sanskrit', value: 'Sanskrit' },
                    { label: 'Konkani', value: 'Konkani' },
                    { label: 'Tulu', value: 'Tulu' },
                    { label: 'Kashmiri', value: 'Kashmiri' },
                    { label: 'Sindhi', value: 'Sindhi' },
                    { label: 'Other', value: 'Other' },
                  ]}
                  value={formData.personalInfo?.motherTongue || ''}
                  onSelect={(value) => {
                    handleFieldChange('personalInfo', 'motherTongue', value);
                    // Clear custom input if not "Other"
                    if (value !== 'Other') {
                      handleFieldChange('personalInfo', 'motherTongueCustom', '');
                    }
                  }}
                  placeholder="Mother Tongue"
                  style={styles.input}
                />
                {formData.personalInfo?.motherTongue === 'Other' && (
                  <TextInput
                    style={styles.input}
                    placeholder="Enter your mother tongue"
                    value={formData.personalInfo?.motherTongueCustom || ''}
                    onChangeText={(text) => {
                      handleFieldChange('personalInfo', 'motherTongueCustom', text);
                      handleFieldChange('personalInfo', 'motherTongue', text);
                    }}
                  />
                )}
                <TextInput
                  style={[styles.input, styles.textArea]}
                  placeholder="About Me"
                  value={formData.personalInfo?.about || ''}
                  onChangeText={(text) => handleFieldChange('personalInfo', 'about', text)}
                  multiline
                  numberOfLines={4}
                />
              </View>
            )}
          </View>

          {/* Family Information Section */}
          <View style={styles.section}>
            <SectionHeader title="Family Information" section="family" icon="👨‍👩‍👧‍👦" />
            {expandedSections.family && (
              <View style={styles.sectionContent}>
                <TextInput
                  style={styles.input}
                  placeholder="Father's Name"
                  value={formData.familyInfo?.fatherName || ''}
                  onChangeText={(text) => handleFieldChange('familyInfo', 'fatherName', text)}
                />
                <TextInput
                  style={styles.input}
                  placeholder="Father's Occupation"
                  value={formData.familyInfo?.fatherOccupation || ''}
                  onChangeText={(text) => handleFieldChange('familyInfo', 'fatherOccupation', text)}
                />
                <TextInput
                  style={styles.input}
                  placeholder="Mother's Name"
                  value={formData.familyInfo?.motherName || ''}
                  onChangeText={(text) => handleFieldChange('familyInfo', 'motherName', text)}
                />
                <TextInput
                  style={styles.input}
                  placeholder="Mother's Occupation"
                  value={formData.familyInfo?.motherOccupation || ''}
                  onChangeText={(text) => handleFieldChange('familyInfo', 'motherOccupation', text)}
                />
                <TextInput
                  style={styles.input}
                  placeholder="Siblings (e.g., 1 Brother, 1 Sister)"
                  value={formData.familyInfo?.siblings || ''}
                  onChangeText={(text) => handleFieldChange('familyInfo', 'siblings', text)}
                />
                <Dropdown
                  options={[
                    { label: 'Select', value: '' },
                    { label: 'Joint', value: 'Joint' },
                    { label: 'Nuclear', value: 'Nuclear' },
                  ]}
                  value={formData.familyInfo?.familyType || ''}
                  onSelect={(value) => handleFieldChange('familyInfo', 'familyType', value)}
                  placeholder="Family Type"
                  style={styles.input}
                />
                <Dropdown
                  options={[
                    { label: 'Select', value: '' },
                    { label: 'Middle Class', value: 'Middle Class' },
                    { label: 'Upper Middle Class', value: 'Upper Middle Class' },
                    { label: 'Rich', value: 'Rich' },
                    { label: 'Affluent', value: 'Affluent' },
                  ]}
                  value={formData.familyInfo?.familyStatus || ''}
                  onSelect={(value) => handleFieldChange('familyInfo', 'familyStatus', value)}
                  placeholder="Family Status"
                  style={styles.input}
                />
                <TextInput
                  style={[styles.input, styles.textArea]}
                  placeholder="Family Values"
                  value={formData.familyInfo?.familyValues || ''}
                  onChangeText={(text) => handleFieldChange('familyInfo', 'familyValues', text)}
                  multiline
                  numberOfLines={3}
                />
              </View>
            )}
          </View>

          {/* Education Section */}
          <View style={styles.section}>
            <SectionHeader title="Education" section="education" icon="🎓" />
            {expandedSections.education && (
              <View style={styles.sectionContent}>
                <Dropdown
                  options={[
                    { label: 'Select', value: '' },
                    { label: 'School', value: 'School' },
                    { label: 'High School', value: 'High School' },
                    { label: 'Diploma', value: 'Diploma' },
                    { label: "Bachelor's Degree", value: "Bachelor's Degree" },
                    { label: "Master's Degree", value: "Master's Degree" },
                    { label: 'M.Phil', value: 'M.Phil' },
                    { label: 'Ph.D', value: 'Ph.D' },
                    { label: 'Professional Degree (CA, CS, ICWA)', value: 'Professional Degree (CA, CS, ICWA)' },
                    { label: 'Other', value: 'Other' },
                  ]}
                  value={formData.education?.highestEducation || ''}
                  onSelect={(value) => handleFieldChange('education', 'highestEducation', value)}
                  placeholder="Highest Education"
                  style={styles.input}
                />
                <TextInput
                  style={styles.input}
                  placeholder="College/University"
                  value={formData.education?.college || ''}
                  onChangeText={(text) => handleFieldChange('education', 'college', text)}
                />
                <Dropdown
                  options={[
                    { label: 'Select', value: '' },
                    { label: 'B.Tech / B.E.', value: 'B.Tech / B.E.' },
                    { label: 'B.Sc', value: 'B.Sc' },
                    { label: 'B.Com', value: 'B.Com' },
                    { label: 'B.A', value: 'B.A' },
                    { label: 'BBA', value: 'BBA' },
                    { label: 'MBBS', value: 'MBBS' },
                    { label: 'BDS', value: 'BDS' },
                    { label: 'B.Pharm', value: 'B.Pharm' },
                    { label: 'M.Tech / M.E.', value: 'M.Tech / M.E.' },
                    { label: 'M.Sc', value: 'M.Sc' },
                    { label: 'M.Com', value: 'M.Com' },
                    { label: 'M.A', value: 'M.A' },
                    { label: 'MBA', value: 'MBA' },
                    { label: 'MD', value: 'MD' },
                    { label: 'MS', value: 'MS' },
                    { label: 'MDS', value: 'MDS' },
                    { label: 'CA', value: 'CA' },
                    { label: 'CS', value: 'CS' },
                    { label: 'ICWA', value: 'ICWA' },
                    { label: 'LLB', value: 'LLB' },
                    { label: 'LLM', value: 'LLM' },
                    { label: 'Ph.D', value: 'Ph.D' },
                    { label: 'Other', value: 'Other' },
                  ]}
                  value={formData.education?.degree || ''}
                  onSelect={(value) => handleFieldChange('education', 'degree', value)}
                  placeholder="Degree"
                  style={styles.input}
                />
                <TextInput
                  style={styles.input}
                  placeholder="Specialization"
                  value={formData.education?.specialization || ''}
                  onChangeText={(text) => handleFieldChange('education', 'specialization', text)}
                />
              </View>
            )}
          </View>

          {/* Career Section */}
          <View style={styles.section}>
            <SectionHeader title="Career" section="career" icon="💼" />
            {expandedSections.career && (
              <View style={styles.sectionContent}>
                <Dropdown
                  options={[
                    { label: 'Select', value: '' },
                    { label: 'Software Engineer', value: 'Software Engineer' },
                    { label: 'Doctor', value: 'Doctor' },
                    { label: 'Engineer', value: 'Engineer' },
                    { label: 'Teacher', value: 'Teacher' },
                    { label: 'Professor', value: 'Professor' },
                    { label: 'Business', value: 'Business' },
                    { label: 'CA / CS / ICWA', value: 'CA / CS / ICWA' },
                    { label: 'Lawyer', value: 'Lawyer' },
                    { label: 'Government Employee', value: 'Government Employee' },
                    { label: 'Banking Professional', value: 'Banking Professional' },
                    { label: 'Accountant', value: 'Accountant' },
                    { label: 'Architect', value: 'Architect' },
                    { label: 'Dentist', value: 'Dentist' },
                    { label: 'Pharmacist', value: 'Pharmacist' },
                    { label: 'Nurse', value: 'Nurse' },
                    { label: 'Pilot', value: 'Pilot' },
                    { label: 'Army / Navy / Air Force', value: 'Army / Navy / Air Force' },
                    { label: 'Police', value: 'Police' },
                    { label: 'Designer', value: 'Designer' },
                    { label: 'Artist', value: 'Artist' },
                    { label: 'Scientist', value: 'Scientist' },
                    { label: 'Research Scholar', value: 'Research Scholar' },
                    { label: 'Student', value: 'Student' },
                    { label: 'Homemaker', value: 'Homemaker' },
                    { label: 'Other', value: 'Other' },
                  ]}
                  value={formData.career?.occupation || ''}
                  onSelect={(value) => handleFieldChange('career', 'occupation', value)}
                  placeholder="Occupation"
                  style={styles.input}
                />
                <TextInput
                  style={styles.input}
                  placeholder="Company/Organization"
                  value={formData.career?.company || ''}
                  onChangeText={(text) => handleFieldChange('career', 'company', text)}
                />
                <Dropdown
                  options={[
                    { label: 'Select', value: '' },
                    { label: 'Below ₹2,00,000', value: 'Below ₹2,00,000' },
                    { label: '₹2,00,000 - ₹5,00,000', value: '₹2,00,000 - ₹5,00,000' },
                    { label: '₹5,00,000 - ₹10,00,000', value: '₹5,00,000 - ₹10,00,000' },
                    { label: '₹10,00,000 - ₹20,00,000', value: '₹10,00,000 - ₹20,00,000' },
                    { label: '₹20,00,000 - ₹50,00,000', value: '₹20,00,000 - ₹50,00,000' },
                    { label: '₹50,00,000 - ₹1,00,00,000', value: '₹50,00,000 - ₹1,00,00,000' },
                    { label: 'Above ₹1,00,00,000', value: 'Above ₹1,00,00,000' },
                    { label: 'Not Disclosed', value: 'Not Disclosed' },
                  ]}
                  value={formData.career?.annualIncome || ''}
                  onSelect={(value) => handleFieldChange('career', 'annualIncome', value)}
                  placeholder="Annual Income"
                  style={styles.input}
                />
                <TextInput
                  style={styles.input}
                  placeholder="Working Location"
                  value={formData.career?.workingLocation || ''}
                  onChangeText={(text) => handleFieldChange('career', 'workingLocation', text)}
                />
              </View>
            )}
          </View>

          {/* Location Section */}
          <View style={styles.section}>
            <SectionHeader title="Location" section="location" icon="📍" />
            {expandedSections.location && (
              <View style={styles.sectionContent}>
                <View>
                  <Text style={styles.label}>Country</Text>
                  <Dropdown
                    options={countries.map((country) => ({ label: country, value: country }))}
                    value={formData.location?.country || 'India'}
                    onSelect={(value) => {
                      handleFieldChange('location', 'country', value);
                      // Clear state and city when country changes
                      if (value !== 'India') {
                        handleFieldChange('location', 'state', '');
                        handleFieldChange('location', 'city', '');
                      }
                    }}
                    placeholder="Country"
                    style={styles.input}
                  />
                  {formData.location?.country === 'Other' && (
                    <TextInput
                      style={styles.input}
                      placeholder="Enter country name"
                      value={formData.location?.countryCustom || ''}
                      onChangeText={(text) => {
                        handleFieldChange('location', 'countryCustom', text);
                        handleFieldChange('location', 'country', text);
                      }}
                    />
                  )}
                </View>
                <View>
                  <Text style={styles.label}>State <Text style={styles.required}>*</Text></Text>
                  {formData.location?.country === 'India' || !formData.location?.country ? (
                    <Dropdown
                      options={[
                        { label: 'Select State', value: '' },
                        ...indianStates.map((state) => ({ label: state, value: state })),
                      ]}
                      value={formData.location?.state || ''}
                      onSelect={(value) => {
                        handleFieldChange('location', 'state', value);
                        // Clear city when state changes
                        handleFieldChange('location', 'city', '');
                      }}
                      placeholder="State"
                      style={styles.input}
                    />
                  ) : (
                    <TextInput
                      style={styles.input}
                      placeholder="Enter state"
                      value={formData.location?.state || ''}
                      onChangeText={(text) => handleFieldChange('location', 'state', text)}
                    />
                  )}
                </View>
                <View>
                  <Text style={styles.label}>City <Text style={styles.required}>*</Text></Text>
                  {formData.location?.country === 'India' || !formData.location?.country ? (
                    formData.location?.state && stateCities[formData.location.state] ? (
                      <Dropdown
                        options={[
                          { label: 'Select City', value: '' },
                          ...stateCities[formData.location.state].map((city) => ({ label: city, value: city })),
                        ]}
                        value={formData.location?.city || ''}
                        onSelect={(value) => handleFieldChange('location', 'city', value)}
                        placeholder="City"
                        style={styles.input}
                      />
                    ) : (
                      <TextInput
                        style={[styles.input, { opacity: 0.5 }]}
                        placeholder="Select state first"
                        value=""
                        editable={false}
                      />
                    )
                  ) : (
                    <TextInput
                      style={styles.input}
                      placeholder="Enter city"
                      value={formData.location?.city || ''}
                      onChangeText={(text) => handleFieldChange('location', 'city', text)}
                    />
                  )}
                </View>
                <TextInput
                  style={styles.input}
                  placeholder="Pincode"
                  value={formData.location?.pincode || ''}
                  onChangeText={(text) => handleFieldChange('location', 'pincode', text)}
                />
              </View>
            )}
          </View>

          {/* Religion Section */}
          <View style={styles.section}>
            <SectionHeader title="Religion & Astrology" section="religion" icon="🕉️" />
            {expandedSections.religion && (
              <View style={styles.sectionContent}>
                <View>
                  <Text style={styles.label}>Religion <Text style={styles.required}>*</Text></Text>
                  <Dropdown
                    options={[
                      { label: 'Select Religion', value: '' },
                      ...religions.map((religion) => ({ label: religion, value: religion })),
                    ]}
                    value={formData.religion?.religion || ''}
                    onSelect={(value) => {
                      handleFieldChange('religion', 'religion', value);
                      // Clear caste and sub-caste when religion changes
                      handleFieldChange('religion', 'caste', '');
                      handleFieldChange('religion', 'subCaste', '');
                      // If "Other" is selected, show custom input
                      if (value === 'Other') {
                        handleFieldChange('religion', 'religionCustom', '');
                      }
                    }}
                    placeholder="Religion"
                    style={styles.input}
                  />
                  {formData.religion?.religion === 'Other' && (
                    <TextInput
                      style={styles.input}
                      placeholder="Enter religion name"
                      value={formData.religion?.religionCustom || ''}
                      onChangeText={(text) => {
                        handleFieldChange('religion', 'religionCustom', text);
                        handleFieldChange('religion', 'religion', text);
                      }}
                    />
                  )}
                </View>
                <View>
                  <Text style={styles.label}>Caste <Text style={styles.required}>*</Text></Text>
                  <Dropdown
                    options={[
                      { label: 'Select Caste', value: '' },
                      ...casteCategories.map((caste) => ({ label: caste, value: caste })),
                    ]}
                    value={formData.religion?.caste || ''}
                    onSelect={(value) => {
                      handleFieldChange('religion', 'caste', value);
                      // Clear sub-caste when caste changes
                      handleFieldChange('religion', 'subCaste', '');
                      // If "Other" is selected, show custom input
                      if (value === 'Other') {
                        handleFieldChange('religion', 'casteCustom', '');
                      }
                    }}
                    placeholder="Caste"
                    style={styles.input}
                  />
                  {formData.religion?.caste === 'Other' && (
                    <TextInput
                      style={styles.input}
                      placeholder="Enter caste name"
                      value={formData.religion?.casteCustom || ''}
                      onChangeText={(text) => {
                        handleFieldChange('religion', 'casteCustom', text);
                        handleFieldChange('religion', 'caste', text);
                      }}
                    />
                  )}
                </View>
                <View>
                  <Text style={styles.label}>Sub-Caste</Text>
                  {formData.religion?.caste && casteSubCastes[formData.religion.caste] ? (
                    <>
                      <Dropdown
                        options={[
                          { label: 'Select Sub-Caste (Optional)', value: '' },
                          ...casteSubCastes[formData.religion.caste].map((subCaste) => ({ label: subCaste, value: subCaste })),
                        ]}
                        value={formData.religion?.subCaste || ''}
                        onSelect={(value) => {
                          handleFieldChange('religion', 'subCaste', value);
                          // If "Other" is selected, show custom input
                          if (value === 'Other') {
                            handleFieldChange('religion', 'subCasteCustom', '');
                          }
                        }}
                        placeholder="Sub-Caste"
                        style={styles.input}
                      />
                      {formData.religion?.subCaste === 'Other' && (
                        <TextInput
                          style={styles.input}
                          placeholder="Enter sub-caste name"
                          value={formData.religion?.subCasteCustom || ''}
                          onChangeText={(text) => {
                            handleFieldChange('religion', 'subCasteCustom', text);
                            handleFieldChange('religion', 'subCaste', text);
                          }}
                        />
                      )}
                    </>
                  ) : (
                    <TextInput
                      style={[styles.input, { opacity: formData.religion?.caste ? 1 : 0.5 }]}
                      placeholder={formData.religion?.caste ? "Enter sub-caste (optional)" : "Select caste first"}
                      value={formData.religion?.subCaste || ''}
                      onChangeText={(text) => handleFieldChange('religion', 'subCaste', text)}
                      editable={!!formData.religion?.caste}
                    />
                  )}
                </View>
                <TextInput
                  style={styles.input}
                  placeholder="Gothra"
                  value={formData.religion?.gothra || ''}
                  onChangeText={(text) => handleFieldChange('religion', 'gothra', text)}
                />
                <TextInput
                  style={styles.input}
                  placeholder="Star (Nakshatra)"
                  value={formData.religion?.star || ''}
                  onChangeText={(text) => handleFieldChange('religion', 'star', text)}
                />
                <TextInput
                  style={styles.input}
                  placeholder="Raasi (Rashi)"
                  value={formData.religion?.raasi || ''}
                  onChangeText={(text) => handleFieldChange('religion', 'raasi', text)}
                />
              </View>
            )}
          </View>

          {/* Lifestyle Section */}
          <View style={styles.section}>
            <SectionHeader title="Lifestyle" section="lifestyle" icon="🍽️" />
            {expandedSections.lifestyle && (
              <View style={styles.sectionContent}>
                <Dropdown
                  options={[
                    { label: 'Select', value: '' },
                    { label: 'Vegetarian', value: 'Vegetarian' },
                    { label: 'Non-Vegetarian', value: 'Non-Vegetarian' },
                    { label: 'Vegan', value: 'Vegan' },
                    { label: 'Eggetarian', value: 'Eggetarian' },
                  ]}
                  value={formData.personalInfo?.eatingHabits || ''}
                  onSelect={(value) => handleFieldChange('personalInfo', 'eatingHabits', value)}
                  placeholder="Eating Habits"
                  style={styles.input}
                />
                <Dropdown
                  options={[
                    { label: 'Select', value: '' },
                    { label: 'Never', value: 'Never' },
                    { label: 'Occasionally', value: 'Occasionally' },
                    { label: 'Regularly', value: 'Regularly' },
                  ]}
                  value={formData.personalInfo?.drinkingHabits || ''}
                  onSelect={(value) => handleFieldChange('personalInfo', 'drinkingHabits', value)}
                  placeholder="Drinking Habits"
                  style={styles.input}
                />
                <Dropdown
                  options={[
                    { label: 'Select', value: '' },
                    { label: 'Never', value: 'Never' },
                    { label: 'Occasionally', value: 'Occasionally' },
                    { label: 'Regularly', value: 'Regularly' },
                  ]}
                  value={formData.personalInfo?.smokingHabits || ''}
                  onSelect={(value) => handleFieldChange('personalInfo', 'smokingHabits', value)}
                  placeholder="Smoking Habits"
                  style={styles.input}
                />
              </View>
            )}
          </View>

          {/* Photos Section */}
          <View style={styles.section}>
            <SectionHeader title="Photos" section="photos" icon="📷" />
            {expandedSections.photos && (
              <View style={styles.sectionContent}>
                <TouchableOpacity style={styles.button} onPress={handlePickImage}>
                  <Text style={styles.buttonText}>Upload Photos</Text>
                </TouchableOpacity>
                <Text style={styles.photoHint}>
                  Minimum 3 photos required. You can upload multiple photos.
                </Text>
                {profile?.photos && profile.photos.length > 0 && (
                  <>
                    {profile.photos.length < 3 && (
                      <Text style={styles.photoWarning}>
                        ⚠️ You need to upload at least 3 photos. Currently you have {profile.photos.length} photo{profile.photos.length !== 1 ? 's' : ''}.
                      </Text>
                    )}
                  </>
                )}
                {profile?.photos && profile.photos.length > 0 && (
                  <View style={styles.photosGrid}>
                    {profile.photos.map((photo, index) => (
                      <View key={photo._id || index} style={styles.photoItem}>
                        <Image
                          source={{ uri: getImageUrl(photo.url) }}
                          style={styles.photoThumbnail}
                        />
                        {photo.isPrimary && (
                          <View style={styles.primaryBadge}>
                            <Text style={styles.primaryBadgeText}>Primary</Text>
                          </View>
                        )}
                        <View style={styles.photoActions}>
                          {!photo.isPrimary && (
                            <TouchableOpacity
                              style={styles.photoActionButton}
                              onPress={async () => {
                                try {
                                  const photoId = photo._id || photo.id;
                                  await setPrimaryPhoto(photoId);
                                  // Update local state immediately - set all to false first, then set selected one to true
                                  const updatedPhotos = profile.photos.map(p => ({
                                    ...p,
                                    isPrimary: (p._id || p.id) === photoId
                                  }));
                                  setProfile(prev => ({ ...prev, photos: updatedPhotos }));
                                  setFormData(prev => ({ ...prev, photos: updatedPhotos }));
                                  alert('Primary photo updated!');
                                  // Reload to ensure sync with server
                                  await loadProfile();
                                } catch (error) {
                                  alert('Failed to set primary photo');
                                }
                              }}
                            >
                              <Text style={styles.photoActionButtonText}>Set Primary</Text>
                            </TouchableOpacity>
                          )}
                          <TouchableOpacity
                            style={[styles.photoActionButton, styles.deleteButton]}
                            onPress={async () => {
                              // Prevent deletion if it would result in less than 3 photos
                              if (profile.photos.length <= 3) {
                                Alert.alert(
                                  'Cannot Delete',
                                  'Minimum 3 photos required. Cannot delete this photo.',
                                  [{ text: 'OK' }]
                                );
                                return;
                              }
                              Alert.alert(
                                'Delete Photo',
                                'Are you sure you want to delete this photo?',
                                [
                                  { text: 'Cancel', style: 'cancel' },
                                  {
                                    text: 'Delete',
                                    style: 'destructive',
                                    onPress: async () => {
                                      try {
                                        const photoId = photo._id || photo.id;
                                        await deletePhoto(photoId);
                                        // Update local state immediately
                                        const updatedPhotos = profile.photos.filter(p => (p._id || p.id) !== photoId);
                                        setProfile(prev => ({ ...prev, photos: updatedPhotos }));
                                        setFormData(prev => ({ ...prev, photos: updatedPhotos }));
                                        alert('Photo deleted!');
                                        // Reload to ensure sync with server
                                        await loadProfile();
                                      } catch (error) {
                                        alert('Failed to delete photo');
                                      }
                                    },
                                  },
                                ]
                              );
                            }}
                          >
                            <Text style={styles.photoActionButtonText}>Delete</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            )}
          </View>

          {/* Action Buttons */}
          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={[styles.button, (saving || !isFormReadyToSubmit()) && styles.buttonDisabled]}
              onPress={handleSubmit}
              disabled={saving || !isFormReadyToSubmit()}
            >
              <Text style={styles.buttonText}>{saving ? 'Submitting...' : 'Submit Profile'}</Text>
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
          {primaryPhoto?.url && (
            <Image source={{ uri: getImageUrl(primaryPhoto.url) }} style={styles.profileImage} />
          )}
          <Text style={styles.name}>
            {displayProfile.personalInfo?.firstName} {displayProfile.personalInfo?.lastName}
          </Text>
          <Text style={styles.details}>
            {displayProfile.personalInfo?.age} years • {displayProfile.location?.city}, {displayProfile.location?.state}
          </Text>
          <Text style={styles.info}>Education: {displayProfile.education?.highestEducation || 'N/A'}</Text>
          <Text style={styles.info}>Occupation: {displayProfile.career?.occupation || 'N/A'}</Text>
          <Text style={styles.info}>Religion: {displayProfile.religion?.religion || 'N/A'}</Text>
          <Text style={styles.info}>Caste: {displayProfile.religion?.caste || 'N/A'}</Text>
          <TouchableOpacity 
            style={styles.subscriptionButton} 
            onPress={() => navigation.navigate('Subscription')}
          >
            <Text style={styles.subscriptionButtonText}>💳 Subscription</Text>
          </TouchableOpacity>
        </View>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
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
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  saveStatus: {
    marginRight: 10,
  },
  saveStatusText: {
    fontSize: 12,
    color: '#666',
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
  section: {
    backgroundColor: '#fff',
    borderRadius: 8,
    marginBottom: 15,
    overflow: 'hidden',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    backgroundColor: '#f9fafb',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  sectionHeaderContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sectionIcon: {
    fontSize: 20,
    marginRight: 10,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  sectionArrow: {
    fontSize: 14,
    color: '#666',
  },
  sectionContent: {
    padding: 15,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    marginBottom: 15,
    backgroundColor: '#fff',
    fontSize: 16,
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  button: {
    backgroundColor: '#ef4444',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 10,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonSecondary: {
    backgroundColor: '#f0f0f0',
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  buttonTextSecondary: {
    color: '#333',
    fontWeight: 'bold',
    fontSize: 16,
  },
  profileView: {
    padding: 15,
    alignItems: 'center',
    backgroundColor: '#fff',
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
    textAlign: 'center',
  },
  subscriptionButton: {
    backgroundColor: '#ef4444',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 30,
    marginBottom: 15,
    width: '100%',
  },
  subscriptionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  heightWeightContainer: {
    marginBottom: 15,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  unitInputRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  unitSelector: {
    minWidth: 80,
  },
  twoInputRow: {
    flexDirection: 'row',
    gap: 8,
    flex: 1,
  },
  flex1: {
    flex: 1,
    fontSize: 16,
    fontWeight: 'bold',
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    marginBottom: 20,
    textAlign: 'center',
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
  photosGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 10,
  },
  photoItem: {
    width: '48%',
    margin: '1%',
    position: 'relative',
    marginBottom: 10,
  },
  photoThumbnail: {
    width: '100%',
    height: 150,
    borderRadius: 8,
  },
  primaryBadge: {
    position: 'absolute',
    top: 5,
    right: 5,
    backgroundColor: '#ef4444',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  primaryBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  photoActions: {
    flexDirection: 'row',
    marginTop: 5,
    justifyContent: 'space-between',
  },
  photoActionButton: {
    flex: 1,
    backgroundColor: '#ef4444',
    padding: 8,
    borderRadius: 6,
    alignItems: 'center',
    marginHorizontal: 2,
  },
  deleteButton: {
    backgroundColor: '#dc2626',
  },
  photoActionButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  required: {
    color: '#ef4444',
  },
  photoHint: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 8,
    marginBottom: 10,
  },
  photoWarning: {
    fontSize: 12,
    color: '#ef4444',
    marginTop: 8,
    marginBottom: 10,
    fontWeight: '600',
  },
});

export default ProfileScreen;
