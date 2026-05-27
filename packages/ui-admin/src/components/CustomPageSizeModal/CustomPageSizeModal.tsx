import React, { useState, useEffect } from 'react';
import { X, Hash } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { CustomPageSizeModalProps } from './types';

export const CustomPageSizeModal: React.FC<CustomPageSizeModalProps> = ({ 
  isOpen, 
  onClose, 
  onConfirm,
  initialValue
}) => {
  const { t } = useTranslation();
  const [value, setValue] = useState<string>('');

  useEffect(() => {
    if (isOpen) {
      setValue(initialValue === 'all' ? '10' : initialValue.toString());
    }
  }, [isOpen, initialValue]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const numValue = parseInt(value);
    if (!isNaN(numValue) && numValue > 0) {
      onConfirm(numValue);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-900 rounded-[2rem] shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200 border border-slate-100 dark:border-slate-800 transition-colors duration-300">
        <div className="px-8 py-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-brand-500/10 dark:bg-brand-500/20 rounded-xl text-brand-600 dark:text-brand-400">
              <Hash size={20} />
            </div>
            <h2 className="text-xl font-black text-slate-900 dark:text-slate-100 uppercase tracking-tight">
              {t('resource_list.custom_page_size')}
            </h2>
          </div>
          <button 
            onClick={onClose} 
            className="p-2 text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all"
            aria-label={t('common.close')}
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-6">
          <div>
            <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2 ml-1">
              {t('resource_list.items_per_page')}
            </label>
            <input 
              type="number" 
              autoFocus
              min="1"
              max="1000"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 focus:bg-white dark:focus:bg-slate-700 transition-all duration-200 outline-none font-bold text-slate-900 dark:text-slate-100 text-lg"
              placeholder="10"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-6 py-4 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 font-black uppercase tracking-widest text-xs rounded-2xl hover:bg-slate-50 dark:hover:bg-slate-800 hover:border-slate-300 dark:hover:border-slate-600 transition-all active:scale-95"
            >
              {t('common.cancel')}
            </button>
            <button
              type="submit"
              className="flex-1 px-6 py-4 bg-brand-500 text-white font-black uppercase tracking-widest text-xs rounded-2xl hover:bg-brand-600 shadow-lg shadow-brand-500/20 transition-all active:scale-95"
            >
              {t('common.apply')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};