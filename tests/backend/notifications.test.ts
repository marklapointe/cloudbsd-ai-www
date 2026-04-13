import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { app } from '../../server/src/index.ts';
import { initDb } from '../../server/src/db.ts';

describe('Notifications API', () => {
  let token: string;

  beforeAll(async () => {
    const db = initDb();
    // Ensure standard limits for these tests
    db.prepare('UPDATE license SET vms_limit = 2, containers_limit = 100, jails_limit = 50').run();
    
    // Login to get token
    const res = await request(app)
      .post('/api/login')
      .send({ username: 'admin', password: 'admin' });
    token = res.body.token;
  });

  it('should fetch notifications', async () => {
    const res = await request(app)
      .get('/api/notifications')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    // Might be 0 if no resource issues or license issues, and we removed the default ad
  });

  it('should generate ephemeral license notifications when limits are exceeded', async () => {
    const db = initDb();
    // Manually reduce license limits in DB to trigger warning
    db.prepare('UPDATE license SET vms_limit = 0').run();
    
    const res = await request(app)
      .get('/api/notifications')
      .set('Authorization', `Bearer ${token}`);

    const vmsWarning = res.body.find((n: any) => n.id.startsWith('license-vms-'));
    expect(vmsWarning).toBeDefined();
    expect(vmsWarning.priority).toBe('high');
    
    // Reset limit
    db.prepare('UPDATE license SET vms_limit = 2').run();
  });
});
