/**
 * API Configuration Module
 * Dynamically resolves the backend API URL.
 * Priority order:
 * 1. User runtime override in localStorage ('jeevan_api_base')
 * 2. VITE_API_BASE_URL (Netlify/Vite environment variable)
 * 3. Default fallback: http://localhost:8000
 */
export const getApiBase = () => {
  if (typeof window !== 'undefined') {
    const custom = localStorage.getItem('jeevan_api_base');
    if (custom && custom.trim()) {
      return custom.trim().replace(/\/$/, '');
    }
  }
  const envUrl = import.meta.env.VITE_API_BASE_URL;
  if (envUrl && envUrl.trim()) {
    return envUrl.trim().replace(/\/$/, '');
  }
  return 'http://localhost:8000';
};

export const setCustomApiBase = (url) => {
  if (typeof window !== 'undefined') {
    if (!url || !url.trim()) {
      localStorage.removeItem('jeevan_api_base');
    } else {
      localStorage.setItem('jeevan_api_base', url.trim().replace(/\/$/, ''));
    }
  }
};

export const API_BASE = getApiBase();

export default API_BASE;
