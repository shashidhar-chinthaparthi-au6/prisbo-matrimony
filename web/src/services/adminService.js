import api from './api';

export const getAllUsers = async (params) => {
  const response = await api.get('/admin/users', { params });
  return response.data;
};

export const getAllProfiles = async (params) => {
  const response = await api.get('/admin/profiles', { params });
  return response.data;
};

export const updateProfileStatus = async (id, data) => {
  const response = await api.put(`/admin/profiles/${id}/status`, data);
  return response.data;
};

export const blockUser = async (id, data) => {
  const response = await api.put(`/admin/users/${id}/block`, data);
  return response.data;
};

export const getStats = async () => {
  const response = await api.get('/admin/stats');
  return response.data;
};

