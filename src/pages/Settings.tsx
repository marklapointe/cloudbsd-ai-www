import React, { useEffect, useState } from 'react';
import { Settings as SettingsIcon, Save, RefreshCw } from 'lucide-react';
import api from '../api/client';

const Settings: React.FC = () => {
  const [config, setConfig] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    try {
      const response = await api.get('/system/config');
      setConfig(response.data);
    } catch (err) {
      console.error('Failed to fetch config', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center py-20 gap-4 animate-in fade-in duration-500">
      <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-brand-500"></div>
      <span className="text-sm font-black text-slate-400 uppercase tracking-widest">Loading settings...</span>
    </div>
  );

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Settings</h1>
          <p className="text-slate-500 mt-1 font-medium">System configuration and preferences</p>
        </div>
      </div>

      <div className="bg-white rounded-[2rem] shadow-soft border border-slate-100 overflow-hidden max-w-2xl transition-all duration-300 hover:shadow-xl">
        <div className="px-8 py-6 border-b border-slate-50 bg-slate-50/50 flex items-center gap-3">
          <div className="p-2 bg-slate-200 text-slate-600 rounded-xl">
            <SettingsIcon size={20} />
          </div>
          <h2 className="text-lg font-black text-slate-900 uppercase tracking-tight">Server Configuration</h2>
        </div>
        
        <div className="p-8 space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-2">
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Server Name</label>
              <input 
                type="text" 
                value={config?.servername || ''} 
                disabled
                className="w-full px-5 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl text-slate-400 cursor-not-allowed font-bold"
              />
            </div>
            <div className="space-y-2">
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Port</label>
              <input 
                type="text" 
                value={config?.port || ''} 
                disabled
                className="w-full px-5 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl text-slate-400 cursor-not-allowed font-bold"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Database Path</label>
            <input 
              type="text" 
              value={config?.dbPath || ''} 
              disabled
              className="w-full px-5 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl text-slate-400 cursor-not-allowed font-bold"
            />
          </div>

          <div className="flex items-center gap-5 p-6 bg-blue-50 rounded-2xl border border-blue-100/50 transition-colors hover:bg-blue-50/80">
            <div className="flex-1">
              <p className="text-sm font-black text-blue-900 uppercase tracking-wider">Demo Mode</p>
              <p className="text-xs text-blue-700/70 font-bold mt-0.5">Currently running in a simulated environment.</p>
            </div>
            <div className={`w-14 h-7 rounded-full transition-all duration-300 relative shadow-inner ${config?.demoMode ? 'bg-blue-600 shadow-blue-900/20' : 'bg-slate-300'}`}>
              <div className={`absolute top-1 w-5 h-5 bg-white rounded-full transition-all duration-300 shadow-md ${config?.demoMode ? 'left-8' : 'left-1'}`}></div>
            </div>
          </div>

          <div className="flex items-center gap-5 p-6 bg-emerald-50 rounded-2xl border border-emerald-100/50 transition-colors hover:bg-emerald-50/80">
            <div className="flex-1">
              <p className="text-sm font-black text-emerald-900 uppercase tracking-wider">SSL/TLS Security</p>
              <p className="text-xs text-emerald-700/70 font-bold mt-0.5">HTTPS and WSS are enabled for secure communication.</p>
            </div>
            <div className={`w-14 h-7 rounded-full transition-all duration-300 relative shadow-inner ${config?.ssl?.enabled ? 'bg-emerald-600 shadow-emerald-900/20' : 'bg-slate-300'}`}>
              <div className={`absolute top-1 w-5 h-5 bg-white rounded-full transition-all duration-300 shadow-md ${config?.ssl?.enabled ? 'left-8' : 'left-1'}`}></div>
            </div>
          </div>
        </div>

        <div className="px-8 py-6 border-t border-slate-50 bg-slate-50/50 flex justify-end">
          <button 
            disabled 
            className="flex items-center gap-2 px-6 py-3 bg-slate-200 text-slate-400 font-black uppercase text-xs tracking-widest rounded-2xl cursor-not-allowed transition-all"
          >
            <Save size={18} />
            <span>Save Changes</span>
          </button>
        </div>
      </div>

      <div className="bg-white rounded-[2rem] shadow-soft border border-slate-100 overflow-hidden max-w-2xl transition-all duration-300 hover:shadow-xl">
        <div className="px-8 py-6 border-b border-slate-50 bg-slate-50/50 flex items-center gap-3">
          <div className="p-2 bg-slate-200 text-slate-600 rounded-xl">
            <RefreshCw size={20} />
          </div>
          <h2 className="text-lg font-black text-slate-900 uppercase tracking-tight">System Actions</h2>
        </div>
        <div className="p-8">
          <button 
            className="px-6 py-3 bg-white border-2 border-red-500/20 text-red-500 font-black uppercase text-xs tracking-widest rounded-2xl hover:bg-red-500 hover:text-white hover:border-red-500 transition-all duration-300 active:scale-95 shadow-sm"
            onClick={() => alert('This would restart the admin panel service.')}
          >
            Restart Service
          </button>
        </div>
      </div>
    </div>
  );
};

export default Settings;
