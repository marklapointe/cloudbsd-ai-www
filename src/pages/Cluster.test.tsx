import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Cluster from './Cluster';
import i18n from '../i18n';
import { I18nextProvider } from 'react-i18next';
import { vi, expect, it, describe } from 'vitest';
import api from '../api/client';

// Mock the API client
vi.mock('../api/client', () => ({
  default: {
    get: vi.fn(() => Promise.resolve({ data: [] })),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

describe('Cluster Page', () => {
  it('renders with internationalized title', () => {
    render(
      <I18nextProvider i18n={i18n}>
        <MemoryRouter>
          <Cluster />
        </MemoryRouter>
      </I18nextProvider>
    );
    
    expect(screen.getByText(i18n.t('cluster.title'))).toBeInTheDocument();
  });

  it('contains internationalized strings', () => {
     render(
      <I18nextProvider i18n={i18n}>
        <MemoryRouter>
          <Cluster />
        </MemoryRouter>
      </I18nextProvider>
    );

    expect(screen.getByText(i18n.t('cluster.description'))).toBeInTheDocument();
    expect(screen.getByText(i18n.t('cluster.add_node'))).toBeInTheDocument();
  });

  it('contains no hardcoded English placeholders in the add node form', async () => {
    render(
      <I18nextProvider i18n={i18n}>
        <MemoryRouter>
          <Cluster />
        </MemoryRouter>
      </I18nextProvider>
    );

    const addButton = screen.getByText(i18n.t('cluster.add_node'));
    fireEvent.click(addButton);

    // Check placeholders - they should be i18n keys or translations, not hardcoded English
    // We expect them to be translated via i18n.t()
    const nameInput = screen.getByPlaceholderText(i18n.t('cluster.placeholder_name'));
    const ipInput = screen.getByPlaceholderText(i18n.t('cluster.placeholder_ip'));
    
    expect(nameInput).toBeInTheDocument();
    expect(ipInput).toBeInTheDocument();
  });

  it('handles non-array response from API without crashing', async () => {
    // Mock API to return an object instead of an array
    vi.mocked(api.get).mockResolvedValueOnce({ data: { message: 'unexpected object' } });

    render(
      <I18nextProvider i18n={i18n}>
        <MemoryRouter>
          <Cluster />
        </MemoryRouter>
      </I18nextProvider>
    );

    // Should not crash and should eventually show the description
    await waitFor(() => {
      expect(screen.getByText(i18n.t('cluster.description'))).toBeInTheDocument();
    });
  });
});
