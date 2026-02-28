import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
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
    } catch (err: any) {
      setError(err.response?.data?.message || `Failed to ${initialData ? 'update' : 'create'} ${resourceName}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <h2 className="text-lg font-bold text-slate-900">
            {initialData ? 'Edit' : 'Create New'} {resourceName}
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 text-red-700 text-sm rounded-lg border border-red-100">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Name</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
              placeholder={`e.g. my-${resourceName.toLowerCase()}`}
            />
          </div>

          {(resourceType === 'containers') && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Image</label>
              <input
                type="text"
                required
                value={image}
                onChange={(e) => setImage(e.target.value)}
                className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                placeholder="e.g. nginx:latest"
              />
            </div>
          )}

          {resourceType === 'jails' && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">IP Address</label>
              <input
                type="text"
                value={ip}
                onChange={(e) => setIp(e.target.value)}
                className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                placeholder="e.g. 192.168.1.100"
              />
            </div>
          )}

          {resourceType === 'vms' && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">vCPUs</label>
                <input
                  type="number"
                  min="1"
                  value={cpu}
                  onChange={(e) => setCpu(parseInt(e.target.value))}
                  className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Memory</label>
                <select
                  value={memory}
                  onChange={(e) => setMemory(e.target.value)}
                  className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
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

          <div className="pt-4 flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-slate-200 text-slate-700 font-medium rounded-lg hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? (initialData ? 'Updating...' : 'Creating...') : (initialData ? 'Update' : 'Create')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ResourceModal;
