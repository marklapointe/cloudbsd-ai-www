import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { app } from '../../server/src/index.ts';
import { initDb } from '../../server/src/db.ts';

describe('User Profile API', () => {
  let token: string;

  beforeAll(async () => {
    initDb();
    // Login to get token
    const res = await request(app)
      .post('/api/login')
      .send({ username: 'admin', password: 'admin' });
    token = res.body.token;
  });

  it('should fetch user profile with default theme', async () => {
    const res = await request(app)
      .get('/api/users/profile')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.username).toBe('admin');
    expect(res.body.theme).toBe('dark'); // Default as specified in migration and initDb
  });

  it('should update user theme', async () => {
    const res = await request(app)
      .put('/api/users/profile')
      .set('Authorization', `Bearer ${token}`)
      .send({ theme: 'light' });

    expect(res.status).toBe(200);
    expect(res.body.theme).toBe('light');

    // Verify fetch reflects change
    const profileRes = await request(app)
      .get('/api/users/profile')
      .set('Authorization', `Bearer ${token}`);
    expect(profileRes.body.theme).toBe('light');
  });

  it('should update language and theme together', async () => {
    const res = await request(app)
      .put('/api/users/profile')
      .set('Authorization', `Bearer ${token}`)
      .send({ theme: 'dark', language: 'fr' });

    expect(res.status).toBe(200);
    expect(res.body.theme).toBe('dark');
    expect(res.body.language).toBe('fr');
  });

  it('should default to dark theme for new users', async () => {
    const username = `user_${Date.now()}`;
    const createRes = await request(app)
      .post('/api/users')
      .set('Authorization', `Bearer ${token}`)
      .send({ username, password: 'password', role: 'viewer' });
    
    expect(createRes.status).toBe(201);
    expect(createRes.body.theme).toBe('dark');

    // Login as new user to check login response
    const loginRes = await request(app)
      .post('/api/login')
      .send({ username, password: 'password' });
    
    expect(loginRes.body.user.theme).toBe('dark');
  });

  it('should include theme in the user list', async () => {
    const res = await request(app)
      .get('/api/users')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    const adminUser = res.body.find((u: any) => u.username === 'admin');
    expect(adminUser).toBeDefined();
    expect(adminUser.theme).toBeDefined();
  });
});
