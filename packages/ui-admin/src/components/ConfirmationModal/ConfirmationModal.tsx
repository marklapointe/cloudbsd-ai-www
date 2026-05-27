import React from 'react';
import { X, AlertTriangle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { ConfirmationModalProps } from './types';

export const ConfirmationModal: React.FC<ConfirmationModalProps> = ({ 
  isOpen, 
  onClose, 
  onConfirm,
  title,
  message,
  confirmLabel,
  cancelLabel,
  variant = 'danger'
}) => {
  const { t } = useTranslation();

  if (!isOpen) return null;

  const getVariantStyles = () => {
    switch (variant) {
      case 'danger':
        return {
          icon: <AlertTriangle className="text-red-600 dark:text-red-400" size={24} />,
          iconBg: 'bg-red-50 dark:bg-red-500/10',
          button: 'bg-red-600 hover:bg-red-700 shadow-red-500/20'
        };
      case 'warning':
        return {
          icon: <AlertTriangle className="text-amber-600 dark:text-amber-400" size={24} />,
          iconBg: 'bg-amber-50 dark:bg-amber-500/10',
          button: 'bg-amber-600 hover:bg-amber-700 shadow-amber-500/20'
        };
      default:
        return {
          icon: <AlertTriangle className="text-brand-600 dark:text-brand-400" size={24} />,
          iconBg: 'bg-brand-50 dark:bg-brand-500/10',
          button: 'bg-brand-600 hover:bg-brand-700 shadow-brand-500/20'
        };
    }
  };

  const styles = getVariantStyles();

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xl">
      <div className="relative bg-white/30 dark:bg-slate-900/40 backdrop-blur-xl rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200 border border-white/30 dark:border-slate-700/40 transition-colors duration-300">
        <div className="absolute inset-0 bg-gradient-to-br from-white/20 via-transparent to-white/10 dark:from-slate-800/30 dark:via-transparent dark:to-slate-900/20 pointer-events-none" />
        
        <div className="relative px-8 py-6 border-b border-white/30 dark:border-slate-700/40 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`p-2.5 ${styles.iconBg} rounded-xl ring-1 ring-inset ring-white/30 dark:ring-slate-700/40 backdrop-blur-xl`}>
              {styles.icon}
            </div>
            <h2 className="text-xl font-black text-slate-900 dark:text-slate-100 uppercase tracking-tight">
              {title}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2.5 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-white/60 dark:hover:bg-slate-700/60 rounded-xl transition-all backdrop-blur-xl ring-1 ring-inset ring-white/30 dark:ring-slate-700/40"
            aria-label={t('common.close')}
          >
            <X size={20} />
          </button>
        </div>

        <div className="relative p-8 space-y-6">
          <p className="text-slate-700 dark:text-slate-300 font-bold leading-relaxed text-lg">
            {message}
          </p>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-6 py-4 bg-white/40 dark:bg-slate-800/50 backdrop-blur-xl border border-white/40 dark:border-slate-700/50 text-slate-700 dark:text-slate-300 font-black uppercase tracking-widest text-xs rounded-2xl hover:bg-white/60 dark:hover:bg-slate-800/70 hover:border-white/60 dark:hover:border-slate-600/60 transition-all active:scale-95 shadow-sm ring-1 ring-inset ring-white/30 dark:ring-slate-700/40"
            >
              {cancelLabel || t('common.cancel')}
            </button>
            <button
              type="button"
              onClick={() => {
                onConfirm();
                onClose();
              }}
              className={`flex-1 px-6 py-4 text-white font-black uppercase tracking-widest text-xs rounded-2xl transition-all active:scale-95 shadow-lg backdrop-blur-xl ring-1 ring-inset ${styles.button} ${variant === 'danger' ? 'ring-red-400/40 bg-red-500/80 hover:bg-red-500/90' : variant === 'warning' ? 'ring-amber-400/40 bg-amber-500/80 hover:bg-amber-500/90' : 'ring-brand-400/40 bg-brand-500/80 hover:bg-brand-500/90'}`}
            >
              {confirmLabel || t('common.confirm') || 'Confirm'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
