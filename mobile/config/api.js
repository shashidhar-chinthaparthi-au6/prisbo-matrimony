import { Platform } from 'react-native';

// Determine the correct API URL based on environment and platform
const getApiBaseUrl = () => {
  // If explicitly set in environment variable, use that
  if (process.env.EXPO_PUBLIC_API_URL) {
    return process.env.EXPO_PUBLIC_API_URL;
  }

  // For Android emulator, use 10.0.2.2 to access host machine's localhost
  if (Platform.OS === 'android') {
    return 'http://10.0.2.2:5000/api';
  }

  // For iOS simulator and web, localhost works
  return 'http://localhost:5000/api';
};

// For physical devices, you need to use your computer's local IP address
// Example: 'http://192.168.1.100:5000/api'
// To find your IP: 
// - Mac/Linux: run `ifconfig | grep "inet " | grep -v 127.0.0.1`
// - Windows: run `ipconfig` and look for IPv4 Address
// Then set EXPO_PUBLIC_API_URL in your .env file or app.json

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

