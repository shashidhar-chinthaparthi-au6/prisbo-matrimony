import api from './api';

export const createProfileForPerson = async (data) => {
  const response = await api.post('/vendor/profiles', data);
  return response.data;
};

export const getMyProfiles = async (params) => {
  const response = await api.get('/vendor/profiles', { params });
  return response.data;
};

export const getMyProfileById = async (id) => {
  const response = await api.get(`/vendor/profiles/${id}`);
  return response.data;
};

export const updateMyProfile = async (id, data) => {
  const response = await api.put(`/vendor/profiles/${id}`, data);
  return response.data;
};

export const deleteMyProfile = async (id) => {
  const response = await api.delete(`/vendor/profiles/${id}`);
  return response.data;
};

export const getMyStats = async () => {
  const response = await api.get('/vendor/stats');
  return response.data;
};

