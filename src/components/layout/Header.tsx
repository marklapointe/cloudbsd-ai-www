import { useTranslation } from 'react-i18next';
import { useLocation } from 'react-router-dom';
import { Bell, User } from 'lucide-react';
import { useNotifications } from '../../contexts/NotificationContext';
import { useState } from 'react';
import { NotificationsPanel } from './NotificationsPanel';
import { ThemeToggle } from './ThemeToggle';

interface HeaderProps {
  username: string;
  role: string;
}

export const Header: React.FC<HeaderProps> = ({ username, role }) => {
  const { t } = useTranslation();
  const { unreadCount } = useNotifications();
  const location = useLocation();
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);

  return (
    <header className="hidden lg:flex sticky top-0 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md h-16 border-b border-slate-200 dark:border-slate-800 z-20 items-center justify-between px-10 transition-colors duration-300">
      <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 text-sm font-medium">
        <span className="capitalize">{location.pathname.substring(1).replace('/', ' > ')}</span>
      </div>

      <div className="flex items-center gap-4">
        <ThemeToggle />

        <div className="relative">
          <button
            onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
            className={`p-2.5 rounded-xl transition-all duration-200 relative border active:scale-95 shadow-sm hover:shadow ${
              isNotificationsOpen
                ? 'bg-brand-50 dark:bg-brand-500/10 text-brand-600 dark:text-brand-400 border-brand-200 dark:border-brand-500/30'
                : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-100 border-transparent hover:border-slate-200 dark:hover:border-slate-700'
            }`}
            aria-label={t('notifications.title')}
            aria-expanded={isNotificationsOpen}
          >
            <Bell size={20} />
            {unreadCount > 0 && (
              <span className="absolute top-2 right-2 w-4 h-4 bg-red-500 text-white text-[10px] font-bold flex items-center justify-center rounded-full border-2 border-white dark:border-slate-900">
                {unreadCount}
              </span>
            )}
          </button>

          <NotificationsPanel
            isOpen={isNotificationsOpen}
            onClose={() => setIsNotificationsOpen(false)}
            onNavigateAll={() => setIsNotificationsOpen(false)}
          />
        </div>

        <div className="w-px h-6 bg-slate-200 dark:bg-slate-800 mx-2" />

        <div className="flex items-center gap-3 pl-2">
          <div className="flex flex-col items-end">
            <span className="text-xs font-bold text-slate-900 dark:text-slate-100 leading-none">
              {username}
            </span>
            <span className="text-[10px] text-brand-600 dark:text-brand-500 font-bold uppercase tracking-wider">
              {t(`common.${role}`)}
            </span>
          </div>
          <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-500 dark:text-slate-400 shadow-inner">
            <User size={20} />
          </div>
        </div>
      </div>
    </header>
  );
};
