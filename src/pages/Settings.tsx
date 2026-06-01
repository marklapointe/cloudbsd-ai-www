/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useEffect, useState } from 'react';
import { Settings as SettingsIcon, Key, ShieldCheck, CreditCard, Activity, Server, Box, Hexagon, Clock, CheckCircle2, Languages } from 'lucide-react';
import api from '../api/client';
import { getSortedLanguages } from '../constants/languages';
import { getDetectedTimezone, formatLocalDate } from '../utils/dateUtils';
import { useTranslation } from 'react-i18next';
import { ToggleSwitch } from '../components/ui/ToggleSwitch';
import { UsageBar } from '../components/ui/UsageBar';
import { SettingsCard } from '../components/ui/SettingsCard';
import { SelectField } from '../components/ui/SelectField';
import { AlertBanner } from '../components/ui/AlertBanner';

const Settings: React.FC = () => {
  const { t, i18n } = useTranslation();
  const [license, setLicense] = useState<any>(null);
  const [licenseKey, setLicenseKey] = useState('');
  const [loading, setLoading] = useState(true);
  const [savingLicense, setSavingLicense] = useState(false);
  const [message, setMessage] = useState<{ text: string, type: 'success' | 'error' } | null>(null);
  const [savingLanguage, setSavingLanguage] = useState(false);
  const [savingTimezone, setSavingTimezone] = useState(false);
  const [timezone, setTimezone] = useState(localStorage.getItem('userTimezone') || '');
  const [, setSavingConfig] = useState(false);
  const [serverName, setServerName] = useState('');
  const [demoMode, setDemoMode] = useState(false);
  const [sslEnabled, setSslEnabled] = useState(false);
  const [corsEnabled, setCorsEnabled] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [configRes, licenseRes] = await Promise.all([
        api.get('/system/config'),
        api.get('/system/license')
      ]);
      setSslEnabled(configRes.data.ssl?.enabled || false);
      setCorsEnabled(configRes.data.corsEnabled || false);
      setServerName(configRes.data.servername || '');
      setDemoMode(configRes.data.demoMode || false);
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
      const response = await api.post('/system/license', { license_key: licenseKey });
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

  const getLimitLabel = (limit: any) => {
    if (limit === undefined || limit === null) return '0';
    if (Number(limit) >= 99999) return '∞';
    return limit.toString();
  };

  const getUsagePercent = (used: any, limit: any) => {
    if (!limit || limit === 0) return 0;
    if (limit >= 99999) return 5; // Minimal bar for unlimited
    return Math.min(100, ((used || 0) / limit) * 100);
  };

  const sortedLanguages = getSortedLanguages();

  const handleLanguageChange = async (newLang: string) => {
    setSavingLanguage(true);
    setMessage(null);
    try {
      localStorage.setItem('i18nextLng', newLang);
      await i18n.changeLanguage(newLang);
      
      // In demo mode, we don't persist the language to the backend
      // This avoids CORS issues if the user is a guest without a valid token
      if (!demoMode) {
        await api.put('/users/profile', { language: newLang });
      }
      
      // Use i18n.t directly to ensure we use the new language context immediately
      setMessage({ text: i18n.t('settings.language_updated'), type: 'success' });
    } catch (err: any) {
      console.error('Failed to update language', err);
      setMessage({ text: t('settings.language_update_failed'), type: 'error' });
    } finally {
      setSavingLanguage(false);
    }
  };

  const handleTimezoneChange = async (newTz: string) => {
    setSavingTimezone(true);
    setMessage(null);
    try {
      if (newTz === '') {
        localStorage.removeItem('userTimezone');
      } else {
        localStorage.setItem('userTimezone', newTz);
      }
      setTimezone(newTz);
      
      if (!demoMode) {
        await api.put('/users/profile', { timezone: newTz || null });
      }
      
      setMessage({ text: t('settings.timezone_updated'), type: 'success' });
    } catch (err: any) {
      console.error('Failed to update timezone', err);
      setMessage({ text: t('settings.timezone_update_failed'), type: 'error' });
    } finally {
      setSavingTimezone(false);
    }
  };

  const handleSaveConfig = async (configOverride?: any) => {
    setSavingConfig(true);
    setMessage(null);
    try {
      const config = {
        servername: serverName,
        demoMode,
        ssl: { enabled: sslEnabled },
        corsEnabled,
        ...configOverride
      };
      const response = await api.put('/system/config', config);
      setMessage({ text: response.data.message, type: 'success' });
    } catch (err: any) {
      console.error('Failed to update config', err);
      setMessage({ 
        text: err.response?.data?.message || t('settings.config_update_failed', { defaultValue: 'Failed to update configuration' }), 
        type: 'error' 
      });
    } finally {
      setSavingConfig(false);
    }
  };

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">{t('settings.title')}</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1 font-medium">{t('settings.subtitle')}</p>
        </div>
      </div>

      {message && (
        <AlertBanner type={message.type} message={message.text} />
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-start">
        <div className="space-y-10">
          <SettingsCard title={t('settings.server_config')} icon={SettingsIcon}>
            <SelectField
              label={t('settings.language_select')}
              icon={Languages}
              value={i18n.language}
              onChange={handleLanguageChange}
              options={sortedLanguages.map((lang) => ({ value: lang.code, label: lang.name }))}
              disabled={savingLanguage}
            />

            <SelectField
              label={t('settings.timezone_select')}
              icon={Clock}
              value={timezone}
              onChange={handleTimezoneChange}
              options={[
                { value: '', label: t('settings.use_detected_timezone', { tz: getDetectedTimezone() }) },
                ...Intl.supportedValuesOf('timeZone').map((tz) => ({ value: tz, label: tz })),
              ]}
              disabled={savingTimezone}
            />

            <div
              className="flex items-center gap-5 p-6 bg-blue-50 dark:bg-blue-500/10 rounded-2xl border border-blue-100/50 dark:border-blue-500/20 transition-colors hover:bg-blue-50/80 dark:hover:bg-blue-500/20 cursor-pointer"
              onClick={() => {
                const newValue = !demoMode;
                setDemoMode(newValue);
                handleSaveConfig({ demoMode: newValue });
              }}
            >
              <div className="flex-1">
                <p className="text-sm font-black text-blue-900 dark:text-blue-300 uppercase tracking-wider">{t('settings.demo_mode')}</p>
                <p className="text-xs text-blue-700/70 dark:text-blue-400/70 font-bold mt-0.5">{t('settings.demo_mode_desc')}</p>
              </div>
              <ToggleSwitch
                checked={demoMode}
                onChange={(newValue) => {
                  setDemoMode(newValue);
                  handleSaveConfig({ demoMode: newValue });
                }}
                color="blue"
              />
            </div>

            <div
              className="flex items-center gap-5 p-6 bg-emerald-50 dark:bg-emerald-500/10 rounded-2xl border border-emerald-100/50 dark:border-emerald-500/20 transition-colors hover:bg-emerald-50/80 dark:hover:bg-emerald-500/20 cursor-pointer"
              onClick={() => {
                const newValue = !sslEnabled;
                setSslEnabled(newValue);
                handleSaveConfig({ ssl: { enabled: newValue } });
              }}
            >
              <div className="flex-1">
                <p className="text-sm font-black text-emerald-900 dark:text-emerald-300 uppercase tracking-wider">{t('settings.ssl_security')}</p>
                <p className="text-xs text-emerald-700/70 dark:text-emerald-400/70 font-bold mt-0.5">{t('settings.ssl_security_desc')}</p>
              </div>
              <ToggleSwitch
                checked={sslEnabled}
                onChange={(newValue) => {
                  setSslEnabled(newValue);
                  handleSaveConfig({ ssl: { enabled: newValue } });
                }}
                color="emerald"
              />
            </div>

            <div
              className="flex items-center gap-5 p-6 bg-amber-50 dark:bg-amber-500/10 rounded-2xl border border-amber-100/50 dark:border-amber-500/20 transition-colors hover:bg-amber-50/80 dark:hover:bg-amber-500/20 cursor-pointer"
              onClick={() => {
                const newValue = !corsEnabled;
                setCorsEnabled(newValue);
                handleSaveConfig({ corsEnabled: newValue });
              }}
            >
              <div className="flex-1">
                <p className="text-sm font-black text-amber-900 dark:text-amber-300 uppercase tracking-wider">{t('settings.cors_config')}</p>
                <p className="text-xs text-amber-700/70 dark:text-amber-400/70 font-bold mt-0.5">{t('settings.cors_config_desc')}</p>
              </div>
              <ToggleSwitch
                checked={corsEnabled}
                onChange={(newValue) => {
                  setCorsEnabled(newValue);
                  handleSaveConfig({ corsEnabled: newValue });
                }}
                color="amber"
              />
            </div>
          </SettingsCard>
        </div>

        <div className="space-y-10">
          <SettingsCard
            title={t('settings.license_status')}
            icon={ShieldCheck}
            badge={license?.status === 'active' ? t('settings.active') : undefined}
          >
            <div className="flex flex-col gap-6">
              <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700">
                <div className="flex items-center gap-3">
                  <CreditCard className="text-slate-400 dark:text-slate-500" size={20} />
                  <div>
                    <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">{t('settings.license_type')}</p>
                    <p className="text-sm font-bold text-slate-900 dark:text-slate-100 capitalize">{license?.license_type ? t(`settings.${license.license_type.toLowerCase()}`) : t('settings.none')}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">{t('settings.registered_to')}</p>
                  <p className="text-sm font-bold text-slate-900 dark:text-slate-100">{license?.registered_to || t('settings.unregistered')}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700">
                  <div className="flex items-center gap-2 mb-2">
                    <Clock className="text-slate-400 dark:text-slate-500" size={16} />
                    <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">{t('settings.expires_on')}</p>
                  </div>
                  <p className="text-sm font-bold text-slate-900 dark:text-slate-100">
                    {license?.expiry_date ? formatLocalDate(license.expiry_date) : t('settings.not_applicable')}
                  </p>
                </div>
                <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700">
                  <div className="flex items-center gap-2 mb-2">
                    <Activity className="text-slate-400 dark:text-slate-500" size={16} />
                    <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">{t('settings.support_tier')}</p>
                  </div>
                  <p className="text-sm font-bold text-slate-900 dark:text-slate-100 capitalize">{license?.support_tier ? t(`settings.${license.support_tier.toLowerCase()}`) : t('settings.none')}</p>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">{t('settings.allowed_resources')}</h3>
              <div className="grid grid-cols-2 gap-y-6 gap-x-8">
                <UsageBar
                  icon={Server}
                  label={t('common.cluster')}
                  used={license?.usage?.nodes || 0}
                  limit={license?.nodes_limit || 1}
                  color="bg-brand-500"
                  getLimitLabel={getLimitLabel}
                  getUsagePercent={getUsagePercent}
                />
                <UsageBar
                  icon={Hexagon}
                  label={t('common.vms')}
                  used={license?.usage?.vms || 0}
                  limit={license?.vms_limit || 1}
                  color="bg-purple-500"
                  getLimitLabel={getLimitLabel}
                  getUsagePercent={getUsagePercent}
                />
                <UsageBar
                  icon={Box}
                  label={t('common.containers')}
                  used={license?.usage?.containers || 0}
                  limit={license?.containers_limit || 1}
                  color="bg-blue-500"
                  getLimitLabel={getLimitLabel}
                  getUsagePercent={getUsagePercent}
                />
                <UsageBar
                  icon={Activity}
                  label={t('common.jails')}
                  used={license?.usage?.jails || 0}
                  limit={license?.jails_limit || 1}
                  color="bg-emerald-500"
                  getLimitLabel={getLimitLabel}
                  getUsagePercent={getUsagePercent}
                />
              </div>
            </div>

            {license?.features && license.features.length > 0 && (
              <div className="space-y-4">
                <h3 className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">{t('settings.included_features')}</h3>
                <div className="flex flex-wrap gap-2">
                  {license.features.map((feature: string) => (
                    <span key={feature} className="px-3 py-1.5 bg-brand-50 dark:bg-brand-500/10 text-brand-700 dark:text-brand-400 text-[10px] font-bold rounded-xl border border-brand-100 dark:border-brand-500/20 flex items-center gap-1.5">
                      <CheckCircle2 size={12} className="text-brand-500" />
                      {t(`settings.feature_${feature.toLowerCase().replace(/ /g, '_')}`, { defaultValue: feature })}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </SettingsCard>

          <SettingsCard title={t('settings.license_reg')} icon={Key}>
            <form onSubmit={handleRegisterLicense} className="space-y-6">
              <div className="space-y-2">
                <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">{t('settings.reg_new_key')}</label>
                <div className="relative">
                  <input
                    type="text"
                    value={licenseKey}
                    onChange={(e) => setLicenseKey(e.target.value)}
                    placeholder={t('settings.reg_key_placeholder')}
                    required
                    className="w-full px-5 py-3.5 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 focus:bg-white dark:focus:bg-slate-700 transition-all duration-200 text-slate-900 dark:text-slate-100 font-bold placeholder-slate-300 dark:placeholder-slate-600 outline-none pl-12"
                  />
                  <Key size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
                </div>
                <p className="text-[10px] text-slate-400 dark:text-slate-500 font-medium ml-1">{t('settings.example')}: CBSD-STD-FREE-2026 or CBSD-ENT-PRO-2026</p>
              </div>

              <button
                type="submit"
                disabled={savingLicense}
                className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-brand-600 text-white font-black uppercase text-xs tracking-widest rounded-2xl hover:bg-brand-700 transition-all duration-300 active:scale-95 shadow-lg shadow-brand-600/20 disabled:opacity-50 disabled:cursor-not-allowed border-b-4 border-brand-800 dark:border-brand-900 hover:border-b-0 hover:translate-y-[2px]"
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
          </SettingsCard>
        </div>
      </div>
    </div>
  );
};

export default Settings;
