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
  formData.append('photo', {
    uri: file.uri,
    type: file.type || 'image/jpeg',
    name: file.name || 'payment-proof.jpg',
  });
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

export const pauseSubscription = async () => {
  const response = await api.post('/subscriptions/pause');
  return response.data;
};

export const resumeSubscription = async () => {
  const response = await api.post('/subscriptions/resume');
  return response.data;
};

export const exportPaymentHistory = async () => {
  const response = await api.get('/subscriptions/history/export', {
    responseType: 'blob',
  });
  // For mobile, we'll show the data in an alert or copy to clipboard
  // In a real app, you might want to use a library like react-native-fs to save the file
  return response.data;
};

