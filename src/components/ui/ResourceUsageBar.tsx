import React from 'react';

export interface ResourceUsageBarProps {
  label: string;
  used: number | string;
  total: number | string;
  unit?: string;
  color?: 'blue' | 'purple' | 'emerald';
}

const colorClasses = {
  blue: 'bg-blue-500',
  purple: 'bg-purple-500',
  emerald: 'bg-emerald-500',
};

export const ResourceUsageBar: React.FC<ResourceUsageBarProps> = ({
  label,
  used,
  total,
  unit = '',
  color = 'blue',
}) => {
  const usedNum = typeof used === 'string' ? parseFloat(used) : used;
  const totalNum = typeof total === 'string' ? parseFloat(total) : total;
  const percentage = totalNum > 0 ? (usedNum / totalNum) * 100 : 0;

  return (
    <div className="space-y-1.5">
      <div className="flex justify-between items-center text-[9px] font-black uppercase tracking-widest">
        <span className="text-slate-400 dark:text-slate-500">{label}</span>
        <span className="text-slate-600 dark:text-slate-400">
          {used} / {total}{unit}
        </span>
      </div>
      <div className="w-full h-1.5 bg-slate-50 dark:bg-slate-800 rounded-full overflow-hidden">
        <div
          className={`h-full ${colorClasses[color]} rounded-full`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
};
