import React from 'react';

export interface UsageBarProps {
  icon: React.ElementType;
  label: string;
  used: number;
  limit: number;
  color?: string;
  getLimitLabel?: (limit: number) => string;
  getUsagePercent?: (used: number, limit: number) => number;
}

const getDefaultLimitLabel = (limit: number): string => {
  if (limit === undefined || limit === null) return '0';
  if (Number(limit) >= 99999) return '∞';
  return limit.toString();
};

const getDefaultUsagePercent = (used: number, limit: number): number => {
  if (!limit || limit === 0) return 0;
  if (limit >= 99999) return 5;
  return Math.min(100, ((used || 0) / limit) * 100);
};

export const UsageBar: React.FC<UsageBarProps> = ({
  icon: Icon,
  label,
  used,
  limit,
  color = 'bg-brand-500',
  getLimitLabel = getDefaultLimitLabel,
  getUsagePercent = getDefaultUsagePercent,
}) => {
  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2">
          <Icon size={14} className={color.replace('bg-', 'text-').replace('/5', '')} />
          <span className="text-xs font-bold text-slate-600 dark:text-slate-400">{label}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-black text-slate-900 dark:text-slate-100">{used}</span>
          <span className="text-[10px] font-black text-slate-300 dark:text-slate-700">/</span>
          <span className="text-xs font-black text-slate-400 dark:text-slate-500">{getLimitLabel(limit)}</span>
        </div>
      </div>
      <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
        <div
          className={`h-full ${color} transition-all duration-1000`}
          style={{ width: `${getUsagePercent(used, limit)}%` }}
        />
      </div>
    </div>
  );
};
