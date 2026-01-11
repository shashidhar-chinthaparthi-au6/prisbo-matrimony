import api from './api';

export const getPlans = async () => {
  const response = await api.get('/subscriptions/plans');
  return response.data;
};

export const getCurrentSubscription = async () => {
  try {
    const response = await api.get('/subscriptions/current');
    return response.data;
  } catch (error) {
    // If endpoint doesn't exist or user has no subscription, return default
    if (error.response?.status === 404 || error.response?.status === 401) {
      return {
        success: true,
        hasActiveSubscription: false,
        subscription: null,
      };
    }
    throw error;
  }
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

export const toggleAutoRenew = async (autoRenew) => {
  const response = await api.put('/subscriptions/auto-renew', { autoRenew });
  return response.data;
};

export const retryPayment = async (subscriptionId, data) => {
  const response = await api.post(`/subscriptions/${subscriptionId}/retry-payment`, data);
  return response.data;
};

export const downgradeSubscription = async (data) => {
  const response = await api.post('/subscriptions/downgrade', data);
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
  const url = window.URL.createObjectURL(new Blob([response.data]));
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', `payment-history-${new Date().toISOString().split('T')[0]}.csv`);
  document.body.appendChild(link);
  link.click();
  link.remove();
  return response.data;
};

