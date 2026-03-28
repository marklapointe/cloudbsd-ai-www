import React from 'react';
import { X, AlertTriangle } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'warning' | 'info';
}

const ConfirmationModal: React.FC<ConfirmationModalProps> = ({ 
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
          icon: <AlertTriangle className="text-red-600" size={24} />,
          iconBg: 'bg-red-50',
          button: 'bg-red-600 hover:bg-red-700 shadow-red-500/20'
        };
      case 'warning':
        return {
          icon: <AlertTriangle className="text-amber-600" size={24} />,
          iconBg: 'bg-amber-50',
          button: 'bg-amber-600 hover:bg-amber-700 shadow-amber-500/20'
        };
      default:
        return {
          icon: <AlertTriangle className="text-brand-600" size={24} />,
          iconBg: 'bg-brand-50',
          button: 'bg-brand-600 hover:bg-brand-700 shadow-brand-500/20'
        };
    }
  };

  const styles = getVariantStyles();

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
      <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200 border border-slate-100">
        <div className="px-8 py-6 border-b border-slate-50 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className={`p-2 ${styles.iconBg} rounded-xl`}>
              {styles.icon}
            </div>
            <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight">
              {title}
            </h2>
          </div>
          <button 
            onClick={onClose} 
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-all"
            aria-label={t('common.close')}
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-8 space-y-6">
          <p className="text-slate-600 font-bold leading-relaxed text-lg">
            {message}
          </p>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-6 py-4 border border-slate-200 text-slate-600 font-black uppercase tracking-widest text-xs rounded-2xl hover:bg-slate-50 hover:border-slate-300 transition-all active:scale-95"
            >
              {cancelLabel || t('common.cancel')}
            </button>
            <button
              type="button"
              onClick={() => {
                onConfirm();
                onClose();
              }}
              className={`flex-1 px-6 py-4 text-white font-black uppercase tracking-widest text-xs rounded-2xl transition-all active:scale-95 shadow-lg ${styles.button}`}
            >
              {confirmLabel || t('common.confirm') || 'Confirm'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConfirmationModal;
