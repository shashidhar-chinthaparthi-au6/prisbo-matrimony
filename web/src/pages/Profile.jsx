import { useState, useEffect } from 'react';
import { useQuery } from 'react-query';
import { useSearchParams } from 'react-router-dom';
import { getMyProfile, createProfile, updateProfile, uploadPhotos } from '../services/profileService';
import { useAuth } from '../context/AuthContext';
import { getImageUrl } from '../config/api';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';

const Profile = () => {
  const [searchParams] = useSearchParams();
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState({});
  const [photos, setPhotos] = useState([]);
  const { user } = useAuth();

  const { data, isLoading, refetch } = useQuery('myProfile', getMyProfile);

  // Auto-open create form if coming from search page
  useEffect(() => {
    const createParam = searchParams.get('create');
    if (createParam === 'true' && !data?.profile && !editing) {
      const profileType = user?.profileType || 'bride';
      setEditing(true);
      setFormData({
        type: profileType,
        personalInfo: {},
        location: {},
        education: {},
        career: {},
      });
      // Remove query param from URL
      window.history.replaceState({}, '', '/profile');
    }
  }, [searchParams, data, editing, user]);

  useEffect(() => {
    if (data?.profile) {
      setFormData(data.profile);
      setPhotos(data.profile.photos || []);
    }
  }, [data]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (data?.profile) {
        await updateProfile(data.profile._id, formData);
        toast.success('Profile updated successfully!');
      } else {
        await createProfile(formData);
        toast.success('Profile created successfully!');
      }
      setEditing(false);
      refetch();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to save profile');
    }
  };

  const handlePhotoUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;
    
    try {
      // If no profile exists, create it first with minimal data
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
      
      const response = await uploadPhotos(files);
      toast.success('Photos uploaded successfully!');
      refetch();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to upload photos');
    }
  };

  if (isLoading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
      </div>
    );
  }

  if (!data?.profile && !editing) {
    // Get type from user data (from API)
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
                type: profileType || user?.profileType || 'bride', // Use type from user data (API)
                personalInfo: {},
                location: {},
                education: {},
                career: {},
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

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">My Profile</h1>
        {!editing && (
          <button
            onClick={() => setEditing(true)}
            className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700"
          >
            Edit Profile
          </button>
        )}
      </div>

      {editing ? (
        <form onSubmit={handleSubmit} className="bg-white p-6 rounded-lg shadow space-y-6">
          {!data?.profile && user?.profileType && (
            <div>
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
              <input type="hidden" value={user.profileType} />
            </div>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                First Name *
              </label>
              <input
                type="text"
                value={formData.personalInfo?.firstName || ''}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    personalInfo: {
                      ...formData.personalInfo,
                      firstName: e.target.value,
                    },
                  })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Last Name *
              </label>
              <input
                type="text"
                value={formData.personalInfo?.lastName || ''}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    personalInfo: {
                      ...formData.personalInfo,
                      lastName: e.target.value,
                    },
                  })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Date of Birth *
              </label>
              <input
                type="date"
                value={formData.personalInfo?.dateOfBirth ? new Date(formData.personalInfo.dateOfBirth).toISOString().split('T')[0] : ''}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    personalInfo: {
                      ...formData.personalInfo,
                      dateOfBirth: e.target.value,
                    },
                  })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Height
              </label>
              <input
                type="text"
                value={formData.personalInfo?.height || ''}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    personalInfo: {
                      ...formData.personalInfo,
                      height: e.target.value,
                    },
                  })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                placeholder="e.g., 5'6&quot;"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                City *
              </label>
              <input
                type="text"
                value={formData.location?.city || ''}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    location: {
                      ...formData.location,
                      city: e.target.value,
                    },
                  })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                State *
              </label>
              <input
                type="text"
                value={formData.location?.state || ''}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    location: {
                      ...formData.location,
                      state: e.target.value,
                    },
                  })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Education
              </label>
              <input
                type="text"
                value={formData.education?.highestEducation || ''}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    education: {
                      ...formData.education,
                      highestEducation: e.target.value,
                    },
                  })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Occupation
              </label>
              <input
                type="text"
                value={formData.career?.occupation || ''}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    career: {
                      ...formData.career,
                      occupation: e.target.value,
                    },
                  })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              About
            </label>
            <textarea
              value={formData.personalInfo?.about || ''}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  personalInfo: {
                    ...formData.personalInfo,
                    about: e.target.value,
                  },
                })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              rows="4"
            />
          </div>

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
          </div>

          <div className="flex space-x-4">
            <button
              type="submit"
              className="px-6 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700"
            >
              Save Profile
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
        </form>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="p-6">
            <div className="flex items-start space-x-6">
              {profile.photos?.[0]?.url ? (
                <img
                  src={getImageUrl(profile.photos[0].url)}
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
            <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p><strong>Education:</strong> {profile.education?.highestEducation || 'N/A'}</p>
                <p><strong>Occupation:</strong> {profile.career?.occupation || 'N/A'}</p>
              </div>
              <div>
                <p><strong>Religion:</strong> {profile.religion?.religion || 'N/A'}</p>
                <p><strong>Caste:</strong> {profile.religion?.caste || 'N/A'}</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Profile;

