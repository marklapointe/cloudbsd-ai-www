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
  if (!db) initDb();
  const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username) as any;

  if (user && bcrypt.compareSync(password, user.password)) {
    logAction(user.id, 'LOGIN_SUCCESS', `User ${username} logged in`);
    const token = jwt.sign({ id: user.id, username: user.username, role: user.role }, SECRET_KEY, { expiresIn: '8h' });
    res.json({ token, user: { id: user.id, username: user.username, role: user.role } });
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
  const users = db.prepare('SELECT id, username, role FROM users').all();
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
  const logs = db.prepare(`
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
 *     responses:
 *       201:
 *         description: User created
 */
app.post('/api/users', authenticateToken, isAdmin, (req, res) => {
  const { username, password, role } = req.body;
  const hashedPassword = bcrypt.hashSync(password, 10);
  try {
    const result = db.prepare('INSERT INTO users (username, password, role) VALUES (?, ?, ?)').run(username, hashedPassword, role || 'viewer');
    logAction((req as any).user.id, 'USER_CREATE', `Created user ${username} with role ${role}`);
    res.status(201).json({ id: result.lastInsertRowid, username, role });
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
  const user = db.prepare('SELECT username FROM users WHERE id = ?').get(id) as any;
  if (!user) return res.status(404).json({ message: 'User not found' });
  
  db.prepare('DELETE FROM users WHERE id = ?').run(id);
  logAction((req as any).user.id, 'USER_DELETE', `Deleted user ${user.username}`);
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
 *           enum: [vms, docker, jails, podman]
 *     responses:
 *       200:
 *         description: List of resources
 */
app.get('/api/:resource', authenticateToken, (req, res) => {
  const { resource } = req.params;
  const validResources = ['vms', 'docker', 'jails', 'podman'];
  if (!validResources.includes(resource)) {
    return res.status(400).json({ message: 'Invalid resource type' });
  }

  const resources = db.prepare('SELECT * FROM resources WHERE type = ?').all(resource);
  res.json(resources);
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
 *           enum: [vms, docker, jails, podman]
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
  const validResources = ['vms', 'docker', 'jails', 'podman'];
  
  if (!validResources.includes(resource)) {
    return res.status(400).json({ message: 'Invalid resource type' });
  }

  let status = 'stopped';
  if (resource === 'jails') status = 'inactive';
  if (resource === 'docker' || resource === 'podman') status = 'exited';

  try {
    const result = db.prepare(`
      INSERT INTO resources (type, name, status, image, ip, cpu, memory) 
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(resource, name, status, image || null, ip || null, cpu || null, memory || null);
    
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
 *           enum: [vms, docker, jails, podman]
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
  const validResources = ['vms', 'docker', 'jails', 'podman'];
  
  if (!validResources.includes(resource)) {
    return res.status(400).json({ message: 'Invalid resource type' });
  }

  try {
    const result = db.prepare('DELETE FROM resources WHERE id = ? AND type = ?').run(id, resource);
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
 *           enum: [vms, docker, jails, podman]
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
  const validResources = ['vms', 'docker', 'jails', 'podman'];
  
  if (!validResources.includes(resource)) {
    return res.status(400).json({ message: 'Invalid resource type' });
  }

  try {
    const result = db.prepare(`
      UPDATE resources 
      SET name = ?, image = ?, ip = ?, cpu = ?, memory = ?
      WHERE id = ? AND type = ?
    `).run(name, image || null, ip || null, cpu || null, memory || null, id, resource);
    
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
 *           enum: [vms, docker, jails, podman]
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
  const validResources = ['vms', 'docker', 'jails', 'podman'];
  const validActions = ['start', 'stop', 'restart'];

  if (!validResources.includes(resource) || !validActions.includes(action)) {
    return res.status(400).json({ message: 'Invalid resource or action' });
  }

  if (config.demoMode) {
    let nextStatus = '';
    if (action === 'start' || action === 'restart') {
      nextStatus = resource === 'jails' ? 'active' : (resource === 'docker' || resource === 'podman' ? 'up' : 'running');
    } else {
      nextStatus = resource === 'jails' ? 'inactive' : (resource === 'docker' || resource === 'podman' ? 'exited' : 'stopped');
    }
    db.prepare('UPDATE resources SET status = ? WHERE id = ? AND type = ?').run(nextStatus, id, resource);
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
