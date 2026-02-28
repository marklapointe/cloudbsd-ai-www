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

  const newDb = new Database(config.dbPath);
  newDb.pragma('journal_mode = WAL');

  newDb.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'viewer' -- 'admin', 'operator', 'viewer'
    );

    CREATE TABLE IF NOT EXISTS permissions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      resource TEXT NOT NULL, -- 'vms', 'containers', 'jails'
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
      type TEXT NOT NULL, -- 'vms', 'containers', 'jails'
      name TEXT NOT NULL,
      status TEXT NOT NULL,
      image TEXT,
      ip TEXT,
      cpu INTEGER,
      memory TEXT,
      disk TEXT,
      node_id INTEGER, -- Link to the node hosting this resource
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (node_id) REFERENCES nodes (id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS nodes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL,
      role TEXT NOT NULL DEFAULT 'worker', -- 'main', 'worker'
      status TEXT NOT NULL DEFAULT 'online', -- 'online', 'offline', 'maintenance'
      ip TEXT,
      cpu_total INTEGER,
      cpu_used INTEGER,
      mem_total TEXT,
      mem_used TEXT,
      disk_total TEXT,
      disk_used TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Check if node_id column exists in resources table (for migration if db exists)
  const tableInfo = newDb.prepare("PRAGMA table_info(resources)").all() as any[];
  const hasNodeId = tableInfo.some(col => col.name === 'node_id');
  if (!hasNodeId) {
    try {
      newDb.exec("ALTER TABLE resources ADD COLUMN node_id INTEGER REFERENCES nodes (id) ON DELETE SET NULL;");
    } catch (e) {
      console.error("Migration failed (node_id): ", e);
    }
  }

  const hasDisk = tableInfo.some(col => col.name === 'disk');
  if (!hasDisk) {
    try {
      newDb.exec("ALTER TABLE resources ADD COLUMN disk TEXT;");
    } catch (e) {
      console.error("Migration failed (disk): ", e);
    }
  }

  // Check nodes table for new metric columns
  const nodeTableInfo = newDb.prepare("PRAGMA table_info(nodes)").all() as any[];
  const newCols = ['cpu_total', 'cpu_used', 'mem_total', 'mem_used', 'disk_total', 'disk_used'];
  for (const col of newCols) {
    if (!nodeTableInfo.some(c => c.name === col)) {
      try {
        const type = col.startsWith('cpu') ? 'INTEGER' : 'TEXT';
        newDb.exec(`ALTER TABLE nodes ADD COLUMN ${col} ${type};`);
      } catch (e) {
        console.error(`Migration failed (${col}): `, e);
      }
    }
  }

  // Create default main node if not exists
  const mainNode = newDb.prepare('SELECT id FROM nodes WHERE role = ?').get('main') as any;
  if (!mainNode) {
    newDb.prepare('INSERT INTO nodes (name, role, status, ip, cpu_total, cpu_used, mem_total, mem_used, disk_total, disk_used) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
      .run('CloudBSD Main', 'main', 'online', '127.0.0.1', 8, 2, '32GB', '8GB', '500GB', '120GB');
  } else {
    // Update existing main node with metrics if they are null
    newDb.prepare('UPDATE nodes SET cpu_total = ?, cpu_used = ?, mem_total = ?, mem_used = ?, disk_total = ?, disk_used = ? WHERE id = ? AND cpu_total IS NULL')
      .run(8, 2, '32GB', '8GB', '500GB', '120GB', mainNode.id);
  }

  // Assign existing resources to the main node if they don't have a node_id
  const defaultNode = newDb.prepare('SELECT id FROM nodes WHERE role = ?').get('main') as any;
  if (defaultNode) {
    newDb.prepare('UPDATE resources SET node_id = ? WHERE node_id IS NULL').run(defaultNode.id);
  }

  // Create some fake worker nodes for demo
  if (config.demoMode) {
    const workerCount = newDb.prepare("SELECT COUNT(*) as count FROM nodes WHERE role = 'worker'").get() as any;
    if (workerCount.count === 0) {
      const workers = [
        { name: 'bsd-worker-01', role: 'worker', status: 'online', ip: '192.168.1.50', cpu_total: 16, cpu_used: 4, mem_total: '64GB', mem_used: '12GB', disk_total: '1TB', disk_used: '200GB' },
        { name: 'bsd-worker-02', role: 'worker', status: 'online', ip: '192.168.1.51', cpu_total: 4, cpu_used: 1, mem_total: '8GB', mem_used: '2GB', disk_total: '250GB', disk_used: '50GB' },
        { name: 'bsd-worker-03', role: 'worker', status: 'offline', ip: '192.168.1.52', cpu_total: 8, cpu_used: 0, mem_total: '16GB', mem_used: '0GB', disk_total: '500GB', disk_used: '0GB' }
      ];
      const stmt = newDb.prepare('INSERT INTO nodes (name, role, status, ip, cpu_total, cpu_used, mem_total, mem_used, disk_total, disk_used) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
      for (const w of workers) {
        stmt.run(w.name, w.role, w.status, w.ip, w.cpu_total, w.cpu_used, w.mem_total, w.mem_used, w.disk_total, w.disk_used);
      }
    }
  }

  // Create default admin if not exists
  const admin = newDb.prepare('SELECT id FROM users WHERE username = ?').get('admin');
  if (!admin) {
    const hashedPassword = bcrypt.hashSync('admin', 10);
    newDb.prepare('INSERT INTO users (username, password, role) VALUES (?, ?, ?)').run('admin', hashedPassword, 'admin');
  }

  // Seed some initial data if table is empty
  const resourceCount = newDb.prepare('SELECT COUNT(*) as count FROM resources').get() as any;
  if (resourceCount.count === 0 && config.demoMode) {
    const worker1 = newDb.prepare("SELECT id FROM nodes WHERE name = 'bsd-worker-01'").get() as any;
    const worker2 = newDb.prepare("SELECT id FROM nodes WHERE name = 'bsd-worker-02'").get() as any;

    const seedResources = [
      { type: 'vms', name: 'web-server', status: 'running', cpu: 1, memory: '2GB', disk: '20GB', node_id: defaultNode.id },
      { type: 'vms', name: 'db-server', status: 'stopped', cpu: 2, memory: '4GB', disk: '50GB', node_id: defaultNode.id },
      { type: 'containers', name: 'nginx-proxy', status: 'up', image: 'nginx:latest', disk: '1GB', node_id: worker1?.id || defaultNode.id },
      { type: 'containers', name: 'redis-cache', status: 'exited', image: 'redis:6', disk: '2GB', node_id: worker1?.id || defaultNode.id },
      { type: 'jails', name: 'app-jail', status: 'active', ip: '192.168.1.10', cpu: 1, memory: '1GB', disk: '10GB', node_id: worker2?.id || defaultNode.id },
      { type: 'containers', name: 'container-worker', status: 'running', image: 'fedora:latest', disk: '5GB', node_id: worker1?.id || defaultNode.id },
      { type: 'containers', name: 'postgres-db', status: 'running', image: 'postgres:15-alpine', disk: '10GB', node_id: worker2?.id || defaultNode.id },
      { type: 'containers', name: 'monitoring-agent', status: 'running', image: 'prometheus:latest', disk: '5GB', node_id: worker1?.id || defaultNode.id },
      { type: 'containers', name: 'logging-sidecar', status: 'up', image: 'fluentd:latest', disk: '1GB', node_id: worker2?.id || defaultNode.id }
    ];

    const stmt = newDb.prepare('INSERT INTO resources (type, name, status, image, ip, cpu, memory, disk, node_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)');
    for (const res of seedResources) {
      stmt.run(res.type, res.name, res.status, res.image || null, res.ip || null, res.cpu || null, res.memory || null, res.disk || null, res.node_id);
    }
  }

  db = newDb;
  return db;
}

export function logAction(userId: number | null, action: string, details?: string) {
  if (!db) initDb();
  db.prepare('INSERT INTO logs (user_id, action, details) VALUES (?, ?, ?)').run(userId, action, details || null);
}

export { db };
export default db;
