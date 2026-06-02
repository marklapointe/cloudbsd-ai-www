import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Bell, ExternalLink, Info, AlertTriangle, CheckCircle, AlertCircle, Megaphone } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';
import { useNotifications } from '../../contexts/NotificationContext';
import { formatLocalTime } from '../../utils/dateUtils';

interface NotificationsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigateAll: () => void;
}

const styleByType: Record<string, { bg: string; text: string; Icon: React.FC<{ size: number }> }> = {
  warning: { bg: 'bg-amber-100', text: 'text-amber-600', Icon: AlertTriangle },
  error: { bg: 'bg-red-100', text: 'text-red-600', Icon: AlertCircle },
  success: { bg: 'bg-emerald-100', text: 'text-emerald-600', Icon: CheckCircle },
  ad: { bg: 'bg-purple-100', text: 'text-purple-600', Icon: Megaphone },
};
const defaultStyle = { bg: 'bg-blue-100', text: 'text-blue-600', Icon: Info };

export const NotificationsPanel: React.FC<NotificationsPanelProps> = ({
  isOpen,
  onClose,
  onNavigateAll,
}) => {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const { notifications, unreadCount, markAsRead } = useNotifications();
  const navigate = useNavigate();
  const isDark = theme === 'dark';

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 z-30" onClick={onClose} />
      <div
        role="dialog"
        aria-label={t('notifications.title')}
        className={`absolute right-0 mt-3 w-80 rounded-2xl shadow-2xl z-40 overflow-hidden ${
          isDark
            ? 'bg-slate-900/90 backdrop-blur-md border border-white/10'
            : 'bg-white/90 backdrop-blur-md border border-slate-200/50'
        }`}
      >
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/50">
          <h3 className="font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <Bell size={16} className="text-brand-500" />
            {t('notifications.title')}
          </h3>
          {unreadCount > 0 && (
            <button
              onClick={() => notifications.forEach((n) => !n.is_read && markAsRead(n.id))}
              className="text-[10px] font-bold text-brand-600 uppercase tracking-wider hover:text-brand-700"
            >
              {t('notifications.mark_read')}
            </button>
          )}
        </div>
        <div className="max-h-96 overflow-y-auto">
          {notifications.length === 0 ? (
            <div className="p-10 text-center">
              <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-3 text-slate-400">
                <Bell size={24} />
              </div>
              <p className="text-sm text-slate-500 font-medium">{t('notifications.empty')}</p>
            </div>
          ) : (
            notifications.map((notification) => {
              const style = styleByType[notification.type] || defaultStyle;
              const Icon = style.Icon;
              return (
                <div
                  key={notification.id}
                  className={`p-4 border-b border-slate-50 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors flex gap-3 ${!notification.is_read ? 'bg-brand-50/30 dark:bg-brand-500/10' : ''}`}
                  onClick={() => !notification.is_read && markAsRead(notification.id)}
                >
                  <div className={`mt-0.5 w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center ${style.bg} ${style.text}`}>
                    <Icon size={16} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-slate-700 dark:text-slate-200 leading-snug font-medium">
                      {notification.message}
                    </p>
                    <div className="flex items-center justify-between mt-1">
                      <p className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">
                        {formatLocalTime(notification.timestamp)}
                      </p>
                      {notification.link && (
                        <a
                          href={notification.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[10px] text-brand-600 hover:underline flex items-center gap-0.5 font-bold"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {t('common.learn_more')} <ExternalLink size={10} />
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
        <div className="p-3 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-800 text-center">
          <button
            onClick={() => {
              onClose();
              onNavigateAll();
              void navigate;
            }}
            className="text-xs font-bold text-slate-500 dark:text-slate-400 hover:text-brand-600 dark:hover:text-brand-400 transition-colors uppercase tracking-widest"
          >
            {t('notifications.view_all')}
          </button>
        </div>
      </div>
    </>
  );
};
