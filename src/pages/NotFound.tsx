import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Home, Compass } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const NotFound: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
    <div
      role="status"
      className="min-h-screen flex items-center justify-center p-6 bg-slate-50 dark:bg-slate-950 transition-colors duration-300"
    >
      <div className="max-w-md w-full text-center">
        <div className="mb-6 flex items-center justify-center">
          <img
            src="/logo-head-only-zoom-2.png"
            alt="CloudBSD"
            className="w-24 h-24 object-contain opacity-60"
          />
        </div>
        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-brand-600 dark:text-brand-400 mb-3">
          {t('notFound.eyebrow')}
        </p>
        <h1 className="text-7xl font-black text-slate-900 dark:text-slate-100 tracking-tight mb-2">
          404
        </h1>
        <p className="text-lg font-bold text-slate-700 dark:text-slate-300 mb-3">
          {t('notFound.title')}
        </p>
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-8">
          {t('notFound.description')}
        </p>
        <div className="flex items-center justify-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-2 px-5 py-3 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 font-bold rounded-2xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all active:scale-95"
          >
            <Compass size={16} />
            {t('notFound.go_back')}
          </button>
          <Link
            to="/"
            className="inline-flex items-center gap-2 px-5 py-3 bg-brand-500 hover:bg-brand-600 text-white font-bold rounded-2xl transition-all active:scale-95 shadow-lg shadow-brand-500/20"
          >
            <Home size={16} />
            {t('notFound.home')}
          </Link>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
