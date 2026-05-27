import { useState, useCallback } from 'react';
import type { UseAuthReturn } from './types';

export const useAuth = (): UseAuthReturn => {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('token'));
  const [username, setUsername] = useState<string | null>(() => localStorage.getItem('username'));
  const [role, setRoleState] = useState<'admin' | 'operator' | 'viewer' | null>(() => {
    const r = localStorage.getItem('role');
    if (r === 'admin' || r === 'operator' || r === 'viewer') return r;
    return 'viewer';
  });

  const login = useCallback((newToken: string, newUsername: string, newRole: string) => {
    localStorage.setItem('token', newToken);
    localStorage.setItem('username', newUsername);
    localStorage.setItem('role', newRole);
    setToken(newToken);
    setUsername(newUsername);
    setRoleState(newRole as 'admin' | 'operator' | 'viewer');
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('token');
    localStorage.removeItem('username');
    localStorage.removeItem('role');
    setToken(null);
    setUsername(null);
    setRoleState(null);
  }, []);

  const setRole = useCallback((newRole: 'admin' | 'operator' | 'viewer') => {
    localStorage.setItem('role', newRole);
    setRoleState(newRole);
  }, []);

  return {
    isAuthenticated: !!token,
    token,
    username,
    role,
    login,
    logout,
    setRole,
  };
};