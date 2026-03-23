import axios from 'axios';

const baseURL = '/api';

const api = axios.create({
  baseURL: baseURL,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
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
      alert(`API Error: ${error.message}\nCheck the console for details. (Close this alert to continue)`);
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
