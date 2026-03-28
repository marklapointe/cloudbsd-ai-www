import { describe, it, expect, vi, beforeEach } from 'vitest';
import { existsSync, readFileSync } from 'fs';
import { reloadConfig } from '../../server/src/config.js';
vi.mock('fs', () => {
    const mExistsSync = vi.fn();
    const mReadFileSync = vi.fn();
    return {
        existsSync: mExistsSync,
        readFileSync: mReadFileSync,
        default: {
            existsSync: mExistsSync,
            readFileSync: mReadFileSync,
        }
    };
});
describe('Configuration Loader', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });
    it('should return default config when no files exist', () => {
        existsSync.mockReturnValue(false);
        const config = reloadConfig();
        expect(config.port).toBe(3001);
        expect(config.demoMode).toBe(true);
    });
    it('should override defaults with user config', () => {
        existsSync.mockReturnValue(true);
        readFileSync.mockReturnValue(JSON.stringify({ port: 4000, demoMode: false }));
        const config = reloadConfig();
        expect(config.port).toBe(4000);
        expect(config.demoMode).toBe(false);
    });
});
