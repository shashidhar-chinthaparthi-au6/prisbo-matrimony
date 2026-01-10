import api from './api';

export const createProfile = async (data) => {
  const response = await api.post('/profiles', data);
  return response.data;
};

export const updateProfile = async (id, data) => {
  const response = await api.put(`/profiles/${id}`, data);
  return response.data;
};

export const getMyProfile = async () => {
  const response = await api.get('/profiles/me');
  return response.data;
};

export const getProfileById = async (id) => {
  const response = await api.get(`/profiles/${id}`);
  return response.data;
};

export const uploadPhotos = async (files) => {
  const formData = new FormData();
  files.forEach((file) => {
    formData.append('photos', file);
  });
  const response = await api.post('/profiles/photos', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return response.data;
};

export const deletePhoto = async (photoId) => {
  const response = await api.delete(`/profiles/photos/${photoId}`);
  return response.data;
};

export const setPrimaryPhoto = async (photoId) => {
  const response = await api.put(`/profiles/photos/${photoId}/primary`);
  return response.data;
};

export const reorderPhotos = async (photoIds) => {
  const response = await api.put('/profiles/photos/reorder', { photoIds });
  return response.data;
};

export const deleteProfile = async (profileId) => {
  const response = await api.delete(`/profiles/${profileId}`);
  return response.data;
};

