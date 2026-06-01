import React from 'react';
import { Play, Square, Settings as SettingsIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

export interface ResourceItem {
  id: number;
  name: string;
  type: string;
  status: string;
  node_id?: number | null;
}

export interface ContextMenuState {
  x: number;
  y: number;
  resource: ResourceItem;
}

interface ContextMenuProps {
  contextMenu: ContextMenuState | null;
  onAction: (action: string) => Promise<void>;
  onClose: () => void;
}

export const ContextMenu: React.FC<ContextMenuProps> = ({
  contextMenu,
  onAction,
  onClose,
}) => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  if (!contextMenu) return null;

  return (
    <div
      className="fixed z-[100] bg-white rounded-2xl shadow-2xl border border-slate-100 p-2 min-w-[160px] animate-in fade-in zoom-in duration-200"
      style={{ left: contextMenu.x, top: contextMenu.y }}
    >
      <div className="px-3 py-2 border-b border-slate-50 mb-1">
        <div className="text-[10px] font-bold uppercase text-slate-400 tracking-widest">
          {t(`${contextMenu.resource.type}.resource_name`)}
        </div>
        <div className="font-bold text-slate-900">{contextMenu.resource.name}</div>
      </div>

      <button
        onClick={() => onAction('start')}
        className="w-full flex items-center gap-3 px-3 py-2 bg-transparent hover:bg-emerald-50 border-none text-slate-700 hover:text-emerald-600 rounded-xl transition-colors text-sm font-semibold text-left shadow-none"
      >
        <Play size={16} />
        <span>{t('resource_list.start')}</span>
      </button>

      <button
        onClick={() => onAction('stop')}
        className="w-full flex items-center gap-3 px-3 py-2 bg-transparent hover:bg-red-50 border-none text-slate-700 hover:text-red-600 rounded-xl transition-colors text-sm font-semibold text-left shadow-none"
      >
        <Square size={16} />
        <span>{t('resource_list.stop')}</span>
      </button>

      <button
        onClick={() => {
          navigate(`/${contextMenu.resource.type}`);
          onClose();
        }}
        className="w-full flex items-center gap-3 px-3 py-2 bg-transparent hover:bg-slate-50 border-none text-slate-700 hover:text-brand-600 rounded-xl transition-colors text-sm font-semibold text-left border-t border-slate-50 mt-1 pt-2 shadow-none"
      >
        <SettingsIcon size={16} />
        <span>{t('common.settings')}</span>
      </button>
    </div>
  );
};

export default ContextMenu;
