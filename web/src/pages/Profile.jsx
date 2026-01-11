import { useState, useEffect, useRef } from 'react';
import { useQuery } from 'react-query';
import { useSearchParams } from 'react-router-dom';
import { getMyProfile, createProfile, updateProfile, uploadPhotos, setPrimaryPhoto, deletePhoto, reorderPhotos } from '../services/profileService';
import { useAuth } from '../context/AuthContext';
import { deactivateAccount, deleteAccount, updateContact, updatePrivacySettings, downloadUserData } from '../services/authService';
import { useNavigate } from 'react-router-dom';
import { getImageUrl } from '../config/api';
import toast from 'react-hot-toast';
import { indianStates, stateCities, countries } from '../utils/indianLocations';
import { religions, casteCategories, casteSubCastes } from '../utils/religionData';
import { isProfileComplete } from '../utils/profileUtils';

const Profile = () => {
  const [searchParams] = useSearchParams();
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState({});
  const [photos, setPhotos] = useState([]);
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
    preferences: false,
  });
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const autoSaveTimerRef = useRef(null);
  const hasInitialDataRef = useRef(false);
  const [showAccountSettings, setShowAccountSettings] = useState(false);
  const [showDeactivateModal, setShowDeactivateModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);
  const [showContactModal, setShowContactModal] = useState(false);
  const [deactivateReason, setDeactivateReason] = useState('');
  const [deletePassword, setDeletePassword] = useState('');
  const [exportData, setExportData] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [contactPassword, setContactPassword] = useState('');
  const [privacySettings, setPrivacySettings] = useState({
    showEmail: false,
    showPhone: false,
    showProfileInSearch: true,
    allowProfileViews: true,
  });

  const { data, isLoading, refetch } = useQuery('myProfile', getMyProfile);

  // Auto-open create/edit form if coming from search page or edit param
  useEffect(() => {
    const createParam = searchParams.get('create');
    const editParam = searchParams.get('edit');
    
    if (createParam === 'true' && !data?.profile && !editing) {
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
        preferences: {},
      });
      window.history.replaceState({}, '', '/profile');
    } else if (editParam === 'true' && data?.profile && !editing) {
      setEditing(true);
      window.history.replaceState({}, '', '/profile');
    }
  }, [searchParams, data, editing, user]);

  useEffect(() => {
    if (data?.profile) {
      const profile = { ...data.profile };
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
      setFormData(profile);
      setPhotos(profile.photos || []);
      hasInitialDataRef.current = true;
    }
  }, [data]);
  
  // Update photos when formData changes
  useEffect(() => {
    if (formData.photos) {
      setPhotos(formData.photos);
    }
  }, [formData.photos]);

  // Auto-save functionality
  useEffect(() => {
    if (!editing || !hasInitialDataRef.current) return;
    if (!data?.profile) return; // Don't auto-save if profile doesn't exist yet

    // Clear existing timer
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
    }

    // Set new timer for auto-save (2 seconds after user stops typing)
    autoSaveTimerRef.current = setTimeout(async () => {
      try {
        setSaving(true);
        await updateProfile(data.profile._id, formData);
        setLastSaved(new Date());
        toast.success('Profile auto-saved', { duration: 2000 });
      } catch (error) {
        toast.error('Failed to auto-save profile');
      } finally {
        setSaving(false);
      }
    }, 2000);

    return () => {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }
    };
  }, [formData, editing, data?.profile]);

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
    const currentPhotos = photos.length || 0;

    const hasFirstName = personalInfo.firstName && personalInfo.firstName.trim() !== '';
    const hasLastName = personalInfo.lastName && personalInfo.lastName.trim() !== '';
    const hasDateOfBirth = personalInfo.dateOfBirth;
    const hasCity = location.city && location.city.trim() !== '';
    const hasState = location.state && location.state.trim() !== '';
    const hasReligion = religion.religion && religion.religion.trim() !== '';
    const hasCaste = religion.caste && religion.caste.trim() !== '';
    const hasMinimumPhotos = currentPhotos >= 3;

    const isReady = hasFirstName && hasLastName && hasDateOfBirth && hasCity && hasState && hasReligion && hasCaste && hasMinimumPhotos;
    
    // Debug: Log missing fields (only in development)
    if (process.env.NODE_ENV === 'development' && !isReady) {
      const missingFields = [];
      if (!hasFirstName) missingFields.push('First Name');
      if (!hasLastName) missingFields.push('Last Name');
      if (!hasDateOfBirth) missingFields.push('Date of Birth');
      if (!hasCity) missingFields.push('City');
      if (!hasState) missingFields.push('State');
      if (!hasReligion) missingFields.push('Religion');
      if (!hasCaste) missingFields.push('Caste');
      if (!hasMinimumPhotos) missingFields.push(`Photos (need ${3 - currentPhotos} more)`);
      console.log('Missing required fields:', missingFields);
    }

    return isReady;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate all mandatory fields
    if (!isFormReadyToSubmit()) {
      toast.error('Please complete all mandatory fields (First Name, Last Name, Date of Birth, City, State, Religion, Caste) and upload at least 3 photos.');
      return;
    }
    
    try {
      setSaving(true);
      if (data?.profile) {
        await updateProfile(data.profile._id, formData);
        toast.success('Profile submitted successfully!');
      } else {
        await createProfile(formData);
        toast.success('Profile submitted successfully!');
        hasInitialDataRef.current = true;
      }
      setLastSaved(new Date());
      setEditing(false);
      refetch();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to submit profile');
    } finally {
      setSaving(false);
    }
  };

  const handlePhotoUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;
    
    try {
      if (!data?.profile) {
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
        await refetch();
      }
      
      await uploadPhotos(files);
      toast.success('Photos uploaded successfully!');
      refetch();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to upload photos');
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
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
      </div>
    );
  }

  if (!data?.profile && !editing) {
    const profileType = user?.profileType || 'bride';
    
    return (
      <div className="text-center py-12">
        <div className="bg-white rounded-lg shadow p-8 max-w-md mx-auto">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Create Your Profile</h2>
          <p className="text-gray-600 mb-6">
            You haven't created your profile yet. Fill in your details to get started.
          </p>
          <button
            onClick={() => {
              setEditing(true);
              setFormData({
                type: profileType,
                personalInfo: {},
                familyInfo: {},
                location: {},
                education: {},
                career: {},
                religion: {},
                preferences: {},
              });
            }}
            className="px-6 py-3 bg-primary-600 text-white rounded-md hover:bg-primary-700 font-medium"
          >
            Create Profile
          </button>
        </div>
      </div>
    );
  }

  const profile = data?.profile || {};
  // Find primary photo or use first photo
  const primaryPhoto = profile.photos?.find(p => p.isPrimary) || profile.photos?.[0];

  const SectionHeader = ({ title, section, icon }) => (
    <button
      type="button"
      onClick={() => toggleSection(section)}
      className="w-full flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
    >
      <div className="flex items-center space-x-2">
        <span className="text-xl">{icon}</span>
        <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
      </div>
      <span className="text-gray-500">
        {expandedSections[section] ? '▼' : '▶'}
      </span>
    </button>
  );

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">My Profile</h1>
        <div className="flex items-center space-x-4">
          {editing && (
            <div className="flex items-center space-x-2 text-sm text-gray-600">
              {saving ? (
                <span className="flex items-center">
                  <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-600 mr-2"></span>
                  Saving...
                </span>
              ) : lastSaved ? (
                <span>Saved {new Date(lastSaved).toLocaleTimeString()}</span>
              ) : null}
            </div>
          )}
          {!editing && (
            <button
              onClick={() => setEditing(true)}
              className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700"
            >
              Edit Profile
            </button>
          )}
        </div>
      </div>

      {editing ? (
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Profile Type */}
          {!data?.profile && user?.profileType && (
            <div className="bg-white p-4 rounded-lg shadow">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Profile Type
              </label>
              <div className="px-4 py-3 bg-primary-50 border border-primary-200 rounded-md">
                <div className="flex items-center justify-between">
                  <span className="text-primary-800 font-medium capitalize">
                    {user.profileType === 'bride' ? 'Bride' : 'Groom'}
                  </span>
                  <span className="text-sm text-gray-600">
                    {user.profileType === 'bride' ? 'Looking for a groom' : 'Looking for a bride'}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Personal Information Section */}
          <div className="bg-white rounded-lg shadow">
            <SectionHeader title="Personal Information" section="personal" icon="👤" />
            {expandedSections.personal && (
              <div className="p-6 space-y-4 border-t">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      First Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.personalInfo?.firstName || ''}
                      onChange={(e) => handleFieldChange('personalInfo', 'firstName', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Last Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.personalInfo?.lastName || ''}
                      onChange={(e) => handleFieldChange('personalInfo', 'lastName', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Date of Birth <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      value={formData.personalInfo?.dateOfBirth ? new Date(formData.personalInfo.dateOfBirth).toISOString().split('T')[0] : ''}
                      onChange={(e) => handleFieldChange('personalInfo', 'dateOfBirth', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Height
                    </label>
                    <div className="flex gap-2">
                      <select
                        value={formData.personalInfo?.heightUnit || 'ft'}
                        onChange={(e) => {
                          const unit = e.target.value;
                          handleFieldChange('personalInfo', 'heightUnit', unit);
                          // Clear height value when unit changes
                          handleFieldChange('personalInfo', 'height', '');
                          handleFieldChange('personalInfo', 'heightFeet', '');
                          handleFieldChange('personalInfo', 'heightInches', '');
                          handleFieldChange('personalInfo', 'heightCm', '');
                        }}
                        className="px-3 py-2 border border-gray-300 rounded-md bg-white"
                      >
                        <option value="ft">ft/in</option>
                        <option value="cm">cm</option>
                      </select>
                      {formData.personalInfo?.heightUnit === 'ft' ? (
                        <div className="flex gap-2 flex-1">
                          <input
                            type="number"
                            min="0"
                            max="8"
                            value={formData.personalInfo?.heightFeet || ''}
                            onChange={(e) => {
                              const feet = e.target.value;
                              handleFieldChange('personalInfo', 'heightFeet', feet);
                              const inches = formData.personalInfo?.heightInches || '0';
                              handleFieldChange('personalInfo', 'height', feet ? `${feet}'${inches}"` : '');
                            }}
                            className="flex-1 px-3 py-2 border border-gray-300 rounded-md"
                            placeholder="Feet"
                          />
                          <input
                            type="number"
                            min="0"
                            max="11"
                            value={formData.personalInfo?.heightInches || ''}
                            onChange={(e) => {
                              const inches = e.target.value;
                              handleFieldChange('personalInfo', 'heightInches', inches);
                              const feet = formData.personalInfo?.heightFeet || '0';
                              handleFieldChange('personalInfo', 'height', feet ? `${feet}'${inches}"` : '');
                            }}
                            className="flex-1 px-3 py-2 border border-gray-300 rounded-md"
                            placeholder="Inches"
                          />
                        </div>
                      ) : (
                        <input
                          type="number"
                          min="0"
                          value={formData.personalInfo?.heightCm || ''}
                          onChange={(e) => {
                            const cm = e.target.value;
                            handleFieldChange('personalInfo', 'heightCm', cm);
                            handleFieldChange('personalInfo', 'height', cm ? `${cm} cm` : '');
                          }}
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-md"
                          placeholder="Centimeters"
                        />
                      )}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Weight
                    </label>
                    <div className="flex gap-2">
                      <select
                        value={formData.personalInfo?.weightUnit || 'kg'}
                        onChange={(e) => {
                          const unit = e.target.value;
                          handleFieldChange('personalInfo', 'weightUnit', unit);
                          handleFieldChange('personalInfo', 'weight', '');
                          handleFieldChange('personalInfo', 'weightValue', '');
                        }}
                        className="px-3 py-2 border border-gray-300 rounded-md bg-white"
                      >
                        <option value="kg">kg</option>
                        <option value="lbs">lbs</option>
                      </select>
                      <input
                        type="number"
                        min="0"
                        step="0.1"
                        value={formData.personalInfo?.weightValue || ''}
                        onChange={(e) => {
                          const value = e.target.value;
                          const unit = formData.personalInfo?.weightUnit || 'kg';
                          handleFieldChange('personalInfo', 'weightValue', value);
                          handleFieldChange('personalInfo', 'weight', value ? `${value} ${unit}` : '');
                        }}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-md"
                        placeholder={`Weight in ${formData.personalInfo?.weightUnit || 'kg'}`}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Blood Group
                    </label>
                    <select
                      value={formData.personalInfo?.bloodGroup || ''}
                      onChange={(e) => handleFieldChange('personalInfo', 'bloodGroup', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    >
                      <option value="">Select</option>
                      <option value="A+">A+</option>
                      <option value="A-">A-</option>
                      <option value="B+">B+</option>
                      <option value="B-">B-</option>
                      <option value="AB+">AB+</option>
                      <option value="AB-">AB-</option>
                      <option value="O+">O+</option>
                      <option value="O-">O-</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Complexion
                    </label>
                    <select
                      value={formData.personalInfo?.complexion || ''}
                      onChange={(e) => handleFieldChange('personalInfo', 'complexion', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    >
                      <option value="">Select</option>
                      <option value="Fair">Fair</option>
                      <option value="Wheatish">Wheatish</option>
                      <option value="Wheatish Brown">Wheatish Brown</option>
                      <option value="Dark">Dark</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Physical Status
                    </label>
                    <select
                      value={formData.personalInfo?.physicalStatus || ''}
                      onChange={(e) => handleFieldChange('personalInfo', 'physicalStatus', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    >
                      <option value="">Select</option>
                      <option value="Normal">Normal</option>
                      <option value="Physically Challenged">Physically Challenged</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Marital Status
                    </label>
                    <select
                      value={formData.personalInfo?.maritalStatus || ''}
                      onChange={(e) => handleFieldChange('personalInfo', 'maritalStatus', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    >
                      <option value="Never Married">Never Married</option>
                      <option value="Divorced">Divorced</option>
                      <option value="Widowed">Widowed</option>
                      <option value="Awaiting Divorce">Awaiting Divorce</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Mother Tongue
                    </label>
                    <select
                      value={formData.personalInfo?.motherTongue || ''}
                      onChange={(e) => {
                        const value = e.target.value;
                        handleFieldChange('personalInfo', 'motherTongue', value);
                        // Clear custom input if not "Other"
                        if (value !== 'Other') {
                          handleFieldChange('personalInfo', 'motherTongueCustom', '');
                        }
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    >
                      <option value="">Select</option>
                      <option value="Hindi">Hindi</option>
                      <option value="English">English</option>
                      <option value="Tamil">Tamil</option>
                      <option value="Telugu">Telugu</option>
                      <option value="Kannada">Kannada</option>
                      <option value="Malayalam">Malayalam</option>
                      <option value="Marathi">Marathi</option>
                      <option value="Gujarati">Gujarati</option>
                      <option value="Bengali">Bengali</option>
                      <option value="Punjabi">Punjabi</option>
                      <option value="Urdu">Urdu</option>
                      <option value="Odia">Odia</option>
                      <option value="Assamese">Assamese</option>
                      <option value="Rajasthani">Rajasthani</option>
                      <option value="Bhojpuri">Bhojpuri</option>
                      <option value="Sanskrit">Sanskrit</option>
                      <option value="Konkani">Konkani</option>
                      <option value="Tulu">Tulu</option>
                      <option value="Kashmiri">Kashmiri</option>
                      <option value="Sindhi">Sindhi</option>
                      <option value="Other">Other</option>
                    </select>
                    {formData.personalInfo?.motherTongue === 'Other' && (
                      <input
                        type="text"
                        value={formData.personalInfo?.motherTongueCustom || ''}
                        onChange={(e) => {
                          handleFieldChange('personalInfo', 'motherTongueCustom', e.target.value);
                          handleFieldChange('personalInfo', 'motherTongue', e.target.value);
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md mt-2"
                        placeholder="Enter your mother tongue"
                      />
                    )}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    About Me
                  </label>
                  <textarea
                    value={formData.personalInfo?.about || ''}
                    onChange={(e) => handleFieldChange('personalInfo', 'about', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    rows="4"
                    placeholder="Tell us about yourself..."
                  />
                </div>
              </div>
            )}
          </div>

          {/* Family Information Section */}
          <div className="bg-white rounded-lg shadow">
            <SectionHeader title="Family Information" section="family" icon="👨‍👩‍👧‍👦" />
            {expandedSections.family && (
              <div className="p-6 space-y-4 border-t">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Father's Name
                    </label>
                    <input
                      type="text"
                      value={formData.familyInfo?.fatherName || ''}
                      onChange={(e) => handleFieldChange('familyInfo', 'fatherName', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Father's Occupation
                    </label>
                    <input
                      type="text"
                      value={formData.familyInfo?.fatherOccupation || ''}
                      onChange={(e) => handleFieldChange('familyInfo', 'fatherOccupation', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Mother's Name
                    </label>
                    <input
                      type="text"
                      value={formData.familyInfo?.motherName || ''}
                      onChange={(e) => handleFieldChange('familyInfo', 'motherName', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Mother's Occupation
                    </label>
                    <input
                      type="text"
                      value={formData.familyInfo?.motherOccupation || ''}
                      onChange={(e) => handleFieldChange('familyInfo', 'motherOccupation', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Siblings
                    </label>
                    <input
                      type="text"
                      value={formData.familyInfo?.siblings || ''}
                      onChange={(e) => handleFieldChange('familyInfo', 'siblings', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      placeholder="e.g., 1 Brother, 1 Sister"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Family Type
                    </label>
                    <select
                      value={formData.familyInfo?.familyType || ''}
                      onChange={(e) => handleFieldChange('familyInfo', 'familyType', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    >
                      <option value="">Select</option>
                      <option value="Joint">Joint</option>
                      <option value="Nuclear">Nuclear</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Family Status
                    </label>
                    <select
                      value={formData.familyInfo?.familyStatus || ''}
                      onChange={(e) => handleFieldChange('familyInfo', 'familyStatus', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    >
                      <option value="">Select</option>
                      <option value="Middle Class">Middle Class</option>
                      <option value="Upper Middle Class">Upper Middle Class</option>
                      <option value="Rich">Rich</option>
                      <option value="Affluent">Affluent</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Family Values
                  </label>
                  <textarea
                    value={formData.familyInfo?.familyValues || ''}
                    onChange={(e) => handleFieldChange('familyInfo', 'familyValues', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    rows="3"
                    placeholder="Describe your family values..."
                  />
                </div>
              </div>
            )}
          </div>

          {/* Education Section */}
          <div className="bg-white rounded-lg shadow">
            <SectionHeader title="Education" section="education" icon="🎓" />
            {expandedSections.education && (
              <div className="p-6 space-y-4 border-t">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Highest Education
                    </label>
                    <select
                      value={formData.education?.highestEducation || ''}
                      onChange={(e) => handleFieldChange('education', 'highestEducation', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    >
                      <option value="">Select</option>
                      <option value="School">School</option>
                      <option value="High School">High School</option>
                      <option value="Diploma">Diploma</option>
                      <option value="Bachelor's Degree">Bachelor's Degree</option>
                      <option value="Master's Degree">Master's Degree</option>
                      <option value="M.Phil">M.Phil</option>
                      <option value="Ph.D">Ph.D</option>
                      <option value="Professional Degree (CA, CS, ICWA)">Professional Degree (CA, CS, ICWA)</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      College/University
                    </label>
                    <input
                      type="text"
                      value={formData.education?.college || ''}
                      onChange={(e) => handleFieldChange('education', 'college', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Degree
                    </label>
                    <select
                      value={formData.education?.degree || ''}
                      onChange={(e) => handleFieldChange('education', 'degree', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    >
                      <option value="">Select</option>
                      <option value="B.Tech / B.E.">B.Tech / B.E.</option>
                      <option value="B.Sc">B.Sc</option>
                      <option value="B.Com">B.Com</option>
                      <option value="B.A">B.A</option>
                      <option value="BBA">BBA</option>
                      <option value="MBBS">MBBS</option>
                      <option value="BDS">BDS</option>
                      <option value="B.Pharm">B.Pharm</option>
                      <option value="M.Tech / M.E.">M.Tech / M.E.</option>
                      <option value="M.Sc">M.Sc</option>
                      <option value="M.Com">M.Com</option>
                      <option value="M.A">M.A</option>
                      <option value="MBA">MBA</option>
                      <option value="MD">MD</option>
                      <option value="MS">MS</option>
                      <option value="MDS">MDS</option>
                      <option value="CA">CA</option>
                      <option value="CS">CS</option>
                      <option value="ICWA">ICWA</option>
                      <option value="LLB">LLB</option>
                      <option value="LLM">LLM</option>
                      <option value="Ph.D">Ph.D</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Specialization
                    </label>
                    <input
                      type="text"
                      value={formData.education?.specialization || ''}
                      onChange={(e) => handleFieldChange('education', 'specialization', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      placeholder="e.g., Computer Science, Finance"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Career Section */}
          <div className="bg-white rounded-lg shadow">
            <SectionHeader title="Career" section="career" icon="💼" />
            {expandedSections.career && (
              <div className="p-6 space-y-4 border-t">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Occupation
                    </label>
                    <select
                      value={formData.career?.occupation || ''}
                      onChange={(e) => handleFieldChange('career', 'occupation', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    >
                      <option value="">Select</option>
                      <option value="Software Engineer">Software Engineer</option>
                      <option value="Doctor">Doctor</option>
                      <option value="Engineer">Engineer</option>
                      <option value="Teacher">Teacher</option>
                      <option value="Professor">Professor</option>
                      <option value="Business">Business</option>
                      <option value="CA / CS / ICWA">CA / CS / ICWA</option>
                      <option value="Lawyer">Lawyer</option>
                      <option value="Government Employee">Government Employee</option>
                      <option value="Banking Professional">Banking Professional</option>
                      <option value="Accountant">Accountant</option>
                      <option value="Architect">Architect</option>
                      <option value="Dentist">Dentist</option>
                      <option value="Pharmacist">Pharmacist</option>
                      <option value="Nurse">Nurse</option>
                      <option value="Pilot">Pilot</option>
                      <option value="Army / Navy / Air Force">Army / Navy / Air Force</option>
                      <option value="Police">Police</option>
                      <option value="Designer">Designer</option>
                      <option value="Artist">Artist</option>
                      <option value="Scientist">Scientist</option>
                      <option value="Research Scholar">Research Scholar</option>
                      <option value="Student">Student</option>
                      <option value="Homemaker">Homemaker</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Company/Organization
                    </label>
                    <input
                      type="text"
                      value={formData.career?.company || ''}
                      onChange={(e) => handleFieldChange('career', 'company', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Annual Income
                    </label>
                    <select
                      value={formData.career?.annualIncome || ''}
                      onChange={(e) => handleFieldChange('career', 'annualIncome', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    >
                      <option value="">Select</option>
                      <option value="Below ₹2,00,000">Below ₹2,00,000</option>
                      <option value="₹2,00,000 - ₹5,00,000">₹2,00,000 - ₹5,00,000</option>
                      <option value="₹5,00,000 - ₹10,00,000">₹5,00,000 - ₹10,00,000</option>
                      <option value="₹10,00,000 - ₹20,00,000">₹10,00,000 - ₹20,00,000</option>
                      <option value="₹20,00,000 - ₹50,00,000">₹20,00,000 - ₹50,00,000</option>
                      <option value="₹50,00,000 - ₹1,00,00,000">₹50,00,000 - ₹1,00,00,000</option>
                      <option value="Above ₹1,00,00,000">Above ₹1,00,00,000</option>
                      <option value="Not Disclosed">Not Disclosed</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Working Location
                    </label>
                    <input
                      type="text"
                      value={formData.career?.workingLocation || ''}
                      onChange={(e) => handleFieldChange('career', 'workingLocation', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      placeholder="City, State"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Location Section */}
          <div className="bg-white rounded-lg shadow">
            <SectionHeader title="Location" section="location" icon="📍" />
            {expandedSections.location && (
              <div className="p-6 space-y-4 border-t">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Country
                    </label>
                    <select
                      value={formData.location?.country || 'India'}
                      onChange={(e) => {
                        handleFieldChange('location', 'country', e.target.value);
                        // Clear state and city when country changes
                        if (e.target.value !== 'India') {
                          handleFieldChange('location', 'state', '');
                          handleFieldChange('location', 'city', '');
                        }
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    >
                      {countries.map((country) => (
                        <option key={country} value={country}>
                          {country}
                        </option>
                      ))}
                    </select>
                    {formData.location?.country === 'Other' && (
                      <input
                        type="text"
                        value={formData.location?.countryCustom || ''}
                        onChange={(e) => {
                          handleFieldChange('location', 'countryCustom', e.target.value);
                          handleFieldChange('location', 'country', e.target.value);
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md mt-2"
                        placeholder="Enter country name"
                      />
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      State <span className="text-red-500">*</span>
                    </label>
                    {formData.location?.country === 'India' || !formData.location?.country ? (
                      <select
                        value={formData.location?.state || ''}
                        onChange={(e) => {
                          handleFieldChange('location', 'state', e.target.value);
                          // Clear city when state changes
                          handleFieldChange('location', 'city', '');
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                        required
                      >
                        <option value="">Select State</option>
                        {indianStates.map((state) => (
                          <option key={state} value={state}>
                            {state}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <input
                        type="text"
                        value={formData.location?.state || ''}
                        onChange={(e) => handleFieldChange('location', 'state', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                        placeholder="Enter state"
                        required
                      />
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      City <span className="text-red-500">*</span>
                    </label>
                    {formData.location?.country === 'India' || !formData.location?.country ? (
                      formData.location?.state && stateCities[formData.location.state] ? (
                        <select
                          value={formData.location?.city || ''}
                          onChange={(e) => handleFieldChange('location', 'city', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md"
                          required
                        >
                          <option value="">Select City</option>
                          {stateCities[formData.location.state].map((city) => (
                            <option key={city} value={city}>
                              {city}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <input
                          type="text"
                          value={formData.location?.city || ''}
                          onChange={(e) => handleFieldChange('location', 'city', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md"
                          placeholder="Select state first"
                          required
                          disabled
                        />
                      )
                    ) : (
                      <input
                        type="text"
                        value={formData.location?.city || ''}
                        onChange={(e) => handleFieldChange('location', 'city', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                        placeholder="Enter city"
                        required
                      />
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Pincode
                    </label>
                    <input
                      type="text"
                      value={formData.location?.pincode || ''}
                      onChange={(e) => handleFieldChange('location', 'pincode', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      placeholder="Enter pincode"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Religion Section */}
          <div className="bg-white rounded-lg shadow">
            <SectionHeader title="Religion & Astrology" section="religion" icon="🕉️" />
            {expandedSections.religion && (
              <div className="p-6 space-y-4 border-t">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Religion <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={formData.religion?.religion || ''}
                      onChange={(e) => {
                        const religion = e.target.value;
                        handleFieldChange('religion', 'religion', religion);
                        // Clear caste and sub-caste when religion changes
                        handleFieldChange('religion', 'caste', '');
                        handleFieldChange('religion', 'subCaste', '');
                        // If "Other" is selected, show custom input
                        if (religion === 'Other') {
                          handleFieldChange('religion', 'religionCustom', '');
                        }
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      required
                    >
                      <option value="">Select Religion</option>
                      {religions.map((religion) => (
                        <option key={religion} value={religion}>
                          {religion}
                        </option>
                      ))}
                    </select>
                    {formData.religion?.religion === 'Other' && (
                      <input
                        type="text"
                        value={formData.religion?.religionCustom || ''}
                        onChange={(e) => {
                          handleFieldChange('religion', 'religionCustom', e.target.value);
                          handleFieldChange('religion', 'religion', e.target.value);
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md mt-2"
                        placeholder="Enter religion name"
                      />
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Caste <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={formData.religion?.caste || ''}
                      onChange={(e) => {
                        const caste = e.target.value;
                        handleFieldChange('religion', 'caste', caste);
                        // Clear sub-caste when caste changes
                        handleFieldChange('religion', 'subCaste', '');
                        // If "Other" is selected, show custom input
                        if (caste === 'Other') {
                          handleFieldChange('religion', 'casteCustom', '');
                        }
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      required
                    >
                      <option value="">Select Caste</option>
                      {casteCategories.map((caste) => (
                        <option key={caste} value={caste}>
                          {caste}
                        </option>
                      ))}
                    </select>
                    {formData.religion?.caste === 'Other' && (
                      <input
                        type="text"
                        value={formData.religion?.casteCustom || ''}
                        onChange={(e) => {
                          handleFieldChange('religion', 'casteCustom', e.target.value);
                          handleFieldChange('religion', 'caste', e.target.value);
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md mt-2"
                        placeholder="Enter caste name"
                      />
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Sub-Caste
                    </label>
                    {formData.religion?.caste && casteSubCastes[formData.religion.caste] ? (
                      <select
                        value={formData.religion?.subCaste || ''}
                        onChange={(e) => {
                          const subCaste = e.target.value;
                          handleFieldChange('religion', 'subCaste', subCaste);
                          // If "Other" is selected, show custom input
                          if (subCaste === 'Other') {
                            handleFieldChange('religion', 'subCasteCustom', '');
                          }
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      >
                        <option value="">Select Sub-Caste (Optional)</option>
                        {casteSubCastes[formData.religion.caste].map((subCaste) => (
                          <option key={subCaste} value={subCaste}>
                            {subCaste}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <input
                        type="text"
                        value={formData.religion?.subCaste || ''}
                        onChange={(e) => handleFieldChange('religion', 'subCaste', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                        placeholder={formData.religion?.caste ? "Enter sub-caste (optional)" : "Select caste first"}
                        disabled={!formData.religion?.caste}
                      />
                    )}
                    {formData.religion?.subCaste === 'Other' && (
                      <input
                        type="text"
                        value={formData.religion?.subCasteCustom || ''}
                        onChange={(e) => {
                          handleFieldChange('religion', 'subCasteCustom', e.target.value);
                          handleFieldChange('religion', 'subCaste', e.target.value);
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md mt-2"
                        placeholder="Enter sub-caste name"
                      />
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Gothra
                    </label>
                    <input
                      type="text"
                      value={formData.religion?.gothra || ''}
                      onChange={(e) => handleFieldChange('religion', 'gothra', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Star (Nakshatra)
                    </label>
                    <input
                      type="text"
                      value={formData.religion?.star || ''}
                      onChange={(e) => handleFieldChange('religion', 'star', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Raasi (Rashi)
                    </label>
                    <input
                      type="text"
                      value={formData.religion?.raasi || ''}
                      onChange={(e) => handleFieldChange('religion', 'raasi', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Lifestyle Section */}
          <div className="bg-white rounded-lg shadow">
            <SectionHeader title="Lifestyle" section="lifestyle" icon="🍽️" />
            {expandedSections.lifestyle && (
              <div className="p-6 space-y-4 border-t">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Eating Habits
                    </label>
                    <select
                      value={formData.personalInfo?.eatingHabits || ''}
                      onChange={(e) => handleFieldChange('personalInfo', 'eatingHabits', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    >
                      <option value="">Select</option>
                      <option value="Vegetarian">Vegetarian</option>
                      <option value="Non-Vegetarian">Non-Vegetarian</option>
                      <option value="Vegan">Vegan</option>
                      <option value="Eggetarian">Eggetarian</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Drinking Habits
                    </label>
                    <select
                      value={formData.personalInfo?.drinkingHabits || ''}
                      onChange={(e) => handleFieldChange('personalInfo', 'drinkingHabits', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    >
                      <option value="">Select</option>
                      <option value="Never">Never</option>
                      <option value="Occasionally">Occasionally</option>
                      <option value="Regularly">Regularly</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Smoking Habits
                    </label>
                    <select
                      value={formData.personalInfo?.smokingHabits || ''}
                      onChange={(e) => handleFieldChange('personalInfo', 'smokingHabits', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    >
                      <option value="">Select</option>
                      <option value="Never">Never</option>
                      <option value="Occasionally">Occasionally</option>
                      <option value="Regularly">Regularly</option>
                    </select>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Photos Section */}
          <div className="bg-white rounded-lg shadow">
            <SectionHeader title="Photos" section="photos" icon="📷" />
            {expandedSections.photos && (
              <div className="p-6 space-y-4 border-t">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Upload Photos
                  </label>
                  <input
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={handlePhotoUpload}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                  <p className="text-sm text-gray-500 mt-1">
                    Minimum 3 photos required. You can upload multiple photos. The first photo will be your primary photo.
                  </p>
                  {photos.length > 0 && photos.length < 3 && (
                    <p className="text-sm text-red-600 mt-1">
                      ⚠️ You need to upload at least 3 photos. Currently you have {photos.length} photo{photos.length !== 1 ? 's' : ''}.
                    </p>
                  )}
                </div>
                {photos.length > 0 && (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                    {photos.map((photo, index) => (
                      <div key={photo._id || index} className="relative group">
                        <img
                          src={getImageUrl(photo.url)}
                          alt={`Photo ${index + 1}`}
                          className="w-full h-32 object-cover rounded-lg"
                        />
                        {photo.isPrimary && (
                          <span className="absolute top-2 right-2 bg-primary-600 text-white text-xs px-2 py-1 rounded">
                            Primary
                          </span>
                        )}
                        <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 rounded-lg transition-all flex items-center justify-center opacity-0 group-hover:opacity-100">
                          <div className="flex space-x-2">
                            {!photo.isPrimary && (
                              <button
                                type="button"
                                onClick={async () => {
                                  try {
                                    const photoId = photo._id || photo.id;
                                    await setPrimaryPhoto(photoId);
                                    // Update local state immediately - set all to false first, then set selected one to true
                                    const updatedPhotos = photos.map(p => ({
                                      ...p,
                                      isPrimary: (p._id || p.id) === photoId
                                    }));
                                    setPhotos(updatedPhotos);
                                    setFormData(prev => ({ ...prev, photos: updatedPhotos }));
                                    toast.success('Primary photo updated!');
                                    // Refetch to ensure sync with server
                                    await refetch();
                                  } catch (error) {
                                    toast.error('Failed to set primary photo');
                                  }
                                }}
                                className="px-3 py-1 bg-primary-600 text-white text-xs rounded hover:bg-primary-700"
                              >
                                Set Primary
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={async () => {
                                // Prevent deletion if it would result in less than 3 photos
                                if (photos.length <= 3) {
                                  toast.error('Minimum 3 photos required. Cannot delete this photo.');
                                  return;
                                }
                                if (window.confirm('Are you sure you want to delete this photo?')) {
                                  try {
                                    const photoId = photo._id || photo.id;
                                    await deletePhoto(photoId);
                                    // Update local state immediately
                                    const updatedPhotos = photos.filter(p => (p._id || p.id) !== photoId);
                                    setPhotos(updatedPhotos);
                                    setFormData(prev => ({ ...prev, photos: updatedPhotos }));
                                    toast.success('Photo deleted!');
                                    // Refetch to ensure sync with server
                                    await refetch();
                                  } catch (error) {
                                    toast.error('Failed to delete photo');
                                  }
                                }
                              }}
                              className="px-3 py-1 bg-red-600 text-white text-xs rounded hover:bg-red-700"
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col space-y-4 bg-white p-4 rounded-lg shadow">
            {/* Show missing fields message */}
            {!isFormReadyToSubmit() && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3 text-sm">
                <p className="text-yellow-800 font-medium mb-1">Please complete the following to submit:</p>
                <ul className="list-disc list-inside text-yellow-700 space-y-1">
                  {(!formData.personalInfo?.firstName || formData.personalInfo?.firstName?.trim() === '') && (
                    <li>First Name</li>
                  )}
                  {(!formData.personalInfo?.lastName || formData.personalInfo?.lastName?.trim() === '') && (
                    <li>Last Name</li>
                  )}
                  {!formData.personalInfo?.dateOfBirth && (
                    <li>Date of Birth</li>
                  )}
                  {(!formData.location?.city || formData.location?.city?.trim() === '') && (
                    <li>City</li>
                  )}
                  {(!formData.location?.state || formData.location?.state?.trim() === '') && (
                    <li>State</li>
                  )}
                  {(!formData.religion?.religion || formData.religion?.religion?.trim() === '') && (
                    <li>Religion</li>
                  )}
                  {(!formData.religion?.caste || formData.religion?.caste?.trim() === '') && (
                    <li>Caste</li>
                  )}
                  {photos.length < 3 && (
                    <li>Photos (need {3 - photos.length} more - minimum 3 required)</li>
                  )}
                </ul>
              </div>
            )}
            <div className="flex space-x-4">
              <button
                type="submit"
                disabled={saving || !isFormReadyToSubmit()}
                className="px-6 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? 'Submitting...' : 'Submit Profile'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setEditing(false);
                  if (data?.profile) {
                    setFormData(data.profile);
                  } else {
                    setFormData({});
                  }
                }}
                className="px-6 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
              >
                Cancel
              </button>
            </div>
          </div>
        </form>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="p-6">
            <div className="flex items-start space-x-6">
              {primaryPhoto?.url ? (
                <img
                  src={getImageUrl(primaryPhoto.url)}
                  alt={profile.personalInfo?.firstName}
                  className="w-32 h-32 object-cover rounded-lg"
                />
              ) : (
                <div className="w-32 h-32 bg-gray-200 rounded-lg flex items-center justify-center">
                  No Photo
                </div>
              )}
              <div>
                <h2 className="text-2xl font-bold">
                  {profile.personalInfo?.firstName} {profile.personalInfo?.lastName}
                </h2>
                <p className="text-gray-600">
                  {profile.personalInfo?.age} years • {profile.location?.city}, {profile.location?.state}
                </p>
              </div>
            </div>
            <div className="mt-6">
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-gray-600">Profile Visibility:</span>
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                    profile.isVisible !== false
                      ? 'bg-green-100 text-green-800'
                      : 'bg-gray-100 text-gray-800'
                  }`}>
                    {profile.isVisible !== false ? 'Visible in Search' : 'Hidden from Search'}
                  </span>
                </div>
                <button
                  onClick={async () => {
                    try {
                      const newVisibility = !(profile.isVisible !== false);
                      await updateProfile(profile._id, { isVisible: newVisibility });
                      toast.success(`Profile ${newVisibility ? 'shown' : 'hidden'} in search`);
                      refetch();
                    } catch (error) {
                      toast.error(error.response?.data?.message || 'Failed to update visibility');
                    }
                  }}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    profile.isVisible !== false
                      ? 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                      : 'bg-green-600 text-white hover:bg-green-700'
                  }`}
                >
                  {profile.isVisible !== false ? 'Hide from Search' : 'Show in Search'}
                </button>
              </div>
              {/* Verification Status and Rejection Reason */}
              <div className="mt-4 mb-4">
                <div className="flex items-center space-x-2 mb-2">
                  <span className="text-sm text-gray-600">Verification Status:</span>
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                    profile.verificationStatus === 'approved'
                      ? 'bg-green-100 text-green-800'
                      : profile.verificationStatus === 'rejected'
                      ? 'bg-red-100 text-red-800'
                      : 'bg-yellow-100 text-yellow-800'
                  }`}>
                    {profile.verificationStatus === 'approved' ? '✓ Verified' : profile.verificationStatus === 'rejected' ? '✗ Rejected' : '⏳ Pending'}
                  </span>
                </div>
                {profile.verificationStatus === 'rejected' && profile.rejectionReason && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                    <p className="text-sm font-semibold text-red-800 mb-1">Rejection Reason:</p>
                    <p className="text-sm text-red-700 mb-3">{profile.rejectionReason}</p>
                    <button
                      onClick={async () => {
                        try {
                          await updateProfile(profile._id, { verificationStatus: 'pending', rejectionReason: undefined });
                          toast.success('Verification re-applied successfully!');
                          refetch();
                        } catch (error) {
                          toast.error(error.response?.data?.message || 'Failed to re-apply verification');
                        }
                      }}
                      className="px-4 py-2 bg-red-600 text-white text-sm rounded-md hover:bg-red-700"
                    >
                      Re-apply for Verification
                    </button>
                  </div>
                )}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p><strong>Education:</strong> {profile.education?.highestEducation || 'N/A'}</p>
                  <p><strong>Occupation:</strong> {profile.career?.occupation || 'N/A'}</p>
                  <p><strong>Religion:</strong> {profile.religion?.religion || 'N/A'}</p>
                  <p><strong>Caste:</strong> {profile.religion?.caste || 'N/A'}</p>
                </div>
                <div>
                  <p><strong>Marital Status:</strong> {profile.personalInfo?.maritalStatus || 'N/A'}</p>
                  <p><strong>Eating Habits:</strong> {profile.personalInfo?.eatingHabits || 'N/A'}</p>
                  <p><strong>Family Type:</strong> {profile.familyInfo?.familyType || 'N/A'}</p>
                  <p><strong>Family Status:</strong> {profile.familyInfo?.familyStatus || 'N/A'}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Profile;
