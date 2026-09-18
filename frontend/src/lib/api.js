const API_BASE_URL = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');

let _memoryToken = null;

const hasSessionStorage = (() => {
  if (typeof window === 'undefined' || !window.sessionStorage) return false;
  try {
    const testKey = '__mplads_test__';
    window.sessionStorage.setItem(testKey, '1');
    window.sessionStorage.removeItem(testKey);
    return true;
  } catch (err) {
    // Storage quota disabled or restricted sandbox
    return false;
  }
})();

export function getAuthToken() {
  if (_memoryToken) return _memoryToken;
  if (!hasSessionStorage) return null;
  return window.sessionStorage.getItem('mplads_auth_token') || null;
}

export function setAuthToken(token) {
  _memoryToken = token;
  if (!hasSessionStorage) return;
  if (token) {
    window.sessionStorage.setItem('mplads_auth_token', token);
  } else {
    window.sessionStorage.removeItem('mplads_auth_token');
  }
}

export function clearAuthToken() {
  _memoryToken = null;
  if (!hasSessionStorage) return;
  window.sessionStorage.removeItem('mplads_auth_token');
}

export function apiFetch(path, options = {}) {
  const token = getAuthToken();
  const headers = { ...(options.headers || {}) };

  // Never send insecure client-controlled role headers
  delete headers['X-User-Role'];

  // Inject standard Authorization Bearer header if token exists
  if (token && !headers['Authorization']) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  return fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
  });
}