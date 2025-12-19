import api from './api';

export const getPlans = async () => {
  const response = await api.get('/subscriptions/plans');
  return response.data;
};

export const getCurrentSubscription = async () => {
  const response = await api.get('/subscriptions/current');
  return response.data;
};

export const getSubscriptionHistory = async () => {
  const response = await api.get('/subscriptions/history');
  return response.data;
};

export const subscribe = async (data) => {
  const response = await api.post('/subscriptions/subscribe', data);
  return response.data;
};

export const upgradeSubscription = async (data) => {
  const response = await api.post('/subscriptions/upgrade', data);
  return response.data;
};

export const uploadPaymentProof = async (subscriptionId, file) => {
  const formData = new FormData();
  formData.append('photo', file);
  formData.append('subscriptionId', subscriptionId);
  
  const response = await api.post('/subscriptions/upload-proof', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return response.data;
};

export const getInvoice = async (subscriptionId) => {
  const response = await api.get(`/subscriptions/${subscriptionId}/invoice`);
  return response.data;
};

