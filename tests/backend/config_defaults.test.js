import { expect, it, describe, vi, beforeEach } from 'vitest';
import * as fs from 'fs';
import { loadConfig } from '../../server/src/config.js';
vi.mock('fs', async (importOriginal) => {
    const actual = await importOriginal();
    const mockedExistsSync = vi.fn();
    const mockedReadFileSync = vi.fn();
    const mockedWriteFileSync = vi.fn();
    return {
        ...actual,
        default: {
            ...actual,
            existsSync: mockedExistsSync,
            readFileSync: mockedReadFileSync,
            writeFileSync: mockedWriteFileSync,
        },
        existsSync: mockedExistsSync,
        readFileSync: mockedReadFileSync,
        writeFileSync: mockedWriteFileSync,
    };
});
describe('Configuration Defaults', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });
    it('defaults corsEnabled to false if missing from config file', () => {
        const mockConfig = {
            port: 3005,
            // corsEnabled is missing
        };
        fs.existsSync.mockReturnValueOnce(true);
        fs.readFileSync.mockReturnValueOnce(JSON.stringify(mockConfig));
        const config = loadConfig();
        expect(config.port).toBe(3005);
        expect(config.corsEnabled).toBe(false);
    });
    it('respects corsEnabled if present in config file (true)', () => {
        const mockConfig = {
            corsEnabled: true,
        };
        fs.existsSync.mockReturnValueOnce(true);
        fs.readFileSync.mockReturnValueOnce(JSON.stringify(mockConfig));
        const config = loadConfig();
        expect(config.corsEnabled).toBe(true);
    });
    it('respects corsEnabled if present in config file (false)', () => {
        const mockConfig = {
            corsEnabled: false,
        };
        fs.existsSync.mockReturnValueOnce(true);
        fs.readFileSync.mockReturnValueOnce(JSON.stringify(mockConfig));
        const config = loadConfig();
        expect(config.corsEnabled).toBe(false);
    });
    it('defaults corsEnabled to false if no config file exists', () => {
        fs.existsSync.mockReturnValue(false);
        const config = loadConfig();
        expect(config.corsEnabled).toBe(false);
    });
    it('forces corsEnabled to false if it is not a boolean in config file', () => {
        const mockConfig = {
            corsEnabled: 'yes', // invalid type
        };
        fs.existsSync.mockReturnValueOnce(true);
        fs.readFileSync.mockReturnValueOnce(JSON.stringify(mockConfig));
        const config = loadConfig();
        expect(config.corsEnabled).toBe(false);
    });
});
