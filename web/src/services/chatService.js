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
  if (data.audio) {
    formData.append('photo', data.audio); // Using same field name for all file types
  }
  if (data.video) {
    formData.append('photo', data.video);
  }
  if (data.file) {
    formData.append('photo', data.file);
  }
  const response = await api.post(`/chats/${chatId}/messages`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return response.data;
};

export const setTyping = async (chatId) => {
  const response = await api.post(`/chats/${chatId}/typing`);
  return response.data;
};

export const getTyping = async (chatId) => {
  const response = await api.get(`/chats/${chatId}/typing`);
  return response.data;
};

export const blockUser = async (userId) => {
  const response = await api.post(`/chats/block/${userId}`);
  return response.data;
};

export const unblockUser = async (userId) => {
  const response = await api.post(`/chats/unblock/${userId}`);
  return response.data;
};

export const getBlockedUsers = async () => {
  const response = await api.get('/chats/blocked');
  return response.data;
};

export const getMediaGallery = async (chatId) => {
  const response = await api.get(`/chats/${chatId}/media`);
  return response.data;
};

export const addReaction = async (chatId, messageId, emoji) => {
  const response = await api.post(`/chats/${chatId}/messages/${messageId}/reactions`, { emoji });
  return response.data;
};

export const removeReaction = async (chatId, messageId, emoji) => {
  const response = await api.delete(`/chats/${chatId}/messages/${messageId}/reactions`, { data: { emoji } });
  return response.data;
};

export const deleteMessage = async (chatId, messageId) => {
  const response = await api.delete(`/chats/${chatId}/messages/${messageId}`);
  return response.data;
};

