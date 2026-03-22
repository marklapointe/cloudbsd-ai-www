import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
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
  FileText
} from 'lucide-react';

const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { t, i18n } = useTranslation();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
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
    <div className="min-h-screen bg-slate-50 flex flex-col lg:flex-row font-sans">
      {/* Mobile Top Bar */}
      <div className="lg:hidden sticky top-0 left-0 right-0 h-16 bg-slate-950 flex items-center justify-between px-6 z-50 border-b border-slate-800/50">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 flex items-center justify-center">
            <img src="/logo.png" alt="CloudBSD" className="w-full h-full object-contain drop-shadow-brand" />
          </div>
          <span className="text-lg font-bold text-slate-100 tracking-tight leading-none">CloudBSD</span>
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
              <span>{t('manual.download_manual')}</span>
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
      <main className="flex-1 overflow-auto bg-slate-50/50 lg:h-screen">
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
