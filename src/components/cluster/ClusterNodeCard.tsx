import React from 'react';
import { Server, Edit2, Trash2, Activity } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { ResourceUsageBar } from '../ui/ResourceUsageBar';

export interface NodeData {
  id: number;
  name: string;
  role: string;
  status: string;
  ip: string;
  cpu_total: number | null;
  cpu_used: number | null;
  mem_total: string | null;
  mem_used: string | null;
  disk_total: string | null;
  disk_used: string | null;
  created_at: string;
}

export interface ClusterNodeCardProps {
  node: NodeData;
  onEdit: (node: NodeData) => void;
  onDelete: (id: number) => void;
}

export const ClusterNodeCard: React.FC<ClusterNodeCardProps> = ({
  node,
  onEdit,
  onDelete,
}) => {
  const { t } = useTranslation();

  const healthScore =
    node.status === 'online' ? 100 : node.status === 'maintenance' ? 50 : 0;

  return (
    <div
      className="bg-white dark:bg-slate-900 rounded-[2rem] p-6 shadow-xl border border-slate-100 dark:border-slate-800 hover:shadow-2xl transition-all duration-300 group relative overflow-hidden"
    >
      {/* Status Indicator */}
      <div
        className={`absolute top-0 right-0 w-32 h-32 -mr-16 -mt-16 rounded-full blur-3xl opacity-10 transition-colors duration-500 ${
          node.status === 'online' ? 'bg-emerald-500' : 'bg-red-500'
        }`}
      />

      <div className="flex items-center justify-between mb-6 relative z-10">
        <div
          className={`p-4 rounded-2xl ${
            node.role === 'core'
              ? 'bg-brand-600 text-white shadow-lg shadow-brand-500/30'
              : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
          }`}
        >
          <Server size={24} />
        </div>
        <div className="flex gap-4 items-center opacity-0 group-hover:opacity-100 transition-opacity">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">
              {t('cluster.actions')}
            </span>
            <button
              onClick={() => onEdit(node)}
              className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl text-slate-400 dark:text-slate-500 hover:text-brand-500 dark:hover:text-brand-400 transition-colors"
              aria-label={t('common.edit')}
              title={t('common.edit')}
            >
              <Edit2 size={18} />
            </button>
            <button
              onClick={() => onDelete(node.id)}
              className="p-2 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-xl text-slate-400 dark:text-slate-500 hover:text-red-500 dark:hover:text-red-400 transition-colors"
              aria-label={t('common.delete')}
              title={t('common.delete')}
            >
              <Trash2 size={18} />
            </button>
          </div>
        </div>
      </div>

      <div className="space-y-1 relative z-10">
        <div className="flex items-center gap-2">
          <h3 className="text-xl font-black text-slate-900 dark:text-slate-100">
            {node.name}
          </h3>
          {node.role === 'core' && (
            <span className="px-2 py-0.5 bg-brand-500/10 text-brand-500 text-[8px] font-black uppercase tracking-widest rounded-md">
              {t('cluster.core')}
            </span>
          )}
        </div>
        <p className="text-slate-400 dark:text-slate-500 font-bold text-xs uppercase tracking-widest">
          {node.ip || t('cluster.local_node')}
        </p>
      </div>

      <div className="mt-8 space-y-4 relative z-10">
        {/* CPU Progress */}
        {node.cpu_total && (
          <ResourceUsageBar
            label={t('cluster.cpu_usage')}
            used={node.cpu_used ?? 0}
            total={node.cpu_total}
            unit={` ${t('cluster.vcpus')}`}
            color="blue"
          />
        )}

        {/* RAM Progress */}
        {node.mem_total && (
          <ResourceUsageBar
            label={t('cluster.memory')}
            used={node.mem_used ?? 0}
            total={node.mem_total}
            color="purple"
          />
        )}

        {/* Disk Progress */}
        {node.disk_total && (
          <ResourceUsageBar
            label={t('cluster.disk_storage')}
            used={node.disk_used ?? 0}
            total={node.disk_total}
            color="emerald"
          />
        )}
      </div>

      <div className="mt-6 pt-6 border-t border-slate-50 dark:border-slate-800 grid grid-cols-2 gap-4 relative z-10">
        <div className="flex items-center gap-2">
          <div
            className={`w-2 h-2 rounded-full ${
              node.status === 'online'
                ? 'bg-emerald-500 animate-pulse'
                : node.status === 'maintenance'
                  ? 'bg-amber-500'
                  : 'bg-red-500'
            }`}
          />
          <span className="text-xs font-black text-slate-600 dark:text-slate-400 uppercase tracking-widest">
            {t(`cluster.${node.status}`)}
          </span>
        </div>
        <div className="flex items-center gap-2 justify-end">
          <Activity size={14} className="text-slate-300 dark:text-slate-600" />
          <span className="text-xs font-bold text-slate-400 dark:text-slate-500">
            {t('cluster.health')}: {healthScore}%
          </span>
        </div>
      </div>
    </div>
  );
};
