import { describe, it, expect, beforeAll, vi } from 'vitest';
import type { AxiosResponse, InternalAxiosRequestConfig } from 'axios';

const requestHandlers: Array<(config: InternalAxiosRequestConfig) => InternalAxiosRequestConfig | Promise<InternalAxiosRequestConfig>> = [];
const responseSuccessHandlers: Array<(response: AxiosResponse) => AxiosResponse | Promise<AxiosResponse>> = [];
const responseErrorHandlers: Array<(error: unknown) => unknown> = [];

vi.mock('axios', () => {
  const create = vi.fn(() => ({
    interceptors: {
      request: { use: vi.fn((fn: typeof requestHandlers[number]) => requestHandlers.push(fn)) },
      response: {
        use: vi.fn((onFulfilled: typeof responseSuccessHandlers[number], onRejected: typeof responseErrorHandlers[number]) => {
          responseSuccessHandlers.push(onFulfilled);
          responseErrorHandlers.push(onRejected);
        }),
      },
    },
    get: vi.fn(),
  }));
  return { default: { create }, create };
});

describe('api client CSRF wiring', () => {
  beforeAll(async () => {
    await import('./client');
  });

  it('attaches a CSRF token header on unsafe methods when one is cached', async () => {
    const handler = requestHandlers[0];
    expect(handler).toBeDefined();

    localStorage.setItem('csrfToken', 'tok-abc');
    const config = {
      method: 'post',
      headers: {} as Record<string, string>,
    } as unknown as InternalAxiosRequestConfig;

    const out = await handler(config);
    expect((out.headers as Record<string, string>)['x-csrf-token']).toBe('tok-abc');
  });

  it('does not attach a CSRF header on safe methods', async () => {
    const handler = requestHandlers[0];
    localStorage.setItem('csrfToken', 'tok-abc');

    const config = {
      method: 'get',
      headers: {} as Record<string, string>,
    } as unknown as InternalAxiosRequestConfig;

    const out = await handler(config);
    expect((out.headers as Record<string, string>)['x-csrf-token']).toBeUndefined();
  });

  it('captures a CSRF token from the response header for use on the next request', async () => {
    const handler = responseSuccessHandlers[0];
    const response = {
      headers: { 'x-csrf-token': 'fresh-tok' },
      config: { url: '/api/x' },
      status: 200,
      data: {},
    } as unknown as AxiosResponse;

    await handler(response);
    expect(localStorage.getItem('csrfToken')).toBe('fresh-tok');
  });

  it('clears the cached CSRF token when the server reports a CSRF mismatch', async () => {
    const handler = responseErrorHandlers[0];
    const err = {
      config: { url: '/api/foo' },
      response: { status: 403, data: { message: 'Invalid CSRF token' } },
      message: 'Request failed',
    };
    localStorage.setItem('csrfToken', 'stale');
    try {
      await handler(err);
    } catch {
      // The production handler re-throws; we only care about the side effect here.
    }
    expect(localStorage.getItem('csrfToken')).toBeNull();
  });
});
