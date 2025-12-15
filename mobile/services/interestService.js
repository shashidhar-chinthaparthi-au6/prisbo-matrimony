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

