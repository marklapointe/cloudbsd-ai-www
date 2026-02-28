import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useTranslation } from 'react-i18next';

const Login: React.FC = () => {
  const { i18n } = useTranslation();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const isAuthenticated = !!localStorage.getItem('token');
    if (isAuthenticated) {
      navigate('/dashboard');
    }
  }, [navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await axios.post('http://localhost:3001/api/login', {
        username,
        password,
      });
      localStorage.setItem('token', response.data.token);
      localStorage.setItem('username', response.data.user.username);
      localStorage.setItem('role', response.data.user.role);
      
      // Update language if the user has a preference
      if (response.data.user.language) {
        i18n.changeLanguage(response.data.user.language);
      }

      navigate('/dashboard');
    } catch (err: any) {
      setError('Invalid username or password');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 p-4 relative overflow-hidden font-sans">
      {/* Background Image with Overlay */}
      <div className="absolute inset-0 z-0">
        <div className="absolute inset-0 bg-gradient-to-br from-slate-950/80 via-slate-950/50 to-brand-900/40" />
      </div>

      {/* Abstract Background Elements */}
      <div className="absolute top-0 -left-20 w-96 h-96 bg-brand-600/20 rounded-full blur-[120px] animate-pulse-slow z-0" />
      <div className="absolute bottom-0 -right-20 w-96 h-96 bg-purple-600/10 rounded-full blur-[120px] animate-pulse-slow z-0" />
      
      <div className="bg-white/95 backdrop-blur-md rounded-[2.5rem] shadow-2xl p-10 w-full max-w-md relative z-10 border border-slate-100 transition-all duration-500 hover:shadow-brand-500/10">
        <div className="text-center mb-10">
          <div className="mb-6 flex items-center justify-center">
            <img 
              src="/logo.png" 
              alt="CloudBSD Logo" 
              className="w-24 h-24 object-contain drop-shadow-2xl transform -rotate-3 hover:rotate-0 transition-transform duration-300"
            />
          </div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">CloudBSD Admin</h1>
          <p className="text-slate-400 mt-2 font-bold uppercase text-[10px] tracking-[0.2em]">Management Infrastructure</p>
        </div>

        {error && (
          <div className="bg-red-50 text-red-600 p-4 rounded-2xl mb-8 text-sm font-bold border border-red-100 animate-in shake duration-500">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-8">
          <div className="space-y-2">
            <label htmlFor="username" className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Username</label>
            <input 
              id="username"
              type="text" 
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-5 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 focus:bg-white transition-all duration-200 text-slate-900 font-bold placeholder-slate-300 outline-none"
              placeholder="Enter your username"
              required
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="password" className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Password</label>
            <input 
              id="password"
              type="password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-5 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 focus:bg-white transition-all duration-200 text-slate-900 font-bold placeholder-slate-300 outline-none"
              placeholder="••••••••"
              required
            />
          </div>
          <button 
            type="submit"
            className="w-full bg-slate-900 hover:bg-brand-600 text-white font-black py-4 rounded-2xl transition-all duration-300 shadow-xl shadow-slate-900/20 active:scale-95 group flex items-center justify-center gap-2"
          >
            <span>Sign In</span>
            <div className="w-5 h-5 bg-white/10 rounded-lg flex items-center justify-center group-hover:bg-white/20 transition-colors">
              <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </button>
        </form>
        
        <div className="mt-10 pt-8 border-t border-slate-50 text-center">
          <p className="text-xs font-bold text-slate-300 uppercase tracking-widest">Secure Cloud Environment</p>
        </div>
      </div>
    </div>
  );
};

export default Login;
