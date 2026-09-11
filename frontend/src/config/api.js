/**
 * API Configuration Module (Production Hardened)
 * Resolves the backend API URL securely.
 * Priority:
 * 1. Explicit environment variable: VITE_API_BASE_URL
 * 2. User-configured custom base in localStorage (explicitly entered in UI only)
 * 3. Default fallback: http://localhost:8000
 *
 * NOTE: Query parameter overrides (?api=...) are intentionally disabled
 * to prevent URL poisoning, XSS, and SSRF attacks against patient data.
 */
export const getApiBase = () => {
  if (typeof window !== 'undefined') {
    const envUrl = import.meta.env?.VITE_API_BASE_URL;
    if (envUrl && envUrl.trim()) {
      return envUrl.trim().replace(/\/$/, '');
    }

    const custom = localStorage.getItem('jeevan_api_base');
    if (custom && custom.trim()) {
      return custom.trim().replace(/\/$/, '');
    }
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
 * Retrieves current JWT bearer token from session state or local storage.
 */
export const getAuthToken = () => {
  if (typeof window === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem('global_state');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed.token) return parsed.token;
      if (parsed.access_token) return parsed.access_token;
    }
  } catch (_) {}
  return sessionStorage.getItem('auth_token') || localStorage.getItem('auth_token') || null;
};

/**
 * Universal helper to perform API calls with automatic tunnel-bypass headers,
 * dynamic base URL resolution, and JWT Bearer token injection.
 */
export const apiFetch = async (endpoint, options = {}) => {
  const base = getApiBase();
  const url = endpoint.startsWith('http') ? endpoint : `${base}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;
  const token = getAuthToken();

  const headers = {
    'bypass-tunnel-reminder': 'true',
    'Bypass-Tunnel-Reminder': 'true',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
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
