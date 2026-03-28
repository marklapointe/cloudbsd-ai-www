import React, { useEffect, useState } from 'react';
import type { LucideIcon } from 'lucide-react';
import { 
  Play, Square, RotateCw, Trash2, Edit, Terminal, Plus, Search, 
  LayoutList, LayoutGrid, ChevronLeft, ChevronRight, ArrowUpDown,
  ArrowUp, ArrowDown, X
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import api from '../api/client';
import socket from '../api/socket';
import ResourceModal from './ResourceModal';
import ConsoleModal from './ConsoleModal';
import CustomPageSizeModal from './CustomPageSizeModal';
import ConfirmationModal from './ConfirmationModal';

interface Resource {
  id: string | number;
  name: string;
  status: string;
  image?: string;
  ip?: string;
  cpu?: number | string;
  memory?: string;
  [key: string]: any; // Allow indexing by dynamic keys for sorting
}

interface ResourceListProps {
  title: string;
  description: string;
  endpoint: string;
  icon: LucideIcon;
  resourceName: string;
  resourceType: string;
  columns: {
    header: string;
    accessor: string;
    render?: (val: any) => React.ReactNode;
    sortable?: boolean;
  }[];
}

const ResourceList: React.FC<ResourceListProps> = ({ 
  title, 
  description, 
  endpoint, 
  icon: Icon, 
  resourceName,
  resourceType,
  columns 
}) => {
  const { t } = useTranslation();
  const [data, setData] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isConsoleOpen, setIsConsoleOpen] = useState(false);
  const [isConfirmationOpen, setIsConfirmationOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | number | null>(null);
  const [editingResource, setEditingResource] = useState<Resource | null>(null);
  const [consoleResource, setConsoleResource] = useState<Resource | null>(null);
  const [isCustomPageSizeModalOpen, setIsCustomPageSizeModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [error, setError] = useState<string | null>(null);
  
  // New states for Pagination, View Mode, and Sorting
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState<number | 'all'>(10);
  const [sortField, setSortField] = useState<string>('name');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  const role = localStorage.getItem('role') || 'viewer';
  const isOperator = role === 'admin' || role === 'operator';

  const fetchData = async () => {
    try {
      const response = await api.get(endpoint);
      if (Array.isArray(response.data)) {
        setData(response.data);
      } else {
        console.error(`Unexpected data format for ${resourceName}:`, response.data);
        setData([]);
      }
    } catch (err) {
      console.error(`Failed to fetch ${resourceName}`, err);
      setError(t('resource_list.fetch_failed', { resource: resourceName }));
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
      // Refresh data after action
      await fetchData();
    } catch (err) {
      console.error(`Failed to ${action} ${resourceName}`, err);
      setError(t('resource_list.action_failed', { action, resource: resourceName }));
    }
  };

  const handleDelete = async (id: string | number) => {
    if (!isOperator) return;
    setDeletingId(id);
    setIsConfirmationOpen(true);
  };

  const confirmDelete = async () => {
    if (!deletingId) return;

    try {
      const resourceType = endpoint.replace(/^\//, '').replace('api/', '');
      await api.delete(`/${resourceType}/${deletingId}`);
      await fetchData();
    } catch (err) {
      console.error(`Failed to delete ${resourceName}`, err);
      setError(t('resource_list.action_failed', { action: 'delete', resource: resourceName }));
    } finally {
      setDeletingId(null);
    }
  };

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const filteredData = data.filter(item => 
    item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (item.image && item.image.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (item.ip && item.ip.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const sortedData = [...filteredData].sort((a, b) => {
    const valA = a[sortField];
    const valB = b[sortField];

    if (valA === valB) return 0;
    
    // Handle numeric comparisons
    const numA = parseFloat(valA);
    const numB = parseFloat(valB);
    if (!isNaN(numA) && !isNaN(numB)) {
      return sortDirection === 'asc' ? numA - numB : numB - numA;
    }

    // Default string comparison
    const strA = String(valA || '').toLowerCase();
    const strB = String(valB || '').toLowerCase();
    
    if (sortDirection === 'asc') {
      return strA < strB ? -1 : 1;
    } else {
      return strA > strB ? -1 : 1;
    }
  });

  const totalItems = sortedData.length;
  const effectivePageSize = pageSize === 'all' ? totalItems : pageSize;
  const totalPages = Math.ceil(totalItems / (effectivePageSize || 1));
  const pagedData = pageSize === 'all' 
    ? sortedData 
    : sortedData.slice((currentPage - 1) * (effectivePageSize as number), currentPage * (effectivePageSize as number));

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, pageSize, sortField, sortDirection]);

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">{title}</h1>
          <p className="text-slate-500 mt-1 font-medium">{description}</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="bg-slate-100 p-1 rounded-2xl flex items-center shadow-inner">
            <button 
              onClick={() => setViewMode('list')}
              className={`p-2 rounded-xl transition-all duration-200 ${viewMode === 'list' ? 'bg-white text-brand-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
              title={t('resource_list.view_list')}
            >
              <LayoutList size={20} />
            </button>
            <button 
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded-xl transition-all duration-200 ${viewMode === 'grid' ? 'bg-white text-brand-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
              title={t('resource_list.view_grid')}
            >
              <LayoutGrid size={20} />
            </button>
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
            aria-label={t(`common.add_${resourceType}`)}
            title={t(`common.add_${resourceType}`)}
          >
            <Plus size={20} />
            <span className="hidden sm:inline">{t(`common.add_${resourceType}`)}</span>
          </button>
        </div>

        {error && (
          <div className="mx-8 mt-4 p-4 bg-red-50 border border-red-100 rounded-2xl flex items-center justify-between animate-in fade-in slide-in-from-top-2 duration-300">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-100 rounded-xl text-red-600">
                <X size={18} />
              </div>
              <span className="text-sm font-bold text-red-700">{error}</span>
            </div>
            <button 
              onClick={() => setError(null)}
              className="p-1 text-red-400 hover:text-red-600 transition-colors"
            >
              <X size={16} />
            </button>
          </div>
        )}
      </div>

      <div className="bg-white rounded-[2rem] shadow-soft border border-slate-100 overflow-hidden transition-all duration-300 hover:shadow-xl">
        <div className="p-6 border-b border-slate-50 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text" 
              placeholder={t('resource_list.search_placeholder')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 focus:bg-white transition-all duration-200 outline-none font-bold text-slate-900"
            />
          </div>

          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-xs font-black text-slate-400 uppercase tracking-widest">{t('resource_list.items_per_page')}:</span>
              <select 
                value={pageSize}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val === 'all') setPageSize('all');
                  else if (val === 'custom') {
                    setIsCustomPageSizeModalOpen(true);
                  } else {
                    setPageSize(parseInt(val));
                  }
                }}
                className="bg-slate-50 border border-slate-100 text-slate-900 text-sm font-bold rounded-xl focus:ring-brand-500 focus:border-brand-500 p-2 outline-none"
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
                <option value="all">{t('resource_list.all')}</option>
                <option value="custom">{t('resource_list.custom')}</option>
              </select>
            </div>

            {viewMode === 'grid' && (
              <div className="flex items-center gap-2">
                <span className="text-xs font-black text-slate-400 uppercase tracking-widest">{t('resource_list.sort_by')}:</span>
                <select 
                  value={sortField}
                  onChange={(e) => setSortField(e.target.value)}
                  className="bg-slate-50 border border-slate-100 text-slate-900 text-sm font-bold rounded-xl focus:ring-brand-500 focus:border-brand-500 p-2 outline-none"
                >
                  <option value="name">{t('common.name')}</option>
                  {columns.map(col => (
                    <option key={col.accessor} value={col.accessor}>{col.header}</option>
                  ))}
                </select>
                <button 
                  onClick={() => setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')}
                  className="p-2 bg-slate-50 border border-slate-100 rounded-xl text-slate-600 hover:text-brand-600 transition-colors"
                >
                  {sortDirection === 'asc' ? <ArrowUp size={16} /> : <ArrowDown size={16} />}
                </button>
              </div>
            )}
          </div>
        </div>

        {viewMode === 'list' ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/50 border-b border-slate-100">
                  <th 
                    className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest cursor-pointer hover:text-brand-600 transition-colors group"
                    onClick={() => handleSort('name')}
                  >
                    <div className="flex items-center gap-1">
                      {t('common.name')}
                      {sortField === 'name' ? (
                        sortDirection === 'asc' ? <ArrowUp size={12} className="text-brand-500" /> : <ArrowDown size={12} className="text-brand-500" />
                      ) : <ArrowUpDown size={12} className="opacity-0 group-hover:opacity-100 transition-opacity" />}
                    </div>
                  </th>
                  {columns.map(col => (
                    <th 
                      key={col.accessor} 
                      className={`px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest transition-colors ${col.sortable !== false ? 'cursor-pointer hover:text-brand-600 group' : ''}`}
                      onClick={() => col.sortable !== false && handleSort(col.accessor)}
                    >
                      <div className="flex items-center gap-1">
                        {col.header}
                        {col.sortable !== false && (
                          sortField === col.accessor ? (
                            sortDirection === 'asc' ? <ArrowUp size={12} className="text-brand-500" /> : <ArrowDown size={12} className="text-brand-500" />
                          ) : <ArrowUpDown size={12} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                        )}
                      </div>
                    </th>
                  ))}
                  <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">{t('resource_list.actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {loading ? (
                  <tr>
                    <td colSpan={columns.length + 2} className="px-8 py-20 text-center">
                      <div className="flex flex-col items-center gap-3">
                        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-brand-500"></div>
                        <span className="text-sm font-bold text-slate-400 uppercase tracking-widest">{t('resource_list.loading', { title })}</span>
                      </div>
                    </td>
                  </tr>
                ) : pagedData.length === 0 ? (
                  <tr>
                    <td colSpan={columns.length + 2} className="px-8 py-20 text-center">
                      <div className="flex flex-col items-center gap-2 text-slate-300">
                        <Icon size={48} className="opacity-20" />
                        <span className="text-sm font-bold uppercase tracking-widest">{t('resource_list.no_resources', { title })}</span>
                      </div>
                    </td>
                  </tr>
                ) : pagedData.map((item) => (
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
                      <td key={col.accessor} className="px-8 py-5">
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
                          title={t('resource_list.console')}
                          aria-label={t('resource_list.console')}
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
                          title={t('resource_list.edit')}
                          aria-label={t('resource_list.edit')}
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
                          title={t('resource_list.start')}
                          aria-label={t('resource_list.start')}
                          disabled={!isOperator}
                          onClick={() => handleAction(item.id, 'start')}
                        >
                          <Play size={18} />
                        </button>
                        <button 
                          className={`p-2.5 rounded-xl transition-all duration-200 active:scale-90 ${
                            isOperator ? 'text-slate-400 hover:text-amber-600 hover:bg-amber-50 hover:shadow-sm' : 'text-slate-200 cursor-not-allowed'
                          }`}
                          title={t('resource_list.restart')}
                          aria-label={t('resource_list.restart')}
                          disabled={!isOperator}
                          onClick={() => handleAction(item.id, 'restart')}
                        >
                          <RotateCw size={18} />
                        </button>
                        <button 
                          className={`p-2.5 rounded-xl transition-all duration-200 active:scale-90 ${
                            isOperator ? 'text-slate-400 hover:text-red-500 hover:bg-red-50 hover:shadow-sm' : 'text-slate-200 cursor-not-allowed'
                          }`}
                          title={t('resource_list.stop')}
                          aria-label={t('resource_list.stop')}
                          disabled={!isOperator}
                          onClick={() => handleAction(item.id, 'stop')}
                        >
                          <Square size={18} />
                        </button>
                        <button 
                          className={`p-2.5 rounded-xl transition-all duration-200 active:scale-90 ${
                            isOperator ? 'text-slate-400 hover:text-red-600 hover:bg-red-50 hover:shadow-sm' : 'text-slate-200 cursor-not-allowed'
                          }`}
                          title={t('resource_list.delete')}
                          aria-label={t('resource_list.delete')}
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
        ) : (
          <div className="p-8">
            {loading ? (
              <div className="flex flex-col items-center py-20 gap-3">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-brand-500"></div>
                <span className="text-sm font-bold text-slate-400 uppercase tracking-widest">{t('resource_list.loading', { title })}</span>
              </div>
            ) : pagedData.length === 0 ? (
              <div className="flex flex-col items-center py-20 gap-2 text-slate-300">
                <Icon size={48} className="opacity-20" />
                <span className="text-sm font-bold uppercase tracking-widest">{t('resource_list.no_resources', { title })}</span>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {pagedData.map((item) => (
                  <div key={item.id} className="group bg-slate-50 border border-slate-100 rounded-3xl p-6 transition-all duration-300 hover:bg-white hover:shadow-xl hover:scale-[1.02] border-b-4 hover:border-b-brand-500">
                    <div className="flex justify-between items-start mb-6">
                      <div className="p-4 bg-white text-slate-500 rounded-2xl shadow-sm group-hover:text-brand-600 transition-colors group-hover:rotate-3">
                        <Icon size={24} />
                      </div>
                      <div className="flex gap-1">
                        <button 
                          className={`p-2 rounded-xl transition-all duration-200 ${isOperator ? 'bg-white text-slate-400 hover:text-brand-600 shadow-sm' : 'text-slate-200 cursor-not-allowed'}`}
                          disabled={!isOperator}
                          onClick={() => {
                            setEditingResource(item);
                            setIsModalOpen(true);
                          }}
                        >
                          <Edit size={16} />
                        </button>
                        <button 
                          className={`p-2 rounded-xl transition-all duration-200 ${isOperator ? 'bg-white text-slate-400 hover:text-red-600 shadow-sm' : 'text-slate-200 cursor-not-allowed'}`}
                          disabled={!isOperator}
                          onClick={() => handleDelete(item.id)}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                    
                    <div className="mb-6">
                      <h3 className="text-xl font-black text-slate-900 mb-1 group-hover:text-brand-700 transition-colors">{item.name}</h3>
                      <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">ID: {item.id}</p>
                    </div>

                    <div className="space-y-3 mb-8">
                      {columns.map(col => (
                        <div key={col.accessor} className="flex justify-between items-center border-b border-slate-100/50 pb-2">
                          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{col.header}</span>
                          <div className="font-bold text-slate-700">
                            {col.render ? col.render(item[col.accessor]) : item[col.accessor] || '—'}
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="flex gap-2">
                      <button 
                        onClick={() => handleAction(item.id, 'start')}
                        className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${isOperator ? 'bg-emerald-50 text-emerald-600 hover:bg-emerald-600 hover:text-white' : 'bg-slate-100 text-slate-300 cursor-not-allowed'}`}
                        disabled={!isOperator}
                      >
                        {t('resource_list.start')}
                      </button>
                      <button 
                        onClick={() => handleAction(item.id, 'stop')}
                        className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${isOperator ? 'bg-red-50 text-red-600 hover:bg-red-600 hover:text-white' : 'bg-slate-100 text-slate-300 cursor-not-allowed'}`}
                        disabled={!isOperator}
                      >
                        {t('resource_list.stop')}
                      </button>
                      <button 
                        onClick={() => {
                          setConsoleResource(item);
                          setIsConsoleOpen(true);
                        }}
                        className={`p-2 rounded-xl transition-all ${isOperator ? 'bg-brand-50 text-brand-600 hover:bg-brand-600 hover:text-white' : 'bg-slate-100 text-slate-300 cursor-not-allowed'}`}
                        disabled={!isOperator}
                      >
                        <Terminal size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Pagination Controls */}
        {pageSize !== 'all' && totalPages > 1 && (
          <div className="p-6 bg-slate-50/50 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4">
            <span className="text-xs font-black text-slate-400 uppercase tracking-widest">
              {t('resource_list.page_of', { current: currentPage, total: totalPages })}
              <span className="ml-2">({totalItems} {t('common.actions').toLowerCase() === 'actions' ? t('common.items') || 'items' : t('common.items')})</span>
            </span>
            <div className="flex items-center gap-2">
              <button 
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="p-2.5 rounded-xl bg-white border border-slate-100 text-slate-600 hover:text-brand-600 hover:shadow-sm transition-all disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <ChevronLeft size={20} />
              </button>
              
              <div className="flex items-center gap-1">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum;
                  if (totalPages <= 5) pageNum = i + 1;
                  else if (currentPage <= 3) pageNum = i + 1;
                  else if (currentPage >= totalPages - 2) pageNum = totalPages - 4 + i;
                  else pageNum = currentPage - 2 + i;

                  return (
                    <button
                      key={pageNum}
                      onClick={() => setCurrentPage(pageNum)}
                      className={`w-10 h-10 rounded-xl font-bold text-sm transition-all ${currentPage === pageNum ? 'bg-brand-600 text-white shadow-lg shadow-brand-500/20' : 'bg-white border border-slate-100 text-slate-600 hover:bg-slate-50'}`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
              </div>

              <button 
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
                className="p-2.5 rounded-xl bg-white border border-slate-100 text-slate-600 hover:text-brand-600 hover:shadow-sm transition-all disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <ChevronRight size={20} />
              </button>
            </div>
          </div>
        )}
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

      <CustomPageSizeModal
        isOpen={isCustomPageSizeModalOpen}
        onClose={() => setIsCustomPageSizeModalOpen(false)}
        onConfirm={(size) => setPageSize(size)}
        initialValue={pageSize}
      />

      <ConfirmationModal
        isOpen={isConfirmationOpen}
        onClose={() => {
          setIsConfirmationOpen(false);
          setDeletingId(null);
        }}
        onConfirm={confirmDelete}
        title={t('common.delete')}
        message={t('resource_list.delete_confirm', { resource: resourceName })}
        variant="danger"
      />
    </div>
  );
};

export default ResourceList;
