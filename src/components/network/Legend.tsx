import React from 'react';
import { useTranslation } from 'react-i18next';

export const Legend: React.FC = () => {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2 px-2 py-1">
        <div className="w-3 h-3 rounded-full bg-emerald-500" />
        <span className="text-[10px] font-bold uppercase text-slate-500">
          {t('network.running')}
        </span>
      </div>
      <div className="flex items-center gap-2 px-2 py-1">
        <div className="w-3 h-3 rounded-full bg-slate-400" />
        <span className="text-[10px] font-bold uppercase text-slate-500">
          {t('network.stopped')}
        </span>
      </div>
    </div>
  );
};

export default Legend;
