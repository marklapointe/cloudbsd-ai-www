import { existsSync, readFileSync, writeFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export interface Config {
  listenAddress: string;
  listenAddressV6: string;
  port: number;
  servername: string;
  secretKey: string;
  dbPath: string;
  demoMode: boolean;
  corsEnabled: boolean;
  ssl: {
    enabled: boolean;
    certPath?: string;
    keyPath?: string;
  };
  // Cookie options control how server-set cookies are emitted
  cookie?: {
    sameSite?: 'none' | 'lax' | 'strict';
    domain?: string | null;
    // null = auto-detect from request / X-Forwarded-Proto
    secure?: boolean | null;
    httpOnly?: boolean;
  };
  // CSRF options (disabled by default to remain permissive behind proxies)
  csrf?: {
    enabled?: boolean;
    header?: string; // header used to expose token to clients
  };
  demoLicense?: {
    nodes_limit: number;
    vms_limit: number;
    containers_limit: number;
    jails_limit: number;
  };
}

const DEFAULT_CONFIG: Config = {
  listenAddress: '0.0.0.0',
  listenAddressV6: '::',
  port: 3001,
  servername: 'localhost',
  secretKey: 'your-secret-key-change-me',
  dbPath: path.join(__dirname, '../../data/admin.db'),
  demoMode: true,
  corsEnabled: false,
  ssl: {
    enabled: false,
    certPath: '/usr/local/etc/cloudbsd/admin/ssl/cert.pem',
    keyPath: '/usr/local/etc/cloudbsd/admin/ssl/key.pem',
  },
  // Default cookie and CSRF settings are permissive to support proxy setups
  cookie: {
    sameSite: 'none',
    domain: null,
    secure: null,
    httpOnly: true,
  },
  csrf: {
    enabled: false,
    header: 'x-csrf-token',
  },
  demoLicense: {
    nodes_limit: 5,
    vms_limit: 2,
    containers_limit: 100,
    jails_limit: 50,
  },
};

const CONFIG_PATHS = [
  path.join(process.cwd(), 'etc/config.json'),
  '/usr/local/etc/cloudbsd/admin/config.json',
];

export function loadConfig(): Config {
  let config = { ...DEFAULT_CONFIG };

  for (const configPath of CONFIG_PATHS) {
    if (existsSync(configPath)) {
      try {
        const fileContent = readFileSync(configPath, 'utf-8');
        const userConfig = JSON.parse(fileContent);
        config = { ...config, ...userConfig };
        // Ensure corsEnabled defaults to false if not provided or if it's not a boolean
        if (typeof config.corsEnabled !== 'boolean') {
          config.corsEnabled = false;
        }
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

export function saveConfig(newConfig: Partial<Config>): void {
  const currentConfig = loadConfig();
  const updatedConfig = { ...currentConfig, ...newConfig };
  
  // We save to the first path in CONFIG_PATHS by default
  const configPath = CONFIG_PATHS[0];
  try {
    writeFileSync(configPath, JSON.stringify(updatedConfig, null, 2), 'utf-8');
    console.log(`Configuration saved to ${configPath}`);
  } catch (error) {
    console.error(`Failed to save configuration to ${configPath}:`, error);
    throw error;
  }
}

let config = loadConfig();

export function reloadConfig() {
  config = loadConfig();
  return config;
}

export default config;
