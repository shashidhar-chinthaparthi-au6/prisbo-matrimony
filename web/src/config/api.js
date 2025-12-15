const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
const BASE_URL = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000';

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

