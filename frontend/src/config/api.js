const PRODUCTION_BACKEND_URL = 'https://sih-main-b6mx.onrender.com';

const isValidApiUrl = (val) => {
  if (!val || typeof val !== 'string') return false;
  const clean = val.trim();
  try {
    const parsed = new URL(clean);
    if (parsed.protocol === 'https:') return true;
    if (parsed.protocol === 'http:' && (parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1')) return true;
  } catch (_) {}
  return false;
};

/**
 * API Configuration Module (Production Hardened)
 * Resolves the backend API URL securely.
 * Priority:
 * 1. Safe query parameter override (?api=... or ?backend=...) for instant link sharing
 * 2. Explicit environment variable: VITE_API_BASE_URL
 * 3. User-configured custom base in localStorage (explicitly entered in UI)
 * 4. Production cloud backend (https://sih-main-b6mx.onrender.com) when deployed on remote host
 * 5. Localhost fallback (http://localhost:8000) when running locally
 */
export const getApiBase = () => {
  if (typeof window !== 'undefined') {
    // 1. Safe query parameter auto-discovery for instant sharing (?api=https://... or ?backend=https://...)
    try {
      const search = window.location?.search || '';
      if (search) {
        const params = new URLSearchParams(search);
        const queryCandidate = params.get('api') || params.get('backend') || params.get('server');
        if (queryCandidate && isValidApiUrl(queryCandidate)) {
          const clean = queryCandidate.trim().replace(/\/$/, '');
          localStorage.setItem('jeevan_api_base', clean);
          // Clean the query parameter from the address bar for security and cleanliness
          const cleanUrl = window.location.pathname + window.location.hash;
          window.history.replaceState({}, document.title, cleanUrl);
          return clean;
        }
      }
    } catch (_) {}

    // 2. Explicit environment variable (baked in at Vite build time via netlify.toml / .env)
    const envUrl = import.meta.env?.VITE_API_BASE_URL;
    if (envUrl && envUrl.trim() && isValidApiUrl(envUrl)) {
      return envUrl.trim().replace(/\/$/, '');
    }

    // 3. User runtime custom base in localStorage
    const custom = localStorage.getItem('jeevan_api_base');
    if (custom && custom.trim() && isValidApiUrl(custom)) {
      return custom.trim().replace(/\/$/, '');
    }

    // 4. Remote cloud deployment fallback: if running on Netlify or any remote host, connect to Render
    const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    if (!isLocalhost) {
      return PRODUCTION_BACKEND_URL;
    }
  }

  return 'http://localhost:8000';
};

export const setCustomApiBase = (url) => {
  if (typeof window !== 'undefined') {
    if (!url || !url.trim()) {
      localStorage.removeItem('jeevan_api_base');
    } else if (isValidApiUrl(url)) {
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
