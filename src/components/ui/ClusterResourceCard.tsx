import React from 'react';
import { motion } from 'framer-motion';
import type { LucideIcon } from 'lucide-react';

export interface ClusterResourceCardProps {
  title: string;
  used: string;
  total: string;
  percentage: number;
  icon: LucideIcon;
  color: string;
  utilizedLabel: string;
  ofLabel: string;
}

const fadeInUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

export const ClusterResourceCard: React.FC<ClusterResourceCardProps> = ({
  title,
  used,
  total,
  percentage,
  icon: Icon,
  color,
  utilizedLabel,
  ofLabel,
}) => {
  return (
    <motion.div
      variants={fadeInUp}
      className="bg-white/80 dark:bg-slate-900/50 backdrop-blur-md border
      border-slate-200/50 dark:border-white/10 p-5 rounded-2xl shadow-soft hover:-translate-y-1 hover:shadow-xl transition-all duration-300"
    >
      <div className="flex items-center justify-between mb-4">
        <div
          className={`p-2.5 rounded-xl bg-${color}-50 dark:bg-${color}-500/10 text-${color}-600 dark:text-${color}-400`}
        >
          <Icon size={20} />
        </div>
        <span className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">
          {title}
        </span>
      </div>
      <div className="flex items-end justify-between mb-2">
        <div className="text-2xl font-black text-slate-900 dark:text-slate-100">
          {used}
        </div>
        <div className="text-xs font-bold text-slate-400 dark:text-slate-500 mb-1">
          {ofLabel} {total}
        </div>
      </div>
      <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
        <div
          className={`h-full bg-gradient-to-r from-${color}-500 to-${color}-600 rounded-full transition-all duration-1000 shadow-lg shadow-${color}-500/20`}
          style={{ width: `${percentage}%` }}
        />
      </div>
      <div className="mt-2 text-right">
        <span
          className={`text-[10px] font-black text-${color}-600 dark:text-${color}-400 tracking-tighter`}
        >
          {percentage}% {utilizedLabel}
        </span>
      </div>
    </motion.div>
  );
};
