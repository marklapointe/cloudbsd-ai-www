import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { app } from '../../server/src/index.ts';
import { initDb } from '../../server/src/db.ts';
import { loginAndPrimeCsrf, withCsrf, type CsrfPrimedSession } from './helpers';

describe('Disks API', () => {
  let session: CsrfPrimedSession;
  let diskId: number;

  beforeAll(async () => {
    initDb();
    session = await loginAndPrimeCsrf(app);
  });

  afterAll(async () => {
    const db = initDb();
    if (diskId) {
      db.prepare('DELETE FROM volumes WHERE disk_id = ?').run(diskId);
      db.prepare('DELETE FROM disks WHERE id = ?').run(diskId);
    }
  });

  it('should list disks', async () => {
    const res = await request(app)
      .get('/api/disks')
      .set('Authorization', `Bearer ${session.token}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it('should get a single disk with volumes', async () => {
    const createRes = await withCsrf(
      request(app).post('/api/disks'),
      session
    ).send({
      name: `test-disk-${Date.now()}`,
      disk_type: 'SSD',
      size: '500GB',
      status: 'online'
    });

    if (createRes.status === 201) {
      diskId = createRes.body.id;
    }

    const res = await request(app)
      .get(`/api/disks/${diskId}`)
      .set('Authorization', `Bearer ${session.token}`);

    expect(res.status).toBe(200);
    expect(res.body.id).toBe(diskId);
    expect(res.body.volumes).toBeDefined();
    expect(Array.isArray(res.body.volumes)).toBe(true);
  });

  it('should create a disk', async () => {
    const name = `test-disk-${Date.now()}`;
    const res = await withCsrf(
      request(app).post('/api/disks'),
      session
    ).send({
      name,
      disk_type: 'HDD',
      size: '1TB',
      status: 'online'
    });

    expect(res.status).toBe(201);
    expect(res.body.id).toBeDefined();
    expect(res.body.name).toBe(name);
    diskId = res.body.id;
  });

  it('should update a disk', async () => {
    const name = `test-disk-update-${Date.now()}`;
    const createRes = await withCsrf(
      request(app).post('/api/disks'),
      session
    ).send({
      name,
      disk_type: 'SSD',
      size: '256GB',
      status: 'online'
    });

    const updateDiskId = createRes.body.id;

    const res = await withCsrf(
      request(app).put(`/api/disks/${updateDiskId}`),
      session
    ).send({
      name,
      disk_type: 'SSD',
      size: '512GB',
      status: 'offline'
    });

    expect(res.status).toBe(200);
    expect(res.body.size).toBe('512GB');
    expect(res.body.status).toBe('offline');

    const db = initDb();
    db.prepare('DELETE FROM volumes WHERE disk_id = ?').run(updateDiskId);
    db.prepare('DELETE FROM disks WHERE id = ?').run(updateDiskId);
  });

  it('should delete a disk (cascades to volumes)', async () => {
    const name = `test-disk-delete-${Date.now()}`;
    const createDiskRes = await withCsrf(
      request(app).post('/api/disks'),
      session
    ).send({
      name,
      disk_type: 'SSD',
      size: '100GB',
      status: 'online'
    });

    const deleteDiskId = createDiskRes.body.id;

    await withCsrf(
      request(app).post('/api/volumes'),
      session
    ).send({
      disk_id: deleteDiskId,
      name: `test-volume-${Date.now()}`,
      volume_type: 'zfs',
      size: '50GB',
      status: 'online'
    });

    const deleteRes = await withCsrf(
      request(app).delete(`/api/disks/${deleteDiskId}`),
      session
    );

    expect(deleteRes.status).toBe(204);

    const getRes = await request(app)
      .get(`/api/disks/${deleteDiskId}`)
      .set('Authorization', `Bearer ${session.token}`);

    expect(getRes.status).toBe(404);
  });

  it('should filter disks by node_id', async () => {
    const createNodeRes = await withCsrf(
      request(app).post('/api/nodes'),
      session
    ).send({
      name: `test-node-${Date.now()}`,
      role: 'agent',
      status: 'online',
      ip: '192.168.1.100'
    });

    const nodeId = createNodeRes.body.id;

    const diskName = `test-disk-node-${Date.now()}`;
    await withCsrf(
      request(app).post('/api/disks'),
      session
    ).send({
      node_id: nodeId,
      name: diskName,
      disk_type: 'SSD',
      size: '1TB',
      status: 'online'
    });

    const res = await request(app)
      .get(`/api/disks?node_id=${nodeId}`)
      .set('Authorization', `Bearer ${session.token}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    const filteredDisk = res.body.find((d: any) => d.node_id === nodeId);
    expect(filteredDisk).toBeDefined();

    const db = initDb();
    const diskToDelete = db.prepare('SELECT id FROM disks WHERE name = ?').get(diskName) as any;
    if (diskToDelete) {
      db.prepare('DELETE FROM volumes WHERE disk_id = ?').run(diskToDelete.id);
      db.prepare('DELETE FROM disks WHERE id = ?').run(diskToDelete.id);
    }
    db.prepare('DELETE FROM nodes WHERE id = ?').run(nodeId);
  });
});
