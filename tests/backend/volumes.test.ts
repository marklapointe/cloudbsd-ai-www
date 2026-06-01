import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { app } from '../../server/src/index.ts';
import { initDb } from '../../server/src/db.ts';

describe('Volumes API', () => {
  let token: string;
  let volumeId: number;
  let diskId: number;

  beforeAll(async () => {
    const db = initDb();
    // Login to get token
    const res = await request(app)
      .post('/api/login')
      .send({ username: 'admin', password: 'admin' });
    token = res.body.token;

    // Create a disk for volume tests
    const diskRes = await request(app)
      .post('/api/disks')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: `test-disk-volumes-${Date.now()}`,
        disk_type: 'SSD',
        size: '1TB',
        status: 'online'
      });
    diskId = diskRes.body.id;
  });

  afterAll(async () => {
    const db = initDb();
    // Cleanup: delete test volume if created
    if (volumeId) {
      db.prepare('DELETE FROM volumes WHERE id = ?').run(volumeId);
    }
    // Cleanup: delete test disk
    if (diskId) {
      db.prepare('DELETE FROM volumes WHERE disk_id = ?').run(diskId);
      db.prepare('DELETE FROM disks WHERE id = ?').run(diskId);
    }
  });

  it('should list volumes', async () => {
    const res = await request(app)
      .get('/api/volumes')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it('should get a single volume', async () => {
    // First create a volume to ensure one exists
    const createRes = await request(app)
      .post('/api/volumes')
      .set('Authorization', `Bearer ${token}`)
      .send({
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
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.id).toBe(volumeId);
    expect(res.body.name).toBeDefined();
  });

  it('should create a volume', async () => {
    const name = `test-volume-${Date.now()}`;
    const res = await request(app)
      .post('/api/volumes')
      .set('Authorization', `Bearer ${token}`)
      .send({
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
    // First create a volume to update
    const name = `test-volume-update-${Date.now()}`;
    const createRes = await request(app)
      .post('/api/volumes')
      .set('Authorization', `Bearer ${token}`)
      .send({
        disk_id: diskId,
        name,
        volume_type: 'zfs',
        size: '25GB',
        status: 'online'
      });

    const updateVolumeId = createRes.body.id;

    const res = await request(app)
      .put(`/api/volumes/${updateVolumeId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        name,
        volume_type: 'zfs',
        size: '100GB',
        status: 'offline'
      });

    expect(res.status).toBe(200);
    expect(res.body.size).toBe('100GB');
    expect(res.body.status).toBe('offline');

    // Cleanup
    const db = initDb();
    db.prepare('DELETE FROM volumes WHERE id = ?').run(updateVolumeId);
  });

  it('should delete a volume', async () => {
    // First create a volume to delete
    const name = `test-volume-delete-${Date.now()}`;
    const createRes = await request(app)
      .post('/api/volumes')
      .set('Authorization', `Bearer ${token}`)
      .send({
        disk_id: diskId,
        name,
        volume_type: 'zfs',
        size: '10GB',
        status: 'online'
      });

    const deleteVolumeId = createRes.body.id;

    const deleteRes = await request(app)
      .delete(`/api/volumes/${deleteVolumeId}`)
      .set('Authorization', `Bearer ${token}`);

    expect(deleteRes.status).toBe(204);

    // Verify volume is deleted
    const getRes = await request(app)
      .get(`/api/volumes/${deleteVolumeId}`)
      .set('Authorization', `Bearer ${token}`);

    expect(getRes.status).toBe(404);
  });

  it('should filter volumes by disk_id', async () => {
    // Create a second disk for filtering test
    const diskRes = await request(app)
      .post('/api/disks')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: `test-disk-filter-${Date.now()}`,
        disk_type: 'HDD',
        size: '2TB',
        status: 'online'
      });

    const filterDiskId = diskRes.body.id;

    // Create volumes on this disk
    await request(app)
      .post('/api/volumes')
      .set('Authorization', `Bearer ${token}`)
      .send({
        disk_id: filterDiskId,
        name: `test-volume-filter-${Date.now()}`,
        volume_type: 'zfs',
        size: '500GB',
        status: 'online'
      });

    // Filter by disk_id
    const res = await request(app)
      .get(`/api/volumes?disk_id=${filterDiskId}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    const filteredVolumes = res.body.filter((v: any) => v.disk_id === filterDiskId);
    expect(filteredVolumes.length).toBeGreaterThan(0);

    // Cleanup
    const db = initDb();
    const volumesToDelete = db.prepare('SELECT id FROM volumes WHERE disk_id = ?').all(filterDiskId) as any[];
    for (const vol of volumesToDelete) {
      db.prepare('DELETE FROM volumes WHERE id = ?').run(vol.id);
    }
    db.prepare('DELETE FROM disks WHERE id = ?').run(filterDiskId);
  });

  it('should get volume with disk and node info', async () => {
    // Create a node
    const nodeRes = await request(app)
      .post('/api/nodes')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: `test-node-volumes-${Date.now()}`,
        role: 'agent',
        status: 'online',
        ip: '192.168.1.200'
      });

    const nodeId = nodeRes.body.id;

    // Create a disk on this node
    const diskRes = await request(app)
      .post('/api/disks')
      .set('Authorization', `Bearer ${token}`)
      .send({
        node_id: nodeId,
        name: `test-disk-with-node-${Date.now()}`,
        disk_type: 'SSD',
        size: '500GB',
        status: 'online'
      });

    const diskWithNodeId = diskRes.body.id;

    // Create a volume on this disk
    const volumeRes = await request(app)
      .post('/api/volumes')
      .set('Authorization', `Bearer ${token}`)
      .send({
        disk_id: diskWithNodeId,
        name: `test-volume-with-node-${Date.now()}`,
        volume_type: 'zfs',
        size: '250GB',
        status: 'online'
      });

    const volumeWithNodeId = volumeRes.body.id;

    // Get the volume and check it has disk_name and node info
    const res = await request(app)
      .get(`/api/volumes/${volumeWithNodeId}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.disk_name).toBeDefined();
    expect(res.body.node_id).toBe(nodeId);
    expect(res.body.node_name).toBeDefined();

    // Cleanup
    const db = initDb();
    db.prepare('DELETE FROM volumes WHERE id = ?').run(volumeWithNodeId);
    db.prepare('DELETE FROM volumes WHERE disk_id = ?').run(diskWithNodeId);
    db.prepare('DELETE FROM disks WHERE id = ?').run(diskWithNodeId);
    db.prepare('DELETE FROM nodes WHERE id = ?').run(nodeId);
  });
});
