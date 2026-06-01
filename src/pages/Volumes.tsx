import React, { useEffect, useState } from 'react';
import {
  HardDrive, Plus, Trash2, Edit2, ChevronDown, ChevronRight,
  X, Server, Activity, Database, Cpu, MemoryStick,
  Circle
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../api/client';
import ConfirmationModal from '../components/ConfirmationModal';
import { TreeItem } from '../components/ui/TreeItem';
import { DiskDetails } from '../components/disks/DiskDetails';
import { VolumeDetails } from '../components/volumes/VolumeDetails';
import { StorageEmptyState } from '../components/storage/StorageEmptyState';

interface NodeData {
  id: number;
  name: string;
  role: string;
  status: string;
  ip: string;
  cpu?: number | string;
  memory?: string;
}

interface VolumeData {
  id: number;
  disk_id: number;
  name: string;
  volume_type: string;
  mount_point: string;
  size: string;
  used: string;
  available: string;
  compression: string | null;
  deduplication: string | null;
  status: string;
}

interface DiskData {
  id: number;
  node_id: number;
  name: string;
  device_path: string;
  disk_type: string;
  pci_path: string | null;
  wwn: string | null;
  serial: string | null;
  model: string | null;
  vendor: string | null;
  size: string;
  sector_size: string | null;
  status: string;
  volumes?: VolumeData[];
}

type SelectionType = 'node' | 'disk' | 'volume' | null;
interface Selection {
  type: SelectionType;
  nodeId?: number;
  diskId?: number;
  volumeId?: number;
}

const Volumes: React.FC = () => {
  const { t } = useTranslation();
  const [nodes, setNodes] = useState<NodeData[]>([]);
  const [disks, setDisks] = useState<DiskData[]>([]);
  const [allVolumes, setAllVolumes] = useState<VolumeData[]>([]);
  const [loading, setLoading] = useState(true);
  const [nodesLoading, setNodesLoading] = useState(true);
  const [error, setError] = useState('');

  const [expandedNodes, setExpandedNodes] = useState<Set<number>>(new Set());
  const [expandedDisks, setExpandedDisks] = useState<Set<number>>(new Set());
  const [selection, setSelection] = useState<Selection>({ type: null });
  const [isDiskModalOpen, setIsDiskModalOpen] = useState(false);
  const [isVolumeModalOpen, setIsVolumeModalOpen] = useState(false);
  const [editingDisk, setEditingDisk] = useState<DiskData | null>(null);
  const [editingVolume, setEditingVolume] = useState<VolumeData | null>(null);
  const [selectedDiskForVolume, setSelectedDiskForVolume] = useState<DiskData | null>(null);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [deletingDisk, setDeletingDisk] = useState<DiskData | null>(null);
  const [deletingVolume, setDeletingVolume] = useState<VolumeData | null>(null);
  const [formError, setFormError] = useState('');
  const [diskForm, setDiskForm] = useState({
    name: '',
    device_path: '',
    disk_type: 'NVME',
    pci_path: '',
    wwn: '',
    serial: '',
    model: '',
    vendor: '',
    size: '',
    sector_size: '',
    status: 'online'
  });

  const [volumeForm, setVolumeForm] = useState({
    name: '',
    volume_type: 'ZFS',
    mount_point: '',
    size: '',
    used: '',
    available: '',
    compression: 'on',
    deduplication: 'off',
    status: 'online'
  });

  const fetchNodes = async () => {
    try {
      setNodesLoading(true);
      const response = await api.get('/nodes');
      if (Array.isArray(response.data)) {
        const agentNodes = response.data.filter((node: NodeData) => node.role === 'agent');
        setNodes(agentNodes);
      }
    } catch (err) {
      console.error('Failed to fetch nodes:', err);
    } finally {
      setNodesLoading(false);
    }
  };

  const fetchAllDisksAndVolumes = async () => {
    try {
      setLoading(true);
      const diskResponse = await api.get('/disks');
      if (Array.isArray(diskResponse.data)) {
        const disksWithVolumes = diskResponse.data as DiskData[];
        setDisks(disksWithVolumes);
        const volumes: VolumeData[] = [];
        disksWithVolumes.forEach(disk => {
          if (disk.volumes) {
            volumes.push(...disk.volumes);
          }
        });
        setAllVolumes(volumes);
      } else {
        setDisks([]);
        setAllVolumes([]);
      }
    } catch (err: unknown) {
      const errorResponse = err as { response?: { data?: { message?: string } } };
      setError(errorResponse.response?.data?.message || t('volumes.fetch_failed'));
      setDisks([]);
      setAllVolumes([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNodes();
    fetchAllDisksAndVolumes();
  }, []);

  const toggleNodeExpand = (nodeId: number) => {
    const newExpanded = new Set(expandedNodes);
    if (newExpanded.has(nodeId)) {
      newExpanded.delete(nodeId);
    } else {
      newExpanded.add(nodeId);
    }
    setExpandedNodes(newExpanded);
  };

  const toggleDiskExpand = (diskId: number) => {
    const newExpanded = new Set(expandedDisks);
    if (newExpanded.has(diskId)) {
      newExpanded.delete(diskId);
    } else {
      newExpanded.add(diskId);
    }
    setExpandedDisks(newExpanded);
  };

  const getDisksForNode = (nodeId: number) => disks.filter(d => d.node_id === nodeId);
  const getVolumesForDisk = (diskId: number) => disks.find(d => d.id === diskId)?.volumes || [];

  const handleSelect = (type: SelectionType, data: { nodeId?: number; diskId?: number; volumeId?: number }) => {
    setSelection({
      type,
      nodeId: data.nodeId,
      diskId: data.diskId,
      volumeId: data.volumeId
    });
  };

  const getSelectedNode = () => nodes.find(n => n.id === selection.nodeId);
  const getSelectedDisk = () => disks.find(d => d.id === selection.diskId);
  const getSelectedVolume = () => allVolumes.find(v => v.id === selection.volumeId);

  const getDiskTypeColor = (type: string): string => {
    switch (type.toUpperCase()) {
      case 'NVME':
        return 'bg-purple-100 text-purple-700 dark:bg-purple-500/20 dark:text-purple-400';
      case 'SCSI':
        return 'bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400';
      case 'SATA':
        return 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400';
      default:
        return 'bg-slate-100 text-slate-700 dark:bg-slate-500/20 dark:text-slate-400';
    }
  };

  const getVolumeTypeColor = (type: string): string => {
    switch (type.toUpperCase()) {
      case 'ZFS':
        return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400';
      case 'UFS':
        return 'bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400';
      case 'GEOM':
        return 'bg-purple-100 text-purple-700 dark:bg-purple-500/20 dark:text-purple-400';
      default:
        return 'bg-slate-100 text-slate-700 dark:bg-slate-500/20 dark:text-slate-400';
    }
  };

  const getStatusColor = (status: string): string => {
    switch (status.toLowerCase()) {
      case 'online':
      case 'active':
      case 'running':
        return 'bg-emerald-500';
      case 'offline':
      case 'inactive':
      case 'stopped':
        return 'bg-red-500';
      case 'maintenance':
        return 'bg-amber-500';
      default:
        return 'bg-slate-500';
    }
  };

  const getUsagePercent = (used: string, available: string): number => {
    const usedNum = parseFloat(used.replace(/[^0-9.]/g, '')) || 0;
    const availNum = parseFloat(available.replace(/[^0-9.]/g, '')) || 0;
    const total = usedNum + availNum;
    if (total === 0) return 0;
    return Math.round((usedNum / total) * 100);
  };

  const getNodeDiskCount = (nodeId: number) => getDisksForNode(nodeId).length;
  const getNodeVolumeCount = (nodeId: number) => {
    return getDisksForNode(nodeId).reduce((acc, disk) => acc + (disk.volumes?.length || 0), 0);
  };

  const openDiskModal = (disk?: DiskData) => {
    setFormError('');
    if (disk) {
      setEditingDisk(disk);
      setDiskForm({
        name: disk.name || '',
        device_path: disk.device_path || '',
        disk_type: disk.disk_type || 'NVME',
        pci_path: disk.pci_path || '',
        wwn: disk.wwn || '',
        serial: disk.serial || '',
        model: disk.model || '',
        vendor: disk.vendor || '',
        size: disk.size || '',
        sector_size: disk.sector_size || '',
        status: disk.status || 'online'
      });
    } else {
      setEditingDisk(null);
      setDiskForm({
        name: '',
        device_path: '',
        disk_type: 'NVME',
        pci_path: '',
        wwn: '',
        serial: '',
        model: '',
        vendor: '',
        size: '',
        sector_size: '',
        status: 'online'
      });
    }
    setIsDiskModalOpen(true);
  };

  const openVolumeModal = (disk: DiskData, volume?: VolumeData) => {
    setFormError('');
    setSelectedDiskForVolume(disk);
    if (volume) {
      setEditingVolume(volume);
      setVolumeForm({
        name: volume.name || '',
        volume_type: volume.volume_type || 'ZFS',
        mount_point: volume.mount_point || '',
        size: volume.size || '',
        used: volume.used || '',
        available: volume.available || '',
        compression: volume.compression === 'on' || volume.compression === '1' ? 'on' : 'off',
        deduplication: volume.deduplication === 'on' || volume.deduplication === '1' ? 'on' : 'off',
        status: volume.status || 'online'
      });
    } else {
      setEditingVolume(null);
      setVolumeForm({
        name: '',
        volume_type: 'ZFS',
        mount_point: '',
        size: '',
        used: '',
        available: '',
        compression: 'on',
        deduplication: 'off',
        status: 'online'
      });
    }
    setIsVolumeModalOpen(true);
  };

  const handleDiskSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    try {
      if (editingDisk) {
        await api.put(`/disks/${editingDisk.id}`, diskForm);
      } else if (selection.nodeId) {
        await api.post('/disks', { ...diskForm, node_id: selection.nodeId });
      }
      setIsDiskModalOpen(false);
      fetchAllDisksAndVolumes();
    } catch (err: unknown) {
      const errorResponse = err as { response?: { data?: { message?: string } } };
      setFormError(errorResponse.response?.data?.message || t('volumes.operation_failed'));
    }
  };

  const handleVolumeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    try {
      if (editingVolume) {
        await api.put(`/volumes/${editingVolume.id}`, volumeForm);
      } else if (selectedDiskForVolume) {
        await api.post('/volumes', { ...volumeForm, disk_id: selectedDiskForVolume.id });
      }
      setIsVolumeModalOpen(false);
      fetchAllDisksAndVolumes();
    } catch (err: unknown) {
      const errorResponse = err as { response?: { data?: { message?: string } } };
      setFormError(errorResponse.response?.data?.message || t('volumes.operation_failed'));
    }
  };

  const handleDeleteDisk = (disk: DiskData) => {
    setDeletingDisk(disk);
    setIsDeleteConfirmOpen(true);
  };

  const confirmDeleteDisk = async () => {
    if (!deletingDisk) return;
    try {
      await api.delete(`/disks/${deletingDisk.id}`);
      fetchAllDisksAndVolumes();
      if (selection.diskId === deletingDisk.id) {
        setSelection({ type: null });
      }
    } catch (err: unknown) {
      const errorResponse = err as { response?: { data?: { message?: string } } };
      setError(errorResponse.response?.data?.message || t('volumes.delete_failed'));
    } finally {
      setDeletingDisk(null);
    }
  };

  const handleDeleteVolume = (volume: VolumeData) => {
    setDeletingVolume(volume);
    setIsDeleteConfirmOpen(true);
  };

  const confirmDeleteVolume = async () => {
    if (!deletingVolume) return;
    try {
      await api.delete(`/volumes/${deletingVolume.id}`);
      fetchAllDisksAndVolumes();
      if (selection.volumeId === deletingVolume.id) {
        setSelection({ type: null });
      }
    } catch (err: unknown) {
      const errorResponse = err as { response?: { data?: { message?: string } } };
      setError(errorResponse.response?.data?.message || t('volumes.delete_failed'));
    } finally {
      setDeletingVolume(null);
    }
  };

  const NodeDetails = ({ node }: { node: NodeData }) => (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <div className="p-4 bg-brand-500/10 rounded-2xl">
          <Server size={32} className="text-brand-500" />
        </div>
        <div>
          <h2 className="text-2xl font-black text-slate-900 dark:text-slate-100">{node.name}</h2>
          <div className="flex items-center gap-2 mt-1">
            <span className={`w-2 h-2 rounded-full ${getStatusColor(node.status)}`} />
            <span className="text-sm font-bold text-slate-500">{node.status}</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-4">
          <div className="flex items-center gap-2 text-slate-400 mb-2">
            <Activity size={14} />
            <span className="text-[10px] font-black uppercase tracking-widest">IP Address</span>
          </div>
          <span className="font-bold text-slate-900 dark:text-slate-100">{node.ip || '—'}</span>
        </div>
        <div className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-4">
          <div className="flex items-center gap-2 text-slate-400 mb-2">
            <Circle size={14} />
            <span className="text-[10px] font-black uppercase tracking-widest">Role</span>
          </div>
          <span className="font-bold text-slate-900 dark:text-slate-100 uppercase">{node.role}</span>
        </div>
        {node.cpu && (
          <div className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-4">
            <div className="flex items-center gap-2 text-slate-400 mb-2">
              <Cpu size={14} />
              <span className="text-[10px] font-black uppercase tracking-widest">CPU</span>
            </div>
            <span className="font-bold text-slate-900 dark:text-slate-100">{node.cpu}</span>
          </div>
        )}
        {node.memory && (
          <div className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-4">
            <div className="flex items-center gap-2 text-slate-400 mb-2">
              <MemoryStick size={14} />
              <span className="text-[10px] font-black uppercase tracking-widest">Memory</span>
            </div>
            <span className="font-bold text-slate-900 dark:text-slate-100">{node.memory}</span>
          </div>
        )}
      </div>

      <div className="border-t border-slate-100 dark:border-slate-800 pt-4">
        <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3">Storage Summary</h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-4 text-center">
            <div className="text-3xl font-black text-brand-600 dark:text-brand-400">{getNodeDiskCount(node.id)}</div>
            <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Disks</div>
          </div>
          <div className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-4 text-center">
            <div className="text-3xl font-black text-emerald-600 dark:text-emerald-400">{getNodeVolumeCount(node.id)}</div>
            <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Volumes</div>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">{t('volumes.title')}</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1 font-medium">{t('volumes.description')}</p>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-[2rem] shadow-xl border border-slate-100 dark:border-slate-800 overflow-hidden">
        <div className="flex" style={{ minHeight: '600px' }}>
          <div className="w-60 flex-shrink-0 border-r border-slate-100 dark:border-slate-800 flex flex-col">
            <div className="p-4 border-b border-slate-100 dark:border-slate-800">
              <h2 className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                Storage Explorer
              </h2>
            </div>
            <div className="flex-1 overflow-y-auto p-2">
              {nodesLoading ? (
                <div className="flex items-center justify-center p-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-500" />
                </div>
              ) : nodes.length === 0 ? (
                <div className="text-center py-8 text-slate-400 text-sm">
                  No nodes available
                </div>
              ) : (
                nodes.map(node => {
                  const nodeDisks = getDisksForNode(node.id);
                  const isNodeExpanded = expandedNodes.has(node.id);
                  const isNodeSelected = selection.type === 'node' && selection.nodeId === node.id;

                  return (
                    <div key={node.id} className="mb-1">
                      <TreeItem
                        item={node.name}
                        icon={Server}
                        isSelected={isNodeSelected}
                        badge={nodeDisks.length}
                        onClick={() => handleSelect('node', { nodeId: node.id })}
                        actions={
                          nodeDisks.length > 0 && (
                            <button
                              onClick={(e) => { e.stopPropagation(); toggleNodeExpand(node.id); }}
                              className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded"
                            >
                              {isNodeExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                            </button>
                          )
                        }
                      >
                        {nodeDisks.length > 0 && (isNodeExpanded ? <ChevronDown size={14} className="text-slate-400" /> : <ChevronRight size={14} className="text-slate-400" />)}
                      </TreeItem>

                          <AnimatePresence>
                        {isNodeExpanded && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.15 }}
                            className="overflow-hidden"
                          >
                            {nodeDisks.map(disk => {
                              const diskVolumes = disk.volumes || [];
                              const isDiskExpanded = expandedDisks.has(disk.id);
                              const isDiskSelected = selection.type === 'disk' && selection.diskId === disk.id;

                              return (
                                <div key={disk.id} className="mb-1">
                                  <TreeItem
                                    item={disk.name}
                                    level={1}
                                    icon={HardDrive}
                                    isSelected={isDiskSelected}
                                    badge={diskVolumes.length}
                                    onClick={() => handleSelect('disk', { nodeId: node.id, diskId: disk.id })}
                                    actions={
                                      <button
                                        onClick={(e) => { e.stopPropagation(); toggleDiskExpand(disk.id); }}
                                        className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded"
                                      >
                                        {isDiskExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                                      </button>
                                    }
                                  >
                                    {diskVolumes.length > 0 && (isDiskExpanded ? <ChevronDown size={14} className="text-slate-400" /> : <ChevronRight size={14} className="text-slate-400" />)}
                                  </TreeItem>

                                  <AnimatePresence>
                                    {isDiskExpanded && (
                                      <motion.div
                                        initial={{ height: 0, opacity: 0 }}
                                        animate={{ height: 'auto', opacity: 1 }}
                                        exit={{ height: 0, opacity: 0 }}
                                        transition={{ duration: 0.1 }}
                                        className="overflow-hidden"
                                      >
                                        {diskVolumes.map(volume => {
                                          const isVolumeSelected = selection.type === 'volume' && selection.volumeId === volume.id;
                                          return (
                                            <TreeItem
                                              key={volume.id}
                                              item={volume.name}
                                              level={2}
                                              icon={Database}
                                              isSelected={isVolumeSelected}
                                              onClick={() => handleSelect('volume', { nodeId: node.id, diskId: disk.id, volumeId: volume.id })}
                                            />
                                          );
                                        })}
                                      </motion.div>
                                    )}
                                  </AnimatePresence>
                                </div>
                              );
                            })}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <div className="flex-1 p-6 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center h-full">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-500" />
              </div>
            ) : error ? (
              <div className="bg-red-50 text-red-600 p-6 rounded-3xl border border-red-100 font-bold dark:bg-red-500/10 dark:border-red-500/20 dark:text-red-400">
                {error}
              </div>
            ) : selection.type === 'node' && selection.nodeId ? (
              <NodeDetails node={getSelectedNode()!} />
            ) : selection.type === 'disk' && selection.diskId ? (
              <DiskDetails
                disk={getSelectedDisk()!}
                getVolumesForDisk={getVolumesForDisk}
                getDiskTypeColor={getDiskTypeColor}
                getStatusColor={getStatusColor}
                selection={selection}
                onEdit={openDiskModal}
                onDelete={handleDeleteDisk}
                onSelect={handleSelect}
                onAddVolume={openVolumeModal}
              />
            ) : selection.type === 'volume' && selection.volumeId ? (
              <VolumeDetails
                volume={getSelectedVolume()!}
                disk={getSelectedDisk()!}
                onEdit={openVolumeModal}
                onDelete={handleDeleteVolume}
                onSelectDisk={(diskId) => handleSelect('disk', { diskId })}
                getUsagePercent={getUsagePercent}
                getVolumeTypeColor={getVolumeTypeColor}
                getStatusColor={getStatusColor}
                getDiskTypeColor={getDiskTypeColor}
              />
            ) : (
              <StorageEmptyState />
            )}
          </div>
        </div>
      </div>

      <AnimatePresence>
        {isDiskModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xl">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative bg-white/30 dark:bg-slate-900/40 backdrop-blur-xl rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden border border-white/30 dark:border-slate-700/40"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-white/20 via-transparent to-white/10 dark:from-slate-800/30 dark:via-transparent dark:to-slate-900/20 pointer-events-none" />

              <div className="relative px-8 py-6 border-b border-white/30 dark:border-slate-700/40 flex items-center justify-between">
                <h2 className="text-xl font-black text-slate-900 dark:text-slate-100">
                  {editingDisk ? t('volumes.edit_disk') : t('volumes.add_disk')}
                </h2>
                <button
                  onClick={() => setIsDiskModalOpen(false)}
                  className="p-2.5 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-white/60 dark:hover:bg-slate-700/60 rounded-xl transition-all"
                >
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleDiskSubmit} className="relative p-6 space-y-4 max-h-[70vh] overflow-y-auto">
                {formError && (
                  <div className="p-3 bg-red-50/60 dark:bg-red-500/20 text-red-700 dark:text-red-300 text-sm rounded-xl border border-red-200/50 dark:border-red-500/30 font-bold">
                    {formError}
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="block text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-1.5">{t('volumes.disk_name')}</label>
                    <input
                      type="text"
                      required
                      value={diskForm.name}
                      onChange={(e) => setDiskForm({ ...diskForm, name: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 transition-all text-slate-900 dark:text-slate-100 font-bold outline-none"
                      placeholder="nvd0"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-1.5">{t('volumes.disk_type')}</label>
                    <select
                      value={diskForm.disk_type}
                      onChange={(e) => setDiskForm({ ...diskForm, disk_type: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 transition-all text-slate-900 dark:text-slate-100 font-bold outline-none appearance-none cursor-pointer"
                    >
                      <option value="NVME">{t('volumes.nvme')}</option>
                      <option value="SCSI">{t('volumes.scsi')}</option>
                      <option value="SATA">{t('volumes.sata')}</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-1.5">{t('volumes.status')}</label>
                    <select
                      value={diskForm.status}
                      onChange={(e) => setDiskForm({ ...diskForm, status: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 transition-all text-slate-900 dark:text-slate-100 font-bold outline-none appearance-none cursor-pointer"
                    >
                      <option value="online">{t('common.online')}</option>
                      <option value="offline">{t('common.offline')}</option>
                      <option value="maintenance">{t('common.maintenance')}</option>
                    </select>
                  </div>

                  <div className="col-span-2">
                    <label className="block text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-1.5">{t('volumes.device_path')}</label>
                    <input
                      type="text"
                      value={diskForm.device_path}
                      onChange={(e) => setDiskForm({ ...diskForm, device_path: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 transition-all text-slate-900 dark:text-slate-100 font-bold outline-none"
                      placeholder="/dev/nvd0"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-1.5">{t('volumes.pci_path')}</label>
                    <input
                      type="text"
                      value={diskForm.pci_path}
                      onChange={(e) => setDiskForm({ ...diskForm, pci_path: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 transition-all text-slate-900 dark:text-slate-100 font-bold outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-1.5">{t('volumes.size')}</label>
                    <input
                      type="text"
                      value={diskForm.size}
                      onChange={(e) => setDiskForm({ ...diskForm, size: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 transition-all text-slate-900 dark:text-slate-100 font-bold outline-none"
                      placeholder="500GB"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-1.5">{t('volumes.serial')}</label>
                    <input
                      type="text"
                      value={diskForm.serial}
                      onChange={(e) => setDiskForm({ ...diskForm, serial: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 transition-all text-slate-900 dark:text-slate-100 font-bold outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-1.5">{t('volumes.model')}</label>
                    <input
                      type="text"
                      value={diskForm.model}
                      onChange={(e) => setDiskForm({ ...diskForm, model: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 transition-all text-slate-900 dark:text-slate-100 font-bold outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-1.5">{t('volumes.vendor')}</label>
                    <input
                      type="text"
                      value={diskForm.vendor}
                      onChange={(e) => setDiskForm({ ...diskForm, vendor: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 transition-all text-slate-900 dark:text-slate-100 font-bold outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-1.5">{t('volumes.sector_size')}</label>
                    <input
                      type="text"
                      value={diskForm.sector_size}
                      onChange={(e) => setDiskForm({ ...diskForm, sector_size: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 transition-all text-slate-900 dark:text-slate-100 font-bold outline-none"
                      placeholder="512"
                    />
                  </div>
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setIsDiskModalOpen(false)}
                    className="flex-1 px-6 py-4 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold uppercase tracking-widest text-xs rounded-2xl hover:bg-slate-200 dark:hover:bg-slate-700 transition-all active:scale-95"
                  >
                    {t('common.cancel')}
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-6 py-4 bg-brand-600 hover:bg-brand-700 text-white font-bold uppercase tracking-widest text-xs rounded-2xl transition-all active:scale-95 shadow-lg shadow-brand-500/20"
                  >
                    {editingDisk ? t('volumes.update_failed') : t('volumes.create_failed')}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isVolumeModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xl">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative bg-white/30 dark:bg-slate-900/40 backdrop-blur-xl rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden border border-white/30 dark:border-slate-700/40"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-white/20 via-transparent to-white/10 dark:from-slate-800/30 dark:via-transparent dark:to-slate-900/20 pointer-events-none" />

              <div className="relative px-8 py-6 border-b border-white/30 dark:border-slate-700/40 flex items-center justify-between">
                <h2 className="text-xl font-black text-slate-900 dark:text-slate-100">
                  {editingVolume ? t('volumes.edit_volume') : t('volumes.add_volume')}
                </h2>
                <button
                  onClick={() => setIsVolumeModalOpen(false)}
                  className="p-2.5 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-white/60 dark:hover:bg-slate-700/60 rounded-xl transition-all"
                >
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleVolumeSubmit} className="relative p-6 space-y-4 max-h-[70vh] overflow-y-auto">
                {formError && (
                  <div className="p-3 bg-red-50/60 dark:bg-red-500/20 text-red-700 dark:text-red-300 text-sm rounded-xl border border-red-200/50 dark:border-red-500/30 font-bold">
                    {formError}
                  </div>
                )}

                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-1.5">{t('common.name')}</label>
                    <input
                      type="text"
                      required
                      value={volumeForm.name}
                      onChange={(e) => setVolumeForm({ ...volumeForm, name: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 transition-all text-slate-900 dark:text-slate-100 font-bold outline-none"
                      placeholder="volume0"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-1.5">{t('volumes.volume_type')}</label>
                      <select
                        value={volumeForm.volume_type}
                        onChange={(e) => setVolumeForm({ ...volumeForm, volume_type: e.target.value })}
                        className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 transition-all text-slate-900 dark:text-slate-100 font-bold outline-none appearance-none cursor-pointer"
                      >
                        <option value="ZFS">{t('volumes.zfs')}</option>
                        <option value="UFS">{t('volumes.ufs')}</option>
                        <option value="GEOM">{t('volumes.geom')}</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-1.5">{t('volumes.status')}</label>
                      <select
                        value={volumeForm.status}
                        onChange={(e) => setVolumeForm({ ...volumeForm, status: e.target.value })}
                        className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 transition-all text-slate-900 dark:text-slate-100 font-bold outline-none appearance-none cursor-pointer"
                      >
                        <option value="online">{t('common.online')}</option>
                        <option value="offline">{t('common.offline')}</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-1.5">{t('volumes.mount_point')}</label>
                    <input
                      type="text"
                      value={volumeForm.mount_point}
                      onChange={(e) => setVolumeForm({ ...volumeForm, mount_point: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 transition-all text-slate-900 dark:text-slate-100 font-bold outline-none"
                      placeholder="/mnt/volume0"
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-1.5">{t('volumes.size')}</label>
                      <input
                        type="text"
                        value={volumeForm.size}
                        onChange={(e) => setVolumeForm({ ...volumeForm, size: e.target.value })}
                        className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 transition-all text-slate-900 dark:text-slate-100 font-bold outline-none"
                        placeholder="100GB"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-1.5">{t('volumes.used')}</label>
                      <input
                        type="text"
                        value={volumeForm.used}
                        onChange={(e) => setVolumeForm({ ...volumeForm, used: e.target.value })}
                        className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 transition-all text-slate-900 dark:text-slate-100 font-bold outline-none"
                        placeholder="50GB"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-1.5">{t('volumes.available')}</label>
                      <input
                        type="text"
                        value={volumeForm.available}
                        onChange={(e) => setVolumeForm({ ...volumeForm, available: e.target.value })}
                        className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 transition-all text-slate-900 dark:text-slate-100 font-bold outline-none"
                        placeholder="50GB"
                      />
                    </div>
                  </div>

                  {volumeForm.volume_type === 'ZFS' && (
                    <div className="flex gap-6 pt-2">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={volumeForm.compression === 'on'}
                          onChange={(e) => setVolumeForm({ ...volumeForm, compression: e.target.checked ? 'on' : 'off' })}
                          className="w-4 h-4 rounded border-slate-300 dark:border-slate-600 text-brand-600 focus:ring-brand-500"
                        />
                        <span className="text-sm font-bold text-slate-700 dark:text-slate-300">{t('volumes.compression')}</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={volumeForm.deduplication === 'on'}
                          onChange={(e) => setVolumeForm({ ...volumeForm, deduplication: e.target.checked ? 'on' : 'off' })}
                          className="w-4 h-4 rounded border-slate-300 dark:border-slate-600 text-brand-600 focus:ring-brand-500"
                        />
                        <span className="text-sm font-bold text-slate-700 dark:text-slate-300">{t('volumes.deduplication')}</span>
                      </label>
                    </div>
                  )}
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setIsVolumeModalOpen(false)}
                    className="flex-1 px-6 py-4 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold uppercase tracking-widest text-xs rounded-2xl hover:bg-slate-200 dark:hover:bg-slate-700 transition-all active:scale-95"
                  >
                    {t('common.cancel')}
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-6 py-4 bg-brand-600 hover:bg-brand-700 text-white font-bold uppercase tracking-widest text-xs rounded-2xl transition-all active:scale-95 shadow-lg shadow-brand-500/20"
                  >
                    {editingVolume ? t('volumes.update_failed') : t('volumes.create_failed')}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <ConfirmationModal
        isOpen={isDeleteConfirmOpen}
        onClose={() => {
          setIsDeleteConfirmOpen(false);
          setDeletingDisk(null);
          setDeletingVolume(null);
        }}
        onConfirm={() => {
          if (deletingDisk) {
            confirmDeleteDisk();
          } else if (deletingVolume) {
            confirmDeleteVolume();
          }
        }}
        title={t('common.delete')}
        message={deletingDisk ? t('volumes.delete_disk_confirm') : t('volumes.delete_volume_confirm')}
        variant="danger"
      />
    </div>
  );
};

export default Volumes;
