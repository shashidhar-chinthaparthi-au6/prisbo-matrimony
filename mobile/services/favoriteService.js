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

