import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { Sun, Moon } from 'lucide-react';
import { useTheme } from '@cloudbsd/hooks';
import type { ThemeToggleProps } from './types';

const ThemeToggle = memo<ThemeToggleProps>(({ className = '', variant = 'cloudbsd' }) => {
  const { t } = useTranslation();
  const { theme, toggleTheme } = useTheme();

  const isRevy = variant === 'revy';

  const buttonClasses = isRevy
    ? 'p-2.5 rounded-xl transition-all duration-200 text-white/60 hover:text-white hover:bg-white/10 border border-transparent hover:border-white/20 active:scale-95 shadow-sm hover:shadow'
    : 'p-2.5 rounded-xl transition-all duration-200 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-100 border border-transparent hover:border-slate-200 dark:hover:border-slate-700 active:scale-95 shadow-sm hover:shadow';

  return (
    <button
      onClick={toggleTheme}
      className={`${buttonClasses} ${className}`}
      aria-label={t('layout.toggle_theme') || 'Toggle theme'}
      title={t('layout.toggle_theme') || 'Toggle theme'}
    >
      <motion.div
        initial={false}
        animate={{ rotate: theme === 'dark' ? 0 : 180 }}
        transition={{ duration: 0.3, ease: 'easeInOut' }}
      >
        {theme === 'dark' ? (
          <Moon size={20} />
        ) : (
          <Sun size={20} />
        )}
      </motion.div>
    </button>
  );
});

ThemeToggle.displayName = 'ThemeToggle';

export { ThemeToggle };
