import api from './api';

export const searchProfiles = async (params) => {
  const response = await api.get('/search', { params });
  return response.data;
};

