import api from './api';

export const register = async (data) => {
  const response = await api.post('/auth/register', data);
  return response.data;
};

export const verifyVendor = async (mobile) => {
  const response = await api.post('/auth/verify-vendor', { mobile });
  return response.data;
};

export const login = async (data) => {
  const response = await api.post('/auth/login', data);
  return response.data;
};

export const getMe = async () => {
  const response = await api.get('/auth/me');
  return response.data;
};

export const forgotPassword = async (data) => {
  const response = await api.post('/auth/forgotpassword', data);
  return response.data;
};

export const resetPassword = async (token, data) => {
  const response = await api.put(`/auth/resetpassword/${token}`, data);
  return response.data;
};

export const deactivateAccount = async (reason) => {
  const response = await api.put('/auth/deactivate', { reason });
  return response.data;
};

export const reactivateAccount = async () => {
  const response = await api.put('/auth/reactivate');
  return response.data;
};

export const deleteAccount = async (password, exportData = false) => {
  const response = await api.delete('/auth/delete', { data: { password, exportData } });
  return response.data;
};

export const updateContact = async (data) => {
  const response = await api.put('/auth/update-contact', data);
  return response.data;
};

export const updatePrivacySettings = async (privacySettings) => {
  const response = await api.put('/auth/privacy', { privacySettings });
  return response.data;
};

export const downloadUserData = async () => {
  const response = await api.get('/auth/download-data');
  return response.data;
};

