import { expect, it, describe } from 'vitest';
import request from 'supertest';
import express from 'express';

describe('Referrer-Policy Header', () => {
  it('should set Referrer-Policy header to no-referrer-when-downgrade by default', async () => {
    const app = express();
    const referrerPolicy = 'no-referrer-when-downgrade';

    app.use((_req, res, next) => {
      res.setHeader('Referrer-Policy', referrerPolicy || 'no-referrer-when-downgrade');
      next();
    });

    app.get('/test', (_req, res) => {
      res.json({ message: 'ok' });
    });

    const response = await request(app).get('/test');
    expect(response.headers['referrer-policy']).toBe('no-referrer-when-downgrade');
  });

  it('should set Referrer-Policy header to strict-origin-when-cross-origin when configured', async () => {
    const app = express();
    const referrerPolicy = 'strict-origin-when-cross-origin';

    app.use((_req, res, next) => {
      res.setHeader('Referrer-Policy', referrerPolicy || 'no-referrer-when-downgrade');
      next();
    });

    app.get('/test', (_req, res) => {
      res.json({ message: 'ok' });
    });

    const response = await request(app).get('/test');
    expect(response.headers['referrer-policy']).toBe('strict-origin-when-cross-origin');
  });
  
  it('should fallback to default if referrerPolicy is empty', async () => {
    const app = express();
    const referrerPolicy = '';

    app.use((_req, res, next) => {
      res.setHeader('Referrer-Policy', referrerPolicy || 'no-referrer-when-downgrade');
      next();
    });

    app.get('/test', (_req, res) => {
      res.json({ message: 'ok' });
    });

    const response = await request(app).get('/test');
    expect(response.headers['referrer-policy']).toBe('no-referrer-when-downgrade');
  });
});
