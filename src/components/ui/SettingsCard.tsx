import React from 'react';

export interface SettingsCardProps {
  title: string;
  icon: React.ElementType;
  children: React.ReactNode;
  badge?: string;
  headerContent?: React.ReactNode;
}

export const SettingsCard: React.FC<SettingsCardProps> = ({
  title,
  icon: Icon,
  children,
  badge,
  headerContent,
}) => {
  return (
    <div className="bg-white dark:bg-slate-900 rounded-[2rem] shadow-soft border border-slate-100 dark:border-slate-800 overflow-hidden transition-all duration-300 hover:shadow-xl">
      <div className="px-8 py-6 border-b border-slate-50 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-xl">
            <Icon size={20} />
          </div>
          <h2 className="text-lg font-black text-slate-900 dark:text-slate-100 uppercase tracking-tight">{title}</h2>
        </div>
        {badge && (
          <span className="px-3 py-1 bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-[10px] font-black uppercase tracking-widest rounded-lg">
            {badge}
          </span>
        )}
        {headerContent}
      </div>
      <div className="p-8 space-y-8">
        {children}
      </div>
    </div>
  );
};
