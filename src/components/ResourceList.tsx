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
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{title}</h1>
          <p className="text-slate-500">{description}</p>
        </div>
        <button 
          onClick={() => {
            setEditingResource(null);
            setIsModalOpen(true);
          }}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            isOperator ? 'bg-blue-600 hover:bg-blue-700 text-white' : 'bg-slate-100 text-slate-400 cursor-not-allowed'
          }`}
          disabled={!isOperator}
        >
          New {resourceName}
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Name</th>
              {columns.map(col => (
                <th key={col.header} className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">{col.header}</th>
              ))}
              <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {loading ? (
              <tr>
                <td colSpan={columns.length + 2} className="px-6 py-10 text-center text-slate-500">Loading {title.toLowerCase()}...</td>
              </tr>
            ) : data.length === 0 ? (
              <tr>
                <td colSpan={columns.length + 2} className="px-6 py-10 text-center text-slate-500">No {title.toLowerCase()} found.</td>
              </tr>
            ) : data.map((item) => (
              <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                      <Icon size={18} />
                    </div>
                    <span className="font-medium text-slate-900">{item.name}</span>
                  </div>
                </td>
                {columns.map(col => (
                  <td key={col.header} className="px-6 py-4">
                    {col.render ? col.render(item[col.accessor]) : (
                      <span className="text-sm text-slate-600">{item[col.accessor]}</span>
                    )}
                  </td>
                ))}
                <td className="px-6 py-4 text-right">
                  <div className="flex justify-end gap-2">
                    <button 
                      className={`p-2 rounded-lg transition-colors ${
                        isOperator ? 'text-slate-400 hover:text-blue-600 hover:bg-blue-50' : 'text-slate-200 cursor-not-allowed'
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
                      className={`p-2 rounded-lg transition-colors ${
                        isOperator ? 'text-slate-400 hover:text-blue-600 hover:bg-blue-50' : 'text-slate-200 cursor-not-allowed'
                      }`}
                      disabled={!isOperator}
                      onClick={() => {
                        setEditingResource(item);
                        setIsModalOpen(true);
                      }}
                    >
                      <Edit size={18} />
                    </button>
                    <button 
                      className={`p-2 rounded-lg transition-colors ${
                        isOperator ? 'text-slate-400 hover:text-blue-600 hover:bg-blue-50' : 'text-slate-200 cursor-not-allowed'
                      }`}
                      title="Start"
                      disabled={!isOperator}
                      onClick={() => handleAction(item.id, 'start')}
                    >
                      <Play size={18} />
                    </button>
                    <button 
                      className={`p-2 rounded-lg transition-colors ${
                        isOperator ? 'text-slate-400 hover:text-amber-600 hover:bg-amber-50' : 'text-slate-200 cursor-not-allowed'
                      }`}
                      title="Restart"
                      disabled={!isOperator}
                      onClick={() => handleAction(item.id, 'restart')}
                    >
                      <RotateCw size={18} />
                    </button>
                    <button 
                      className={`p-2 rounded-lg transition-colors ${
                        isOperator ? 'text-slate-400 hover:text-red-600 hover:bg-red-50' : 'text-slate-200 cursor-not-allowed'
                      }`}
                      title="Stop"
                      disabled={!isOperator}
                      onClick={() => handleAction(item.id, 'stop')}
                    >
                      <Square size={18} />
                    </button>
                    <button 
                      className={`p-2 rounded-lg transition-colors ${
                        isOperator ? 'text-slate-400 hover:text-red-600 hover:bg-red-50' : 'text-slate-200 cursor-not-allowed'
                      }`}
                      title="Delete"
                      disabled={!isOperator}
                      onClick={() => handleDelete(item.id)}
                    >
                      <Trash2 size={18} />
                    </button>
                    <button className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
                      <MoreVertical size={18} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
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
