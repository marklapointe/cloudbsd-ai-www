import { existsSync, readFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export interface Config {
  port: number;
  servername: string;
  secretKey: string;
  dbPath: string;
  demoMode: boolean;
  ssl: {
    enabled: boolean;
    certPath?: string;
    keyPath?: string;
  };
}

const DEFAULT_CONFIG: Config = {
  port: 3001,
  servername: 'localhost',
  secretKey: 'your-secret-key-change-me',
  dbPath: path.join(__dirname, '../../data/admin.db'),
  demoMode: true,
  ssl: {
    enabled: false,
    certPath: '/usr/local/etc/cloudbsd/admin-panel/ssl/cert.pem',
    keyPath: '/usr/local/etc/cloudbsd/admin-panel/ssl/key.pem',
  },
};

const CONFIG_PATHS = [
  path.join(process.cwd(), 'etc/config.json'),
  '/usr/local/etc/cloudbsd/admin-panel/config.json',
];

export function loadConfig(): Config {
  let config = { ...DEFAULT_CONFIG };

  for (const configPath of CONFIG_PATHS) {
    if (existsSync(configPath)) {
      try {
        const fileContent = readFileSync(configPath, 'utf-8');
        const userConfig = JSON.parse(fileContent);
        config = { ...config, ...userConfig };
        console.log(`Loaded configuration from ${configPath}`);
        return config;
      } catch (error) {
        console.warn(`Failed to parse config at ${configPath}:`, error);
      }
    }
  }

  console.warn('Using default configuration settings.');
  return config;
}

let config = loadConfig();

export function reloadConfig() {
  config = loadConfig();
  return config;
}

export default config;
