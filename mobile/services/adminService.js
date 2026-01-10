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

// Subscription Management
export const getAllSubscriptions = async (params) => {
  const response = await api.get('/admin/subscriptions', { params });
  return response.data;
};

export const getPendingSubscriptions = async () => {
  const response = await api.get('/admin/subscriptions/pending');
  return response.data;
};

export const approveSubscription = async (id, data) => {
  const response = await api.put(`/admin/subscriptions/${id}/approve`, data);
  return response.data;
};

export const rejectSubscription = async (id, data) => {
  const response = await api.put(`/admin/subscriptions/${id}/reject`, data);
  return response.data;
};

export const cancelSubscription = async (id) => {
  const response = await api.put(`/admin/subscriptions/${id}/cancel`);
  return response.data;
};

export const reactivateSubscription = async (id) => {
  const response = await api.put(`/admin/subscriptions/${id}/reactivate`);
  return response.data;
};

export const getSubscriptionStats = async () => {
  const response = await api.get('/admin/subscriptions/stats');
  return response.data;
};

// Profile Verification
export const getPendingProfiles = async (params) => {
  const response = await api.get('/admin/profiles/pending', { params });
  return response.data;
};

export const getProfileById = async (id) => {
  const response = await api.get(`/admin/profiles/${id}`);
  return response.data;
};

export const approveProfile = async (id) => {
  const response = await api.put(`/admin/profiles/${id}/approve`);
  return response.data;
};

export const rejectProfile = async (id, rejectionReason) => {
  const response = await api.put(`/admin/profiles/${id}/reject`, { rejectionReason });
  return response.data;
};

export const updateProfileField = async (id, field, value, section) => {
  const response = await api.put(`/admin/profiles/${id}/update`, { field, value, section });
  return response.data;
};

export const deleteProfilePhoto = async (profileId, photoId) => {
  const response = await api.delete(`/admin/profiles/${profileId}/photos/${photoId}`);
  return response.data;
};

export const getVerificationStats = async () => {
  const response = await api.get('/admin/profiles/verification-stats');
  return response.data;
};

export const bulkDeleteProfiles = async (profileIds) => {
  const response = await api.delete('/admin/profiles/bulk-delete', { data: { profileIds } });
  return response.data;
};

export const getDeletedProfiles = async (params) => {
  const response = await api.get('/admin/profiles/deleted', { params });
  return response.data;
};

export const restoreProfile = async (id) => {
  const response = await api.put(`/admin/profiles/${id}/restore`);
  return response.data;
};

export const bulkRestoreProfiles = async (profileIds) => {
  const response = await api.put('/admin/profiles/bulk-restore', { profileIds });
  return response.data;
};

export const getVendors = async (params) => {
  const response = await api.get('/admin/vendors', { params });
  return response.data;
};

export const createVendor = async (data) => {
  const response = await api.post('/admin/vendors', data);
  return response.data;
};

export const updateVendor = async (id, data) => {
  const response = await api.put(`/admin/vendors/${id}`, data);
  return response.data;
};

