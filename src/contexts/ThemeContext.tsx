import React, { createContext, useContext, useEffect, useState } from 'react';
import api from '../api/client';

type Theme = 'light' | 'dark';

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setThemeState] = useState<Theme>(() => {
    const saved = localStorage.getItem('theme') as Theme;
    return saved || 'dark'; // Default to dark as requested
  });

  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove('light', 'dark');
    root.classList.add(theme);
    localStorage.setItem('theme', theme);

    // Sync with backend if logged in
    const token = localStorage.getItem('token');
    if (token) {
      api.put('/users/profile', { theme }).catch(err => {
        console.error('Failed to sync theme with backend:', err);
      });
    }
  }, [theme]);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      api.get('/users/profile').then(res => {
        if (res.data.theme && (res.data.theme === 'light' || res.data.theme === 'dark')) {
          setThemeState(res.data.theme as Theme);
        }
      }).catch(err => {
        console.error('Failed to fetch user profile for theme:', err);
      });
    }
  }, []);

  const setTheme = (newTheme: Theme) => setThemeState(newTheme);
  const toggleTheme = () => setThemeState(prev => prev === 'light' ? 'dark' : 'light');

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
