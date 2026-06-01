import React from 'react';
import { Link } from 'react-router-dom';
import type { LucideIcon } from 'lucide-react';

export interface StatCardProps {
  name: string;
  count: number;
  icon: LucideIcon;
  color: string;
  shadow: string;
  path: string;
}

export const StatCard: React.FC<StatCardProps> = ({
  name,
  count,
  icon: Icon,
  color,
  shadow,
  path,
}) => {
  return (
    <Link
      to={path}
      className="group bg-white/80 dark:bg-slate-900/50 backdrop-blur-md border border-slate-200/50 dark:border-white/10 p-6 rounded-2xl shadow-soft flex items-center gap-5 transition-all duration-300 hover:shadow-xl hover:-translate-y-1 active:scale-95"
    >
      <div
        className={`bg-gradient-to-br ${color} p-4 rounded-2xl text-white shadow-lg ${shadow} transform transition-transform group-hover:rotate-6`}
      >
        <Icon size={26} />
      </div>
      <div>
        <p className="text-sm font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">
          {name}
        </p>
        <p className="text-3xl font-black text-slate-900 dark:text-slate-100 mt-1">
          {count}
        </p>
      </div>
    </Link>
  );
};
