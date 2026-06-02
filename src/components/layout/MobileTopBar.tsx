import { useTranslation } from 'react-i18next';
import { Menu, X, Bell } from 'lucide-react';
import { useNotifications } from '../../contexts/NotificationContext';
import { ThemeToggle } from './ThemeToggle';

interface MobileTopBarProps {
  onToggleMenu: () => void;
  isMenuOpen: boolean;
}

export const MobileTopBar: React.FC<MobileTopBarProps> = ({ onToggleMenu, isMenuOpen }) => {
  const { t } = useTranslation();
  const { unreadCount } = useNotifications();

  return (
    <div className="lg:hidden sticky top-0 left-0 right-0 h-16 bg-white dark:bg-slate-950 flex items-center justify-between px-6 z-50 border-b border-slate-200 dark:border-slate-800/50 transition-colors duration-300">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 flex items-center justify-center">
          <img
            src="/logo-head-only-zoom-2.png"
            alt="CloudBSD"
            className="w-full h-full object-contain drop-shadow-brand"
          />
        </div>
        <span className="text-lg font-bold tracking-tight leading-none">
          <span className="text-white dark:text-white">Cloud</span>
          <span className="text-accent dark:text-accent">BSD</span>
        </span>
      </div>

      <div className="flex items-center gap-2">
        <ThemeToggle className="p-2 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-900 rounded-lg transition-colors" />

        <div className="relative">
          <button
            className="p-2 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-900 rounded-lg transition-colors relative"
            aria-label={t('notifications.title')}
          >
            <Bell size={20} />
            {unreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-red-500 text-white text-[10px] font-bold flex items-center justify-center rounded-full border-2 border-white dark:border-slate-950">
                {unreadCount}
              </span>
            )}
          </button>
        </div>

        <button
          onClick={onToggleMenu}
          className="p-2 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-900 rounded-lg transition-colors flex items-center justify-center"
          aria-label={t('layout.toggle_menu')}
          title={t('layout.toggle_menu')}
        >
          {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>
    </div>
  );
};
