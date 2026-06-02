import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { app } from '../../server/src/index.ts';
import { initDb } from '../../server/src/db.ts';
import { loginAndPrimeCsrf, withCsrf, type CsrfPrimedSession } from './helpers';

describe('Resources API', () => {
  let session: CsrfPrimedSession;

  beforeAll(async () => {
    const db = initDb();
    db.prepare('UPDATE license SET vms_limit = 10, containers_limit = 100, jails_limit = 100').run();
    session = await loginAndPrimeCsrf(app);
  });

  afterAll(async () => {
    const db = initDb();
    db.prepare('UPDATE license SET vms_limit = 2, containers_limit = 100, jails_limit = 50').run();
  });

  it('should list VMs', async () => {
    const res = await request(app)
      .get('/api/vms')
      .set('Authorization', `Bearer ${session.token}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it('should list Containers', async () => {
    const res = await request(app)
      .get('/api/containers')
      .set('Authorization', `Bearer ${session.token}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it('should list Jails', async () => {
    const res = await request(app)
      .get('/api/jails')
      .set('Authorization', `Bearer ${session.token}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it('should create and delete a VM', async () => {
    const name = `test-vm-${Date.now()}`;
    const createRes = await withCsrf(
      request(app).post('/api/vms'),
      session
    ).send({ name, cpu: 1, memory: '1GB', disk: '10GB' });

    expect(createRes.status).toBe(201);
    const vmId = createRes.body.id;

    const deleteRes = await withCsrf(
      request(app).delete(`/api/vms/${vmId}`),
      session
    );

    expect(deleteRes.status).toBe(204);
  });

  it('should perform actions on resources', async () => {
    const listRes = await request(app)
      .get('/api/vms')
      .set('Authorization', `Bearer ${session.token}`);

    const resource = listRes.body.find((r: any) => r.status === 'running' || r.status === 'up' || r.status === 'active');
    if (resource) {
      const actionRes = await withCsrf(
        request(app).post(`/api/vms/${resource.id}/stop`),
        session
      );

      expect(actionRes.status).toBe(200);
      expect(actionRes.body.message).toContain('stopped');
    }
  });

  it('should fetch system stats', async () => {
    const res = await request(app)
      .get('/api/system/stats')
      .set('Authorization', `Bearer ${session.token}`);

    expect(res.status).toBe(200);
    expect(res.body.cpu).toBeDefined();
    expect(res.body.memory).toBeDefined();
  });
});
