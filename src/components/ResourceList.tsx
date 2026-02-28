import React, { useEffect, useState } from 'react';
import type { LucideIcon } from 'lucide-react';
import { Play, Square, MoreVertical, RotateCw, Trash2, Edit, Terminal } from 'lucide-react';
import api from '../api/client';
import socket from '../api/socket';
import ResourceModal from './ResourceModal';
import ConsoleModal from './ConsoleModal';

interface Resource {
  id: string | number;
  name: string;
  status: string;
  image?: string;
  ip?: string;
  cpu?: number | string;
  memory?: string;
}

interface ResourceListProps {
  title: string;
  description: string;
  endpoint: string;
  icon: LucideIcon;
  resourceName: string;
  columns: {
    header: string;
    accessor: keyof Resource;
    render?: (val: any) => React.ReactNode;
  }[];
}

const ResourceList: React.FC<ResourceListProps> = ({ 
  title, 
  description, 
  endpoint, 
  icon: Icon, 
  resourceName,
  columns 
}) => {
  const [data, setData] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isConsoleOpen, setIsConsoleOpen] = useState(false);
  const [editingResource, setEditingResource] = useState<Resource | null>(null);
  const [consoleResource, setConsoleResource] = useState<Resource | null>(null);
  const role = localStorage.getItem('role') || 'viewer';
  const isOperator = role === 'admin' || role === 'operator';

  const fetchData = async () => {
    try {
      const response = await api.get(endpoint);
      setData(response.data);
    } catch (err) {
      console.error(`Failed to fetch ${resourceName}`, err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();

    socket.on('resource_update', (data: { resource: string }) => {
      if (endpoint.includes(data.resource)) {
        fetchData();
      }
    });

    return () => {
      socket.off('resource_update');
    };
  }, [endpoint, resourceName]);

  const handleAction = async (id: string | number, action: string) => {
    if (!isOperator) return;
    try {
      const resourceType = endpoint.replace(/^\//, '').replace('api/', '');
      await api.post(`/${resourceType}/${id}/${action}`);
      // fetchData() will be called via socket event
    } catch (err) {
      console.error(`Failed to ${action} ${resourceName}`, err);
      alert(`Failed to ${action} ${resourceName}. Check your permissions.`);
    }
  };

  const handleDelete = async (id: string | number) => {
    if (!isOperator) return;
    if (!confirm(`Are you sure you want to delete this ${resourceName}?`)) return;

    try {
      const resourceType = endpoint.replace(/^\//, '').replace('api/', '');
      await api.delete(`/${resourceType}/${id}`);
    } catch (err) {
      console.error(`Failed to delete ${resourceName}`, err);
      alert(`Failed to delete ${resourceName}.`);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">{title}</h1>
          <p className="text-slate-500 mt-1 font-medium">{description}</p>
        </div>
        <button 
          onClick={() => {
            setEditingResource(null);
            setIsModalOpen(true);
          }}
          className={`px-6 py-2.5 rounded-2xl font-bold transition-all duration-200 shadow-lg active:scale-95 flex items-center gap-2 ${
            isOperator 
              ? 'bg-brand-600 hover:bg-brand-700 text-white shadow-brand-500/20' 
              : 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none'
          }`}
          disabled={!isOperator}
        >
          <div className="w-5 h-5 rounded-lg bg-white/20 flex items-center justify-center font-bold text-xs">+</div>
          New {resourceName}
        </button>
      </div>

      <div className="bg-white rounded-[2rem] shadow-soft border border-slate-100 overflow-hidden transition-all duration-300 hover:shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-100">
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Name</th>
                {columns.map(col => (
                  <th key={col.header} className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">{col.header}</th>
                ))}
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? (
                <tr>
                  <td colSpan={columns.length + 2} className="px-8 py-20 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-brand-500"></div>
                      <span className="text-sm font-bold text-slate-400 uppercase tracking-widest">Loading {title.toLowerCase()}...</span>
                    </div>
                  </td>
                </tr>
              ) : data.length === 0 ? (
                <tr>
                  <td colSpan={columns.length + 2} className="px-8 py-20 text-center">
                    <div className="flex flex-col items-center gap-2 text-slate-300">
                      <Icon size={48} className="opacity-20" />
                      <span className="text-sm font-bold uppercase tracking-widest">No {title.toLowerCase()} found</span>
                    </div>
                  </td>
                </tr>
              ) : data.map((item) => (
                <tr key={item.id} className="group hover:bg-slate-50/50 transition-all duration-200">
                  <td className="px-8 py-5">
                    <div className="flex items-center gap-4">
                      <div className="p-3 bg-slate-100 text-slate-500 rounded-2xl group-hover:bg-brand-50 group-hover:text-brand-600 transition-all duration-200 group-hover:rotate-3 group-hover:scale-110">
                        <Icon size={20} />
                      </div>
                      <div>
                        <span className="font-black text-slate-900 block group-hover:text-brand-700 transition-colors">{item.name}</span>
                        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter">ID: {item.id}</span>
                      </div>
                    </div>
                  </td>
                  {columns.map(col => (
                    <td key={col.header} className="px-8 py-5">
                      {col.render ? col.render(item[col.accessor]) : (
                        <span className="text-sm font-bold text-slate-600">{item[col.accessor] || '—'}</span>
                      )}
                    </td>
                  ))}
                  <td className="px-8 py-5 text-right">
                    <div className="flex justify-end gap-1.5 opacity-60 group-hover:opacity-100 transition-opacity">
                      <button 
                        className={`p-2.5 rounded-xl transition-all duration-200 active:scale-90 ${
                          isOperator ? 'text-slate-400 hover:text-brand-600 hover:bg-brand-50 hover:shadow-sm' : 'text-slate-200 cursor-not-allowed'
                        }`}
                        title="Console"
                        disabled={!isOperator}
                        onClick={() => {
                          setConsoleResource(item);
                          setIsConsoleOpen(true);
                        }}
                      >
                        <Terminal size={18} />
                      </button>
                      <button 
                        className={`p-2.5 rounded-xl transition-all duration-200 active:scale-90 ${
                          isOperator ? 'text-slate-400 hover:text-brand-600 hover:bg-brand-50 hover:shadow-sm' : 'text-slate-200 cursor-not-allowed'
                        }`}
                        title="Edit Settings"
                        disabled={!isOperator}
                        onClick={() => {
                          setEditingResource(item);
                          setIsModalOpen(true);
                        }}
                      >
                        <Edit size={18} />
                      </button>
                      <div className="w-px h-6 bg-slate-100 mx-1 self-center" />
                      <button 
                        className={`p-2.5 rounded-xl transition-all duration-200 active:scale-90 ${
                          isOperator ? 'text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 hover:shadow-sm' : 'text-slate-200 cursor-not-allowed'
                        }`}
                        title="Start"
                        disabled={!isOperator}
                        onClick={() => handleAction(item.id, 'start')}
                      >
                        <Play size={18} />
                      </button>
                      <button 
                        className={`p-2.5 rounded-xl transition-all duration-200 active:scale-90 ${
                          isOperator ? 'text-slate-400 hover:text-amber-600 hover:bg-amber-50 hover:shadow-sm' : 'text-slate-200 cursor-not-allowed'
                        }`}
                        title="Restart"
                        disabled={!isOperator}
                        onClick={() => handleAction(item.id, 'restart')}
                      >
                        <RotateCw size={18} />
                      </button>
                      <button 
                        className={`p-2.5 rounded-xl transition-all duration-200 active:scale-90 ${
                          isOperator ? 'text-slate-400 hover:text-red-500 hover:bg-red-50 hover:shadow-sm' : 'text-slate-200 cursor-not-allowed'
                        }`}
                        title="Stop"
                        disabled={!isOperator}
                        onClick={() => handleAction(item.id, 'stop')}
                      >
                        <Square size={18} />
                      </button>
                      <div className="w-px h-6 bg-slate-100 mx-1 self-center" />
                      <button 
                        className={`p-2.5 rounded-xl transition-all duration-200 active:scale-90 ${
                          isOperator ? 'text-slate-400 hover:text-red-600 hover:bg-red-50 hover:shadow-sm' : 'text-slate-200 cursor-not-allowed'
                        }`}
                        title="Delete"
                        disabled={!isOperator}
                        onClick={() => handleDelete(item.id)}
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <ResourceModal 
        isOpen={isModalOpen} 
        onClose={() => {
          setIsModalOpen(false);
          setEditingResource(null);
        }}
        resourceType={endpoint.replace(/^\//, '').replace('api/', '')}
        resourceName={resourceName}
        initialData={editingResource}
      />

      {consoleResource && (
        <ConsoleModal
          isOpen={isConsoleOpen}
          onClose={() => {
            setIsConsoleOpen(false);
            setConsoleResource(null);
          }}
          resource={consoleResource}
          resourceType={endpoint.replace(/^\//, '').replace('api/', '')}
        />
      )}
    </div>
  );
};

export default ResourceList;
