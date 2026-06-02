import request from 'supertest';
import type { Express } from 'express';

export interface CsrfPrimedSession {
  token: string;
  csrfToken: string;
  cookies: string;
}

/**
 * Logs in and primes a CSRF token + captures the Set-Cookie header so
 * subsequent unsafe requests can be signed. Pass the result of this into
 * `withCsrf()` when issuing a POST/PUT/PATCH/DELETE.
 */
export async function loginAndPrimeCsrf(
  app: Express,
  username = 'admin',
  password = 'admin',
): Promise<CsrfPrimedSession> {
  const login = await request(app)
    .post('/api/login')
    .send({ username, password });
  if (login.status !== 200) {
    throw new Error(`Login failed with status ${login.status}: ${JSON.stringify(login.body)}`);
  }
  const token: string = login.body.token;
  const loginCookies = login.headers['set-cookie'];
  const cookieHeader = Array.isArray(loginCookies) ? loginCookies.join('; ') : (loginCookies || '');

  const csrf = await request(app)
    .get('/api/csrf')
    .set('Cookie', cookieHeader);
  if (csrf.status !== 200) {
    throw new Error(`CSRF prime failed with status ${csrf.status}: ${JSON.stringify(csrf.body)}`);
  }
  const csrfToken: string = csrf.body.csrfToken;
  const csrfCookies = csrf.headers['set-cookie'];
  const allCookies = Array.isArray(csrfCookies)
    ? [...(Array.isArray(loginCookies) ? loginCookies : []), ...csrfCookies].join('; ')
    : cookieHeader;

  return { token, csrfToken, cookies: allCookies };
}

export function withCsrf<T extends request.Test>(req: T, session: CsrfPrimedSession): T {
  return req
    .set('Authorization', `Bearer ${session.token}`)
    .set('x-csrf-token', session.csrfToken)
    .set('Cookie', session.cookies);
}
