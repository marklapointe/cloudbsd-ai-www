import { render, screen, fireEvent, act } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { expect, vi, it, describe, beforeEach } from 'vitest';
import Login from './Login';
import i18n from '../i18n';
import { I18nextProvider } from 'react-i18next';
import { ThemeProvider } from '../contexts/ThemeContext';
import api from '../api/client';

vi.mock('../api/client', () => ({
  default: {
    post: vi.fn(),
    get: vi.fn(),
    put: vi.fn(),
    interceptors: {
      response: { use: vi.fn(), eject: vi.fn() },
    },
  },
}));

describe('Login Component', () => {
  beforeAll(async () => {
    await i18n.changeLanguage('en');
  });

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    localStorage.setItem('i18nextLng', 'en');
    (api.get as any).mockResolvedValue({ data: {} });
    (api.put as any).mockResolvedValue({ data: {} });
    (api.post as any).mockResolvedValue({ data: {} });
  });

  it('renders login form', () => {
    render(
      <ThemeProvider>
        <I18nextProvider i18n={i18n}>
          <BrowserRouter>
            <Login />
          </BrowserRouter>
        </I18nextProvider>
      </ThemeProvider>
    );

    expect(screen.getByText(/CloudBSD Admin/i)).toBeInTheDocument();
    expect(screen.getByTestId('username-label')).toBeInTheDocument();
    expect(screen.getByTestId('password-label')).toBeInTheDocument();
  });

  it('updates input values on change', () => {
    render(
      <ThemeProvider>
        <I18nextProvider i18n={i18n}>
          <BrowserRouter>
            <Login />
          </BrowserRouter>
        </I18nextProvider>
      </ThemeProvider>
    );

    const usernameInput = screen.getByLabelText(/Username/i, { selector: 'input' }) || screen.getByPlaceholderText(/username/i);
    const passwordInput = screen.getByLabelText(/Password/i, { selector: 'input' }) || screen.getByPlaceholderText(/••••••••/);

    fireEvent.change(usernameInput, { target: { value: 'admin' } });
    fireEvent.change(passwordInput, { target: { value: 'password' } });

    expect(usernameInput.value).toBe('admin');
    expect(passwordInput.value).toBe('password');
  });

  it('handles successful login and applies user theme', async () => {
    (api.post as any).mockResolvedValueOnce({
      data: {
        token: 'fake-token',
        user: {
          username: 'admin',
          role: 'admin',
          theme: 'light',
          language: 'fr'
        }
      }
    });

    render(
      <ThemeProvider>
        <I18nextProvider i18n={i18n}>
          <BrowserRouter>
            <Login />
          </BrowserRouter>
        </I18nextProvider>
      </ThemeProvider>
    );

    const usernameInput = screen.getByLabelText(/Username/i);
    const passwordInput = screen.getByLabelText(/Password/i);
    const submitBtn = screen.getByTestId('login-submit');

    fireEvent.change(usernameInput, { target: { value: 'admin' } });
    fireEvent.change(passwordInput, { target: { value: 'admin' } });

    await act(async () => {
      fireEvent.click(submitBtn);
    });

    expect(localStorage.getItem('token')).toBe('fake-token');
    expect(localStorage.getItem('theme')).toBe('light');
    expect(localStorage.getItem('i18nextLng')).toBe('en');
  });

  it('uses backend language when localStorage has no preference', async () => {
    localStorage.removeItem('i18nextLng');
    (api.post as any).mockResolvedValueOnce({
      data: {
        token: 'fake-token',
        user: {
          username: 'admin',
          role: 'admin',
          theme: 'light',
          language: 'fr'
        }
      }
    });

    render(
      <ThemeProvider>
        <I18nextProvider i18n={i18n}>
          <BrowserRouter>
            <Login />
          </BrowserRouter>
        </I18nextProvider>
      </ThemeProvider>
    );

    const usernameInput = screen.getByLabelText(/Username/i);
    const passwordInput = screen.getByLabelText(/Password/i);
    const submitBtn = screen.getByTestId('login-submit');

    fireEvent.change(usernameInput, { target: { value: 'admin' } });
    fireEvent.change(passwordInput, { target: { value: 'admin' } });

    await act(async () => {
      fireEvent.click(submitBtn);
    });

    expect(localStorage.getItem('i18nextLng')).toBe('fr');
  });

  it('handles login failure', async () => {
    (api.post as any).mockImplementationOnce(() => Promise.reject(new Error('Invalid credentials')));

    render(
      <ThemeProvider>
        <I18nextProvider i18n={i18n}>
          <BrowserRouter>
            <Login />
          </BrowserRouter>
        </I18nextProvider>
      </ThemeProvider>
    );

    const loginForm = screen.getByTestId('login-form');

    await act(async () => {
      fireEvent.submit(loginForm);
    });

    expect(await screen.findByTestId('login-error')).toBeInTheDocument();
  });

  it('toggles theme on the login page', async () => {
    render(
      <ThemeProvider>
        <I18nextProvider i18n={i18n}>
          <BrowserRouter>
            <Login />
          </BrowserRouter>
        </I18nextProvider>
      </ThemeProvider>
    );

    const themeToggle = screen.getByTitle(/Toggle Theme/i);
    
    // Default is dark, toggle should make it light
    await act(async () => {
      fireEvent.click(themeToggle);
    });

    expect(localStorage.getItem('theme')).toBe('light');
  });
});
