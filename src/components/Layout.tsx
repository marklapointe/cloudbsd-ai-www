import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../contexts/ThemeContext';
import { Sidebar } from './layout/Sidebar';
import { MobileTopBar } from './layout/MobileTopBar';
import { Header } from './layout/Header';
import { HighPriorityBanner } from './layout/HighPriorityBanner';
import { downloadUserManual } from './layout/downloadUserManual';

const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [sidebarWidth, setSidebarWidth] = useState(256);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 1024);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const username = localStorage.getItem('username') || 'User';
  const role = localStorage.getItem('role') || 'viewer';
  const isDark = theme === 'dark';

  return (
    <div
      className={`min-h-screen ${
        isDark ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900'
      } flex flex-col lg:flex-row font-sans transition-colors duration-300`}
    >
      <MobileTopBar
        isMenuOpen={isSidebarOpen}
        onToggleMenu={() => setIsSidebarOpen((open) => !open)}
      />

      <Sidebar
        isMobile={isMobile}
        isOpen={isSidebarOpen}
        width={sidebarWidth}
        isResizing={false}
        username={username}
        role={role}
        onClose={() => setIsSidebarOpen(false)}
        onDownloadManual={() => downloadUserManual(t)}
        onWidthChange={setSidebarWidth}
      />

      <main className="flex-1 overflow-auto bg-slate-50/50 dark:bg-slate-900/50 lg:h-screen relative transition-colors duration-300">
        <Header username={username} role={role} />
        <HighPriorityBanner />
        <div
          className={`
            p-6 lg:p-10 mx-auto
            ${window.location.pathname === '/network' ? 'max-w-none w-full h-full p-0 lg:p-0' : 'max-w-7xl'}
          `}
        >
          {children}
        </div>
      </main>
    </div>
  );
};

export default Layout;
