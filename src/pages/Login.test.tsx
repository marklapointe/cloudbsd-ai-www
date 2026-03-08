import { render, screen, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { expect, vi, it, describe } from 'vitest';
import Login from './Login';
import i18n from '../i18n';
import { I18nextProvider } from 'react-i18next';

vi.mock('../api/client', () => ({
  default: {
    post: vi.fn(),
    interceptors: {
      response: { use: vi.fn(), eject: vi.fn() },
    },
  },
}));

describe('Login Component', () => {
  it('renders login form', () => {
    render(
      <I18nextProvider i18n={i18n}>
        <BrowserRouter>
          <Login />
        </BrowserRouter>
      </I18nextProvider>
    );

    expect(screen.getByText(/CloudBSD Admin/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Username/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Password/i)).toBeInTheDocument();
  });

  it('updates input values on change', () => {
    render(
      <I18nextProvider i18n={i18n}>
        <BrowserRouter>
          <Login />
        </BrowserRouter>
      </I18nextProvider>
    );

    const usernameInput = screen.getByLabelText(/Username/i) as HTMLInputElement;
    const passwordInput = screen.getByLabelText(/Password/i) as HTMLInputElement;

    fireEvent.change(usernameInput, { target: { value: 'admin' } });
    fireEvent.change(passwordInput, { target: { value: 'password' } });

    expect(usernameInput.value).toBe('admin');
    expect(passwordInput.value).toBe('password');
  });
});
