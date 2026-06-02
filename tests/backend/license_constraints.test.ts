import { expect, it, describe, beforeAll } from 'vitest';
import request from 'supertest';
import { initDb } from '../../server/src/db';
import { app } from '../../server/src/index';
import { loginAndPrimeCsrf, withCsrf, type CsrfPrimedSession } from './helpers';

describe('License Constraints', () => {
  let session: CsrfPrimedSession;
  let db: any;

  beforeAll(async () => {
    db = initDb();
    session = await loginAndPrimeCsrf(app);
  });

  it('should prevent creating a VM when limit is reached', async () => {
    db.prepare('UPDATE license SET vms_limit = ?').run(1);

    db.prepare("DELETE FROM resources WHERE type = 'vms'").run();
    db.prepare("INSERT INTO resources (type, name, status) VALUES ('vms', 'existing-vm', 'running')").run();

    const response = await withCsrf(
      request(app).post('/api/vms'),
      session
    ).send({ name: 'new-vm' });

    expect(response.status).toBe(403);
    expect(response.body.message).toContain('License limit reached');
  });

  it('should allow creating a VM when limit is not reached', async () => {
    db.prepare('UPDATE license SET vms_limit = ?').run(10);

    const response = await withCsrf(
      request(app).post('/api/vms'),
      session
    ).send({ name: 'allowed-vm' });

    expect(response.status).toBe(201);
  });

  it('should enforce container limits', async () => {
    db.prepare('UPDATE license SET containers_limit = ?').run(0);

    const response = await withCsrf(
      request(app).post('/api/containers'),
      session
    ).send({ name: 'denied-container' });

    expect(response.status).toBe(403);
    expect(response.body.message).toContain('License limit reached');
  });

  it('should enforce jail limits', async () => {
    db.prepare('UPDATE license SET jails_limit = ?').run(0);

    const response = await withCsrf(
      request(app).post('/api/jails'),
      session
    ).send({ name: 'denied-jail' });

    expect(response.status).toBe(403);
    expect(response.body.message).toContain('License limit reached');
  });
});
