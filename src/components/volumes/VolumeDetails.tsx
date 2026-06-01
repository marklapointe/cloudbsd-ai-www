import React from 'react';
import { Database, Activity, HardDrive, Trash2, Edit2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { VolumeData, DiskData } from '../../pages/Volumes';

export interface VolumeDetailsProps {
  volume: VolumeData;
  disk: DiskData;
  onEdit: (disk: DiskData, volume: VolumeData) => void;
  onDelete: (volume: VolumeData) => void;
  onSelectDisk: (diskId: number) => void;
  getUsagePercent: (used: string, available: string) => number;
  getVolumeTypeColor: (type: string) => string;
  getStatusColor: (status: string) => string;
  getDiskTypeColor: (type: string) => string;
}

export const VolumeDetails: React.FC<VolumeDetailsProps> = ({
  volume,
  disk,
  onEdit,
  onDelete,
  onSelectDisk,
  getUsagePercent,
  getVolumeTypeColor,
  getStatusColor,
  getDiskTypeColor,
}) => {
  const { t } = useTranslation();
  const usagePercent = getUsagePercent(volume.used, volume.available);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="p-4 bg-emerald-500/10 rounded-2xl">
            <Database size={32} className="text-emerald-500" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-2xl font-black text-slate-900 dark:text-slate-100">{volume.name}</h2>
              <span className={`px-2 py-0.5 text-[10px] font-black uppercase tracking-widest rounded-md ${getVolumeTypeColor(volume.volume_type)}`}>
                {volume.volume_type}
              </span>
            </div>
            <div className="flex items-center gap-2 mt-1">
              <span className={`w-2 h-2 rounded-full ${getStatusColor(volume.status)}`} />
              <span className="text-sm font-bold text-slate-500">{volume.status}</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => onEdit(disk, volume)}
            className="p-2.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl text-slate-400 hover:text-brand-500 transition-colors"
            title={t('volumes.edit_volume')}
          >
            <Edit2 size={18} />
          </button>
          <button
            onClick={() => onDelete(volume)}
            className="p-2.5 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-xl text-slate-400 hover:text-red-500 transition-colors"
            title={t('common.delete')}
          >
            <Trash2 size={18} />
          </button>
        </div>
      </div>

      {volume.mount_point && (
        <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-4 flex items-center gap-3">
          <Activity size={16} className="text-slate-400" />
          <div>
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Mount Point</span>
            <span className="font-bold text-slate-900 dark:text-slate-100">{volume.mount_point}</span>
          </div>
        </div>
      )}

      <div className="grid grid-cols-3 gap-3">
        <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-3 text-center">
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Size</span>
          <span className="font-bold text-slate-900 dark:text-slate-100">{volume.size}</span>
        </div>
        <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-3 text-center">
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Used</span>
          <span className="font-bold text-slate-900 dark:text-slate-100">{volume.used}</span>
        </div>
        <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-3 text-center">
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Available</span>
          <span className="font-bold text-slate-900 dark:text-slate-100">{volume.available}</span>
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex justify-between text-xs font-black uppercase tracking-widest">
          <span className="text-slate-400">Usage</span>
          <span className={usagePercent > 80 ? 'text-red-500' : 'text-emerald-500'}>
            {usagePercent}%
          </span>
        </div>
        <div className="w-full h-3 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${usagePercent > 80 ? 'bg-red-500' : 'bg-emerald-500'}`}
            style={{ width: `${usagePercent}%` }}
          />
        </div>
      </div>

      {(volume.volume_type === 'ZFS' || volume.volume_type === 'zfs') && (
        <div className="flex gap-4 pt-2">
          <div className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest ${
            volume.compression === 'on' || volume.compression === '1'
              ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
              : 'bg-slate-100 dark:bg-slate-800 text-slate-400'
          }`}>
            Compression: {volume.compression === 'on' || volume.compression === '1' ? 'ON' : 'OFF'}
          </div>
          <div className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest ${
            volume.deduplication === 'on' || volume.deduplication === '1'
              ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
              : 'bg-slate-100 dark:bg-slate-800 text-slate-400'
          }`}>
            Deduplication: {volume.deduplication === 'on' || volume.deduplication === '1' ? 'ON' : 'OFF'}
          </div>
        </div>
      )}

      <div className="border-t border-slate-100 dark:border-slate-800 pt-4">
        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Parent Disk</span>
        <button
          onClick={() => onSelectDisk(disk.id)}
          className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors w-full"
        >
          <HardDrive size={16} className="text-slate-400" />
          <span className="font-bold text-slate-900 dark:text-slate-100">{disk.name}</span>
          <span className={`px-2 py-0.5 text-[9px] font-black uppercase tracking-widest rounded-md ${getDiskTypeColor(disk.disk_type)}`}>
            {disk.disk_type}
          </span>
        </button>
      </div>
    </div>
  );
};
