export interface AuthState {
  isAuthenticated: boolean;
  token: string | null;
  username: string | null;
  role: 'admin' | 'operator' | 'viewer' | null;
}

export interface UseAuthReturn extends AuthState {
  login: (token: string, username: string, role: string) => void;
  logout: () => void;
  setRole: (role: 'admin' | 'operator' | 'viewer') => void;
}
