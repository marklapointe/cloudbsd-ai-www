import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import api from '../api/client';

interface Resource {
  id: string | number;
  name: string;
  status: string;
  image?: string;
  ip?: string;
  cpu?: number | string;
  memory?: string;
}

interface ResourceModalProps {
  isOpen: boolean;
  onClose: () => void;
  resourceType: string;
  resourceName: string;
  initialData?: Resource | null;
}

const ResourceModal: React.FC<ResourceModalProps> = ({ 
  isOpen, 
  onClose, 
  resourceType, 
  resourceName,
  initialData
}) => {
  const { t } = useTranslation();
  const [name, setName] = useState('');
  const [image, setImage] = useState('');
  const [ip, setIp] = useState('');
  const [cpu, setCpu] = useState(1);
  const [memory, setMemory] = useState('1GB');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (initialData) {
      setName(initialData.name || '');
      setImage(initialData.image || '');
      setIp(initialData.ip || '');
      setCpu(typeof initialData.cpu === 'number' ? initialData.cpu : parseInt(initialData.cpu || '1'));
      setMemory(initialData.memory || '1GB');
    } else {
      setName('');
      setImage('');
      setIp('');
      setCpu(1);
      setMemory('1GB');
    }
  }, [initialData, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (initialData) {
        await api.put(`/${resourceType}/${initialData.id}`, {
          name,
          image,
          ip,
          cpu,
          memory
        });
      } else {
        await api.post(`/${resourceType}`, {
          name,
          image,
          ip,
          cpu,
          memory
        });
      }
      onClose();
    } catch (err: unknown) {
      const errorResponse = err as { response?: { data?: { message?: string } } };
      setError(errorResponse.response?.data?.message || t(`resource_modal.${initialData ? 'update_failed' : 'create_failed'}`, { resource: resourceName }));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xl">
      <div className="relative bg-white/30 dark:bg-slate-900/40 backdrop-blur-xl rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200 border border-white/30 dark:border-slate-700/40 transition-colors duration-300">
        <div className="absolute inset-0 bg-gradient-to-br from-white/20 via-transparent to-white/10 dark:from-slate-800/30 dark:via-transparent dark:to-slate-900/20 pointer-events-none" />
        
        <div className="relative px-8 py-6 border-b border-white/30 dark:border-slate-700/40 flex items-center justify-between">
          <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
            {initialData ? t('resource_modal.edit') : t('resource_modal.create_new')} {resourceName}
          </h2>
          <button
            onClick={onClose}
            className="p-2.5 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-white/60 dark:hover:bg-slate-700/60 rounded-xl transition-all backdrop-blur-xl ring-1 ring-inset ring-white/30 dark:ring-slate-700/40"
            aria-label={t('common.close')}
            title={t('common.close')}
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="relative p-6 space-y-4">
          {error && (
            <div className="p-3 bg-red-50/60 dark:bg-red-500/20 backdrop-blur-xl text-red-700 dark:text-red-300 text-sm rounded-xl border border-red-200/50 dark:border-red-500/30 font-bold ring-1 ring-inset ring-red-500/20">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">{t('resource_modal.name')}</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-white/40 dark:border-slate-700/50 bg-white/40 dark:bg-slate-800/50 backdrop-blur-xl focus:outline-none focus:ring-2 focus:ring-brand-500/60 focus:border-brand-500 transition-all font-bold text-slate-900 dark:text-slate-100 ring-1 ring-inset ring-white/30 dark:ring-slate-700/40 placeholder:text-slate-400/60 dark:placeholder:text-slate-500/60"
              placeholder={t('resource_modal.name_placeholder', { resource: resourceName.toLowerCase() })}
            />
          </div>

          {(resourceType === 'containers') && (
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">{t('resource_modal.image')}</label>
              <input
                type="text"
                required
                value={image}
                onChange={(e) => setImage(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-white/40 dark:border-slate-700/50 bg-white/40 dark:bg-slate-800/50 backdrop-blur-xl focus:outline-none focus:ring-2 focus:ring-brand-500/60 focus:border-brand-500 transition-all font-bold text-slate-900 dark:text-slate-100 ring-1 ring-inset ring-white/30 dark:ring-slate-700/40 placeholder:text-slate-400/60 dark:placeholder:text-slate-500/60"
                placeholder={t('resource_modal.image_placeholder')}
              />
            </div>
          )}

          {resourceType === 'jails' && (
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">{t('resource_modal.ip_address')}</label>
              <input
                type="text"
                value={ip}
                onChange={(e) => setIp(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-white/40 dark:border-slate-700/50 bg-white/40 dark:bg-slate-800/50 backdrop-blur-xl focus:outline-none focus:ring-2 focus:ring-brand-500/60 focus:border-brand-500 transition-all font-bold text-slate-900 dark:text-slate-100 ring-1 ring-inset ring-white/30 dark:ring-slate-700/40 placeholder:text-slate-400/60 dark:placeholder:text-slate-500/60"
                placeholder={t('resource_modal.ip_placeholder')}
              />
            </div>
          )}

          {resourceType === 'vms' && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">{t('resource_modal.vcpus')}</label>
                <input
                  type="number"
                  min="1"
                  value={cpu}
                  onChange={(e) => setCpu(parseInt(e.target.value))}
                  className="w-full px-4 py-3 rounded-xl border border-white/40 dark:border-slate-700/50 bg-white/40 dark:bg-slate-800/50 backdrop-blur-xl focus:outline-none focus:ring-2 focus:ring-brand-500/60 focus:border-brand-500 transition-all font-bold text-slate-900 dark:text-slate-100 ring-1 ring-inset ring-white/30 dark:ring-slate-700/40"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">{t('resource_modal.memory')}</label>
                <select
                  value={memory}
                  onChange={(e) => setMemory(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-white/40 dark:border-slate-700/50 bg-white/40 dark:bg-slate-800/50 backdrop-blur-xl focus:outline-none focus:ring-2 focus:ring-brand-500/60 focus:border-brand-500 transition-all font-bold cursor-pointer text-slate-900 dark:text-slate-100 ring-1 ring-inset ring-white/30 dark:ring-slate-700/40"
                >
                  <option value="512MB">512MB</option>
                  <option value="1GB">1GB</option>
                  <option value="2GB">2GB</option>
                  <option value="4GB">4GB</option>
                  <option value="8GB">8GB</option>
                </select>
              </div>
            </div>
          )}

          <div className="pt-6 flex gap-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-6 py-4 bg-white/40 dark:bg-slate-800/50 backdrop-blur-xl border border-white/40 dark:border-slate-700/50 text-slate-700 dark:text-slate-300 font-black uppercase tracking-widest text-xs rounded-2xl hover:bg-white/60 dark:hover:bg-slate-800/70 hover:border-white/60 dark:hover:border-slate-600/60 transition-all active:scale-95 shadow-sm ring-1 ring-inset ring-white/30 dark:ring-slate-700/40"
            >
              {t('common.cancel')}
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-6 py-4 bg-brand-500/80 backdrop-blur-xl text-white font-black uppercase tracking-widest text-xs rounded-2xl hover:bg-brand-500/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-brand-500/30 active:scale-95 ring-1 ring-inset ring-brand-400/40"
            >
              {loading ? (initialData ? t('resource_modal.updating') : t('resource_modal.creating')) : (initialData ? t('resource_modal.update') : t('resource_modal.create'))}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ResourceModal;
