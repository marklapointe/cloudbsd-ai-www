import { useTranslation } from 'react-i18next';
import { FileText, LogOut } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface SidebarFooterProps {
  onDownloadManual: () => void;
}

export const SidebarFooter: React.FC<SidebarFooterProps> = ({ onDownloadManual }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('username');
    localStorage.removeItem('role');
    navigate('/login');
  };

  return (
    <div className="p-6 mt-auto">
      <button
        onClick={onDownloadManual}
        className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-brand-500/10 hover:bg-brand-500/20 text-brand-600 dark:text-brand-400 rounded-xl transition-all duration-200 text-sm font-semibold mb-4 border border-brand-500/20 hover:border-brand-500/40 group"
      >
        <FileText size={18} className="group-hover:scale-110 transition-transform" />
        <span>{t('manual.user_manual')}</span>
      </button>

      <button
        onClick={handleLogout}
        className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-slate-50 dark:bg-slate-900/50 hover:bg-red-500/10 hover:text-red-600 dark:hover:text-red-400 text-slate-500 dark:text-slate-400 rounded-lg transition-all duration-200 text-sm font-medium border border-slate-200 dark:border-slate-800/50 hover:border-red-500/30"
      >
        <LogOut size={16} />
        <span>{t('common.logout')}</span>
      </button>
    </div>
  );
};
