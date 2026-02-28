import express from 'express';
import cors from 'cors';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { createServer as createHttpServer } from 'http';
import { createServer as createHttpsServer } from 'https';
import { Server } from 'socket.io';
import swaggerUi from 'swagger-ui-express';
import swaggerJsdoc from 'swagger-jsdoc';
import os from 'os';
import db, { initDb, logAction } from './db.ts';

import config from './config.ts';
import { ensureCertificates } from './ssl.ts';

const app = express();

const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'CloudBSD Admin API',
      version: '1.0.0',
      description: 'API documentation for the CloudBSD Admin Web UI',
      license: {
        name: 'BSD 3-Clause',
        url: 'https://opensource.org/licenses/BSD-3-Clause',
      },
      contact: {
        name: 'Mark LaPointe',
        email: 'mark@cloudbsd.org',
      },
    },
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
    },
    security: [{
      bearerAuth: [],
    }],
  },
  apis: ['./server/src/index.ts', './server/dist/index.js'],
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

let httpServer: any;

const sslCerts = ensureCertificates();

if (config.ssl.enabled && sslCerts) {
  httpServer = createHttpsServer({
    cert: sslCerts.cert,
    key: sslCerts.key
  }, app);
  console.log('SSL/TLS enabled');
} else {
  httpServer = createHttpServer(app);
}

const io = new Server(httpServer, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Terminal sessions (mock for now)
const terminalSessions = new Map<string, string>();

io.on('connection', (socket) => {
  console.log('User connected');

  socket.on('terminal_join', (data: { resourceId: string | number, resourceType: string }) => {
    const sessionId = `${socket.id}-${data.resourceId}`;
    terminalSessions.set(sessionId, '');
    console.log(`User joined terminal for ${data.resourceType} ${data.resourceId}`);
    
    // In demo mode, simulate some activity or initial output
    if (config.demoMode) {
      setTimeout(() => {
        socket.emit('terminal_output', { 
          resourceId: data.resourceId, 
          output: `\r\nWelcome to ${data.resourceType} console simulation.\r\nType something to see it echoed back.\r\n\r\n` 
        });
      }, 500);
    }
  });

  socket.on('terminal_data', (data: { resourceId: string | number, data: string }) => {
    // Echo back in demo mode
    if (config.demoMode) {
      if (data.data === '\r') {
        socket.emit('terminal_output', { resourceId: data.resourceId, output: '\r\n$ ' });
      } else {
        socket.emit('terminal_output', { resourceId: data.resourceId, output: data.data });
      }
    }
    // In a real system, you'd write to a PTY here
  });

  socket.on('terminal_leave', (data: { resourceId: string | number }) => {
    const sessionId = `${socket.id}-${data.resourceId}`;
    terminalSessions.delete(sessionId);
    console.log(`User left terminal for resource ${data.resourceId}`);
  });

  socket.on('disconnect', () => {
    console.log('User disconnected');
    // Cleanup sessions for this socket
    for (const [key] of terminalSessions) {
      if (key.startsWith(socket.id)) {
        terminalSessions.delete(key);
      }
    }
  });
});
const port = config.port;
const SECRET_KEY = config.secretKey;

app.use(cors());
app.use(express.json());

initDb();

// Middleware to verify JWT
const authenticateToken = (req: any, res: any, next: any) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) return res.sendStatus(401);

  jwt.verify(token, SECRET_KEY, (err: any, user: any) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
};

const isAdmin = (req: any, res: any, next: any) => {
  if (req.user && req.user.role === 'admin') {
    next();
  } else {
    res.status(403).json({ message: 'Admin access required' });
  }
};

const isOperator = (req: any, res: any, next: any) => {
  if (req.user && (req.user.role === 'admin' || req.user.role === 'operator')) {
    next();
  } else {
    res.status(403).json({ message: 'Operator access required' });
  }
};

// Auth routes
/**
 * @openapi
 * /api/health:
 *   get:
 *     summary: Check backend status
 *     tags: [Auth]
 *     security: []
 *     responses:
 *       200:
 *         description: Backend is healthy
 */
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date() });
});

