import React from 'react';
import { HardDrive, Plus, Trash2, Edit2, Database } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { DiskData, VolumeData, Selection } from '../../pages/Volumes';

export interface DiskDetailsProps {
  disk: DiskData;
  getVolumesForDisk: (diskId: number) => VolumeData[];
  getDiskTypeColor: (type: string) => string;
  getStatusColor: (status: string) => string;
  selection: Selection;
  onEdit: (disk: DiskData) => void;
  onDelete: (disk: DiskData) => void;
  onSelect: (type: 'volume', data: { volumeId: number; diskId: number }) => void;
  onAddVolume: (disk: DiskData) => void;
}

export const DiskDetails: React.FC<DiskDetailsProps> = ({
  disk,
  getVolumesForDisk,
  getDiskTypeColor,
  getStatusColor,
  selection,
  onEdit,
  onDelete,
  onSelect,
  onAddVolume,
}) => {
  const { t } = useTranslation();
  const volumes = getVolumesForDisk(disk.id);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="p-4 bg-slate-100 dark:bg-slate-800 rounded-2xl">
            <HardDrive size={32} className="text-slate-600 dark:text-slate-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-2xl font-black text-slate-900 dark:text-slate-100">{disk.name}</h2>
              <span className={`px-2 py-0.5 text-[10px] font-black uppercase tracking-widest rounded-md ${getDiskTypeColor(disk.disk_type)}`}>
                {disk.disk_type}
              </span>
            </div>
            <div className="flex items-center gap-2 mt-1">
              <span className={`w-2 h-2 rounded-full ${getStatusColor(disk.status)}`} />
              <span className="text-sm font-bold text-slate-500">{disk.status}</span>
              <span className="text-slate-300">•</span>
              <span className="text-sm font-bold text-slate-500">{disk.size}</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => onEdit(disk)}
            className="p-2.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl text-slate-400 hover:text-brand-500 transition-colors"
            title={t('volumes.edit_disk')}
          >
            <Edit2 size={18} />
          </button>
          <button
            onClick={() => onDelete(disk)}
            className="p-2.5 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-xl text-slate-400 hover:text-red-500 transition-colors"
            title={t('common.delete')}
          >
            <Trash2 size={18} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {disk.device_path && (
          <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-3">
            <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest block mb-1">Device Path</span>
            <span className="font-bold text-slate-700 dark:text-slate-300 text-sm">{disk.device_path}</span>
          </div>
        )}
        {disk.serial && (
          <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-3">
            <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest block mb-1">Serial</span>
            <span className="font-bold text-slate-700 dark:text-slate-300 text-sm">{disk.serial}</span>
          </div>
        )}
        {disk.pci_path && (
          <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-3">
            <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest block mb-1">PCI Path</span>
            <span className="font-bold text-slate-700 dark:text-slate-300 text-sm">{disk.pci_path}</span>
          </div>
        )}
        {disk.model && (
          <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-3">
            <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest block mb-1">Model</span>
            <span className="font-bold text-slate-700 dark:text-slate-300 text-sm">{disk.model}</span>
          </div>
        )}
        {disk.vendor && (
          <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-3">
            <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest block mb-1">Vendor</span>
            <span className="font-bold text-slate-700 dark:text-slate-300 text-sm">{disk.vendor}</span>
          </div>
        )}
        {disk.wwn && (
          <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-3">
            <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest block mb-1">WWN</span>
            <span className="font-bold text-slate-700 dark:text-slate-300 text-sm">{disk.wwn}</span>
          </div>
        )}
        {disk.sector_size && (
          <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-3">
            <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest block mb-1">Sector Size</span>
            <span className="font-bold text-slate-700 dark:text-slate-300 text-sm">{disk.sector_size}</span>
          </div>
        )}
      </div>

      <div className="border-t border-slate-100 dark:border-slate-800 pt-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">Volumes ({volumes.length})</h3>
          <button
            onClick={() => onAddVolume(disk)}
            className="px-3 py-1.5 bg-brand-50 dark:bg-brand-500/10 rounded-xl text-brand-600 dark:text-brand-400 text-xs font-bold hover:bg-brand-100 dark:hover:bg-brand-500/20 transition-colors flex items-center gap-1"
          >
            <Plus size={14} />
            Add Volume
          </button>
        </div>
        <div className="space-y-2">
          {volumes.length === 0 ? (
            <div className="text-center py-6 text-slate-400 text-sm font-medium">No volumes on this disk</div>
          ) : (
            volumes.map(volume => (
              <button
                key={volume.id}
                onClick={() => onSelect('volume', { volumeId: volume.id, diskId: disk.id })}
                className={`w-full flex items-center gap-3 p-3 rounded-xl transition-colors ${
                  selection.volumeId === volume.id
                    ? 'bg-brand-500/10 border border-brand-500/20'
                    : 'bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <Database size={16} className="text-slate-400" />
                <div className="flex-1 text-left">
                  <span className="font-bold text-slate-900 dark:text-slate-100 text-sm">{volume.name}</span>
                  <span className={`ml-2 px-2 py-0.5 text-[9px] font-black uppercase tracking-widest rounded-md ${
                    volume.volume_type === 'ZFS' || volume.volume_type === 'zfs'
                      ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400'
                      : volume.volume_type === 'UFS'
                      ? 'bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400'
                      : volume.volume_type === 'GEOM'
                      ? 'bg-purple-100 text-purple-700 dark:bg-purple-500/20 dark:text-purple-400'
                      : 'bg-slate-100 text-slate-700 dark:bg-slate-500/20 dark:text-slate-400'
                  }`}>
                    {volume.volume_type}
                  </span>
                </div>
                <span className="text-xs text-slate-400 font-bold">{volume.size}</span>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
