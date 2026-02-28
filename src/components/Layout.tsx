import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { 
  LayoutDashboard, 
  Monitor, 
  Container, 
  Box, 
  HardDrive, 
  Server,
  Network,
  LogOut, 
  Menu, 
  X,
  User,
  History,
  Settings
} from 'lucide-react';

const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { t } = useTranslation();
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
          aria-label="Toggle Menu"
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
              <span className="text-[10px] text-brand-400 font-bold uppercase tracking-widest">Admin Panel</span>
            </div>
          </div>

          <nav className="flex-1 px-4 py-2 space-y-1">
            <div className="px-4 py-2 mb-2">
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Main Menu</p>
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
            <div className="bg-slate-900/50 rounded-2xl p-4 mb-4 border border-slate-800/50">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center text-slate-300 border border-slate-700">
                  <User size={20} />
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-sm font-semibold truncate text-slate-200">{username}</span>
                  <span className="text-[10px] text-brand-500 font-bold uppercase tracking-wider truncate">{localStorage.getItem('role') || 'viewer'}</span>
                </div>
              </div>
              <button 
                onClick={handleLogout}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-slate-800 hover:bg-red-500/10 hover:text-red-400 text-slate-400 rounded-lg transition-all duration-200 text-sm font-medium border border-slate-700/50 hover:border-red-500/30"
              >
                <LogOut size={16} />
                <span>{t('common.logout')}</span>
              </button>
            </div>
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
