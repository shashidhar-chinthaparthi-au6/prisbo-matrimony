import api from './api';

export const getNotifications = async (params = {}) => {
  const queryParams = new URLSearchParams(params).toString();
  const response = await api.get(`/notifications${queryParams ? `?${queryParams}` : ''}`);
  return response.data;
};

export const markAsRead = async (id) => {
  const response = await api.put(`/notifications/${id}/read`);
  return response.data;
};

export const markAllAsRead = async () => {
  const response = await api.put('/notifications/read-all');
  return response.data;
};

export const deleteNotification = async (id) => {
  const response = await api.delete(`/notifications/${id}`);
  return response.data;
};

export const deleteAllNotifications = async () => {
  const response = await api.delete('/notifications/delete-all');
  return response.data;
};

export const getNotificationPreferences = async () => {
  const response = await api.get('/notifications/preferences');
  return response.data;
};

export const updateNotificationPreferences = async (preferences) => {
  const response = await api.put('/notifications/preferences', { preferences });
  return response.data;
};

