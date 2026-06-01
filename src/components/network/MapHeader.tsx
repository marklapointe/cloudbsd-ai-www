import React from 'react';
import { Search } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface MapHeaderProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
}

export const MapHeader: React.FC<MapHeaderProps> = ({
  searchTerm,
  onSearchChange,
}) => {
  const { t } = useTranslation();

  return (
    <div className="absolute top-6 left-6 right-6 z-50 pointer-events-none flex flex-col md:flex-row md:items-center justify-between gap-4">
      <div className="pointer-events-auto bg-white/90 backdrop-blur-md p-4 rounded-2xl border border-slate-100 shadow-xl">
        <h1 className="text-xl font-extrabold text-slate-900 tracking-tight leading-tight">
          {t('network.title')}
        </h1>
        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">
          {t('network.visual_overview')}
        </p>
      </div>

      <div className="relative pointer-events-auto">
        <Search
          className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
          size={18}
        />
        <input
          type="text"
          placeholder={t('network.search_nodes')}
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-12 pr-6 py-2.5 bg-white border border-slate-100 rounded-2xl shadow-xl focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 outline-none w-full md:w-64 transition-all text-slate-900 font-bold"
        />
      </div>
    </div>
  );
};

export default MapHeader;
