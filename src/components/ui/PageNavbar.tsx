import React from 'react';
import { Sun, Moon, Bell } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';
import { useNotifications } from '../../contexts/NotificationContext';

export interface PageNavbarProps {
  pageName: string;
  userName?: string;
  userRole?: string;
  onNotificationsClick?: () => void;
}

export const PageNavbar: React.FC<PageNavbarProps> = ({
  pageName,
  userName = 'admin',
  userRole = 'Admin',
  onNotificationsClick,
}) => {
  const { theme, toggleTheme } = useTheme();
  const { unreadCount } = useNotifications();
  const isDark = theme === 'dark';

  const getRoleBadgeVariant = (role: string): 'default' | 'success' | 'warning' | 'danger' => {
    switch (role.toLowerCase()) {
      case 'admin':
        return 'success';
      case 'operator':
        return 'warning';
      default:
        return 'default';
    }
  };

  const roleBadgeVariant = getRoleBadgeVariant(userRole);

  const roleBadgeColors: Record<string, string> = {
    default: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
    success: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
    warning: 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
    danger: 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  };

  return (
    <header className="hidden lg:flex sticky top-0 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md h-16 border-b border-slate-200 dark:border-slate-800 z-20 items-center justify-between px-10 transition-colors duration-300">
      <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 text-sm font-medium">
        <span className="capitalize">{pageName}</span>
      </div>

      <div className="flex items-center gap-4">
        <button
          onClick={toggleTheme}
          className="p-2.5 rounded-xl transition-all duration-200 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-100 border border-transparent hover:border-slate-200 dark:hover:border-slate-700 active:scale-95 shadow-sm hover:shadow"
          aria-label="Toggle theme"
          title="Toggle theme"
        >
          {isDark ? <Sun size={20} /> : <Moon size={20} />}
        </button>

        <button
          onClick={onNotificationsClick}
          className="p-2.5 rounded-xl transition-all duration-200 relative border active:scale-95 shadow-sm hover:shadow text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-100 border-transparent hover:border-slate-200 dark:hover:border-slate-700"
          aria-label="Notifications"
          title="Notifications"
        >
          <Bell size={20} />
          {unreadCount > 0 && (
            <span className="absolute top-2 right-2 w-4 h-4 bg-red-500 text-white text-[10px] font-bold flex items-center justify-center rounded-full border-2 border-white dark:border-slate-900">
              {unreadCount}
            </span>
          )}
        </button>

        <div className="w-px h-6 bg-slate-200 dark:bg-slate-800 mx-2" />

        <div className="flex items-center gap-3 pl-2">
          <div className="flex flex-col items-end">
            <span className="text-xs font-bold text-slate-900 dark:text-slate-100 leading-none">{userName}</span>
            <span className={`text-[10px] font-bold uppercase tracking-wider mt-0.5 px-1.5 py-0.5 rounded-full ${roleBadgeColors[roleBadgeVariant]}`}>
              {userRole}
            </span>
          </div>
          <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-500 dark:text-slate-400 shadow-inner font-semibold">
            {userName.charAt(0).toUpperCase()}
          </div>
        </div>
      </div>
    </header>
  );
};
