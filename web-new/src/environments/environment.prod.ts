export const environment = {
  production: true,
  apiBaseUrl: '',
  streamPath: '/api/stream',
  apiPath: '/api',
  /** Production hits Express envelope gateway; client falls back to mocks only on hard failure. */
  useMocks: false,
};
