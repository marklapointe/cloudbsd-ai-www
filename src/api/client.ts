import axios from 'axios';

const baseURL = '/api';

const api = axios.create({
  baseURL: baseURL,
});

api.interceptors.request.use((config) => {
  let token = localStorage.getItem('token');
  
  // Validate token structure (JWT should have 3 parts separated by dots)
  if (token && (token.split('.').length !== 3 || token.length < 50)) {
    const isMalformed = token.split('.').length !== 3;
    const isTooShort = token.length < 50;
    const reason = isMalformed ? 'malformed structure' : (isTooShort ? 'too short' : 'invalid');
    
    console.error(`[Auth] Invalid token detected in localStorage (${reason}, length: ${token.length}). Clearing it.`);
    
    // Check for "username" as token mistake
    if (token === localStorage.getItem('username')) {
      console.error('[Auth] Token matches username in localStorage! Critical implementation error suspected.');
    }
    
    localStorage.removeItem('token');
    localStorage.removeItem('username');
    localStorage.removeItem('role');
    token = null;
    
    // If we're not already on the login or index page, force a reload to trigger redirect
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
  return config;
});

api.interceptors.response.use(
  (response) => {
    // Check if we should pause on success for debugging
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
    // Check if we should pause on errors for debugging (if the query param is present)
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
      // Only alert on non-auth errors to avoid infinite loops if the redirect fails
      if (error.response?.status !== 401 && error.response?.status !== 403) {
        alert(`API Error: ${error.message}\nCheck the console for details. (Close this alert to continue)`);
      }
    }

    // If we're on the login page or making a login request, don't auto-redirect
    const isLoginRequest = error.config && error.config.url && error.config.url.endsWith('/login');
    const isLoginPage = window.location.pathname === '/login';

    if (error.response && (error.response.status === 401 || error.response.status === 403) && !isLoginRequest && !isLoginPage) {
      localStorage.removeItem('token');
      localStorage.removeItem('username');
      localStorage.removeItem('role');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;
