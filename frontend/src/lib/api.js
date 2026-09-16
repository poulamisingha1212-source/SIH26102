const API_BASE_URL = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');

let _memoryToken = null;

export function getAuthToken() {
  if (_memoryToken) return _memoryToken;
  try {
    return sessionStorage.getItem('mplads_auth_token') || null;
  } catch {
    return null;
  }
}

export function setAuthToken(token) {
  _memoryToken = token;
  try {
    if (token) {
      sessionStorage.setItem('mplads_auth_token', token);
    } else {
      sessionStorage.removeItem('mplads_auth_token');
    }
  } catch {
    // SessionStorage may fail in restricted sandboxes
  }
}

export function clearAuthToken() {
  _memoryToken = null;
  try {
    sessionStorage.removeItem('mplads_auth_token');
  } catch {
    // Ignore
  }
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