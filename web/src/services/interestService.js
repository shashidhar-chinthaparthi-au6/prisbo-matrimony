import api from './api';

export const sendInterest = async (data) => {
  const response = await api.post('/interests', data);
  return response.data;
};

export const acceptInterest = async (id) => {
  const response = await api.put(`/interests/${id}/accept`);
  return response.data;
};

export const rejectInterest = async (id) => {
  const response = await api.put(`/interests/${id}/reject`);
  return response.data;
};

export const getSentInterests = async () => {
  const response = await api.get('/interests/sent');
  return response.data;
};

export const getReceivedInterests = async () => {
  const response = await api.get('/interests/received');
  return response.data;
};

export const getMutualMatches = async () => {
  const response = await api.get('/interests/matches');
  return response.data;
};

export const withdrawInterest = async (id) => {
  const response = await api.delete(`/interests/${id}`);
  return response.data;
};

export const bulkAcceptInterests = async (interestIds) => {
  const response = await api.post('/interests/bulk-accept', { interestIds });
  return response.data;
};

export const bulkRejectInterests = async (interestIds) => {
  const response = await api.post('/interests/bulk-reject', { interestIds });
  return response.data;
};

export const getInterestHistory = async (userId) => {
  const response = await api.get(`/interests/history/${userId}`);
  return response.data;
};

