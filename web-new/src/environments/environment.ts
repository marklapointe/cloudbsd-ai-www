export const environment = {
  production: false,
  /** Admin backend origin; empty = same-origin (Rule #13: UI → backend only). */
  apiBaseUrl: '',
  streamPath: '/api/stream',
  apiPath: '/api',
  /**
   * Prefer live POST /api envelope gateway; EnvelopeClient falls back to
   * in-process mocks if the backend is unreachable (dev resilience).
   */
  useMocks: false,
};
