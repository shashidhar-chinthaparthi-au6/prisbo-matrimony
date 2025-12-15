import api from './api';

export const getChats = async () => {
  const response = await api.get('/chats');
  return response.data;
};

export const getOrCreateChat = async (userId) => {
  const response = await api.post('/chats', { userId });
  return response.data;
};

export const getMessages = async (chatId) => {
  const response = await api.get(`/chats/${chatId}/messages`);
  return response.data;
};

export const sendMessage = async (chatId, data) => {
  const formData = new FormData();
  formData.append('content', data.content || '');
  if (data.image) {
    formData.append('photo', data.image);
  }
  const response = await api.post(`/chats/${chatId}/messages`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return response.data;
};

