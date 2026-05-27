import { memo, useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { Globe, X, Check } from 'lucide-react';
import { languages, getLanguageByCode } from './languages';
import type { LanguageSelectorProps } from './types';

const LanguageSelector = memo<LanguageSelectorProps>(({ className = '', variant = 'revy' }) => {
  const { i18n } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const currentLanguage = getLanguageByCode(i18n.language) || languages[0];
  const isRevy = variant === 'revy';

  const handleLanguageChange = (lng: string) => {
    i18n.changeLanguage(lng);
    const url = new URL(window.location.href);
    url.searchParams.set('lng', lng);
    window.history.pushState({}, '', url.toString());
    setIsOpen(false);
  };

  useEffect(() => {
    const handlePopState = () => {
      const urlParams = new URLSearchParams(window.location.search);
      const lng = urlParams.get('lng');
      if (lng && i18n.language !== lng) {
        i18n.changeLanguage(lng);
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [i18n]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  const buttonClasses = isRevy
    ? 'border-white/10 bg-white/5 hover:border-revy-accent'
    : 'border-white/10 bg-white/5 backdrop-blur-md hover:border-white/30 text-white';

  const selectedItemClasses = isRevy
    ? 'bg-revy-blue/30 text-revy-accent font-bold'
    : 'bg-blue-50 dark:bg-blue-900/30 text-cloudbsd-blue dark:text-blue-400 font-bold';

  const normalItemClasses = isRevy
    ? 'text-white/70 hover:bg-white/5 hover:text-white'
    : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/50';

  const dropdownBgClasses = isRevy
    ? 'bg-revy-dark border border-white/10'
    : 'bg-white dark:bg-slate-800';

  return (
    <div className={`relative inline-block ${className}`} ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`inline-flex items-center justify-center h-10 px-3 md:px-4 rounded-xl border shadow-sm transition-all duration-300 group ${
          isRevy
            ? 'gpu-accelerated text-white/60 hover:text-revy-accent'
            : 'backdrop-blur-md text-white/90 hover:text-white'
        } ${buttonClasses}`}
        aria-haspopup="true"
        aria-expanded={isOpen}
      >
        <Globe className={`w-4 h-4 md:mr-2 ${isRevy ? '' : 'text-white/80'} group-hover:${isRevy ? 'text-revy-accent' : 'text-white'} transition-colors`} />
        <span className="hidden md:inline text-sm font-medium mr-2">
          {currentLanguage?.nativeName || 'Language'}
        </span>
        <span className="md:hidden text-lg" aria-hidden="true">
          {currentLanguage?.flag || '🌐'}
        </span>
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            {/* Desktop Dropdown */}
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              transition={{ duration: 0.15 }}
              className={`hidden md:block absolute right-0 mt-2 w-64 max-h-96 overflow-y-auto rounded-2xl shadow-2xl ring-1 ring-black ring-opacity-5 z-[100] focus:outline-none scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-slate-700 p-2 ${dropdownBgClasses}`}
            >
              {languages.map((lang) => (
                <button
                  key={lang.code}
                  onClick={() => handleLanguageChange(lang.code)}
                  className={`flex items-center px-4 py-3 text-sm w-full rounded-xl transition-all duration-200 ${
                    (i18n.language || '').startsWith(lang.code)
                      ? selectedItemClasses
                      : normalItemClasses
                  }`}
                >
                  <span className="mr-3 text-lg">{lang.flag}</span>
                  <span className="flex-1 text-left">{lang.nativeName}</span>
                  {(i18n.language || '').startsWith(lang.code) && <Check className="w-4 h-4" />}
                </button>
              ))}
            </motion.div>

            {/* Mobile Dropdown - Full Screen Overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className={`md:hidden fixed inset-0 z-[200] backdrop-blur-xl p-6 overflow-y-auto ${
                isRevy ? 'bg-revy-dark/95' : 'bg-white dark:bg-slate-800/95'
              }`}
            >
              <div className={`flex items-center justify-between mb-8 ${isRevy ? '' : 'dark:text-white'}`}>
                <h2 className={`text-2xl font-bold flex items-center gap-2 font-display ${isRevy ? 'text-white' : 'text-slate-800 dark:text-white'}`}>
                  <Globe className={`w-6 h-6 ${isRevy ? 'text-revy-accent' : 'text-cloudbsd-blue'}`} />
                  Select Language
                </h2>
                <button
                  onClick={() => setIsOpen(false)}
                  className={`p-2 rounded-full ${isRevy ? 'bg-white/5 text-white/60' : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'}`}
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="grid grid-cols-1 gap-3">
                {languages.map((lang) => (
                  <button
                    key={lang.code}
                    onClick={() => handleLanguageChange(lang.code)}
                    className={`flex items-center px-5 py-4 text-lg w-full rounded-2xl border transition-all ${
                      (i18n.language || '').startsWith(lang.code)
                        ? isRevy
                          ? 'bg-revy-blue/30 border-revy-accent/30 text-revy-accent font-bold'
                          : 'bg-blue-50 dark:bg-blue-900/30 border-cloudbsd-blue/30 text-cloudbsd-blue dark:text-blue-400 font-bold'
                        : isRevy
                        ? 'border-white/5 text-white/70'
                        : 'border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    <span className="mr-4 text-2xl">{lang.flag}</span>
                    <span className="flex-1 text-left">{lang.nativeName}</span>
                    {(i18n.language || '').startsWith(lang.code) && <Check className="w-6 h-6" />}
                  </button>
                ))}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
});

LanguageSelector.displayName = 'LanguageSelector';

export { LanguageSelector };
