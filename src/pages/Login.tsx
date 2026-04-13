import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Languages, Sun, Moon } from 'lucide-react';
import api from '../api/client';
import { useTranslation } from 'react-i18next';
import { getSortedLanguages } from '../constants/languages';
import { useTheme } from '../contexts/ThemeContext';

const Login: React.FC = () => {
  const { t, i18n } = useTranslation();
  const { theme, toggleTheme } = useTheme();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const sortedLanguages = getSortedLanguages();

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const errorCode = urlParams.get('error');
    if (errorCode === 'session_corrupted') {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setError('Your session data was corrupted. Please log in again.');
    } else if (errorCode === 'session_expired') {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setError('Your session has expired or is invalid. Please log in again.');
    }
    
    const isAuthenticated = !!localStorage.getItem('token');
    if (isAuthenticated) {
      navigate('/dashboard');
    }
  }, [navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await api.post('/login', {
        username,
        password,
      });
      localStorage.setItem('token', response.data.token);
      localStorage.setItem('username', response.data.user.username);
      localStorage.setItem('role', response.data.user.role);
      
      // Update language if the user has a preference and save it to localStorage for the detector
      if (response.data.user.language) {
        localStorage.setItem('i18nextLng', response.data.user.language);
        i18n.changeLanguage(response.data.user.language);
      }

      // Update timezone if the user has a preference
      if (response.data.user.timezone) {
        localStorage.setItem('userTimezone', response.data.user.timezone);
      } else {
        localStorage.removeItem('userTimezone');
      }

      navigate('/dashboard');
    } catch {
      setError(t('login.error_invalid') || 'Invalid username or password');
    }
  };

  return (
    <div className={`min-h-screen flex items-center justify-center ${theme === 'dark' ? 'bg-slate-950' : 'bg-slate-50'} p-4 relative overflow-hidden font-sans transition-colors duration-500`}>
      {/* Background Image with Overlay */}
      <div className="absolute inset-0 z-0">
        <div className={`absolute inset-0 ${theme === 'dark' ? 'bg-gradient-to-br from-slate-950/80 via-slate-950/50 to-brand-900/40' : 'bg-gradient-to-br from-slate-50/80 via-white/50 to-brand-100/40'}`} />
      </div>

      {/* Theme Toggle (Top Right) */}
      <div className="absolute top-6 right-6 z-20">
        <button 
          onClick={toggleTheme}
          className="p-3 rounded-2xl bg-white/20 dark:bg-slate-900/20 backdrop-blur-md border border-white/20 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:text-brand-600 dark:hover:text-brand-400 transition-all hover:scale-110 active:scale-95 shadow-xl"
          title={t('layout.toggle_theme')}
        >
          {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
        </button>
      </div>

      {/* Abstract Background Elements */}
      <div className="absolute top-0 -left-20 w-96 h-96 bg-brand-600/20 rounded-full blur-[120px] animate-pulse-slow z-0" />
      <div className="absolute bottom-0 -right-20 w-96 h-96 bg-purple-600/10 rounded-full blur-[120px] animate-pulse-slow z-0" />
      
      <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-md rounded-[2.5rem] shadow-2xl p-10 w-full max-w-md relative z-10 border border-slate-100 dark:border-slate-800 transition-all duration-500 hover:shadow-brand-500/10">
        <div className="text-center mb-10">
          <div className="mb-6 flex items-center justify-center">
            <img 
              src="/logo.png" 
              alt="CloudBSD Logo" 
              className="w-24 h-24 object-contain drop-shadow-2xl transform -rotate-3 hover:rotate-0 transition-transform duration-300"
            />
          </div>
          <h1 className="text-3xl font-black text-slate-900 dark:text-slate-100 tracking-tight">{t('login.title')}</h1>
          <p className="text-slate-400 dark:text-slate-500 mt-2 font-bold uppercase text-[10px] tracking-[0.2em]">{t('login.subtitle')}</p>
        </div>

        {error && (
          <div className="bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 p-4 rounded-2xl mb-8 text-sm font-bold border border-red-100 dark:border-red-500/20 animate-in shake duration-500">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-8">
          <div className="space-y-2">
            <label htmlFor="username" className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">{t('login.username_label')}</label>
            <input 
              id="username"
              type="text" 
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-5 py-3.5 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 focus:bg-white dark:focus:bg-slate-700 transition-all duration-200 text-slate-900 dark:text-slate-100 font-bold placeholder-slate-300 dark:placeholder-slate-600 outline-none"
              placeholder={t('login.username_placeholder')}
              required
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="password" className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">{t('login.password_label')}</label>
            <input 
              id="password"
              type="password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-5 py-3.5 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 focus:bg-white dark:focus:bg-slate-700 transition-all duration-200 text-slate-900 dark:text-slate-100 font-bold placeholder-slate-300 dark:placeholder-slate-600 outline-none"
              placeholder={t('login.password_placeholder')}
              required
            />
          </div>
          <button 
            type="submit"
            className="w-full bg-slate-900 dark:bg-brand-600 hover:bg-brand-600 dark:hover:bg-brand-700 text-white font-black py-4 rounded-2xl transition-all duration-300 shadow-xl shadow-slate-900/20 dark:shadow-brand-600/20 active:scale-95 group flex items-center justify-center gap-2 border-b-4 border-slate-950 dark:border-brand-800 hover:border-b-0 hover:translate-y-[2px]"
          >
            <span className="uppercase text-xs tracking-widest">{t('login.sign_in')}</span>
            <div className="w-6 h-6 bg-white/10 rounded-lg flex items-center justify-center group-hover:bg-white/20 transition-colors">
              <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={4} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </button>
        </form>
        
        <div className="mt-10 pt-8 border-t border-slate-50 dark:border-slate-800 text-center">
          <div className="flex flex-col items-center gap-4">
            <div className="relative group w-full max-w-[200px]">
              <select
                value={i18n.language}
                onChange={(e) => i18n.changeLanguage(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 outline-none appearance-none focus:ring-2 focus:ring-brand-500/10 focus:border-brand-500 transition-all cursor-pointer"
                aria-label={t('common.language')}
              >
                {sortedLanguages.map((lang) => (
                  <option key={lang.code} value={lang.code}>
                    {lang.name}
                  </option>
                ))}
              </select>
              <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 dark:text-slate-500">
                <Languages size={14} />
              </div>
              <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-300 dark:text-slate-600">
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>
            <p className="text-xs font-bold text-slate-300 dark:text-slate-600 uppercase tracking-widest">{t('login.footer')}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
