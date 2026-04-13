import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { app } from '../../server/src/index.ts';
import { initDb } from '../../server/src/db.ts';

describe('Resources API', () => {
  let token: string;

  beforeAll(async () => {
    const db = initDb();
    // Update license to allow more resources for testing
    db.prepare('UPDATE license SET vms_limit = 10, containers_limit = 100, jails_limit = 100').run();
    
    // Login to get token
    const res = await request(app)
      .post('/api/login')
      .send({ username: 'admin', password: 'admin' });
    token = res.body.token;
  });

  afterAll(async () => {
    const db = initDb();
    // Reset limits to standard trial values
    db.prepare('UPDATE license SET vms_limit = 2, containers_limit = 100, jails_limit = 50').run();
  });

  it('should list VMs', async () => {
    const res = await request(app)
      .get('/api/vms')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it('should list Containers', async () => {
    const res = await request(app)
      .get('/api/containers')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it('should list Jails', async () => {
    const res = await request(app)
      .get('/api/jails')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it('should create and delete a VM', async () => {
    const name = `test-vm-${Date.now()}`;
    const createRes = await request(app)
      .post('/api/vms')
      .set('Authorization', `Bearer ${token}`)
      .send({ name, cpu: 1, memory: '1GB', disk: '10GB' });
    
    expect(createRes.status).toBe(201);
    const vmId = createRes.body.id;

    const deleteRes = await request(app)
      .delete(`/api/vms/${vmId}`)
      .set('Authorization', `Bearer ${token}`);
    
    expect(deleteRes.status).toBe(204);
  });

  it('should perform actions on resources', async () => {
    // Find a running resource
    const listRes = await request(app)
      .get('/api/vms')
      .set('Authorization', `Bearer ${token}`);
    
    const resource = listRes.body.find((r: any) => r.status === 'running' || r.status === 'up' || r.status === 'active');
    if (resource) {
      const actionRes = await request(app)
        .post(`/api/vms/${resource.id}/stop`)
        .set('Authorization', `Bearer ${token}`);
      
      expect(actionRes.status).toBe(200);
      expect(actionRes.body.message).toContain('stopped');
    }
  });

  it('should fetch system stats', async () => {
    const res = await request(app)
      .get('/api/system/stats')
      .set('Authorization', `Bearer ${token}`);
    
    expect(res.status).toBe(200);
    expect(res.body.cpu).toBeDefined();
    expect(res.body.memory).toBeDefined();
  });
});
