import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { ThemeProvider, useTheme } from './ThemeContext';
import api from '../api/client';
import React from 'react';

// Mock api client
vi.mock('../api/client', () => ({
  default: {
    get: vi.fn(),
    put: vi.fn(),
  },
}));

const TestComponent = () => {
  const { theme, toggleTheme, setTheme } = useTheme();
  return (
    <div>
      <span data-testid="theme-value">{theme}</span>
      <button onClick={toggleTheme}>Toggle</button>
      <button onClick={() => setTheme('light')}>Set Light</button>
    </div>
  );
};

describe('ThemeContext', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    // Default mock response for profile
    (api.get as any).mockResolvedValue({ data: { theme: 'dark' } });
    (api.put as any).mockResolvedValue({ data: { success: true } });
    
    // Clean up document classes
    document.documentElement.classList.remove('light', 'dark');
  });

  it('defaults to dark theme when nothing is saved', () => {
    render(
      <ThemeProvider>
        <TestComponent />
      </ThemeProvider>
    );
    expect(screen.getByTestId('theme-value').textContent).toBe('dark');
    expect(document.documentElement.classList.contains('dark')).toBe(true);
  });

  it('uses saved theme from localStorage', () => {
    localStorage.setItem('theme', 'light');
    render(
      <ThemeProvider>
        <TestComponent />
      </ThemeProvider>
    );
    expect(screen.getByTestId('theme-value').textContent).toBe('light');
    expect(document.documentElement.classList.contains('light')).toBe(true);
  });

  it('toggles theme', async () => {
    render(
      <ThemeProvider>
        <TestComponent />
      </ThemeProvider>
    );
    const toggleBtn = screen.getByText('Toggle');
    
    await act(async () => {
      toggleBtn.click();
    });
    
    expect(screen.getByTestId('theme-value').textContent).toBe('light');
    expect(localStorage.getItem('theme')).toBe('light');
    expect(document.documentElement.classList.contains('light')).toBe(true);
  });

  it('syncs theme with backend on change if logged in', async () => {
    localStorage.setItem('token', 'fake-token');
    render(
      <ThemeProvider>
        <TestComponent />
      </ThemeProvider>
    );
    
    const setLightBtn = screen.getByText('Set Light');
    
    await act(async () => {
      setLightBtn.click();
    });
    
    expect(api.put).toHaveBeenCalledWith('/users/profile', { theme: 'light' });
  });

  it('fetches theme from backend on mount if logged in', async () => {
    localStorage.setItem('token', 'fake-token');
    (api.get as any).mockResolvedValueOnce({ data: { theme: 'light' } });

    await act(async () => {
      render(
        <ThemeProvider>
          <TestComponent />
        </ThemeProvider>
      );
    });

    expect(api.get).toHaveBeenCalledWith('/users/profile');
    // Wait for the state update from the promise
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });
    expect(screen.getByTestId('theme-value').textContent).toBe('light');
  });

  it('defaults to dark if backend returns no theme and nothing in localStorage', async () => {
    localStorage.setItem('token', 'fake-token');
    (api.get as any).mockResolvedValueOnce({ data: { theme: null } });

    await act(async () => {
      render(
        <ThemeProvider>
          <TestComponent />
        </ThemeProvider>
      );
    });

    expect(screen.getByTestId('theme-value').textContent).toBe('dark');
  });
});
