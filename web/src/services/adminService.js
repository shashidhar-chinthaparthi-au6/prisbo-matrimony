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

export const getSubscriptionById = async (id) => {
  const response = await api.get(`/admin/subscriptions/${id}`);
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

export const getAllPlans = async () => {
  const response = await api.get('/admin/subscription-plans');
  return response.data;
};

export const createPlan = async (data) => {
  const response = await api.post('/admin/subscription-plans', data);
  return response.data;
};

export const updatePlan = async (id, data) => {
  const response = await api.put(`/admin/subscription-plans/${id}`, data);
  return response.data;
};

export const deletePlan = async (id) => {
  const response = await api.delete(`/admin/subscription-plans/${id}`);
  return response.data;
};

