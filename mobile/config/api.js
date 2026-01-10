import { Platform } from 'react-native';

// Production API URL
const PRODUCTION_API_URL = 'https://prisbo-matrimony.vercel.app/api';

// Determine the correct API URL based on environment and platform
const getApiBaseUrl = () => {
  // If explicitly set in environment variable, use that
  if (process.env.EXPO_PUBLIC_API_URL) {
    return process.env.EXPO_PUBLIC_API_URL;
  }

  // Use production API by default
  return PRODUCTION_API_URL;
};

const API_BASE_URL = getApiBaseUrl();
const BASE_URL = API_BASE_URL.replace('/api', '');

export default API_BASE_URL;
export const getImageUrl = (url) => {
  if (!url) return '';
  // If already a full URL, return as is
  if (url.startsWith('http')) return url;
  // If starts with /uploads, prepend base URL
  if (url.startsWith('/uploads')) return `${BASE_URL}${url}`;
  // Otherwise return as is
  return url;
};

