import React, { useEffect, useState } from 'react';
import { Settings as SettingsIcon, Save, RefreshCw, Key, ShieldCheck, CreditCard, Activity, Users, Server, Box, Hexagon, Clock, CheckCircle2, Languages } from 'lucide-react';
import api from '../api/client';
import { useTranslation } from 'react-i18next';

const Settings: React.FC = () => {
  const { t, i18n } = useTranslation();
  const [config, setConfig] = useState<any>(null);
  const [license, setLicense] = useState<any>(null);
  const [licenseKey, setLicenseKey] = useState('');
  const [loading, setLoading] = useState(true);
  const [savingLicense, setSavingLicense] = useState(false);
  const [message, setMessage] = useState<{ text: string, type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [configRes, licenseRes] = await Promise.all([
        api.get('/system/config'),
        api.get('/system/license')
      ]);
      setConfig(configRes.data);
      setLicense(licenseRes.data);
    } catch (err) {
      console.error('Failed to fetch settings', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterLicense = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingLicense(true);
    setMessage(null);
    try {
      const response = await api.post('/api/system/license', { license_key: licenseKey });
      setLicense(response.data.license);
      setLicenseKey('');
      setMessage({ text: response.data.message, type: 'success' });
    } catch (err: any) {
      setMessage({ 
        text: err.response?.data?.message || 'Failed to register license', 
        type: 'error' 
      });
    } finally {
      setSavingLicense(false);
    }
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center py-20 gap-4 animate-in fade-in duration-500">
      <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-brand-500"></div>
      <span className="text-sm font-black text-slate-400 uppercase tracking-widest">{t('common.loading')}</span>
    </div>
  );

  const getLimitLabel = (limit: number) => {
    if (limit >= 99999) return '∞';
    return limit.toString();
  };

  const getUsagePercent = (used: number, limit: number) => {
    if (limit >= 99999) return 5; // Minimal bar for unlimited
    return Math.min(100, (used / limit) * 100);
  };

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">{t('settings.title')}</h1>
          <p className="text-slate-500 mt-1 font-medium">System configuration and preferences</p>
        </div>
      </div>

      {message && (
        <div className={`p-4 rounded-2xl flex items-center gap-3 animate-in slide-in-from-top-2 duration-300 ${
          message.type === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-red-50 text-red-700 border border-red-100'
        }`}>
          {message.type === 'success' ? <CheckCircle2 size={18} /> : <Activity size={18} />}
          <p className="text-sm font-bold">{message.text}</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-start">
        <div className="space-y-10">
          <div className="bg-white rounded-[2rem] shadow-soft border border-slate-100 overflow-hidden transition-all duration-300 hover:shadow-xl">
            <div className="px-8 py-6 border-b border-slate-50 bg-slate-50/50 flex items-center gap-3">
              <div className="p-2 bg-slate-200 text-slate-600 rounded-xl">
                <SettingsIcon size={20} />
              </div>
              <h2 className="text-lg font-black text-slate-900 uppercase tracking-tight">{t('settings.server_config')}</h2>
            </div>
            
            <div className="p-8 space-y-8">
              <div className="space-y-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className="p-1.5 bg-brand-100 text-brand-600 rounded-lg">
                    <Languages size={16} />
                  </div>
                  <h3 className="text-sm font-bold text-slate-900">{t('settings.language')}</h3>
                </div>
                <div className="relative group">
                  <select
                    value={i18n.language}
                    onChange={(e) => i18n.changeLanguage(e.target.value)}
                    className="w-full px-5 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl text-slate-900 font-bold outline-none appearance-none focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 focus:bg-white transition-all duration-200 cursor-pointer"
                  >
                    <option value="en">English</option>
                    <option value="fr">Français</option>
                    <option value="es">Español</option>
                    <option value="pt">Português</option>
                    <option value="ro">Română</option>
                    <option value="zh">中文</option>
                    <option value="ja">日本語</option>
                    <option value="ar-IQ">العراقية (IRAQ)</option>
                  </select>
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 group-hover:text-brand-500 transition-colors">
                    <Languages size={18} />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-2">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{t('settings.server_name')}</label>
                  <input 
                    type="text" 
                    value={config?.servername || ''} 
                    disabled
                    className="w-full px-5 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl text-slate-400 cursor-not-allowed font-bold"
                  />
                </div>
                <div className="space-y-2">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{t('settings.port')}</label>
                  <input 
                    type="text" 
                    value={config?.port || ''} 
                    disabled
                    className="w-full px-5 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl text-slate-400 cursor-not-allowed font-bold"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{t('settings.db_path')}</label>
                <input 
                  type="text" 
                  value={config?.dbPath || ''} 
                  disabled
                  className="w-full px-5 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl text-slate-400 cursor-not-allowed font-bold"
                />
              </div>

              <div className="flex items-center gap-5 p-6 bg-blue-50 rounded-2xl border border-blue-100/50 transition-colors hover:bg-blue-50/80">
                <div className="flex-1">
                  <p className="text-sm font-black text-blue-900 uppercase tracking-wider">{t('settings.demo_mode')}</p>
                  <p className="text-xs text-blue-700/70 font-bold mt-0.5">{t('settings.demo_mode_desc')}</p>
                </div>
                <div className={`w-14 h-7 rounded-full transition-all duration-300 relative shadow-inner ${config?.demoMode ? 'bg-blue-600 shadow-blue-900/20' : 'bg-slate-300'}`}>
                  <div className={`absolute top-1 w-5 h-5 bg-white rounded-full transition-all duration-300 shadow-md ${config?.demoMode ? 'left-8' : 'left-1'}`}></div>
                </div>
              </div>

              <div className="flex items-center gap-5 p-6 bg-emerald-50 rounded-2xl border border-emerald-100/50 transition-colors hover:bg-emerald-50/80">
                <div className="flex-1">
                  <p className="text-sm font-black text-emerald-900 uppercase tracking-wider">{t('settings.ssl_security')}</p>
                  <p className="text-xs text-emerald-700/70 font-bold mt-0.5">{t('settings.ssl_security_desc')}</p>
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
                <span>{t('common.save')}</span>
              </button>
            </div>
          </div>

          <div className="bg-white rounded-[2rem] shadow-soft border border-slate-100 overflow-hidden transition-all duration-300 hover:shadow-xl">
            <div className="px-8 py-6 border-b border-slate-50 bg-slate-50/50 flex items-center gap-3">
              <div className="p-2 bg-slate-200 text-slate-600 rounded-xl">
                <RefreshCw size={20} />
              </div>
              <h2 className="text-lg font-black text-slate-900 uppercase tracking-tight">{t('settings.system_actions')}</h2>
            </div>
            <div className="p-8">
              <button 
                className="px-6 py-3 bg-white border-2 border-red-500/20 text-red-500 font-black uppercase text-xs tracking-widest rounded-2xl hover:bg-red-500 hover:text-white hover:border-red-500 transition-all duration-300 active:scale-95 shadow-sm"
                onClick={() => alert('This would restart the admin panel service.')}
              >
                {t('settings.restart_service')}
              </button>
            </div>
          </div>
        </div>

        <div className="space-y-10">
          <div className="bg-white rounded-[2rem] shadow-soft border border-slate-100 overflow-hidden transition-all duration-300 hover:shadow-xl">
            <div className="px-8 py-6 border-b border-slate-50 bg-slate-50/50 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-brand-100 text-brand-600 rounded-xl">
                  <ShieldCheck size={20} />
                </div>
                <h2 className="text-lg font-black text-slate-900 uppercase tracking-tight">{t('settings.license_status')}</h2>
              </div>
              {license?.status === 'active' && (
                <span className="px-3 py-1 bg-emerald-100 text-emerald-600 text-[10px] font-black uppercase tracking-widest rounded-lg">Active</span>
              )}
            </div>
            
            <div className="p-8 space-y-8">
              <div className="flex flex-col gap-6">
                <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                  <div className="flex items-center gap-3">
                    <CreditCard className="text-slate-400" size={20} />
                    <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('settings.license_type')}</p>
                      <p className="text-sm font-bold text-slate-900 capitalize">{license?.license_type || 'None'}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('settings.registered_to')}</p>
                    <p className="text-sm font-bold text-slate-900">{license?.registered_to || 'Unregistered'}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                    <div className="flex items-center gap-2 mb-2">
                      <Clock className="text-slate-400" size={16} />
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('settings.expires_on')}</p>
                    </div>
                    <p className="text-sm font-bold text-slate-900">
                      {license?.expiry_date ? new Date(license.expiry_date).toLocaleDateString() : 'N/A'}
                    </p>
                  </div>
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                    <div className="flex items-center gap-2 mb-2">
                      <Activity className="text-slate-400" size={16} />
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('settings.support_tier')}</p>
                    </div>
                    <p className="text-sm font-bold text-slate-900 capitalize">{license?.support_tier || 'None'}</p>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">{t('settings.allowed_resources')}</h3>
                <div className="grid grid-cols-2 gap-y-6 gap-x-8">
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <Server size={14} className="text-brand-500" />
                        <span className="text-xs font-bold text-slate-600">{t('common.cluster')}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-black text-slate-900">{license?.usage?.nodes || 0}</span>
                        <span className="text-[10px] font-black text-slate-300">/</span>
                        <span className="text-xs font-black text-slate-400">{getLimitLabel(license?.nodes_limit)}</span>
                      </div>
                    </div>
                    <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-brand-500 transition-all duration-1000" 
                        style={{ width: `${getUsagePercent(license?.usage?.nodes || 0, license?.nodes_limit || 1)}%` }}
                      ></div>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <Hexagon size={14} className="text-purple-500" />
                        <span className="text-xs font-bold text-slate-600">{t('common.vms')}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-black text-slate-900">{license?.usage?.vms || 0}</span>
                        <span className="text-[10px] font-black text-slate-300">/</span>
                        <span className="text-xs font-black text-slate-400">{getLimitLabel(license?.vms_limit)}</span>
                      </div>
                    </div>
                    <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-purple-500 transition-all duration-1000" 
                        style={{ width: `${getUsagePercent(license?.usage?.vms || 0, license?.vms_limit || 1)}%` }}
                      ></div>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <Box size={14} className="text-blue-500" />
                        <span className="text-xs font-bold text-slate-600">{t('common.containers')}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-black text-slate-900">{license?.usage?.containers || 0}</span>
                        <span className="text-[10px] font-black text-slate-300">/</span>
                        <span className="text-xs font-black text-slate-400">{getLimitLabel(license?.containers_limit)}</span>
                      </div>
                    </div>
                    <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-blue-500 transition-all duration-1000" 
                        style={{ width: `${getUsagePercent(license?.usage?.containers || 0, license?.containers_limit || 1)}%` }}
                      ></div>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <Activity size={14} className="text-emerald-500" />
                        <span className="text-xs font-bold text-slate-600">{t('common.jails')}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-black text-slate-900">{license?.usage?.jails || 0}</span>
                        <span className="text-[10px] font-black text-slate-300">/</span>
                        <span className="text-xs font-black text-slate-400">{getLimitLabel(license?.jails_limit)}</span>
                      </div>
                    </div>
                    <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-emerald-500 transition-all duration-1000" 
                        style={{ width: `${getUsagePercent(license?.usage?.jails || 0, license?.jails_limit || 1)}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              </div>

              {license?.features && license.features.length > 0 && (
                <div className="space-y-4">
                  <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">{t('settings.included_features')}</h3>
                  <div className="flex flex-wrap gap-2">
                    {license.features.map((feature: string) => (
                      <span key={feature} className="px-3 py-1.5 bg-brand-50 text-brand-700 text-[10px] font-bold rounded-xl border border-brand-100 flex items-center gap-1.5">
                        <CheckCircle2 size={12} className="text-brand-500" />
                        {feature.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="bg-white rounded-[2rem] shadow-soft border border-slate-100 overflow-hidden transition-all duration-300 hover:shadow-xl">
            <div className="px-8 py-6 border-b border-slate-50 bg-slate-50/50 flex items-center gap-3">
              <div className="p-2 bg-slate-200 text-slate-600 rounded-xl">
                <Key size={20} />
              </div>
              <h2 className="text-lg font-black text-slate-900 uppercase tracking-tight">{t('settings.license_reg')}</h2>
            </div>
            
            <form onSubmit={handleRegisterLicense} className="p-8 space-y-6">
              <div className="space-y-2">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{t('settings.reg_new_key')}</label>
                <div className="relative">
                  <input 
                    type="text" 
                    value={licenseKey}
                    onChange={(e) => setLicenseKey(e.target.value)}
                    placeholder={t('settings.reg_key_placeholder')}
                    required
                    className="w-full px-5 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 focus:bg-white transition-all duration-200 text-slate-900 font-bold placeholder-slate-300 outline-none pl-12"
                  />
                  <Key size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                </div>
                <p className="text-[10px] text-slate-400 font-medium ml-1">{t('settings.example')}: CBSD-STD-FREE-2026 or CBSD-ENT-PRO-2026</p>
              </div>

              <button 
                type="submit"
                disabled={savingLicense}
                className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-slate-900 text-white font-black uppercase text-xs tracking-widest rounded-2xl hover:bg-brand-600 transition-all duration-300 active:scale-95 shadow-lg shadow-slate-900/10 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {savingLicense ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                ) : (
                  <>
                    <ShieldCheck size={18} />
                    <span>{t('settings.register_license')}</span>
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;