/**
 * @openapi
 * /api/login:
 *   post:
 *     summary: Authenticate and receive JWT
 *     tags: [Auth]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               username:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Successfully authenticated
 *       401:
 *         description: Invalid credentials
 */
app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  const currentDb = initDb();
  const user = currentDb.prepare('SELECT * FROM users WHERE username = ?').get(username) as any;

  if (user && bcrypt.compareSync(password, user.password)) {
    logAction(user.id, 'LOGIN_SUCCESS', `User ${username} logged in`);
    const token = jwt.sign({ id: user.id, username: user.username, role: user.role, language: user.language }, SECRET_KEY, { expiresIn: '8h' });
    res.json({ token, user: { id: user.id, username: user.username, role: user.role, language: user.language } });
  } else {
    logAction(null, 'LOGIN_FAILURE', `Failed login attempt for user: ${username}`);
    res.status(401).json({ message: 'Invalid credentials' });
  }
});

// User management routes
/**
 * @openapi
 * /api/users:
 *   get:
 *     summary: List all users (Admin only)
 *     tags: [Users]
 *     responses:
 *       200:
 *         description: List of users
 */
app.get('/api/users', authenticateToken, isAdmin, (req, res) => {
  const currentDb = initDb();
  const users = currentDb.prepare('SELECT id, username, role, language FROM users').all();
  res.json(users);
});

/**
 * @openapi
 * /api/logs:
 *   get:
 *     summary: Fetch recent system audit logs (Admin only)
 *     tags: [Logs]
 *     responses:
 *       200:
 *         description: List of logs
 */
app.get('/api/logs', authenticateToken, isAdmin, (req, res) => {
  const currentDb = initDb();
  const logs = currentDb.prepare(`
    SELECT logs.*, users.username 
    FROM logs 
    LEFT JOIN users ON logs.user_id = users.id 
    ORDER BY logs.timestamp DESC 
    LIMIT 100
  `).all();
  res.json(logs);
});

/**
 * @openapi
 * /api/users:
 *   post:
 *     summary: Create new user (Admin only)
 *     tags: [Users]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               username:
 *                 type: string
 *               password:
 *                 type: string
 *               role:
 *                 type: string
 *                 enum: [admin, operator, viewer]
 *               language:
 *                 type: string
 *                 enum: [en, fr, es, "es-ES", pt, ro, ru, hi, pa, zh, ja, iu, "ar-IQ", tlh]
 *     responses:
 *       201:
 *         description: User created
 */
