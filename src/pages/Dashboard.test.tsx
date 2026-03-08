import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Dashboard from './Dashboard';
import i18n from '../i18n';
import { I18nextProvider } from 'react-i18next';
import { vi } from 'vitest';

// Mock the API client
const mockClusterStats = {
  nodes: { online: 5, total: 10 },
  cpu: { used: 40, total: 100, percentage: 40 },
  memory: { used: "32GB", total: "64GB", percentage: 50 },
  disk: { used: "1TB", total: "2TB", percentage: 50 }
};

const mockSystemStats = {
  cpu: 25,
  memory: 45,
  disk: 60,
  network: { in: 12.5, out: 8.4 },
  uptime: '10 days, 4:20'
};

const mockSystemInfo = {
  hostname: 'cloudbsd-test',
  os: 'FreeBSD 14.0-RELEASE',
  cpu: 'AMD EPYC 7763 64-Core Processor',
  cores: 64
};

vi.mock('../api/client', () => ({
  default: {
    get: vi.fn((url) => {
      if (url === '/cluster/stats') return Promise.resolve({ data: mockClusterStats });
      if (url === '/system/stats') return Promise.resolve({ data: mockSystemStats });
      if (url === '/system/info') return Promise.resolve({ data: mockSystemInfo });
      if (url === '/system/host') return Promise.resolve({ data: { arch: 'amd64', loadAverage: [0.1, 0.2, 0.3], totalMemory: '64GB', freeMemory: '32GB' } });
      return Promise.resolve({ data: [] });
    }),
  },
}));

describe('Dashboard Page', () => {
  it('contains internationalized strings', async () => {
    render(
      <I18nextProvider i18n={i18n}>
        <MemoryRouter>
          <Dashboard />
        </MemoryRouter>
      </I18nextProvider>
    );

    expect(screen.getByText(i18n.t('dashboard.system_health'))).toBeInTheDocument();
    expect(screen.getByText(i18n.t('dashboard.server_info'))).toBeInTheDocument();
    expect(screen.getByText(i18n.t('dashboard.system_live'))).toBeInTheDocument();
    
    // Check for "5 / 10 Nodes Online"
    await waitFor(() => {
      expect(screen.getByText(/5 \/ 10/)).toBeInTheDocument();
      expect(screen.getByText(new RegExp(i18n.t('dashboard.nodes_online')))).toBeInTheDocument();
    });
    
    expect(screen.getByText(i18n.t('dashboard.vcpus'))).toBeInTheDocument();
  });
});
