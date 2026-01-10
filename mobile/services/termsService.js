import api from './api';

export const getCurrentTerms = async () => {
  const response = await api.get('/terms/current');
  return response.data;
};

export const acceptTerms = async (version) => {
  const response = await api.post('/terms/accept', { version });
  return response.data;
};