app.post('/api/users', authenticateToken, isAdmin, (req, res) => {
  const { username, password, role, language } = req.body;
  const hashedPassword = bcrypt.hashSync(password, 10);
  const currentDb = initDb();
  try {
    const result = currentDb.prepare('INSERT INTO users (username, password, role, language) VALUES (?, ?, ?, ?)').run(username, hashedPassword, role || 'viewer', language || 'en');
    logAction((req as any).user.id, 'USER_CREATE', `Created user ${username} with role ${role} and language ${language}`);
    res.status(201).json({ id: result.lastInsertRowid, username, role, language });
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
});

/**
 * @openapi
 * /api/users/{id}:
 *   delete:
 *     summary: Delete a user (Admin only)
 *     tags: [Users]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       204:
 *         description: User deleted
 */
app.delete('/api/users/:id', authenticateToken, isAdmin, (req, res) => {
  const { id } = req.params;
  const currentDb = initDb();
  const user = currentDb.prepare('SELECT username FROM users WHERE id = ?').get(id) as any;
  if (!user) return res.status(404).json({ message: 'User not found' });
  
  currentDb.prepare('DELETE FROM users WHERE id = ?').run(id);
  logAction((req as any).user.id, 'USER_DELETE', `Deleted user ${user.username}`);
  res.sendStatus(204);
});

// Cluster node management routes
/**
 * @openapi
 * /api/nodes:
 *   get:
 *     summary: List all cluster nodes
 *     tags: [Cluster]
 *     responses:
 *       200:
 *         description: List of nodes
 */
app.get('/api/nodes', authenticateToken, (req, res) => {
  const currentDb = initDb();
  const nodes = currentDb.prepare('SELECT * FROM nodes ORDER BY role DESC, name ASC').all();
  res.json(nodes);
});

/**
 * @openapi
 * /api/nodes:
 *   post:
 *     summary: Create new node (Admin/Operator only)
 *     tags: [Cluster]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               role:
 *                 type: string
 *               status:
 *                 type: string
 *               ip:
 *                 type: string
 *               cpu_total:
 *                 type: integer
 *               cpu_used:
 *                 type: integer
 *               mem_total:
 *                 type: string
 *               mem_used:
 *                 type: string
 *               disk_total:
 *                 type: string
 *               disk_used:
 *                 type: string
 *     responses:
 *       201:
 *         description: Node created
 */
app.post('/api/nodes', authenticateToken, isOperator, (req, res) => {
  const { name, role, status, ip, cpu_total, cpu_used, mem_total, mem_used, disk_total, disk_used } = req.body;
  const currentDb = initDb();
  try {
    const result = currentDb.prepare(`
      INSERT INTO nodes (name, role, status, ip, cpu_total, cpu_used, mem_total, mem_used, disk_total, disk_used) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      name, 
      role || 'agent', 
      status || 'online', 
      ip || '', 
      cpu_total || null, 
      cpu_used || null, 
      mem_total || null, 
      mem_used || null, 
      disk_total || null, 
      disk_used || null
    );
    logAction((req as any).user.id, 'NODE_CREATE', `Created node ${name} with role ${role}`);
    res.status(201).json({ id: result.lastInsertRowid, ...req.body });
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
});

/**
 * @openapi
 * /api/nodes/{id}:
 *   put:
 *     summary: Update a node (Admin/Operator only)
 *     tags: [Cluster]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               role:
 *                 type: string
 *               status:
 *                 type: string
 *               ip:
 *                 type: string
 *               cpu_total:
 *                 type: integer
 *               cpu_used:
 *                 type: integer
 *               mem_total:
 *                 type: string
 *               mem_used:
 *                 type: string
 *               disk_total:
 *                 type: string
 *               disk_used:
 *                 type: string
 *     responses:
 *       200:
 *         description: Node updated
 */
app.put('/api/nodes/:id', authenticateToken, isOperator, (req, res) => {
  const { id } = req.params;
  const { name, role, status, ip, cpu_total, cpu_used, mem_total, mem_used, disk_total, disk_used } = req.body;
  const currentDb = initDb();
  try {
    currentDb.prepare(`
      UPDATE nodes 
      SET name = ?, role = ?, status = ?, ip = ?, cpu_total = ?, cpu_used = ?, mem_total = ?, mem_used = ?, disk_total = ?, disk_used = ? 
      WHERE id = ?
    `).run(
      name, role, status, ip, cpu_total, cpu_used, mem_total, mem_used, disk_total, disk_used, id
    );
    logAction((req as any).user.id, 'NODE_UPDATE', `Updated node ${name} (ID: ${id})`);
    res.json({ id, ...req.body });
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
});

/**
 * @openapi
 * /api/cluster/stats:
 *   get:
 *     summary: Get aggregated cluster stats
 *     tags: [Cluster]
 *     responses:
 *       200:
 *         description: Aggregated stats
 */
app.get('/api/cluster/stats', authenticateToken, (req, res) => {
  const currentDb = initDb();
  const nodes = currentDb.prepare('SELECT * FROM nodes').all() as any[];
  
  const parseMemory = (mem: string | null) => {
    if (!mem) return 0;
    const match = mem.match(/(\d+)\s*(GB|MB|TB)/i);
    if (!match) return 0;
    const value = parseInt(match[1]);
    const unit = match[2].toUpperCase();
    if (unit === 'GB') return value * 1024;
    if (unit === 'TB') return value * 1024 * 1024;
    return value;
  };

  const parseDisk = (disk: string | null) => {
    if (!disk) return 0;
    const match = disk.match(/(\d+)\s*(GB|MB|TB)/i);
    if (!match) return 0;
    const value = parseInt(match[1]);
    const unit = match[2].toUpperCase();
    if (unit === 'GB') return value;
    if (unit === 'TB') return value * 1024;
    return value / 1024; // MB to GB
  };

  const stats = {
    total_cpu: 0,
    used_cpu: 0,
    total_mem_mb: 0,
    used_mem_mb: 0,
    total_disk_gb: 0,
    used_disk_gb: 0,
    node_count: nodes.length,
    online_nodes: nodes.filter(n => n.status === 'online').length
  };

  nodes.forEach(node => {
    stats.total_cpu += node.cpu_total || 0;
    stats.used_cpu += node.cpu_used || 0;
    stats.total_mem_mb += parseMemory(node.mem_total);
    stats.used_mem_mb += parseMemory(node.mem_used);
    stats.total_disk_gb += parseDisk(node.disk_total);
    stats.used_disk_gb += parseDisk(node.disk_used);
  });

  res.json({
    cpu: {
      total: stats.total_cpu,
      used: stats.used_cpu,
      percentage: stats.total_cpu > 0 ? Math.round((stats.used_cpu / stats.total_cpu) * 100) : 0
    },
    memory: {
      total: `${(stats.total_mem_mb / 1024).toFixed(1)}GB`,
      used: `${(stats.used_mem_mb / 1024).toFixed(1)}GB`,
      percentage: stats.total_mem_mb > 0 ? Math.round((stats.used_mem_mb / stats.total_mem_mb) * 100) : 0
    },
    disk: {
      total: stats.total_disk_gb >= 1024 ? `${(stats.total_disk_gb / 1024).toFixed(1)}TB` : `${stats.total_disk_gb.toFixed(1)}GB`,
      used: stats.used_disk_gb >= 1024 ? `${(stats.used_disk_gb / 1024).toFixed(1)}TB` : `${stats.used_disk_gb.toFixed(1)}GB`,
      percentage: stats.total_disk_gb > 0 ? Math.round((stats.used_disk_gb / stats.total_disk_gb) * 100) : 0
    },
    nodes: {
      total: stats.node_count,
      online: stats.online_nodes
    }
  });
});

/**
 * @openapi
 * /api/nodes/{id}:
 *   delete:
 *     summary: Delete a node (Admin only)
 *     tags: [Cluster]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       204:
 *         description: Node deleted
 */
app.delete('/api/nodes/:id', authenticateToken, isAdmin, (req, res) => {
  const { id } = req.params;
  const currentDb = initDb();
  
  // Before deleting, assign resources to another node or set to NULL
  currentDb.prepare('UPDATE resources SET node_id = NULL WHERE node_id = ?').run(id);
  
  currentDb.prepare('DELETE FROM nodes WHERE id = ?').run(id);
  logAction((req as any).user.id, 'NODE_DELETE', `Deleted node ID: ${id}`);
  res.sendStatus(204);
});

// Resource routes
/**
 * @openapi
 * /api/{resource}:
 *   get:
 *     summary: List resources of a specific type
 *     tags: [Resources]
 *     parameters:
 *       - in: path
 *         name: resource
 *         required: true
 *         schema:
 *           type: string
 *           enum: [vms, containers, jails]
 *     responses:
 *       200:
 *         description: List of resources
 */
app.get('/api/:resource', authenticateToken, (req, res) => {
  const { resource } = req.params;
  const validResources = ['vms', 'containers', 'jails'];
  if (!validResources.includes(resource)) {
    return res.status(400).json({ message: 'Invalid resource type' });
  }

  const currentDb = initDb();
  const items = currentDb.prepare(`
    SELECT resources.*, nodes.name as node_name 
    FROM resources 
    LEFT JOIN nodes ON resources.node_id = nodes.id 
    WHERE type = ?
  `).all(resource);
  res.json(items);
});

/**
 * @openapi
 * /api/{resource}:
 *   post:
 *     summary: Create new resource (Operator/Admin)
 *     tags: [Resources]
 *     parameters:
 *       - in: path
 *         name: resource
 *         required: true
 *         schema:
 *           type: string
 *           enum: [vms, containers, jails]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               image:
 *                 type: string
 *               ip:
 *                 type: string
 *               cpu:
 *                 type: integer
 *               memory:
 *                 type: string
 *     responses:
 *       201:
 *         description: Resource created
 */
app.post('/api/:resource', authenticateToken, isOperator, (req, res) => {
  const { resource } = req.params;
  const { name, image, ip, cpu, memory } = req.body;
  const validResources = ['vms', 'containers', 'jails'];
  
  if (!validResources.includes(resource)) {
    return res.status(400).json({ message: 'Invalid resource type' });
  }

  let status = 'stopped';
  if (resource === 'jails') status = 'inactive';
  if (resource === 'containers') status = 'exited';

  const currentDb = initDb();
  try {
    const result = currentDb.prepare(`
      INSERT INTO resources (type, name, status, image, ip, cpu, memory, node_id) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(resource, name, status, image || null, ip || null, cpu || null, memory || null, req.body.node_id || null);
    
    logAction((req as any).user.id, `RESOURCE_CREATE`, `Created ${resource} ${name}`);
    io.emit('resource_update', { resource, timestamp: new Date() });
    
    res.status(201).json({ id: result.lastInsertRowid, name, status });
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
});

/**
 * @openapi
 * /api/{resource}/{id}:
 *   delete:
 *     summary: Remove resource (Operator/Admin)
 *     tags: [Resources]
 *     parameters:
 *       - in: path
 *         name: resource
 *         required: true
 *         schema:
 *           type: string
 *           enum: [vms, containers, jails]
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       204:
 *         description: Resource deleted
 */
app.delete('/api/:resource/:id', authenticateToken, isOperator, (req, res) => {
  const { resource, id } = req.params;
  const validResources = ['vms', 'containers', 'jails'];
  
  if (!validResources.includes(resource)) {
    return res.status(400).json({ message: 'Invalid resource type' });
  }

  const currentDb = initDb();
  try {
    const result = currentDb.prepare('DELETE FROM resources WHERE id = ? AND type = ?').run(id, resource);
    if (result.changes === 0) return res.status(404).json({ message: 'Resource not found' });
    
    logAction((req as any).user.id, `RESOURCE_DELETE`, `Deleted ${resource} ${id}`);
    io.emit('resource_update', { resource, timestamp: new Date() });
    
    res.sendStatus(204);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
});

/**
 * @openapi
 * /api/{resource}/{id}:
 *   put:
 *     summary: Update existing resource (Operator/Admin)
 *     tags: [Resources]
 *     parameters:
 *       - in: path
 *         name: resource
 *         required: true
 *         schema:
 *           type: string
 *           enum: [vms, containers, jails]
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               image:
 *                 type: string
 *               ip:
 *                 type: string
 *               cpu:
 *                 type: integer
 *               memory:
 *                 type: string
 *     responses:
 *       200:
 *         description: Resource updated
 */
app.put('/api/:resource/:id', authenticateToken, isOperator, (req, res) => {
  const { resource, id } = req.params;
  const { name, image, ip, cpu, memory } = req.body;
  const validResources = ['vms', 'containers', 'jails'];
  
  if (!validResources.includes(resource)) {
    return res.status(400).json({ message: 'Invalid resource type' });
  }

  const currentDb = initDb();
  try {
    const result = currentDb.prepare(`
      UPDATE resources 
      SET name = ?, image = ?, ip = ?, cpu = ?, memory = ?, node_id = ?
      WHERE id = ? AND type = ?
    `).run(name, image || null, ip || null, cpu || null, memory || null, req.body.node_id || null, id, resource);
    
    if (result.changes === 0) return res.status(404).json({ message: 'Resource not found' });

    logAction((req as any).user.id, `RESOURCE_UPDATE`, `Updated ${resource} ${name} (ID: ${id})`);
    io.emit('resource_update', { resource, timestamp: new Date() });
    
    res.json({ message: 'Resource updated successfully' });
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
});

// Resource actions
/**
 * @openapi
 * /api/{resource}/{id}/{action}:
 *   post:
 *     summary: Execute action on resource (Operator/Admin)
 *     tags: [Resources]
 *     parameters:
 *       - in: path
 *         name: resource
 *         required: true
 *         schema:
 *           type: string
 *           enum: [vms, containers, jails]
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *       - in: path
 *         name: action
 *         required: true
 *         schema:
 *           type: string
 *           enum: [start, stop, restart]
 *     responses:
 *       200:
 *         description: Action executed successfully
 */
app.post('/api/:resource/:id/:action', authenticateToken, isOperator, (req, res) => {
  const { resource, id, action } = req.params;
  const validResources = ['vms', 'containers', 'jails'];
  const validActions = ['start', 'stop', 'restart'];

  if (!validResources.includes(resource) || !validActions.includes(action)) {
    return res.status(400).json({ message: 'Invalid resource or action' });
  }

  const currentDb = initDb();
  if (config.demoMode) {
    let nextStatus = '';
    if (action === 'start' || action === 'restart') {
      nextStatus = resource === 'jails' ? 'active' : (resource === 'containers' ? 'up' : 'running');
    } else {
      nextStatus = resource === 'jails' ? 'inactive' : (resource === 'containers' ? 'exited' : 'stopped');
    }
    currentDb.prepare('UPDATE resources SET status = ? WHERE id = ? AND type = ?').run(nextStatus, id, resource);
  }

  logAction((req as any).user.id, `RESOURCE_${action.toUpperCase()}`, `${action}ed ${resource} ${id}`);
  
  // Broadcast update to all clients
  io.emit('resource_update', { resource, timestamp: new Date() });
  
  res.json({ message: `Successfully ${action}ed ${resource} ${id}` });
});

// System routes
/**
 * @openapi
 * /api/system/stats:
 *   get:
 *     summary: Real-time health metrics
 *     tags: [System]
 *     responses:
 *       200:
 *         description: System stats
 */
app.get('/api/system/stats', authenticateToken, (req, res) => {
  // In a real app, these would come from the OS (e.g. sysctl on FreeBSD)
  const cpuUsage = Math.floor(Math.random() * 25) + 5;
  const freeMem = os.freemem();
  const totalMem = os.totalmem();
  const memUsage = Math.floor(((totalMem - freeMem) / totalMem) * 100);
  
  const uptimeSeconds = os.uptime();
  const days = Math.floor(uptimeSeconds / (24 * 3600));
  const hours = Math.floor((uptimeSeconds % (24 * 3600)) / 3600);
  const minutes = Math.floor((uptimeSeconds % 3600) / 60);
  const uptimeString = `${days}d ${hours}h ${minutes}m`;

  res.json({
    cpu: cpuUsage,
    memory: memUsage,
    disk: 38,
    network: {
      in: (Math.random() * 5).toFixed(2),
      out: (Math.random() * 2).toFixed(2)
    },
    uptime: uptimeString
  });
});

/**
 * @openapi
 * /api/system/host:
 *   get:
 *     summary: Detailed host information
 *     tags: [System]
 *     responses:
 *       200:
 *         description: Host information
 */
app.get('/api/system/host', authenticateToken, (req, res) => {
  res.json({
    hostname: os.hostname(),
    platform: os.platform(),
    release: os.release(),
    arch: os.arch(),
    cpus: os.cpus().length,
    cpuModel: os.cpus()[0].model,
    totalMemory: (os.totalmem() / (1024 * 1024 * 1024)).toFixed(2) + ' GB',
    freeMemory: (os.freemem() / (1024 * 1024 * 1024)).toFixed(2) + ' GB',
    loadAverage: os.loadavg()
  });
});

/**
 * @openapi
 * /api/system/info:
 *   get:
 *     summary: Server hardware/OS details
 *     tags: [System]
 *     responses:
 *       200:
 *         description: Server information
 */
app.get('/api/system/info', authenticateToken, (req, res) => {
  res.json({
    hostname: os.hostname(),
    os: `${os.type()} ${os.release()}`,
    cpu: os.cpus()[0].model,
    cores: `${os.cpus().length} Cores`
  });
});

/**
 * @openapi
 * /api/system/config:
 *   get:
 *     summary: System configuration (Admin only)
 *     tags: [System]
 *     responses:
 *       200:
 *         description: System configuration
 */
app.get('/api/system/config', authenticateToken, isAdmin, (req, res) => {
  res.json({
    port: config.port,
    servername: config.servername,
    dbPath: config.dbPath,
    demoMode: config.demoMode,
    ssl: {
      enabled: config.ssl.enabled
    }
  });
});

/**
 * @openapi
 * /api/system/license:
 *   get:
 *     summary: Get license information
 *     tags: [System]
 *     responses:
 *       200:
 *         description: License details
 */
app.get('/api/system/license', authenticateToken, (req, res) => {
  const currentDb = initDb();
  const license = currentDb.prepare('SELECT * FROM license LIMIT 1').get() as any;
  
  if (license) {
    if (license.features) {
      license.features = JSON.parse(license.features);
    }

    // Get current usage counts
    const nodesCount = currentDb.prepare('SELECT COUNT(*) as count FROM nodes').get() as any;
    const vmsCount = currentDb.prepare("SELECT COUNT(*) as count FROM resources WHERE type = 'vms'").get() as any;
    const containersCount = currentDb.prepare("SELECT COUNT(*) as count FROM resources WHERE type = 'containers'").get() as any;
    const jailsCount = currentDb.prepare("SELECT COUNT(*) as count FROM resources WHERE type = 'jails'").get() as any;

    license.usage = {
      nodes: nodesCount.count,
      vms: vmsCount.count,
      containers: containersCount.count,
      jails: jailsCount.count
    };
  }
  
  res.json(license || null);
});

/**
 * @openapi
 * /api/system/license:
 *   post:
 *     summary: Update license key
 *     tags: [System]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               license_key:
 *                 type: string
 *     responses:
 *       200:
 *         description: License updated
 */
app.post('/api/system/license', authenticateToken, isAdmin, (req, res) => {
  const { license_key } = req.body;
  if (!license_key) {
    return res.status(400).json({ message: 'License key is required' });
  }

  const currentDb = initDb();
  
  // In a real app, you would validate the key against a server or use crypto
  // For demo, we'll simulate a successful update if the key starts with 'CBSD-'
  if (license_key.startsWith('CBSD-')) {
    const isEnterprise = license_key.includes('ENT');
    const isStandard = license_key.includes('STD');
    
    let type = 'trial';
    let nodes = 5;
    let vms = 20;
    let containers = 100;
    let jails = 50;
    let support = 'community';
    let features = ['clustering', 'api_access', 'live_migration'];

    if (isEnterprise) {
      type = 'enterprise';
      nodes = 99999;
      vms = 99999;
      containers = 99999;
      jails = 99999;
      support = '24/7';
      features = [...features, 'high_availability', 'advanced_backup', 'dedicated_support'];
    } else if (isStandard) {
      type = 'standard';
      nodes = 25;
      vms = 100;
      containers = 500;
      jails = 200;
      support = 'business';
      features = [...features, 'advanced_backup'];
    }

    const expiryDate = new Date();
    expiryDate.setFullYear(expiryDate.getFullYear() + 1);

    currentDb.prepare(`
      UPDATE license SET 
        license_key = ?, license_type = ?, status = 'active', 
        nodes_limit = ?, vms_limit = ?, containers_limit = ?, 
        jails_limit = ?, expiry_date = ?, support_tier = ?, 
        registered_to = 'Licensed Customer', features = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = (SELECT id FROM license LIMIT 1)
    `).run(
      license_key, type, nodes, vms, containers, jails, 
      expiryDate.toISOString(), support, JSON.stringify(features)
    );

    logAction((req as any).user.id, 'LICENSE_UPDATE', `Updated license to ${type}`);
    
    // Fetch updated license to return
    const updatedLicense = currentDb.prepare('SELECT * FROM license LIMIT 1').get() as any;
    if (updatedLicense && updatedLicense.features) {
      updatedLicense.features = JSON.parse(updatedLicense.features);
    }
    
    return res.json({ 
      message: 'License registered successfully',
      license: updatedLicense
    });
  } else {
    return res.status(400).json({ message: 'Invalid license key format' });
  }
});

io.on('connection', (socket) => {
  console.log('A user connected');
  socket.on('disconnect', () => {
    console.log('User disconnected');
  });
});

// Mock real-time updates
setInterval(() => {
  const resources = ['vms', 'docker', 'jails', 'podman'];
  const resource = resources[Math.floor(Math.random() * resources.length)];
  io.emit('resource_update', { resource, timestamp: new Date() });
}, 5000);

httpServer.listen(port, () => {
  const protocol = config.ssl.enabled ? 'https' : 'http';
  console.log(`Server running on ${protocol}://${config.servername}:${port}`);
});
