import api from './api';

// Get all support chats
export const getSupportChats = async () => {
  const response = await api.get('/chats/support');
  return response.data;
};

// Get or create support chat with vendor (for superadmin)
export const getOrCreateVendorChat = async (vendorId) => {
  const response = await api.get(`/chats/support/superadmin-vendor/${vendorId}`);
  return response.data;
};

// Get or create support chat with user (for superadmin)
export const getOrCreateUserChat = async (userId) => {
  const response = await api.get(`/chats/support/superadmin-user/${userId}`);
  return response.data;
};

// Get or create support chat with superadmin (for vendor)
export const getOrCreateSuperAdminChat = async () => {
  const response = await api.post('/chats/support/superadmin-vendor');
  return response.data;
};

// Get or create support chat with user (for vendor)
export const getOrCreateVendorUserChat = async (userId) => {
  const response = await api.get(`/chats/support/vendor-user/${userId}`);
  return response.data;
};

