import React from 'react';
import { Server, CheckCircle, XCircle, Wrench } from 'lucide-react';
import type { NodeData } from './ClusterNodeCard';

export interface ClusterStatsProps {
  nodes: NodeData[];
}

interface StatItem {
  label: string;
  value: number;
  icon: React.ReactNode;
  color: string;
}

export const ClusterStats: React.FC<ClusterStatsProps> = ({ nodes }) => {
  const totalNodes = nodes.length;
  const onlineNodes = nodes.filter((n) => n.status === 'online').length;
  const offlineNodes = nodes.filter((n) => n.status === 'offline').length;
  const maintenanceNodes = nodes.filter((n) => n.status === 'maintenance').length;
  const coreNodes = nodes.filter((n) => n.role === 'core').length;
  const agentNodes = nodes.filter((n) => n.role === 'agent').length;

  const stats: StatItem[] = [
    {
      label: 'Total Nodes',
      value: totalNodes,
      icon: <Server size={18} />,
      color: 'text-brand-500',
    },
    {
      label: 'Online',
      value: onlineNodes,
      icon: <CheckCircle size={18} />,
      color: 'text-emerald-500',
    },
    {
      label: 'Offline',
      value: offlineNodes,
      icon: <XCircle size={18} />,
      color: 'text-red-500',
    },
    {
      label: 'Maintenance',
      value: maintenanceNodes,
      icon: <Wrench size={18} />,
      color: 'text-amber-500',
    },
    {
      label: 'Core',
      value: coreNodes,
      icon: <Server size={18} />,
      color: 'text-brand-600',
    },
    {
      label: 'Agents',
      value: agentNodes,
      icon: <Server size={18} />,
      color: 'text-slate-500',
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
      {stats.map((stat) => (
        <div
          key={stat.label}
          className="bg-white dark:bg-slate-900 rounded-2xl p-4 shadow-lg border border-slate-100 dark:border-slate-800"
        >
          <div className="flex items-center gap-2 mb-2">
            <span className={stat.color}>{stat.icon}</span>
            <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">
              {stat.label}
            </span>
          </div>
          <p className="text-2xl font-black text-slate-900 dark:text-slate-100">
            {stat.value}
          </p>
        </div>
      ))}
    </div>
  );
};
