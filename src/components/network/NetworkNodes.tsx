import React from 'react';
import { Handle, Position } from '@xyflow/react';
import { Server, ChevronRight, ChevronDown, MoreVertical } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export interface HostNodeData {
  label: string;
  isExpanded: boolean;
  onToggleExpand: () => void;
  t: (key: string) => string;
}

export interface ResourceNodeData {
  label: string;
  status: string;
  type: string;
  icon: LucideIcon;
  resource: {
    id: number;
    name: string;
    type: string;
    status: string;
    node_id?: number | null;
  };
  onContextMenu: (event: React.MouseEvent, resource: ResourceNodeData['resource']) => void;
  t: (key: string) => string;
}

const HostNode: React.FC<{ data: HostNodeData }> = ({ data }) => {
  return (
    <div
      className={`px-4 py-3 rounded-2xl border-2 shadow-xl min-w-[200px] transition-all duration-300 ${
        data.isExpanded
          ? 'bg-slate-900 border-brand-500 text-white'
          : 'bg-white border-slate-200 text-slate-900'
      }`}
    >
      <Handle
        type="target"
        position={Position.Top}
        className="w-3 h-3 bg-brand-500 border-2 border-white"
      />
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div
            className={`p-2 rounded-xl ${
              data.isExpanded ? 'bg-brand-500/20 text-brand-400' : 'bg-slate-100 text-slate-600'
            }`}
          >
            <Server size={20} />
          </div>
          <div>
            <div className="text-xs font-bold uppercase tracking-widest opacity-60">
              {data.t('common.host_system')}
            </div>
            <div className="font-black text-sm">{data.label}</div>
          </div>
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            data.onToggleExpand();
          }}
          className={`p-1 rounded-lg transition-colors flex items-center justify-center min-w-0 min-h-0 border-none bg-transparent shadow-none ${
            data.isExpanded ? 'hover:bg-white/10 text-white' : 'hover:bg-slate-100 text-slate-600'
          }`}
        >
          {data.isExpanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
        </button>
      </div>
      <Handle
        type="source"
        position={Position.Bottom}
        className="w-3 h-3 bg-brand-500 border-2 border-white"
      />
    </div>
  );
};

const ResourceNode: React.FC<{ data: ResourceNodeData }> = ({ data }) => {
  const Icon = data.icon;
  const statusColors: Record<string, string> = {
    running: 'bg-emerald-500',
    up: 'bg-emerald-500',
    active: 'bg-emerald-500',
    stopped: 'bg-slate-400',
    exited: 'bg-red-500',
    error: 'bg-red-500',
  };

  const statusColor = statusColors[data.status] || 'bg-slate-400';

  return (
    <div
      className="px-4 py-3 rounded-2xl bg-white border border-slate-200 shadow-lg min-w-[180px] hover:border-brand-500 transition-all group"
      onContextMenu={(e) => data.onContextMenu(e, data.resource)}
    >
      <Handle type="target" position={Position.Top} className="w-2 h-2 bg-slate-300" />
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-xl bg-slate-50 text-slate-600 group-hover:text-brand-500 transition-colors">
          <Icon size={18} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <div className={`w-1.5 h-1.5 rounded-full ${statusColor}`} />
            <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
              {data.t(`${data.type}.resource_name`)}
            </div>
          </div>
          <div className="font-bold text-sm truncate text-slate-900">{data.label}</div>
        </div>
        <div className="text-slate-300 group-hover:text-slate-400 p-1 flex items-center justify-center">
          <MoreVertical size={14} />
        </div>
      </div>
    </div>
  );
};

export const nodeTypes = {
  host: HostNode as any,
  resource: ResourceNode as any,
};

export { HostNode, ResourceNode };
export default nodeTypes;
