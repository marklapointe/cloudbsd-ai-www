import { useTranslation } from 'react-i18next';
import { User } from 'lucide-react';

interface UserBadgeProps {
  username: string;
  role: string;
}

export const UserBadge: React.FC<UserBadgeProps> = ({ username, role }) => {
  const { t } = useTranslation();
  return (
    <div className="rounded-2xl p-4 mb-6 flex items-center gap-3 bg-slate-900/5 dark:bg-white/5 border border-slate-200/50 dark:border-white/10">
      <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
        <User size={20} />
      </div>
      <div className="flex flex-col min-w-0">
        <span className="text-sm font-semibold truncate text-slate-900 dark:text-slate-200">
          {username}
        </span>
        <span className="text-[10px] text-brand-600 dark:text-brand-500 font-bold uppercase tracking-wider truncate">
          {t(`common.${role}`)}
        </span>
      </div>
    </div>
  );
};
