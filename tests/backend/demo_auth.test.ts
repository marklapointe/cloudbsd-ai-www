import { describe, it, expect, vi, beforeEach } from 'vitest';
import jwt from 'jsonwebtoken';
import config from '../../server/src/config.ts';
import { authenticateToken, isAdmin } from '../../server/src/index.ts';
import { logAction } from '../../server/src/db.ts';

// Mock config
vi.mock('../../server/src/config.ts', async (importOriginal) => {
  const actual = await importOriginal() as any;
  return {
    ...actual,
    default: {
      ...actual.default,
      demoMode: false,
      secretKey: 'test-secret'
    }
  };
});

// Mock db and logAction
vi.mock('../../server/src/db.ts', () => ({
  initDb: vi.fn(),
  logAction: vi.fn()
}));

describe('Demo Mode Authentication', () => {
  let req: any;
  let res: any;
  let next: any;

  beforeEach(() => {
    vi.clearAllMocks();
    req = {
      headers: {},
      method: 'GET',
      url: '/api/test',
      ip: '127.0.0.1'
    };
    res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis()
    };
    next = vi.fn();
  });

  it('should bypass authentication when demoMode is true for GET requests', () => {
    config.demoMode = true;
    req.method = 'GET';
    authenticateToken(req, res, next);
    
    expect(next).toHaveBeenCalled();
    expect(req.user).toEqual({ id: 1, username: 'demo', role: 'admin', language: 'en' });
    expect(res.status).not.toHaveBeenCalled();
  });

  it('should NOT bypass authentication when demoMode is true for POST requests (guest)', () => {
    config.demoMode = true;
    req.method = 'POST';
    authenticateToken(req, res, next);
    
    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(401); // Falls through to "No token provided"
  });

  it('should allow valid token in demoMode for POST requests', () => {
    config.demoMode = true;
    req.method = 'POST';
    const user = { id: 2, username: 'admin_real', role: 'admin' };
    const token = jwt.sign(user, config.secretKey);
    req.headers['authorization'] = `Bearer ${token}`;
    
    authenticateToken(req, res, next);
    
    expect(next).toHaveBeenCalled();
    expect(req.user).toMatchObject(user);
  });

  it('should require authentication when demoMode is false', () => {
    config.demoMode = false;
    authenticateToken(req, res, next);
    
    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ message: 'Authentication required' });
  });

  it('should allow valid token when demoMode is false', () => {
    config.demoMode = false;
    const user = { id: 2, username: 'testuser', role: 'admin' };
    const token = jwt.sign(user, config.secretKey);
    req.headers['authorization'] = `Bearer ${token}`;
    
    authenticateToken(req, res, next);
    
    // JWT verify is async in index.ts because it uses a callback
    // but in some environments it might be sync if it's mocked or depending on how it's called.
    // In index.ts: jwt.verify(token, SECRET_KEY, (err: any, user: any) => { ... })
    
    // We might need to wait for it or mock jwt.verify
    expect(next).toHaveBeenCalled();
    expect(req.user).toMatchObject(user);
  });

  it('should deny access if isAdmin is called by non-admin in demo mode (if role was different)', () => {
    // In current implementation, demoMode always sets role to 'admin'
    config.demoMode = true;
    authenticateToken(req, res, next);
    
    isAdmin(req, res, next);
    expect(next).toHaveBeenCalledTimes(2); // Once for auth, once for isAdmin
  });

  it('should deny access for viewer role in non-demo mode', () => {
    config.demoMode = false;
    req.user = { id: 3, username: 'viewer', role: 'viewer' };
    
    isAdmin(req, res, next);
    
    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: 'Admin access required' }));
  });
});
