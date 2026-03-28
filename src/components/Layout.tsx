import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import api from '../api/client';
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
  AlertCircle
} from 'lucide-react';

interface Notification {
  id: string;
  type: 'info' | 'warning' | 'error' | 'success';
  message: string;
  timestamp: Date;
  read: boolean;
}

const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { t, i18n } = useTranslation();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [licenseWarning, setLicenseWarning] = useState<string | null>(null);
  const navigate = useNavigate();
  const location = useLocation();
  const username = localStorage.getItem('username') || 'User';
  const role = localStorage.getItem('role') || 'viewer';

  useEffect(() => {
    checkLicense();
    // Poll for license and notifications every minute
    const interval = setInterval(checkLicense, 60000);
    
    // Load existing notifications from localStorage
    const savedNotifications = localStorage.getItem('system_notifications');
    if (savedNotifications) {
      try {
        const parsed = JSON.parse(savedNotifications);
        setNotifications(parsed.map((n: any) => ({
          ...n,
          timestamp: new Date(n.timestamp)
        })));
      } catch (e) {
        console.error('Failed to parse saved notifications', e);
      }
    }

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    // Save notifications to localStorage when they change
    localStorage.setItem('system_notifications', JSON.stringify(notifications));
  }, [notifications]);

  const checkLicense = async () => {
    try {
      const res = await api.get('/system/license');
      const license = res.data;
      if (license && license.usage) {
        const warnings: string[] = [];
        if (license.usage.vms > license.vms_limit) {
          warnings.push(t('notifications.vms_over_limit', { count: license.usage.vms, limit: license.vms_limit }));
        }
        if (license.usage.containers > license.containers_limit) {
          warnings.push(t('notifications.containers_over_limit', { count: license.usage.containers, limit: license.containers_limit }));
        }
        if (license.usage.jails > license.jails_limit) {
          warnings.push(t('notifications.jails_over_limit', { count: license.usage.jails, limit: license.jails_limit }));
        }
        if (license.usage.nodes > license.nodes_limit) {
          warnings.push(t('notifications.nodes_over_limit', { count: license.usage.nodes, limit: license.nodes_limit }));
        }

        if (warnings.length > 0) {
          const warningMsg = warnings.join(' | ');
          setLicenseWarning(warningMsg);
          
          // Add as notification if not already present or if last warning was > 24h ago
          setNotifications(prev => {
            const now = new Date();
            const lastInstance = prev.find(n => n.message === warningMsg);
            const isTooSoon = lastInstance && (now.getTime() - new Date(lastInstance.timestamp).getTime() < 24 * 60 * 60 * 1000);

            if (!lastInstance || !isTooSoon) {
              return [{
                id: Date.now().toString(),
                type: 'warning',
                message: warningMsg,
                timestamp: now,
                read: false
              }, ...prev];
            }
            return prev;
          });
        } else {
          setLicenseWarning(null);
        }
      }
    } catch (err) {
      console.error('Failed to check license status', err);
    }
  };

  const markAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const unreadCount = notifications.filter(n => !n.read).length;

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
    <div className="min-h-screen bg-slate-50 flex flex-col lg:flex-row font-sans">
      {/* Mobile Top Bar */}
      <div className="lg:hidden sticky top-0 left-0 right-0 h-16 bg-slate-950 flex items-center justify-between px-6 z-50 border-b border-slate-800/50">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 flex items-center justify-center">
            <img src="/logo.png" alt="CloudBSD" className="w-full h-full object-contain drop-shadow-brand" />
          </div>
          <span className="text-lg font-bold text-slate-100 tracking-tight leading-none">CloudBSD</span>
        </div>
        
        <div className="flex items-center gap-2">
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
      <main className="flex-1 overflow-auto bg-slate-50/50 lg:h-screen relative">
        {/* Desktop Header */}
        <header className="hidden lg:flex sticky top-0 bg-white/80 backdrop-blur-md h-16 border-b border-slate-200 z-20 items-center justify-between px-10">
          <div className="flex items-center gap-2 text-slate-500 text-sm font-medium">
            <span className="capitalize">{location.pathname.substring(1).replace('/', ' > ')}</span>
          </div>
          
          <div className="flex items-center gap-4">
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
                  <div className="absolute right-0 mt-3 w-80 bg-white rounded-2xl shadow-2xl border border-slate-200 z-40 overflow-hidden animate-in fade-in zoom-in duration-200 origin-top-right">
                    <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                      <h3 className="font-bold text-slate-800 flex items-center gap-2">
                        <Bell size={16} className="text-brand-500" />
                        {t('notifications.title')}
                      </h3>
                      {unreadCount > 0 && (
                        <button 
                          onClick={markAllAsRead}
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
                            className={`p-4 border-b border-slate-50 hover:bg-slate-50 transition-colors flex gap-3 ${!notification.read ? 'bg-brand-50/30' : ''}`}
                          >
                            <div className={`mt-0.5 w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center ${
                              notification.type === 'warning' ? 'bg-amber-100 text-amber-600' :
                              notification.type === 'error' ? 'bg-red-100 text-red-600' :
                              notification.type === 'success' ? 'bg-emerald-100 text-emerald-600' :
                              'bg-blue-100 text-blue-600'
                            }`}>
                              {notification.type === 'warning' ? <AlertTriangle size={16} /> :
                               notification.type === 'error' ? <AlertCircle size={16} /> :
                               notification.type === 'success' ? <CheckCircle size={16} /> :
                               <Info size={16} />}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm text-slate-700 leading-snug">{notification.message}</p>
                              <p className="text-[10px] text-slate-400 mt-1 font-medium">
                                {new Date(notification.timestamp).toLocaleTimeString()}
                              </p>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                    <div className="p-3 bg-slate-50 border-t border-slate-100 text-center">
                      <button 
                        onClick={() => {
                          setIsNotificationsOpen(false);
                          navigate('/notifications');
                        }}
                        className="text-xs font-bold text-slate-500 hover:text-brand-600 transition-colors uppercase tracking-widest"
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

        {/* License Warning Banner */}
        {licenseWarning && (
          <div className="bg-amber-500 text-white px-6 py-2 flex items-center justify-between gap-4 animate-in slide-in-from-top duration-500">
            <div className="flex items-center gap-2 font-bold text-xs uppercase tracking-wider">
              <AlertTriangle size={16} />
              <span>{t('notifications.license_warning')}: {licenseWarning}</span>
            </div>
            <Link 
              to="/settings" 
              className="bg-white/20 hover:bg-white/30 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest transition-colors whitespace-nowrap"
            >
              {t('notifications.upgrade_license')}
            </Link>
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
