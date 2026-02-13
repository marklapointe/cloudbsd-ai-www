import fs from 'fs';
import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

import config from './config.ts';

import bcrypt from 'bcryptjs';

let db: Database.Database = null as any;

export function initDb() {
  if (db) return db;

  // Check if database file exists
  if (!fs.existsSync(config.dbPath)) {
    console.log(`Database file not found at ${config.dbPath}. A new database will be created.`);
    
    // Ensure the directory exists
    const dbDir = path.dirname(config.dbPath);
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }
  } else {
    console.log(`Using existing database file at ${config.dbPath}`);
  }

  db = new Database(config.dbPath);
  db.pragma('journal_mode = WAL');

  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'viewer' -- 'admin', 'operator', 'viewer'
    );

    CREATE TABLE IF NOT EXISTS permissions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      resource TEXT NOT NULL, -- 'vms', 'docker', 'jails', 'podman'
      action TEXT NOT NULL,   -- 'read', 'write', 'admin'
      FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
      user_id INTEGER,
      action TEXT NOT NULL,
      details TEXT,
      FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS resources (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      type TEXT NOT NULL, -- 'vms', 'docker', 'jails', 'podman'
      name TEXT NOT NULL,
      status TEXT NOT NULL,
      image TEXT,
      ip TEXT,
      cpu INTEGER,
      memory TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Create default admin if not exists
  const admin = db.prepare('SELECT id FROM users WHERE username = ?').get('admin');
  if (!admin) {
    const hashedPassword = bcrypt.hashSync('admin', 10);
    db.prepare('INSERT INTO users (username, password, role) VALUES (?, ?, ?)').run('admin', hashedPassword, 'admin');
  }

  // Seed some initial data if table is empty
  const resourceCount = db.prepare('SELECT COUNT(*) as count FROM resources').get() as any;
  if (resourceCount.count === 0 && config.demoMode) {
    const seedResources = [
      { type: 'vms', name: 'web-server', status: 'running', cpu: 1, memory: '2GB' },
      { type: 'vms', name: 'db-server', status: 'stopped', cpu: 2, memory: '4GB' },
      { type: 'docker', name: 'nginx-proxy', status: 'up', image: 'nginx:latest' },
      { type: 'docker', name: 'redis-cache', status: 'exited', image: 'redis:6' },
      { type: 'jails', name: 'app-jail', status: 'active', ip: '192.168.1.10' },
      { type: 'podman', name: 'podman-worker', status: 'running', image: 'fedora:latest' }
    ];

    const stmt = db.prepare('INSERT INTO resources (type, name, status, image, ip, cpu, memory) VALUES (?, ?, ?, ?, ?, ?, ?)');
    for (const res of seedResources) {
      stmt.run(res.type, res.name, res.status, res.image || null, res.ip || null, res.cpu || null, res.memory || null);
    }
  }
}

export function logAction(userId: number | null, action: string, details?: string) {
  if (!db) initDb();
  db.prepare('INSERT INTO logs (user_id, action, details) VALUES (?, ?, ?)').run(userId, action, details || null);
}

export { db };
export default db;
