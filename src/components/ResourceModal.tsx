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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
      <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200 border border-slate-200/50 dark:border-slate-800 transition-colors duration-300">
        <div className="px-8 py-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/50">
          <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
            {initialData ? t('resource_modal.edit') : t('resource_modal.create_new')} {resourceName}
          </h2>
          <button 
            onClick={onClose} 
            className="text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
            aria-label={t('common.close')}
            title={t('common.close')}
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-500/10 text-red-700 dark:text-red-400 text-sm rounded-lg border border-red-100 dark:border-red-500/20 font-bold">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{t('resource_modal.name')}</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all font-bold text-slate-900 dark:text-slate-100"
              placeholder={t('resource_modal.name_placeholder', { resource: resourceName.toLowerCase() })}
            />
          </div>

          {(resourceType === 'containers') && (
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{t('resource_modal.image')}</label>
              <input
                type="text"
                required
                value={image}
                onChange={(e) => setImage(e.target.value)}
                className="w-full px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all font-bold text-slate-900 dark:text-slate-100"
                placeholder={t('resource_modal.image_placeholder')}
              />
            </div>
          )}

          {resourceType === 'jails' && (
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{t('resource_modal.ip_address')}</label>
              <input
                type="text"
                value={ip}
                onChange={(e) => setIp(e.target.value)}
                className="w-full px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all font-bold text-slate-900 dark:text-slate-100"
                placeholder={t('resource_modal.ip_placeholder')}
              />
            </div>
          )}

          {resourceType === 'vms' && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{t('resource_modal.vcpus')}</label>
                <input
                  type="number"
                  min="1"
                  value={cpu}
                  onChange={(e) => setCpu(parseInt(e.target.value))}
                  className="w-full px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all font-bold text-slate-900 dark:text-slate-100"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{t('resource_modal.memory')}</label>
                <select
                  value={memory}
                  onChange={(e) => setMemory(e.target.value)}
                  className="w-full px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all font-bold cursor-pointer text-slate-900 dark:text-slate-100"
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
              className="flex-1 px-6 py-3 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-bold rounded-2xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-all active:scale-95"
            >
              {t('common.cancel')}
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-6 py-3 bg-brand-600 text-white font-black rounded-2xl hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-brand-500/20 active:scale-95"
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
