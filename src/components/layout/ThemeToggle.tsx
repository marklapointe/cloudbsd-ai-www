import { useTranslation } from 'react-i18next';
import { useTheme } from '../../contexts/ThemeContext';
import { Sun, Moon } from 'lucide-react';

interface ThemeToggleProps {
  className?: string;
}

export const ThemeToggle: React.FC<ThemeToggleProps> = ({ className = '' }) => {
  const { theme, toggleTheme } = useTheme();
  const { t } = useTranslation();
  const isDark = theme === 'dark';

  return (
    <button
      onClick={toggleTheme}
      className={className || 'p-2.5 rounded-xl transition-all duration-200 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-100 border border-transparent hover:border-slate-200 dark:hover:border-slate-700 active:scale-95 shadow-sm hover:shadow'}
      aria-label={t('layout.toggle_theme')}
      title={t('layout.toggle_theme')}
    >
      {isDark ? <Sun size={20} /> : <Moon size={20} />}
    </button>
  );
};
