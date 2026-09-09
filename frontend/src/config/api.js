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
    try {
      // Check query parameter override: ?api=... or ?backend=... or ?server=...
      const search = window.location?.search || '';
      if (search) {
        const params = new URLSearchParams(search);
        const queryApi = params.get('api') || params.get('backend') || params.get('server');
        if (queryApi && queryApi.trim()) {
          const clean = queryApi.trim().replace(/\/$/, '');
          localStorage.setItem('jeevan_api_base', clean);
          return clean;
        }
      }
    } catch (_) {}

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

/**
 * Universal helper to perform API calls with automatic tunnel-bypass headers
 * and dynamic base URL resolution.
 */
export const apiFetch = async (endpoint, options = {}) => {
  const base = getApiBase();
  const url = endpoint.startsWith('http') ? endpoint : `${base}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;
  const headers = {
    'bypass-tunnel-reminder': 'true',
    'Bypass-Tunnel-Reminder': 'true',
    ...(options.headers || {})
  };
  return fetch(url, { ...options, headers });
};

/**
 * API_BASE object with string coercion support.
 * In template literals like `${API_BASE}/api/...`, it invokes getApiBase() dynamically.
 */
export const API_BASE = {
  toString: () => getApiBase(),
  valueOf: () => getApiBase(),
  [Symbol.toPrimitive]: () => getApiBase(),
  replace: (...args) => getApiBase().replace(...args),
  startsWith: (...args) => getApiBase().startsWith(...args),
  concat: (...args) => getApiBase().concat(...args),
};

export default API_BASE;
