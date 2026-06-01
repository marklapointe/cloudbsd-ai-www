import React from 'react';
import { CheckCircle2, Activity } from 'lucide-react';

export type AlertBannerType = 'success' | 'error';

export interface AlertBannerProps {
  type: AlertBannerType;
  message: string;
  icon?: React.ElementType;
}

export const AlertBanner: React.FC<AlertBannerProps> = ({
  type,
  message,
  icon,
}) => {
  const Icon = icon || (type === 'success' ? CheckCircle2 : Activity);

  return (
    <div
      className={`p-4 rounded-2xl flex items-center gap-3 animate-in slide-in-from-top-2 duration-300 ${
        type === 'success'
          ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-500/20'
          : 'bg-red-50 dark:bg-red-500/10 text-red-700 dark:text-red-400 border border-red-100 dark:border-red-500/20'
      }`}
    >
      <Icon size={18} />
      <p className="text-sm font-bold">{message}</p>
    </div>
  );
};
