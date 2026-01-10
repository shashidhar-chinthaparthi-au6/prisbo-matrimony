import api from './api';

export const addFavorite = async (profileId) => {
  const response = await api.post('/favorites', { profileId });
  return response.data;
};

export const removeFavorite = async (profileId) => {
  const response = await api.delete(`/favorites/${profileId}`);
  return response.data;
};

export const getFavorites = async () => {
  const response = await api.get('/favorites');
  return response.data;
};

export const updateFavorite = async (profileId, data) => {
  const response = await api.put(`/favorites/${profileId}`, data);
  return response.data;
};

export const exportFavorites = async (format = 'json') => {
  const response = await api.get(`/favorites/export?format=${format}`, {
    responseType: format === 'csv' ? 'blob' : 'json',
  });
  return response.data;
};

