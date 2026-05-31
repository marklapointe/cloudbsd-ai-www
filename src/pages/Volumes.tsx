import React, { useEffect, useState } from 'react';
import { HardDrive, Activity } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import api from '../api/client';

interface VolumeData {
  name: string;
  type: string;
  size: string;
  used: string;
  available: string;
  mount_point: string;
  status: string;
}

const Volumes: React.FC = () => {
  const { t } = useTranslation();
  const [volumes, setVolumes] = useState<VolumeData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchVolumes = async () => {
    try {
      setLoading(true);
      const response = await api.get('/volumes');
      const isJson = response.headers?.['content-type']?.includes('application/json') ||
                   (!response.headers?.['content-type'] && typeof response.data === 'object');

      if (isJson) {
        if (Array.isArray(response.data)) {
          setVolumes(response.data);
        } else {
          console.error('Invalid volumes data received:', response.data);
          setVolumes([]);
        }
      } else {
        console.error('Unexpected response content type:', response.headers?.['content-type']);
        setError(t('volumes.fetch_failed'));
        setVolumes([]);
      }
    } catch (err: unknown) {
      const errorResponse = err as { response?: { data?: { message?: string } } };
      setError(errorResponse.response?.data?.message || t('volumes.fetch_failed'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVolumes();
  }, []);

  // Helper to calculate usage percentage
  const getUsagePercent = (used: string, available: string): number => {
    const usedNum = parseFloat(used.replace(/[^0-9.]/g, '')) || 0;
    const availNum = parseFloat(available.replace(/[^0-9.]/g, '')) || 0;
    const total = usedNum + availNum;
    if (total === 0) return 0;
    return Math.round((usedNum / total) * 100);
  };

  // Get icon color based on volume type
  const getTypeColor = (type: string): string => {
    switch (type.toLowerCase()) {
      case 'zfs':
        return 'text-emerald-500';
      case 'ufs':
        return 'text-blue-500';
      case 'geom':
        return 'text-purple-500';
      default:
        return 'text-slate-500';
    }
  };

  // Get status color
  const getStatusColor = (status: string): string => {
    switch (status.toLowerCase()) {
      case 'online':
      case 'active':
        return 'bg-emerald-500';
      case 'offline':
      case 'inactive':
        return 'bg-red-500';
      case 'maintenance':
        return 'bg-amber-500';
      default:
        return 'bg-slate-500';
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">{t('volumes.title')}</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1 font-medium">{t('volumes.description')}</p>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center p-20">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-500"></div>
        </div>
      ) : error ? (
        <div className="bg-red-50 text-red-600 p-6 rounded-3xl border border-red-100 font-bold dark:bg-red-500/10 dark:border-red-500/20 dark:text-red-400">
          {error}
        </div>
      ) : volumes.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 p-12 rounded-[2.5rem] shadow-xl border border-slate-100 dark:border-slate-800 text-center">
          <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4">
            <HardDrive size={32} className="text-slate-400" />
          </div>
          <h3 className="text-xl font-black text-slate-900 dark:text-slate-100 mb-2">{t('volumes.no_volumes')}</h3>
          <p className="text-slate-500 dark:text-slate-400 font-medium">{t('volumes.no_volumes_desc')}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {volumes.map((volume) => (
            <div
              key={volume.name}
              className="bg-white dark:bg-slate-900 rounded-[2rem] p-6 shadow-xl border border-slate-100 dark:border-slate-800 hover:shadow-2xl transition-all duration-300 group relative overflow-hidden"
            >
              {/* Status Indicator */}
              <div className={`absolute top-0 right-0 w-32 h-32 -mr-16 -mt-16 rounded-full blur-3xl opacity-10 ${getStatusColor(volume.status)}`} />

              <div className="flex items-center justify-between mb-6 relative z-10">
                <div className={`p-4 rounded-2xl bg-slate-100 dark:bg-slate-800 ${getTypeColor(volume.type)}`}>
                  <HardDrive size={24} />
                </div>
                <div className="flex items-center gap-2">
                  <span className="px-3 py-1 bg-brand-500/10 text-brand-500 text-[10px] font-black uppercase tracking-widest rounded-md">
                    {volume.type}
                  </span>
                </div>
              </div>

              <div className="space-y-1 relative z-10">
                <div className="flex items-center gap-2">
                  <h3 className="text-xl font-black text-slate-900 dark:text-slate-100">{volume.name}</h3>
                </div>
                <p className="text-slate-400 dark:text-slate-500 font-bold text-xs uppercase tracking-widest flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${getStatusColor(volume.status)}`} />
                  {volume.status}
                </p>
              </div>

              <div className="mt-6 space-y-4 relative z-10">
                {/* Size Info */}
                <div className="flex justify-between items-center text-[9px] font-black uppercase tracking-widest">
                  <span className="text-slate-400 dark:text-slate-500">{t('volumes.size')}</span>
                  <span className="text-slate-600 dark:text-slate-400">{volume.size}</span>
                </div>

                {/* Usage Progress */}
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center text-[9px] font-black uppercase tracking-widest">
                    <span className="text-slate-400 dark:text-slate-500">{t('volumes.usage')}</span>
                    <span className="text-slate-600 dark:text-slate-400">{volume.used} / {volume.available}</span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-50 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${getUsagePercent(volume.used, volume.available) > 80 ? 'bg-red-500' : 'bg-emerald-500'}`}
                      style={{ width: `${getUsagePercent(volume.used, volume.available)}%` }}
                    />
                  </div>
                </div>

                {/* Mount Point */}
                <div className="space-y-1.5">
                  <div className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                    {t('volumes.mount_point')}
                  </div>
                  <div className="flex items-center gap-2 px-3 py-2 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
                    <Activity size={14} className="text-slate-400 dark:text-slate-500" />
                    <span className="text-sm font-bold text-slate-700 dark:text-slate-300 truncate">
                      {volume.mount_point || '/'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="mt-6 pt-6 border-t border-slate-50 dark:border-slate-800 flex items-center justify-between relative z-10">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                    {t('volumes.utilized')}:
                  </span>
                  <span className="text-xs font-black text-brand-600 dark:text-brand-400">
                    {getUsagePercent(volume.used, volume.available)}%
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Volumes;
