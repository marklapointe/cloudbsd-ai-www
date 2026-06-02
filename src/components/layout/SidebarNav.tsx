import { Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Monitor,
  Container,
  HardDrive,
  Server,
  Network,
  User,
  History,
  Settings,
} from 'lucide-react';

interface NavItem {
  name: string;
  path: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
}

export const buildNavItems = (t: (key: string) => string, role: string): NavItem[] => {
  const items: NavItem[] = [
    { name: t('common.dashboard'), path: '/dashboard', icon: LayoutDashboard },
    { name: t('common.cluster'), path: '/cluster', icon: Server },
    { name: t('common.vms'), path: '/vms', icon: Monitor },
    { name: t('common.containers'), path: '/containers', icon: Container },
    { name: t('common.jails'), path: '/jails', icon: HardDrive },
    { name: t('common.volumes'), path: '/volumes', icon: HardDrive },
    { name: t('common.network'), path: '/network', icon: Network },
  ];
  if (role === 'admin') {
    items.push({ name: t('common.users'), path: '/users', icon: User });
    items.push({ name: t('common.logs'), path: '/logs', icon: History });
    items.push({ name: t('common.settings'), path: '/settings', icon: Settings });
  } else if (role === 'operator') {
    items.push({ name: t('common.settings'), path: '/settings', icon: Settings });
  }
  return items;
};

interface SidebarNavProps {
  items: NavItem[];
  onItemClick?: () => void;
}

export const SidebarNav: React.FC<SidebarNavProps> = ({ items, onItemClick }) => {
  const location = useLocation();

  return (
    <>
      <div className="px-4 py-2 mb-2">
        <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">
          Main menu
        </p>
      </div>
      {items.map((item) => {
        const isActive = location.pathname === item.path;
        return (
          <Link
            key={item.path}
            to={item.path}
            onClick={onItemClick}
            aria-current={isActive ? 'page' : undefined}
            className={`
              flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group
              hover:-translate-y-0.5
              ${isActive
                ? 'bg-brand-600/10 text-brand-600 dark:text-brand-400 shadow-sm'
                : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-900 hover:text-slate-900 dark:hover:text-slate-200'}
            `}
          >
            <item.icon
              size={20}
              className={`transition-transform duration-200 ${isActive ? 'scale-110' : 'group-hover:scale-110'}`}
            />
            <span className="font-medium">{item.name}</span>
            {isActive && (
              <div className="ml-auto w-1.5 h-1.5 rounded-full bg-brand-500 shadow-lg shadow-brand-500/50" />
            )}
          </Link>
        );
      })}
    </>
  );
};
