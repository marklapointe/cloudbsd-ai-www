import axios from 'axios';

const defaultPort = 3001;
const host = window.location.hostname === 'localhost' ? `localhost:${defaultPort}` : window.location.host;
const baseURL = `${window.location.protocol}//${host}/api`;

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
  (response) => response,
  (error) => {
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
