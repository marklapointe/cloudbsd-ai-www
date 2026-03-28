import { expect, it, describe, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import cors from 'cors';
import { Server } from 'socket.io';
// Mocks
vi.mock('../../server/src/config.ts', () => ({
    default: {
        corsEnabled: false,
        ssl: { enabled: false },
        demoMode: true,
        secretKey: 'test-secret',
        port: 3001
    },
    reloadConfig: vi.fn(),
    saveConfig: vi.fn()
}));
vi.mock('../../server/src/db.ts', () => ({
    default: {
        prepare: vi.fn().mockReturnValue({
            get: vi.fn(),
            all: vi.fn(),
            run: vi.fn()
        }),
        exec: vi.fn()
    },
    initDb: vi.fn(),
    logAction: vi.fn()
}));
describe('CORS Settings logic', () => {
    describe('Express CORS', () => {
        it('should not apply CORS when corsEnabled is false', async () => {
            const app = express();
            const corsEnabled = false;
            if (corsEnabled) {
                app.use(cors());
            }
            app.get('/test', (_req, res) => {
                res.json({ message: 'ok' });
            });
            const response = await request(app)
                .get('/test')
                .set('Origin', 'http://external-domain.com');
            expect(response.headers['access-control-allow-origin']).toBeUndefined();
        });
        it('should apply CORS when corsEnabled is true', async () => {
            const app = express();
            const corsEnabled = true;
            if (corsEnabled) {
                app.use(cors({
                    origin: (_origin, callback) => {
                        callback(null, true);
                    },
                    credentials: true,
                    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
                    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin']
                }));
            }
            app.get('/test', (_req, res) => {
                res.json({ message: 'ok' });
            });
            const response = await request(app)
                .get('/test')
                .set('Origin', 'http://external-domain.com');
            expect(response.headers['access-control-allow-origin']).toBe('http://external-domain.com');
            expect(response.headers['access-control-allow-credentials']).toBe('true');
        });
    });
    describe('Socket.io CORS', () => {
        it('should configure Socket.io CORS correctly when enabled', () => {
            const corsEnabled = true;
            const io = new Server({
                cors: corsEnabled ? {
                    origin: "*",
                    methods: ["GET", "POST"]
                } : undefined
            });
            const options = io.opts;
            expect(options.cors).toBeDefined();
            expect(options.cors?.origin).toBe("*");
            expect(options.cors?.methods).toContain("GET");
            expect(options.cors?.methods).toContain("POST");
        });
        it('should not configure Socket.io CORS when disabled', () => {
            const corsEnabled = false;
            const io = new Server({
                cors: corsEnabled ? {
                    origin: "*",
                    methods: ["GET", "POST"]
                } : undefined
            });
            expect(io.opts.cors).toBeUndefined();
        });
    });
});
