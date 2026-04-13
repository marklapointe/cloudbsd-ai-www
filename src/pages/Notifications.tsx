import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  Search, 
  Trash2, 
  Mail, 
  MailOpen, 
  AlertTriangle, 
  AlertCircle, 
  CheckCircle, 
  Info,
  ChevronLeft,
  ChevronRight,
  MoreVertical,
  Filter,
  ArrowLeft,
  X
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { formatLocalDate, formatLocalDateTime } from '../utils/dateUtils';
import { useNotifications } from '../contexts/NotificationContext';

const Notifications: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { 
    notifications, 
    markAsRead, 
    dismissNotification,
    deleteNotification
  } = useNotifications();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const filteredNotifications = notifications.filter(n => 
    n.message.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const currentSelectedId = selectedId || (filteredNotifications.length > 0 ? filteredNotifications[0].id : null);
  const selectedNotification = notifications.find(n => n.id === currentSelectedId);

  const getTypeIcon = (type: string, size = 18) => {
    switch (type) {
      case 'warning': return <AlertTriangle size={size} className="text-amber-500" />;
      case 'error': return <AlertCircle size={size} className="text-red-500" />;
      case 'success': return <CheckCircle size={size} className="text-emerald-500" />;
      case 'ad': return <Info size={size} className="text-purple-500" />;
      default: return <Info size={size} className="text-blue-500" />;
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-12rem)] bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden transition-colors duration-300">
      {/* Header / Toolbar */}
      <div className="flex items-center justify-between p-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => navigate(-1)}
            className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full transition-colors"
          >
            <ArrowLeft size={20} className="text-slate-600 dark:text-slate-300" />
          </button>
          <h1 className="text-xl font-bold text-slate-800 dark:text-slate-100">{t('notifications.title')}</h1>
          <div className="relative ml-4">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
            <input 
              type="text"
              placeholder={t('common.search')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 w-64 transition-all dark:text-slate-100"
            />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg text-slate-500 dark:text-slate-400 transition-colors">
            <Filter size={18} />
          </button>
          <button className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg text-slate-500 dark:text-slate-400 transition-colors">
            <MoreVertical size={18} />
          </button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Inbox List */}
        <div className="w-1/3 border-r border-slate-100 dark:border-slate-800 overflow-y-auto">
          {filteredNotifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full p-8 text-center">
              <div className="w-16 h-16 bg-slate-50 dark:bg-slate-800 rounded-full flex items-center justify-center mb-4">
                <Mail size={32} className="text-slate-300 dark:text-slate-600" />
              </div>
              <p className="text-slate-500 dark:text-slate-400 font-medium">{t('notifications.empty')}</p>
            </div>
          ) : (
            filteredNotifications.map(n => (
              <div 
                key={n.id}
                onClick={() => {
                  setSelectedId(n.id);
                  if (!n.is_read) markAsRead(n.id);
                }}
                className={`
                  p-4 border-b border-slate-50 dark:border-slate-800 cursor-pointer transition-all flex gap-4
                  ${currentSelectedId === n.id ? 'bg-brand-50/50 dark:bg-brand-500/10 border-l-4 border-l-brand-500' : 'hover:bg-slate-50 dark:hover:bg-slate-800 border-l-4 border-l-transparent'}
                  ${!n.is_read ? 'font-bold' : ''}
                `}
              >
                <div className="mt-1">
                  {n.is_read ? <MailOpen size={16} className="text-slate-400 dark:text-slate-500" /> : <Mail size={16} className="text-brand-500" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-start mb-1">
                    <span className={`text-xs px-2 py-0.5 rounded-full uppercase tracking-tighter font-black ${
                      n.type === 'warning' ? 'bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400' :
                      n.type === 'error' ? 'bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-400' :
                      n.type === 'success' ? 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400' :
                      n.type === 'ad' ? 'bg-purple-100 dark:bg-purple-500/20 text-purple-700 dark:text-purple-400' :
                      'bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-400'
                    }`}>
                      {t(`common.${n.type}`)}
                    </span>
                    <span className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">
                      {formatLocalDate(n.timestamp)}
                    </span>
                  </div>
                  <p className="text-sm text-slate-700 dark:text-slate-200 truncate">{n.message}</p>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Message Detail */}
        <div className="flex-1 bg-slate-50/30 dark:bg-slate-950/30 flex flex-col overflow-hidden">
          {selectedNotification ? (
            <>
              <div className="p-6 bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${
                    selectedNotification.type === 'warning' ? 'bg-amber-100 dark:bg-amber-500/20' :
                    selectedNotification.type === 'error' ? 'bg-red-100 dark:bg-red-500/20' :
                    selectedNotification.type === 'success' ? 'bg-emerald-100 dark:bg-emerald-500/20' :
                    'bg-blue-100 dark:bg-blue-500/20'
                  }`}>
                    {getTypeIcon(selectedNotification.type, 24)}
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">
                      {t('notifications.message_type', { type: t(`common.${selectedNotification.type}`) })}
                    </h2>
                    <p className="text-xs text-slate-400 dark:text-slate-500 font-medium">
                      {formatLocalDateTime(selectedNotification.timestamp)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => dismissNotification(selectedNotification.id)}
                    className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg text-slate-400 transition-colors"
                    title={t('common.dismiss')}
                  >
                    <X size={20} />
                  </button>
                  <button 
                    onClick={() => deleteNotification(selectedNotification.id)}
                    className="p-2 hover:bg-red-50 dark:hover:bg-red-500/10 hover:text-red-600 dark:hover:text-red-400 rounded-lg text-slate-400 transition-colors"
                    title={t('common.delete')}
                  >
                    <Trash2 size={20} />
                  </button>
                </div>
              </div>
              <div className="flex-1 p-8 overflow-y-auto">
                <div className="max-w-2xl bg-white dark:bg-slate-900 p-8 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm">
                  <div className="flex items-center gap-2 mb-6 pb-6 border-b border-slate-50 dark:border-slate-800 text-slate-400 dark:text-slate-500 text-sm">
                    <span className="font-bold text-slate-600 dark:text-slate-400 uppercase tracking-widest text-[10px]">{t('notifications.message_from')}:</span>
                    <span>{t('notifications.system_admin')}</span>
                  </div>
                  <div className="prose prose-slate dark:prose-invert max-w-none">
                    <p className="text-slate-700 dark:text-slate-200 leading-relaxed whitespace-pre-wrap">
                      {selectedNotification.message}
                    </p>
                  </div>
                  <div className="mt-12 pt-6 border-t border-slate-50 dark:border-slate-800">
                    <p className="text-xs text-slate-400 dark:text-slate-500 italic">
                      {t('notifications.automated_notice')}
                    </p>
                  </div>
                </div>
              </div>
              <div className="p-4 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center text-slate-400 dark:text-slate-500 text-xs font-medium">
                <div className="flex items-center gap-4">
                  <button className="flex items-center gap-1 hover:text-brand-600 dark:hover:text-brand-400 transition-colors">
                    <ChevronLeft size={16} /> {t('resource_list.previous')}
                  </button>
                  <button className="flex items-center gap-1 hover:text-brand-600 dark:hover:text-brand-400 transition-colors">
                    {t('resource_list.next')} <ChevronRight size={16} />
                  </button>
                </div>
                <span>{t('notifications.message_id')}: {selectedNotification.id}</span>
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-300 dark:text-slate-700">
              <Mail size={64} strokeWidth={1} className="mb-4 opacity-20" />
              <p className="font-medium">{t('notifications.select_prompt')}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Notifications;