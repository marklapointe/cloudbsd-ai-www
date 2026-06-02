import { useTranslation } from 'react-i18next';
import { AlertCircle, X, ExternalLink } from 'lucide-react';
import { useNotifications } from '../../contexts/NotificationContext';

export const HighPriorityBanner: React.FC = () => {
  const { t } = useTranslation();
  const { highPriorityNotifications, dismissNotification } = useNotifications();

  if (highPriorityNotifications.length === 0) return null;

  return (
    <div
      role="alert"
      className="bg-red-600 dark:bg-red-700 text-white px-6 py-3 flex flex-col gap-2 animate-in slide-in-from-top duration-500 shadow-lg relative z-10"
    >
      {highPriorityNotifications.map((notification) => (
        <div
          key={notification.id}
          className="flex items-center justify-between gap-4 max-w-7xl mx-auto w-full"
        >
          <div className="flex items-center gap-3 font-bold text-xs uppercase tracking-wider">
            <div className="p-1.5 bg-white/20 rounded-lg">
              <AlertCircle size={18} />
            </div>
            <span>{notification.message}</span>
          </div>
          <div className="flex items-center gap-3">
            {notification.link && (
              <a
                href={notification.link}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-white/10 hover:bg-white/20 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all hover:scale-105 active:scale-95 whitespace-nowrap border border-white/20 shadow-sm flex items-center gap-2"
              >
                {t('common.learn_more')}
                <ExternalLink size={12} />
              </a>
            )}
            <button
              onClick={() => dismissNotification(notification.id)}
              className="w-8 h-8 flex items-center justify-center bg-black/10 hover:bg-black/20 rounded-xl text-white transition-all hover:scale-105 active:scale-95 border border-white/10"
              title={t('common.dismiss')}
            >
              <X size={16} />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};
