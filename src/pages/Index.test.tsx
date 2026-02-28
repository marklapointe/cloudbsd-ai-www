import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter, useNavigate } from 'react-router-dom';
import { expect, vi, it, describe, beforeEach } from 'vitest';
import Index from './Index';

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: vi.fn(),
  };
});

describe('Index Component', () => {
  const mockNavigate = vi.fn();

  beforeEach(() => {
    vi.mocked(useNavigate).mockReturnValue(mockNavigate);
    localStorage.clear();
  });

  it('redirects to /dashboard if token is present', async () => {
    localStorage.setItem('token', 'fake-token');
    render(
      <BrowserRouter>
        <Index />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/dashboard');
    });
  });

  it('redirects to /login if token is not present', async () => {
    render(
      <BrowserRouter>
        <Index />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/login');
    });
  });
});
