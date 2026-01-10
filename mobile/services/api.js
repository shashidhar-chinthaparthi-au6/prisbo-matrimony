import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import API_BASE_URL from '../config/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests
api.interceptors.request.use(
  async (config) => {
    const token = await AsyncStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Retry configuration
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1 second

// Retry function
const retryRequest = async (config, retryCount = 0) => {
  if (retryCount >= MAX_RETRIES) {
    throw new Error('Max retries exceeded');
  }
  
  await new Promise(resolve => setTimeout(resolve, RETRY_DELAY * (retryCount + 1)));
  return api.request(config);
};

// Handle response errors
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Handle 401 Unauthorized
    if (error.response?.status === 401) {
      await AsyncStorage.removeItem('token');
      await AsyncStorage.removeItem('user');
    }

    // Handle network errors and 5xx errors with retry
    if (
      (!error.response || (error.response.status >= 500 && error.response.status < 600)) &&
      !originalRequest._retry &&
      originalRequest.method !== 'get' // Only retry non-GET requests
    ) {
      originalRequest._retry = true;
      const retryCount = originalRequest._retryCount || 0;
      
      if (retryCount < MAX_RETRIES) {
        originalRequest._retryCount = retryCount + 1;
        try {
          return await retryRequest(originalRequest, retryCount);
        } catch (retryError) {
          // If retry fails, throw original error
          return Promise.reject(error);
        }
      }
    }

    // Handle timeout errors
    if (error.code === 'ECONNABORTED' || error.message === 'Network Error') {
      error.message = 'Network timeout. Please check your connection and try again.';
    }

    return Promise.reject(error);
  }
);

export default api;

