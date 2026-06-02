import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { app } from '../../server/src/index.ts';
import { initDb } from '../../server/src/db.ts';
import { loginAndPrimeCsrf, withCsrf, type CsrfPrimedSession } from './helpers';

describe('Volumes API', () => {
  let session: CsrfPrimedSession;
  let volumeId: number;
  let diskId: number;

  beforeAll(async () => {
    initDb();
    session = await loginAndPrimeCsrf(app);

    const diskRes = await withCsrf(
      request(app).post('/api/disks'),
      session
    ).send({
      name: `test-disk-volumes-${Date.now()}`,
      disk_type: 'SSD',
      size: '1TB',
      status: 'online'
    });
    diskId = diskRes.body.id;
  });

  afterAll(async () => {
    const db = initDb();
    if (volumeId) {
      db.prepare('DELETE FROM volumes WHERE id = ?').run(volumeId);
    }
    if (diskId) {
      db.prepare('DELETE FROM volumes WHERE disk_id = ?').run(diskId);
      db.prepare('DELETE FROM disks WHERE id = ?').run(diskId);
    }
  });

  it('should list volumes', async () => {
    const res = await request(app)
      .get('/api/volumes')
      .set('Authorization', `Bearer ${session.token}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it('should get a single volume', async () => {
    const createRes = await withCsrf(
      request(app).post('/api/volumes'),
      session
    ).send({
      disk_id: diskId,
      name: `test-volume-${Date.now()}`,
      volume_type: 'zfs',
      size: '100GB',
      status: 'online'
    });

    if (createRes.status === 201) {
      volumeId = createRes.body.id;
    }

    const res = await request(app)
      .get(`/api/volumes/${volumeId}`)
      .set('Authorization', `Bearer ${session.token}`);

    expect(res.status).toBe(200);
    expect(res.body.id).toBe(volumeId);
    expect(res.body.name).toBeDefined();
  });

  it('should create a volume', async () => {
    const name = `test-volume-${Date.now()}`;
    const res = await withCsrf(
      request(app).post('/api/volumes'),
      session
    ).send({
      disk_id: diskId,
      name,
      volume_type: 'zfs',
      mount_point: '/mnt/test',
      size: '50GB',
      used: '10GB',
      available: '40GB',
      compression: 'lz4',
      deduplication: 'off',
      status: 'online'
    });

    expect(res.status).toBe(201);
    expect(res.body.id).toBeDefined();
    expect(res.body.name).toBe(name);
    expect(res.body.volume_type).toBe('zfs');
    volumeId = res.body.id;
  });

  it('should update a volume', async () => {
    const name = `test-volume-update-${Date.now()}`;
    const createRes = await withCsrf(
      request(app).post('/api/volumes'),
      session
    ).send({
      disk_id: diskId,
      name,
      volume_type: 'zfs',
      size: '25GB',
      status: 'online'
    });

    const updateVolumeId = createRes.body.id;

    const res = await withCsrf(
      request(app).put(`/api/volumes/${updateVolumeId}`),
      session
    ).send({
      name,
      volume_type: 'zfs',
      size: '100GB',
      status: 'offline'
    });

    expect(res.status).toBe(200);
    expect(res.body.size).toBe('100GB');
    expect(res.body.status).toBe('offline');

    const db = initDb();
    db.prepare('DELETE FROM volumes WHERE id = ?').run(updateVolumeId);
  });

  it('should delete a volume', async () => {
    const name = `test-volume-delete-${Date.now()}`;
    const createRes = await withCsrf(
      request(app).post('/api/volumes'),
      session
    ).send({
      disk_id: diskId,
      name,
      volume_type: 'zfs',
      size: '10GB',
      status: 'online'
    });

    const deleteVolumeId = createRes.body.id;

    const deleteRes = await withCsrf(
      request(app).delete(`/api/volumes/${deleteVolumeId}`),
      session
    );

    expect(deleteRes.status).toBe(204);

    const getRes = await request(app)
      .get(`/api/volumes/${deleteVolumeId}`)
      .set('Authorization', `Bearer ${session.token}`);

    expect(getRes.status).toBe(404);
  });

  it('should filter volumes by disk_id', async () => {
    const diskRes = await withCsrf(
      request(app).post('/api/disks'),
      session
    ).send({
      name: `test-disk-filter-${Date.now()}`,
      disk_type: 'HDD',
      size: '2TB',
      status: 'online'
    });

    const filterDiskId = diskRes.body.id;

    await withCsrf(
      request(app).post('/api/volumes'),
      session
    ).send({
      disk_id: filterDiskId,
      name: `test-volume-filter-${Date.now()}`,
      volume_type: 'zfs',
      size: '500GB',
      status: 'online'
    });

    const res = await request(app)
      .get(`/api/volumes?disk_id=${filterDiskId}`)
      .set('Authorization', `Bearer ${session.token}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    const filteredVolumes = res.body.filter((v: any) => v.disk_id === filterDiskId);
    expect(filteredVolumes.length).toBeGreaterThan(0);

    const db = initDb();
    const volumesToDelete = db.prepare('SELECT id FROM volumes WHERE disk_id = ?').all(filterDiskId) as any[];
    for (const vol of volumesToDelete) {
      db.prepare('DELETE FROM volumes WHERE id = ?').run(vol.id);
    }
    db.prepare('DELETE FROM disks WHERE id = ?').run(filterDiskId);
  });

  it('should get volume with disk and node info', async () => {
    const nodeRes = await withCsrf(
      request(app).post('/api/nodes'),
      session
    ).send({
      name: `test-node-volumes-${Date.now()}`,
      role: 'agent',
      status: 'online',
      ip: '192.168.1.200'
    });

    const nodeId = nodeRes.body.id;

    const diskRes = await withCsrf(
      request(app).post('/api/disks'),
      session
    ).send({
      node_id: nodeId,
      name: `test-disk-with-node-${Date.now()}`,
      disk_type: 'SSD',
      size: '500GB',
      status: 'online'
    });

    const diskWithNodeId = diskRes.body.id;

    const volumeRes = await withCsrf(
      request(app).post('/api/volumes'),
      session
    ).send({
      disk_id: diskWithNodeId,
      name: `test-volume-with-node-${Date.now()}`,
      volume_type: 'zfs',
      size: '250GB',
      status: 'online'
    });

    const volumeWithNodeId = volumeRes.body.id;

    const res = await request(app)
      .get(`/api/volumes/${volumeWithNodeId}`)
      .set('Authorization', `Bearer ${session.token}`);

    expect(res.status).toBe(200);
    expect(res.body.disk_name).toBeDefined();
    expect(res.body.node_id).toBe(nodeId);
    expect(res.body.node_name).toBeDefined();

    const db = initDb();
    db.prepare('DELETE FROM volumes WHERE id = ?').run(volumeWithNodeId);
    db.prepare('DELETE FROM volumes WHERE disk_id = ?').run(diskWithNodeId);
    db.prepare('DELETE FROM disks WHERE id = ?').run(diskWithNodeId);
    db.prepare('DELETE FROM nodes WHERE id = ?').run(nodeId);
  });
});
