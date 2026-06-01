import React from 'react';
import { motion } from 'framer-motion';
import { Activity, ArrowDownLeft, ArrowUpRight } from 'lucide-react';

export interface SystemHealthData {
  cpu: number;
  memory: number;
  disk: number;
  network: { in: number; out: number };
  uptime: string;
}

export interface SystemHealthCardProps {
  systemHealth: SystemHealthData;
  cpuLabel: string;
  memoryLabel: string;
  diskLabel: string;
  networkInLabel: string;
  networkOutLabel: string;
  mbpsLabel: string;
  liveMetricsLabel: string;
  systemHealthLabel: string;
}

const fadeInUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

export const SystemHealthCard: React.FC<SystemHealthCardProps> = ({
  systemHealth,
  cpuLabel,
  memoryLabel,
  diskLabel,
  networkInLabel,
  networkOutLabel,
  mbpsLabel,
  liveMetricsLabel,
  systemHealthLabel,
}) => {
  return (
    <motion.div
      variants={fadeInUp}
      className="lg:col-span-2 bg-white/80 dark:bg-slate-900/50 backdrop-blur-md border border-slate-200/50 dark:border-white/10 p-8 rounded-2xl shadow-soft transition-colors duration-300"
    >
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">
            {systemHealthLabel}
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">
            {liveMetricsLabel}
          </p>
        </div>
        <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-2xl text-slate-400 dark:text-slate-500 transition-colors duration-300">
          <Activity size={24} />
        </div>
      </div>
      <div className="space-y-8">
        <div className="group">
          <div className="flex justify-between mb-3 items-end">
            <span className="text-sm font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
              {cpuLabel}
            </span>
            <span className="text-lg font-black text-blue-600 dark:text-blue-400">
              {systemHealth.cpu}%
            </span>
          </div>
          <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-3 overflow-hidden">
            <div
              className="bg-gradient-to-r from-blue-500 to-blue-600 h-full rounded-full transition-all duration-1000 ease-out shadow-lg shadow-blue-500/20"
              style={{ width: `${systemHealth.cpu}%` }}
            />
          </div>
        </div>
        <div className="group">
          <div className="flex justify-between mb-3 items-end">
            <span className="text-sm font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
              {memoryLabel}
            </span>
            <span className="text-lg font-black text-emerald-600 dark:text-emerald-400">
              {systemHealth.memory}%
            </span>
          </div>
          <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-3 overflow-hidden">
            <div
              className="bg-gradient-to-r from-emerald-500 to-emerald-600 h-full rounded-full transition-all duration-1000 ease-out shadow-lg shadow-emerald-500/20"
              style={{ width: `${systemHealth.memory}%` }}
            />
          </div>
        </div>
        <div className="group">
          <div className="flex justify-between mb-3 items-end">
            <span className="text-sm font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
              {diskLabel}
            </span>
            <span className="text-lg font-black text-amber-600 dark:text-amber-400">
              {systemHealth.disk}%
            </span>
          </div>
          <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-3 overflow-hidden">
            <div
              className="bg-gradient-to-r from-amber-500 to-amber-600 h-full rounded-full transition-all duration-1000 ease-out shadow-lg shadow-amber-500/20"
              style={{ width: `${systemHealth.disk}%` }}
            />
          </div>
        </div>

        <div className="pt-8 grid grid-cols-1 md:grid-cols-2 gap-6 border-t border-slate-50 dark:border-slate-800">
          <div className="flex items-center gap-4 p-4 rounded-2xl bg-slate-50/50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 transition-colors hover:bg-slate-50 dark:hover:bg-slate-800">
            <div className="p-3 bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 rounded-xl shadow-sm">
              <ArrowDownLeft size={20} />
            </div>
            <div>
              <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-widest">
                {networkInLabel}
              </p>
              <p className="text-lg font-black text-slate-900 dark:text-slate-100 leading-tight">
                {systemHealth.network?.in ?? 0}{' '}
                <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
                  {mbpsLabel}
                </span>
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4 p-4 rounded-2xl bg-slate-50/50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 transition-colors hover:bg-slate-50 dark:hover:bg-slate-800">
            <div className="p-3 bg-purple-100 dark:bg-purple-500/20 text-purple-600 dark:text-purple-400 rounded-xl shadow-sm">
              <ArrowUpRight size={20} />
            </div>
            <div>
              <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-widest">
                {networkOutLabel}
              </p>
              <p className="text-lg font-black text-slate-900 dark:text-slate-100 leading-tight">
                {systemHealth.network?.out ?? 0}{' '}
                <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
                  {mbpsLabel}
                </span>
              </p>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};
