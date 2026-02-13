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

export default api;
