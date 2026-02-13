import { describe, it, expect, beforeAll } from 'vitest';
import { db, initDb } from './db.ts';

describe('Database Schema', () => {
  beforeAll(() => {
    initDb();
  });

  const getTableInfo = (tableName: string) => {
    return db.prepare(`PRAGMA table_info(${tableName})`).all() as any[];
  };

  it('should have the correct fields in the users table', () => {
    const columns = getTableInfo('users');
    const columnNames = columns.map(c => c.name);
    
    expect(columnNames).toContain('id');
    expect(columnNames).toContain('username');
    expect(columnNames).toContain('password');
    expect(columnNames).toContain('role');
    
    // Check types (roughly)
    const idCol = columns.find(c => c.name === 'id');
    expect(idCol.type).toBe('INTEGER');
    expect(idCol.pk).toBe(1);

    const usernameCol = columns.find(c => c.name === 'username');
    expect(usernameCol.type).toBe('TEXT');
    expect(usernameCol.notnull).toBe(1);
  });

  it('should have the correct fields in the resources table', () => {
    const columns = getTableInfo('resources');
    const columnNames = columns.map(c => c.name);
    
    expect(columnNames).toContain('id');
    expect(columnNames).toContain('type');
    expect(columnNames).toContain('name');
    expect(columnNames).toContain('status');
    expect(columnNames).toContain('image');
    expect(columnNames).toContain('ip');
    expect(columnNames).toContain('cpu');
    expect(columnNames).toContain('memory');
    expect(columnNames).toContain('created_at');

    expect(columns.find(c => c.name === 'type').type).toBe('TEXT');
    expect(columns.find(c => c.name === 'name').type).toBe('TEXT');
  });

  it('should have the correct fields in the logs table', () => {
    const columns = getTableInfo('logs');
    const columnNames = columns.map(c => c.name);
    
    expect(columnNames).toContain('id');
    expect(columnNames).toContain('timestamp');
    expect(columnNames).toContain('user_id');
    expect(columnNames).toContain('action');
    expect(columnNames).toContain('details');

    expect(columns.find(c => c.name === 'action').type).toBe('TEXT');
  });

  it('should have the correct fields in the permissions table', () => {
    const columns = getTableInfo('permissions');
    const columnNames = columns.map(c => c.name);
    
    expect(columnNames).toContain('id');
    expect(columnNames).toContain('user_id');
    expect(columnNames).toContain('resource');
    expect(columnNames).toContain('action');
  });
});
