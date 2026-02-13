import { describe, it, expect, beforeAll } from 'vitest';
import bcrypt from 'bcryptjs';
import { db, initDb } from './db.ts';

describe('Database Logic', () => {
  beforeAll(() => {
    initDb();
  });

  it('should have an admin user', () => {
    const user = db.prepare('SELECT * FROM users WHERE username = ?').get('admin') as any;
    expect(user).toBeDefined();
    expect(user.username).toBe('admin');
    expect(user.role).toBe('admin');
  });

  it('should verify admin password correctly', () => {
    const user = db.prepare('SELECT * FROM users WHERE username = ?').get('admin') as any;
    const isValid = bcrypt.compareSync('admin', user.password);
    expect(isValid).toBe(true);
  });

  it('should have seeded resources in demo mode', () => {
    const vms = db.prepare('SELECT * FROM resources WHERE type = ?').all('vms') as any[];
    expect(vms.length).toBeGreaterThan(0);
    expect(vms[0].name).toBe('web-server');
  });

  it('should allow creating new resources', () => {
    const stmt = db.prepare('INSERT INTO resources (type, name, status) VALUES (?, ?, ?)');
    const result = stmt.run('vms', 'test-vm', 'stopped');
    expect(result.changes).toBe(1);
    
    const vm = db.prepare('SELECT * FROM resources WHERE id = ?').get(result.lastInsertRowid) as any;
    expect(vm.name).toBe('test-vm');
    expect(vm.type).toBe('vms');
  });
});
