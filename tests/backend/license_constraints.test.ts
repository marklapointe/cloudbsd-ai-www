import { expect, it, describe, beforeAll } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { initDb } from '../../server/src/db';
import config from '../../server/src/config';
import { app } from '../../server/src/index';

const SECRET_KEY = config.secretKey || 'your-secret-key-change-me';

describe('License Constraints', () => {
  let adminToken: string;
  let db: any;

  beforeAll(async () => {
    db = initDb();
    adminToken = jwt.sign({ id: 1, username: 'admin', role: 'admin' }, SECRET_KEY);
  });

  it('should prevent creating a VM when limit is reached', async () => {
    // Set VM limit to 1
    db.prepare('UPDATE license SET vms_limit = ?').run(1);
    
    // Ensure we have at least 1 VM
    db.prepare("DELETE FROM resources WHERE type = 'vms'").run();
    db.prepare("INSERT INTO resources (type, name, status) VALUES ('vms', 'existing-vm', 'running')").run();
    
    // Try to create another VM
    const response = await request(app)
      .post('/api/vms')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'new-vm' });
    
    expect(response.status).toBe(403);
    expect(response.body.message).toContain('License limit reached');
  });

  it('should allow creating a VM when limit is not reached', async () => {
    // Set VM limit to 10
    db.prepare('UPDATE license SET vms_limit = ?').run(10);
    
    const response = await request(app)
      .post('/api/vms')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'allowed-vm' });
    
    expect(response.status).toBe(201);
  });

  it('should enforce container limits', async () => {
    db.prepare('UPDATE license SET containers_limit = ?').run(0);
    
    const response = await request(app)
      .post('/api/containers')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'denied-container' });
    
    expect(response.status).toBe(403);
    expect(response.body.message).toContain('License limit reached');
  });

  it('should enforce jail limits', async () => {
    db.prepare('UPDATE license SET jails_limit = ?').run(0);
    
    const response = await request(app)
      .post('/api/jails')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'denied-jail' });
    
    expect(response.status).toBe(403);
    expect(response.body.message).toContain('License limit reached');
  });
});
