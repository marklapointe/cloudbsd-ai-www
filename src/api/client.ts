import axios from 'axios';

const baseURL = '/api';
const CSRF_HEADER = 'x-csrf-token';
const CSRF_STORAGE_KEY = 'csrfToken';
const UNSAFE_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

const api = axios.create({
  baseURL: baseURL,
  withCredentials: true,
});

function readCsrfToken(): string | null {
  try {
    return localStorage.getItem(CSRF_STORAGE_KEY);
  } catch {
    return null;
  }
}

function writeCsrfToken(token: string | null) {
  try {
    if (token) localStorage.setItem(CSRF_STORAGE_KEY, token);
    else localStorage.removeItem(CSRF_STORAGE_KEY);
  } catch {
    // localStorage may be unavailable in private modes; CSRF will simply
    // re-prime on the next request.
  }
}

function captureCsrfFromResponse(response: { headers: Record<string, unknown> }) {
  const raw = response.headers[CSRF_HEADER] ?? response.headers[CSRF_HEADER.toUpperCase()];
  if (typeof raw === 'string' && raw.length > 0) {
    writeCsrfToken(raw);
  }
}

api.interceptors.request.use((config) => {
  let token = localStorage.getItem('token');

  // Validate token structure (JWT should have 3 parts separated by dots)
  if (token && (token.split('.').length !== 3 || token.length < 50)) {
    const isMalformed = token.split('.').length !== 3;
    const isTooShort = token.length < 50;
    const reason = isMalformed ? 'malformed structure' : (isTooShort ? 'too short' : 'invalid');

    console.error(`[Auth] Invalid token detected in localStorage (${reason}, length: ${token.length}). Clearing it.`);

    if (token === localStorage.getItem('username')) {
      console.error('[Auth] Token matches username in localStorage! Critical implementation error suspected.');
    }

    localStorage.removeItem('token');
    localStorage.removeItem('username');
    localStorage.removeItem('role');
    writeCsrfToken(null);
    token = null;

    if (window.location.pathname !== '/login' && window.location.pathname !== '/') {
      window.location.href = '/login?error=session_corrupted';
    }
  }

  // Debug logging for token
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.has('debug')) {
    if (token) {
      const tokenPreview = token.length > 20
        ? `${token.substring(0, 10)}...${token.substring(token.length - 10)}`
        : token;
      console.log(`[API Request] Token found in localStorage (length: ${token.length}): ${tokenPreview}`);
    } else {
      console.warn('[API Request] No token found in localStorage');
    }
  }

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  const method = (config.method || 'get').toUpperCase();
  if (UNSAFE_METHODS.has(method)) {
    const csrf = readCsrfToken();
    if (csrf) {
      config.headers[CSRF_HEADER] = csrf;
    }
  }

  return config;
});

api.interceptors.response.use(
  (response) => {
    captureCsrfFromResponse(response);
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.has('debug')) {
      console.log('API Success captured:', {
        url: response.config?.url,
        method: response.config?.method,
        status: response.status,
        data: response.data
      });
    }
    return response;
  },
  (error) => {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.has('debug')) {
      console.error('API Error captured:', {
        url: error.config?.url,
        method: error.config?.method,
        status: error.response?.status,
        data: error.response?.data,
        message: error.message,
        error
      });
      if (error.response?.status !== 401 && error.response?.status !== 403) {
        console.error(`API Error: ${error.message}`);
      }
    }

    // If the server just told us our CSRF token is bad, drop it so the next
    // request re-primes via the /api/csrf endpoint or a fresh login.
    if (error.response?.status === 403 && typeof error.response?.data?.message === 'string'
        && error.response.data.message.toLowerCase().includes('csrf')) {
      writeCsrfToken(null);
    }

    const isLoginRequest = error.config && error.config.url && error.config.url.endsWith('/login');
    const isCsrfPrime = error.config && error.config.url && error.config.url.endsWith('/csrf');
    const isLoginPage = window.location.pathname === '/login';

    if (error.response && (error.response.status === 401 || error.response.status === 403)
        && !isLoginRequest && !isLoginPage && !isCsrfPrime) {
      console.warn(`[Auth] ${error.response.status} Error on ${error.config?.url}. Clearing storage and redirecting to login.`);
      localStorage.clear();
      writeCsrfToken(null);
      window.location.href = '/login?error=session_expired';
    }
    return Promise.reject(error);
  }
);

/**
 * Ensures a CSRF token is present in localStorage by hitting the /api/csrf
 * endpoint. Safe to call multiple times. Should be called once after the user
 * is authenticated (or before the first unsafe request) to seed the cookie.
 */
export async function ensureCsrfToken(): Promise<void> {
  if (readCsrfToken()) return;
  try {
    await api.get('/csrf');
  } catch (err) {
    // Non-fatal: the request that needed the token will 403 and the caller
    // can decide what to do.
    console.warn('[CSRF] Failed to prime CSRF token:', err);
  }
}

export default api;
