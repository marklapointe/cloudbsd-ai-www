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

  if (loading) return <div className="text-center py-10">Loading settings...</div>;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Settings</h1>
        <p className="text-slate-500">System configuration and preferences</p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden max-w-2xl">
        <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 flex items-center gap-2">
          <SettingsIcon size={20} className="text-slate-500" />
          <h2 className="font-bold text-slate-900">Server Configuration</h2>
        </div>
        
        <div className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Server Name</label>
              <input 
                type="text" 
                value={config?.servername || ''} 
                disabled
                className="w-full px-4 py-2 rounded-lg border border-slate-200 bg-slate-50 text-slate-500 cursor-not-allowed"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Port</label>
              <input 
                type="text" 
                value={config?.port || ''} 
                disabled
                className="w-full px-4 py-2 rounded-lg border border-slate-200 bg-slate-50 text-slate-500 cursor-not-allowed"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Database Path</label>
            <input 
              type="text" 
              value={config?.dbPath || ''} 
              disabled
              className="w-full px-4 py-2 rounded-lg border border-slate-200 bg-slate-50 text-slate-500 cursor-not-allowed"
            />
          </div>

          <div className="flex items-center gap-4 p-4 bg-blue-50 rounded-lg border border-blue-100">
            <div className="flex-1">
              <p className="text-sm font-medium text-blue-900">Demo Mode</p>
              <p className="text-xs text-blue-700">Currently running in simulated environment.</p>
            </div>
            <div className={`w-12 h-6 rounded-full transition-colors relative ${config?.demoMode ? 'bg-blue-600' : 'bg-slate-300'}`}>
              <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${config?.demoMode ? 'left-7' : 'left-1'}`}></div>
            </div>
          </div>

          <div className="flex items-center gap-4 p-4 bg-emerald-50 rounded-lg border border-emerald-100">
            <div className="flex-1">
              <p className="text-sm font-medium text-emerald-900">SSL/TLS Security</p>
              <p className="text-xs text-emerald-700">HTTPS and WSS are enabled for secure communication.</p>
            </div>
            <div className={`w-12 h-6 rounded-full transition-colors relative ${config?.ssl?.enabled ? 'bg-emerald-600' : 'bg-slate-300'}`}>
              <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${config?.ssl?.enabled ? 'left-7' : 'left-1'}`}></div>
            </div>
          </div>
        </div>

        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex justify-end">
          <button 
            disabled 
            className="flex items-center gap-2 px-4 py-2 bg-slate-200 text-slate-500 font-medium rounded-lg cursor-not-allowed"
          >
            <Save size={18} />
            <span>Save Changes</span>
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden max-w-2xl">
        <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 flex items-center gap-2">
          <RefreshCw size={20} className="text-slate-500" />
          <h2 className="font-bold text-slate-900">System Actions</h2>
        </div>
        <div className="p-6">
          <button 
            className="px-4 py-2 border border-red-200 text-red-600 font-medium rounded-lg hover:bg-red-50 transition-colors"
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
