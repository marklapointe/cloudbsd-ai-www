import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { formatLocalTime } from '../utils/dateUtils';
import { useNotifications } from '../contexts/NotificationContext';
import { 
  LayoutDashboard, 
  Monitor, 
  Container, 
  HardDrive, 
  Server,
  Network,
  LogOut, 
  Menu, 
  X,
  User,
  History,
  Settings,
  FileText,
  Bell,
  AlertTriangle,
  Info,
  CheckCircle,
  AlertCircle,
  ExternalLink,
  Megaphone,
  Sun,
  Moon
} from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';

const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { t, i18n } = useTranslation();
  const { theme, toggleTheme } = useTheme();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const { 
    notifications, 
    unreadCount, 
    highPriorityNotifications, 
    markAsRead,
    dismissNotification
  } = useNotifications();
  const navigate = useNavigate();
  const location = useLocation();
  const username = localStorage.getItem('username') || 'User';
  const role = localStorage.getItem('role') || 'viewer';

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('username');
    localStorage.removeItem('role');
    navigate('/login');
  };

  const handleDownloadManual = () => {
    const manualContent = `# ${t('manual.title')}

## ${t('manual.introduction')}
${t('manual.intro_text')}

## ${t('manual.authentication')}

### ${t('manual.login')}
${t('manual.login_text')}

### ${t('manual.language_selection')}
${t('manual.language_text')}

## ${t('manual.dashboard')}
${t('manual.dashboard_text')}

## ${t('manual.resource_management')}

### ${t('manual.vms')}
${t('manual.vms_text')}

### ${t('manual.containers')}
${t('manual.containers_text')}

### ${t('manual.jails')}
${t('manual.jails_text')}

## ${t('manual.cluster')}
${t('manual.cluster_text')}

## ${t('manual.network_map')}
${t('manual.network_map_text')}

## ${t('manual.roles')}
- ${t('manual.roles_admin')}
- ${t('manual.roles_operator')}
- ${t('manual.roles_viewer')}

## ${t('manual.administration')}

### ${t('manual.user_management')}
${t('manual.user_management_text')}

### ${t('manual.logs')}
${t('manual.logs_text')}

### ${t('manual.settings')}
${t('manual.settings_text')}

## ${t('manual.troubleshooting')}
- ${t('manual.trouble_auth')}
- ${t('manual.trouble_lang')}
`;
    const blob = new Blob([manualContent], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `CloudBSD_User_Manual_${i18n.language}.md`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const navItems = [
    { name: t('common.dashboard'), path: '/dashboard', icon: LayoutDashboard },
    { name: t('common.cluster'), path: '/cluster', icon: Server },
    { name: t('common.vms'), path: '/vms', icon: Monitor },
    { name: t('common.containers'), path: '/containers', icon: Container },
    { name: t('common.jails'), path: '/jails', icon: HardDrive },
    { name: t('common.network'), path: '/network', icon: Network },
  ];

  if (role === 'admin') {
    navItems.push({ name: t('common.users'), path: '/users', icon: User });
    navItems.push({ name: t('common.logs'), path: '/logs', icon: History });
    navItems.push({ name: t('common.settings'), path: '/settings', icon: Settings });
  } else if (role === 'operator') {
    navItems.push({ name: t('common.settings'), path: '/settings', icon: Settings });
  }

  return (
    <div className={`min-h-screen ${theme === 'dark' ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900'} flex flex-col lg:flex-row font-sans transition-colors duration-300`}>
      {/* Mobile Top Bar */}
      <div className="lg:hidden sticky top-0 left-0 right-0 h-16 bg-slate-950 flex items-center justify-between px-6 z-50 border-b border-slate-800/50">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 flex items-center justify-center">
            <img src="/logo.png" alt="CloudBSD" className="w-full h-full object-contain drop-shadow-brand" />
          </div>
          <span className="text-lg font-bold text-slate-100 tracking-tight leading-none">CloudBSD</span>
        </div>
        
        <div className="flex items-center gap-2">
          {/* Theme Toggle (Mobile) */}
          <button 
            onClick={toggleTheme}
            className="p-2 text-slate-100 hover:bg-slate-900 rounded-lg transition-colors"
            aria-label={t('layout.toggle_theme')}
            title={t('layout.toggle_theme')}
          >
            {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
          </button>

          {/* Notification Bell (Mobile) */}
          <div className="relative">
            <button 
              onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
              className="p-2 text-slate-100 hover:bg-slate-900 rounded-lg transition-colors relative"
            >
              <Bell size={20} />
              {unreadCount > 0 && (
                <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-red-500 text-white text-[10px] font-bold flex items-center justify-center rounded-full border-2 border-slate-950">
                  {unreadCount}
                </span>
              )}
            </button>
          </div>

          <button 
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="p-2 text-slate-100 hover:bg-slate-900 rounded-lg transition-colors flex items-center justify-center"
            aria-label={t('layout.toggle_menu')}
            title={t('layout.toggle_menu')}
          >
            {isSidebarOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      {/* Sidebar Overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-30 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed inset-y-0 left-0 z-40 w-64 bg-slate-950 text-slate-100 shadow-2xl transform transition-all duration-300 ease-in-out border-r border-slate-800/50
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        lg:translate-x-0 lg:static lg:inset-0 lg:h-screen
      `}>
        <div className="flex flex-col h-full">
          <div className="p-8 flex items-center gap-4">
            <div className="w-12 h-12 flex items-center justify-center transform hover:rotate-6 transition-transform">
              <img src="/logo.png" alt="CloudBSD" className="w-full h-full object-contain drop-shadow-brand" />
            </div>
            <div>
              <span className="text-xl font-bold tracking-tight block leading-none">CloudBSD</span>
              <span className="text-[10px] text-brand-400 font-bold uppercase tracking-widest">{t('layout.admin_panel')}</span>
            </div>
          </div>

          <nav className="flex-1 px-4 py-2 space-y-1">
            <div className="bg-slate-900/50 rounded-2xl p-4 mb-6 border border-slate-800/50 flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center text-slate-300 border border-slate-700">
                <User size={20} />
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-sm font-semibold truncate text-slate-200">{username}</span>
                <span className="text-[10px] text-brand-500 font-bold uppercase tracking-wider truncate">{t(`common.${localStorage.getItem('role') || 'viewer'}`)}</span>
              </div>
            </div>

            <div className="px-4 py-2 mb-2">
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{t('layout.main_menu')}</p>
            </div>
            {navItems.map((item) => (
              <Link
                key={item.name}
                to={item.path}
                className={`
                  flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group
                  ${location.pathname === item.path 
                    ? 'bg-brand-600/10 text-brand-400 shadow-sm' 
                    : 'text-slate-400 hover:bg-slate-900 hover:text-slate-200'}
                `}
                onClick={() => setIsSidebarOpen(false)}
              >
                <item.icon size={20} className={`transition-transform duration-200 ${location.pathname === item.path ? 'scale-110' : 'group-hover:scale-110'}`} />
                <span className="font-medium">{item.name}</span>
                {location.pathname === item.path && (
                  <div className="ml-auto w-1.5 h-1.5 rounded-full bg-brand-500 shadow-lg shadow-brand-500/50" />
                )}
              </Link>
            ))}
          </nav>

          <div className="p-6 mt-auto">
            <button 
              onClick={handleDownloadManual}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-brand-500/10 hover:bg-brand-500/20 text-brand-400 rounded-xl transition-all duration-200 text-sm font-semibold mb-4 border border-brand-500/20 hover:border-brand-500/40 group"
            >
              <FileText size={18} className="group-hover:scale-110 transition-transform" />
              <span>{t('manual.user_manual')}</span>
            </button>

            <button 
              onClick={handleLogout}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-slate-900/50 hover:bg-red-500/10 hover:text-red-400 text-slate-400 rounded-lg transition-all duration-200 text-sm font-medium border border-slate-800/50 hover:border-red-500/30"
            >
              <LogOut size={16} />
              <span>{t('common.logout')}</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto bg-slate-50/50 dark:bg-slate-900/50 lg:h-screen relative transition-colors duration-300">
        {/* Desktop Header */}
        <header className="hidden lg:flex sticky top-0 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md h-16 border-b border-slate-200 dark:border-slate-800 z-20 items-center justify-between px-10 transition-colors duration-300">
          <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 text-sm font-medium">
            <span className="capitalize">{location.pathname.substring(1).replace('/', ' > ')}</span>
          </div>
          
          <div className="flex items-center gap-4">
            {/* Theme Toggle (Desktop) */}
            <button 
              onClick={toggleTheme}
              className={`p-2.5 rounded-xl transition-all duration-200 ${theme === 'dark' ? 'text-slate-400 hover:bg-slate-800 hover:text-slate-200' : 'text-slate-400 hover:bg-slate-100 hover:text-slate-600'}`}
              aria-label={t('layout.toggle_theme')}
              title={t('layout.toggle_theme')}
            >
              {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
            </button>

            {/* Notification Bell (Desktop) */}
            <div className="relative">
              <button 
                onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
                className={`p-2.5 rounded-xl transition-all duration-200 relative ${isNotificationsOpen ? 'bg-brand-50 text-brand-600' : 'text-slate-400 hover:bg-slate-100 hover:text-slate-600'}`}
              >
                <Bell size={20} />
                {unreadCount > 0 && (
                  <span className="absolute top-2 right-2 w-4 h-4 bg-red-500 text-white text-[10px] font-bold flex items-center justify-center rounded-full border-2 border-white">
                    {unreadCount}
                  </span>
                )}
              </button>

              {isNotificationsOpen && (
                <>
                  <div className="fixed inset-0 z-30" onClick={() => setIsNotificationsOpen(false)} />
                  <div className="absolute right-0 mt-3 w-80 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 z-40 overflow-hidden animate-in fade-in zoom-in duration-200 origin-top-right">
                    <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/50">
                      <h3 className="font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                        <Bell size={16} className="text-brand-500" />
                        {t('notifications.title')}
                      </h3>
                      {unreadCount > 0 && (
                        <button 
                          onClick={() => notifications.forEach(n => !n.is_read && markAsRead(n.id))}
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
                        notifications.map(notification => (
                          <div 
                            key={notification.id} 
                            className={`p-4 border-b border-slate-50 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors flex gap-3 ${!notification.is_read ? 'bg-brand-50/30 dark:bg-brand-500/10' : ''}`}
                            onClick={() => !notification.is_read && markAsRead(notification.id)}
                          >
                            <div className={`mt-0.5 w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center ${
                              notification.type === 'warning' ? 'bg-amber-100 text-amber-600' :
                              notification.type === 'error' ? 'bg-red-100 text-red-600' :
                              notification.type === 'success' ? 'bg-emerald-100 text-emerald-600' :
                              notification.type === 'ad' ? 'bg-purple-100 text-purple-600' :
                              'bg-blue-100 text-blue-600'
                            }`}>
                              {notification.type === 'warning' ? <AlertTriangle size={16} /> :
                               notification.type === 'error' ? <AlertCircle size={16} /> :
                               notification.type === 'success' ? <CheckCircle size={16} /> :
                               notification.type === 'ad' ? <Megaphone size={16} /> :
                               <Info size={16} />}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm text-slate-700 dark:text-slate-200 leading-snug font-medium">{notification.message}</p>
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
                        ))
                      )}
                    </div>
                    <div className="p-3 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-800 text-center">
                      <button 
                        onClick={() => {
                          setIsNotificationsOpen(false);
                          navigate('/notifications');
                        }}
                        className="text-xs font-bold text-slate-500 dark:text-slate-400 hover:text-brand-600 dark:hover:text-brand-400 transition-colors uppercase tracking-widest"
                      >
                        {t('notifications.view_all')}
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>

            <div className="w-px h-6 bg-slate-200" />
          </div>
        </header>

        {/* High Priority Notification Banner */}
        {highPriorityNotifications.length > 0 && (
          <div className="bg-red-600 text-white px-6 py-2 flex flex-col gap-2 animate-in slide-in-from-top duration-500">
            {highPriorityNotifications.map(notification => (
              <div key={notification.id} className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-2 font-bold text-xs uppercase tracking-wider">
                  <AlertCircle size={16} />
                  <span>{notification.message}</span>
                </div>
                <div className="flex items-center gap-2">
                  {notification.link && (
                    <a 
                      href={notification.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="bg-slate-950/40 hover:bg-slate-950/60 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all hover:scale-105 active:scale-95 whitespace-nowrap border border-white/10 shadow-sm"
                    >
                      {t('common.learn_more')}
                    </a>
                  )}
                  <button 
                    onClick={() => dismissNotification(notification.id)}
                    className="w-7 h-7 flex items-center justify-center bg-slate-950/20 hover:bg-slate-950/40 rounded-xl text-white/70 hover:text-white transition-all hover:scale-105 active:scale-95 border border-white/5"
                    title={t('common.dismiss')}
                  >
                    <X size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className={`
          p-6 lg:p-10 mx-auto
          ${location.pathname === '/network' ? 'max-w-none w-full h-full p-0 lg:p-0' : 'max-w-7xl'}
        `}>
          {children}
        </div>
      </main>
    </div>
  );
};

export default Layout;
