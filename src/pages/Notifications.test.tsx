import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import Notifications from './Notifications';
import { NotificationProvider } from '../contexts/NotificationContext';
import { BrowserRouter } from 'react-router-dom';

// Mock the API client
vi.mock('../api/client', () => ({
  default: {
    get: vi.fn().mockResolvedValue({
      data: [
        {
          id: '1',
          type: 'warning',
          priority: 'high',
          message: 'Test High Priority Notification',
          timestamp: new Date().toISOString(),
          is_read: 0
        },
        {
          id: 'ad-1',
          type: 'ad',
          priority: 'low',
          message: 'Test Advertisement',
          timestamp: new Date().toISOString(),
          is_read: 0
        }
      ]
    }),
    post: vi.fn().mockResolvedValue({ data: { success: true } }),
    delete: vi.fn().mockResolvedValue({ data: { success: true } })
  }
}));

// Mock i18next
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { language: 'en' }
  })
}));

describe('Notifications Page', () => {
  it('renders the notifications list and details', async () => {
    render(
      <BrowserRouter>
        <NotificationProvider>
          <Notifications />
        </NotificationProvider>
      </BrowserRouter>
    );

    // Wait for the notifications to be loaded and rendered
    await waitFor(() => {
      const elements = screen.queryAllByText(/Test/i);
      expect(elements.length).toBeGreaterThan(0);
    }, { timeout: 2000 });
    
    // Check if the type labels are present
    expect(screen.getAllByText('common.warning')[0]).toBeInTheDocument();
    expect(screen.getAllByText('common.ad')[0]).toBeInTheDocument();
  });
});
