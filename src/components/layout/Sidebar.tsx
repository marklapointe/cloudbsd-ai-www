import { useRef, useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { useTheme } from '../../contexts/ThemeContext';
import { UserBadge } from './UserBadge';
import { SidebarNav, buildNavItems } from './SidebarNav';
import { SidebarFooter } from './SidebarFooter';
import { ChevronRight } from 'lucide-react';

interface SidebarProps {
  isMobile: boolean;
  isOpen: boolean;
  width: number;
  isResizing: boolean;
  username: string;
  role: string;
  onClose: () => void;
  onDownloadManual: () => void;
  onWidthChange: (width: number) => void;
}

const DEFAULT_WIDTH = 256;
const MIN_WIDTH = 0;
const MAX_WIDTH = 320;

export const Sidebar: React.FC<SidebarProps> = ({
  isMobile,
  isOpen,
  width,
  isResizing,
  username,
  role,
  onClose,
  onDownloadManual,
  onWidthChange,
}) => {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const widthRef = useRef(width);
  const startXRef = useRef(0);
  const startWidthRef = useRef(DEFAULT_WIDTH);
  const isDraggingRef = useRef(false);
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    widthRef.current = width;
  }, [width]);

  const startResize = (e: React.MouseEvent) => {
    if (isMobile) return;
    e.preventDefault();
    isDraggingRef.current = true;
    setIsDragging(true);
    startXRef.current = e.clientX;
    startWidthRef.current = widthRef.current;
  };

  const stopResize = () => {
    if (!isDraggingRef.current) return;
    isDraggingRef.current = false;
    setIsDragging(false);
    const finalWidth = widthRef.current < 80 ? 0 : DEFAULT_WIDTH;
    widthRef.current = finalWidth;
    onWidthChange(finalWidth);
  };

  const handleDrag = (e: MouseEvent) => {
    if (!isDraggingRef.current || isMobile) return;
    const deltaX = e.clientX - startXRef.current;
    const next = Math.max(MIN_WIDTH, Math.min(MAX_WIDTH, startWidthRef.current + deltaX));
    widthRef.current = next;
    onWidthChange(next);
  };

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleDrag);
      document.addEventListener('mouseup', stopResize);
      document.body.style.cursor = 'ew-resize';
      document.body.style.userSelect = 'none';
    } else {
      document.removeEventListener('mousemove', handleDrag);
      document.removeEventListener('mouseup', stopResize);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    }
    return () => {
      document.removeEventListener('mousemove', handleDrag);
      document.removeEventListener('mouseup', stopResize);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDragging]);

  const toggleSidebar = () => {
    const next = widthRef.current === 0 ? DEFAULT_WIDTH : 0;
    widthRef.current = next;
    onWidthChange(next);
  };

  const navItems = buildNavItems(t, role);

  return (
    <>
      {isMobile && isOpen && (
        <div
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-30 lg:hidden"
          onClick={onClose}
        />
      )}

      <motion.aside
        initial={false}
        animate={
          isMobile
            ? { x: isOpen ? 0 : -DEFAULT_WIDTH }
            : width === 0
              ? { x: -width }
              : { x: 0 }
        }
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        style={{ width: isMobile ? DEFAULT_WIDTH : width }}
        className={`
          fixed inset-y-0 left-0 z-40 shadow-2xl overflow-hidden
          ${isDark
            ? 'bg-slate-900/95 backdrop-blur-md border-r border-white/10 text-slate-100'
            : 'bg-white/80 backdrop-blur-md border-r border-slate-200/50 text-slate-900'}
          lg:translate-x-0 lg:static lg:inset-0 lg:h-screen
          ${isResizing ? 'select-none' : ''}
        `}
      >
        {!isMobile && width > 0 && (
          <div
            className={`
              absolute right-0 top-0 bottom-0 w-4 cursor-ew-resize z-50
              flex items-center justify-center
              group transition-colors duration-200
              ${isDragging ? 'bg-brand-500/20' : 'hover:bg-brand-500/10'}
            `}
            onMouseDown={startResize}
            onDoubleClick={toggleSidebar}
          >
            <div
              className={`
                w-0.5 h-12 rounded-full transition-all duration-200
                ${isDragging
                  ? 'bg-brand-500'
                  : 'bg-slate-400/40 group-hover:bg-brand-500/60 group-hover:h-16'}
              `}
            />
          </div>
        )}

        <div className="flex flex-col h-full">
          <div className="p-8 flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 flex items-center justify-center transform hover:rotate-6 transition-transform">
                <img
                  src="/logo-head-only-zoom-2.png"
                  alt="CloudBSD"
                  className="w-full h-full object-contain drop-shadow-brand"
                />
              </div>
              <div>
                <span className="text-xl font-bold tracking-tight block leading-none">
                  <span className="text-white dark:text-white">Cloud</span>
                  <span className="text-accent dark:text-accent">BSD</span>
                </span>
                <span className="text-[10px] text-brand-600 dark:text-brand-400 font-bold uppercase tracking-widest">
                  {t('layout.admin_panel')}
                </span>
              </div>
            </div>
          </div>

          <nav className="flex-1 px-4 py-2 space-y-1 overflow-y-auto">
            <UserBadge username={username} role={role} />
            <SidebarNav items={navItems} onItemClick={isMobile ? onClose : undefined} />
          </nav>

          <SidebarFooter onDownloadManual={onDownloadManual} />
        </div>
      </motion.aside>

      {!isMobile && width === 0 && (
        <div
          className="fixed left-0 top-1/2 -translate-y-1/2 z-50 w-8 h-16 flex items-center justify-center bg-slate-800/90 backdrop-blur-md border border-white/20 rounded-r-lg hover:bg-slate-700/90 hover:border-brand-500/50 cursor-pointer transition-all duration-200"
          onClick={() => onWidthChange(DEFAULT_WIDTH)}
        >
          <ChevronRight size={18} className="text-slate-300" />
        </div>
      )}
    </>
  );
};
