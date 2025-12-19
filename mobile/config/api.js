const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'https://backend-ashy-eight-14.vercel.app/api';
const BASE_URL = process.env.EXPO_PUBLIC_API_URL?.replace('/api', '') || 'https://backend-ashy-eight-14.vercel.app';

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

