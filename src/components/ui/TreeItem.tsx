import React from 'react';

export interface TreeItemProps {
  item: string;
  level?: number;
  children?: React.ReactNode;
  onClick?: () => void;
  isSelected?: boolean;
  icon?: React.ComponentType<{ size?: number; className?: string }>;
  badge?: string | number;
  actions?: React.ReactNode;
}

export const TreeItem: React.FC<TreeItemProps> = ({
  item,
  level = 0,
  children,
  onClick,
  isSelected = false,
  icon: Icon,
  badge,
  actions,
}) => {
  return (
    <div>
      <button
        onClick={onClick}
        className={`w-full flex items-center gap-2 px-3 py-2.5 text-left transition-all duration-150 rounded-xl group ${
          isSelected
            ? 'bg-brand-500/10 text-brand-600 dark:text-brand-400'
            : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/50'
        }`}
        style={{ paddingLeft: `${12 + level * 20}px` }}
      >
        {children && (
          <span className="w-4 h-4 flex items-center justify-center text-slate-400">
            {children}
          </span>
        )}
        {Icon && (
          <Icon
            size={16}
            className={isSelected ? 'text-brand-500' : 'text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-300'}
          />
        )}
        <span className={`flex-1 text-sm font-bold truncate ${isSelected ? 'text-brand-600 dark:text-brand-400' : ''}`}>
          {item}
        </span>
        {badge !== undefined && (
          <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md">
            {badge}
          </span>
        )}
        {actions && (
          <span
            className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1"
            onClick={(e) => e.stopPropagation()}
          >
            {actions}
          </span>
        )}
      </button>
    </div>
  );
};
