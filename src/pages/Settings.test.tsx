import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { expect, vi, it, describe, beforeEach } from 'vitest';
import Settings from './Settings';
import api from '../api/client';
import { I18nextProvider } from 'react-i18next';
import i18n from '../i18n';

vi.mock('../api/client', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
  },
}));

describe('Settings Component', () => {
  const mockConfig = {
    servername: 'Test Server',
    port: 3001,
    dbPath: './data/test.db',
    demoMode: true,
    ssl: { enabled: true }
  };

  const mockLicense = {
    status: 'active',
    license_type: 'enterprise',
    registered_to: 'Test User',
    expiry_date: '2026-12-31',
    support_tier: 'premium',
    usage: { nodes: 1, vms: 2, containers: 3, jails: 4 },
    nodes_limit: 10,
    vms_limit: 20,
    containers_limit: 30,
    jails_limit: 40,
    features: ['live_migration', 'api_access']
  };

  beforeEach(() => {
    vi.mocked(api.get).mockImplementation((url) => {
      if (url === '/system/config') return Promise.resolve({ data: mockConfig });
      if (url === '/system/license') return Promise.resolve({ data: mockLicense });
      return Promise.reject(new Error('Unknown URL'));
    });
    localStorage.setItem('token', 'fake-token');
  });

  it('renders settings page with server config and license info', async () => {
    render(
      <I18nextProvider i18n={i18n}>
        <BrowserRouter>
          <Settings />
        </BrowserRouter>
      </I18nextProvider>
    );

    expect(screen.getByText('Loading...')).toBeDefined();

    await waitFor(() => {
      // Check license info
      expect(screen.getByText(i18n.t('settings.enterprise'))).toBeDefined();
      expect(screen.getByText('Test User')).toBeDefined();
      expect(screen.getByText(i18n.t('settings.premium'))).toBeDefined();
      expect(screen.getByText(i18n.t('settings.active'))).toBeInTheDocument();
      
      // Check features
      expect(screen.getByText(i18n.t('settings.feature_live_migration'))).toBeDefined();
      expect(screen.getByText(i18n.t('settings.feature_api_access'))).toBeDefined();
    });
  });

  it('handles license registration', async () => {
    vi.mocked(api.post).mockResolvedValue({ 
      data: { 
        message: 'License registered successfully',
        license: { ...mockLicense, license_type: 'pro' }
      } 
    });

    render(
      <I18nextProvider i18n={i18n}>
        <BrowserRouter>
          <Settings />
        </BrowserRouter>
      </I18nextProvider>
    );

    await waitFor(() => {
      expect(screen.getByPlaceholderText(i18n.t('settings.reg_key_placeholder'))).toBeDefined();
    });

    const input = screen.getByPlaceholderText(i18n.t('settings.reg_key_placeholder'));
    const button = screen.getByText(i18n.t('settings.register_license'));

    fireEvent.change(input, { target: { value: 'NEW-KEY' } });
    fireEvent.click(button);

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith(expect.stringContaining('/system/license'), { license_key: 'NEW-KEY' });
      expect(screen.getByText('License registered successfully')).toBeDefined();
    });
  });

  it('displays languages in native names and sorted with English at top', async () => {
    render(
      <I18nextProvider i18n={i18n}>
        <BrowserRouter>
          <Settings />
        </BrowserRouter>
      </I18nextProvider>
    );

    await waitFor(() => {
      const langSelect = screen.getByLabelText(i18n.t('common.language')) as HTMLSelectElement;
      const options = Array.from(langSelect.options);
      expect(options[0].textContent).toBe('English');
      expect(options[0].getAttribute('value')).toBe('en');

      const otherLangNames = options.slice(1).map(opt => opt.textContent);
      const sortedOtherLangNames = [...otherLangNames].sort((a, b) => 
        a!.localeCompare(b!, undefined, { sensitivity: 'base' })
      );
      expect(otherLangNames).toEqual(sortedOtherLangNames);

      // Verify some native names are present
      expect(screen.getByText('Français')).toBeDefined();
      expect(screen.getByText('Español')).toBeDefined();
      expect(screen.getByText('日本語')).toBeDefined();
      expect(screen.getByText('العربية')).toBeDefined();
    });
  });

  it('handles null license response from API without crashing', async () => {
    // Mock API to return null for license
    vi.mocked(api.get).mockImplementation((url) => {
      if (url === '/system/config') return Promise.resolve({ data: mockConfig });
      if (url === '/system/license') return Promise.resolve({ data: null });
      return Promise.reject(new Error('Unknown URL'));
    });

    render(
      <I18nextProvider i18n={i18n}>
        <BrowserRouter>
          <Settings />
        </BrowserRouter>
      </I18nextProvider>
    );

    // Should not crash and should show the license section
    await waitFor(() => {
      expect(screen.getByText(i18n.t('settings.license_status'))).toBeInTheDocument();
    });
    
    // Check that it shows "0" for limits and "None" for type
    expect(screen.getAllByText(i18n.t('settings.none')).length).toBeGreaterThan(0);
    const limitElements = screen.getAllByText('0');
    expect(limitElements.length).toBeGreaterThan(0);
  });

  it('displays the language updated message in the new language', async () => {
    vi.mocked(api.put).mockResolvedValue({ data: { message: 'Success' } });

    render(
      <I18nextProvider i18n={i18n}>
        <BrowserRouter>
          <Settings />
        </BrowserRouter>
      </I18nextProvider>
    );

    await waitFor(() => {
      expect(screen.getByLabelText(i18n.t('common.language'))).toBeDefined();
    });

    const select = screen.getByLabelText(i18n.t('common.language'));
    
    // Switch to Spanish (which has a translation)
    fireEvent.change(select, { target: { value: 'es' } });

    await waitFor(() => {
      // Should show the Spanish translation for "Language preference saved successfully"
      // Which is "Preferencia de idioma guardada con éxito" in es.ts
      const message = screen.getByText('Preferencia de idioma guardada con éxito');
      expect(message).toBeDefined();
      expect(message.textContent).not.toBe('settings.language_updated');
    });

    // Switch to another language that previously had a placeholder (e.g., Italian 'it')
    fireEvent.change(select, { target: { value: 'it' } });

    await waitFor(() => {
      // Once fixed, this should be the Italian translation, not the key
      const itMessage = screen.queryByText('settings.language_updated');
      expect(itMessage).toBeNull();
      
      // We'll check for the Italian translation once we've added it
      expect(screen.getByText('Preferenza della lingua salvata con successo')).toBeDefined();
    });
    
    // Reset to English for other tests
    await i18n.changeLanguage('en');
  });

  it('handles auto-saving of config toggles', async () => {
    vi.mocked(api.put).mockResolvedValue({ 
      data: { message: 'Configuration updated successfully' } 
    });

    render(
      <I18nextProvider i18n={i18n}>
        <BrowserRouter>
          <Settings />
        </BrowserRouter>
      </I18nextProvider>
    );

    await waitFor(() => {
      expect(screen.getByText(i18n.t('settings.demo_mode'))).toBeInTheDocument();
    });

    // Click Demo Mode toggle
    const demoModeToggle = screen.getByText(i18n.t('settings.demo_mode')).closest('div.flex');
    fireEvent.click(demoModeToggle!);

    await waitFor(() => {
      expect(api.put).toHaveBeenCalledWith('/system/config', expect.objectContaining({
        demoMode: false // It was true in mockConfig, so clicking it should set it to false
      }));
      expect(screen.getByText('Configuration updated successfully')).toBeInTheDocument();
    });

    // Click SSL Security toggle
    const sslToggle = screen.getByText(i18n.t('settings.ssl_security')).closest('div.flex');
    fireEvent.click(sslToggle!);

    await waitFor(() => {
      expect(api.put).toHaveBeenCalledWith('/system/config', expect.objectContaining({
        ssl: { enabled: false } // It was true in mockConfig, so clicking it should set it to false
      }));
    });
  });

  it('handles auto-save config update failure', async () => {
    vi.mocked(api.put).mockRejectedValue({
      response: {
        data: { message: 'Failed to update' }
      }
    });

    render(
      <I18nextProvider i18n={i18n}>
        <BrowserRouter>
          <Settings />
        </BrowserRouter>
      </I18nextProvider>
    );

    await waitFor(() => {
      expect(screen.getByText(i18n.t('settings.demo_mode'))).toBeInTheDocument();
    });

    const demoModeToggle = screen.getByText(i18n.t('settings.demo_mode')).closest('div.flex');
    fireEvent.click(demoModeToggle!);

    await waitFor(() => {
      expect(screen.getByText('Failed to update')).toBeInTheDocument();
    });
  });
});
