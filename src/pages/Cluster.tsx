import React, { useEffect, useState } from 'react';
import { Server, Plus, Trash2, Edit2, Shield, Activity, Globe } from 'lucide-react';
import api from '../api/client';

interface NodeData {
  id: number;
  name: string;
  role: string;
  status: string;
  ip: string;
  cpu_total: number | null;
  cpu_used: number | null;
  mem_total: string | null;
  mem_used: string | null;
  disk_total: string | null;
  disk_used: string | null;
  created_at: string;
}

const Cluster: React.FC = () => {
  const [nodes, setNodes] = useState<NodeData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingNode, setEditingNode] = useState<NodeData | null>(null);
  
  const [formData, setFormData] = useState({
    name: '',
    role: 'worker',
    status: 'online',
    ip: '',
    cpu_total: '',
    cpu_used: '',
    mem_total: '',
    mem_used: '',
    disk_total: '',
    disk_used: ''
  });

  const fetchNodes = async () => {
    try {
      setLoading(true);
      const response = await api.get('/nodes');
      setNodes(response.data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to fetch cluster nodes');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNodes();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingNode) {
        await api.put(`/nodes/${editingNode.id}`, formData);
      } else {
        await api.post('/nodes', formData);
      }
      setFormData({ 
        name: '', role: 'worker', status: 'online', ip: '',
        cpu_total: '', cpu_used: '', mem_total: '', mem_used: '', disk_total: '', disk_used: ''
      });
      setShowAddForm(false);
      setEditingNode(null);
      fetchNodes();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Operation failed');
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this node? All resources on this node will be unassigned.')) return;
    try {
      await api.delete(`/nodes/${id}`);
      fetchNodes();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to delete node');
    }
  };

  const startEdit = (node: NodeData) => {
    setEditingNode(node);
    setFormData({
      name: node.name,
      role: node.role,
      status: node.status,
      ip: node.ip || '',
      cpu_total: node.cpu_total?.toString() || '',
      cpu_used: node.cpu_used?.toString() || '',
      mem_total: node.mem_total || '',
      mem_used: node.mem_used || '',
      disk_total: node.disk_total || '',
      disk_used: node.disk_used || ''
    });
    setShowAddForm(true);
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Cluster Management</h1>
          <p className="text-slate-500 mt-1 font-medium">Manage main and worker nodes in your infrastructure</p>
        </div>
        <button 
          onClick={() => {
            setShowAddForm(!showAddForm);
            if (showAddForm) setEditingNode(null);
          }}
          className={`flex items-center gap-2 px-6 py-2.5 rounded-2xl font-bold transition-all duration-200 shadow-lg active:scale-95 ${
            showAddForm 
              ? 'bg-slate-200 text-slate-600 hover:bg-slate-300' 
              : 'bg-brand-600 hover:bg-brand-700 text-white shadow-brand-500/20'
          }`}
        >
          <Plus size={20} />
          {showAddForm ? 'Cancel' : 'Add Node'}
        </button>
      </div>

      {showAddForm && (
        <div className="bg-white p-8 rounded-[2.5rem] shadow-xl border border-slate-100 animate-in zoom-in-95 duration-300">
          <h2 className="text-xl font-black text-slate-900 mb-6">{editingNode ? 'Edit Node' : 'Add New Node'}</h2>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 items-end">
              <div className="space-y-2">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Node Name</label>
                <input 
                  type="text" 
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 focus:bg-white transition-all duration-200 text-slate-900 font-bold placeholder-slate-300 outline-none"
                  placeholder="e.g. Worker-01"
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">IP Address</label>
                <input 
                  type="text" 
                  value={formData.ip}
                  onChange={(e) => setFormData({...formData, ip: e.target.value})}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 focus:bg-white transition-all duration-200 text-slate-900 font-bold placeholder-slate-300 outline-none"
                  placeholder="10.0.0.X"
                />
              </div>
              <div className="space-y-2">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Role</label>
                <select 
                  value={formData.role}
                  onChange={(e) => setFormData({...formData, role: e.target.value})}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 focus:bg-white transition-all duration-200 text-slate-900 font-bold outline-none appearance-none cursor-pointer"
                >
                  <option value="main">Main (Control Plane)</option>
                  <option value="worker">Worker Node</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Status</label>
                <select 
                  value={formData.status}
                  onChange={(e) => setFormData({...formData, status: e.target.value})}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 focus:bg-white transition-all duration-200 text-slate-900 font-bold outline-none appearance-none cursor-pointer"
                >
                  <option value="online">Online</option>
                  <option value="offline">Offline</option>
                  <option value="maintenance">Maintenance</option>
                </select>
              </div>
            </div>

            {editingNode && (
              <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4 animate-in fade-in duration-300">
                <div className="space-y-2">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">CPU Total</label>
                  <input 
                    type="number" 
                    value={formData.cpu_total}
                    onChange={(e) => setFormData({...formData, cpu_total: e.target.value})}
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-100 rounded-xl focus:border-brand-500 text-slate-900 font-bold outline-none"
                    placeholder="e.g. 8"
                  />
                </div>
                <div className="space-y-2">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">CPU Used</label>
                  <input 
                    type="number" 
                    value={formData.cpu_used}
                    onChange={(e) => setFormData({...formData, cpu_used: e.target.value})}
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-100 rounded-xl focus:border-brand-500 text-slate-900 font-bold outline-none"
                    placeholder="e.g. 2"
                  />
                </div>
                <div className="space-y-2">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">RAM Total</label>
                  <input 
                    type="text" 
                    value={formData.mem_total}
                    onChange={(e) => setFormData({...formData, mem_total: e.target.value})}
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-100 rounded-xl focus:border-brand-500 text-slate-900 font-bold outline-none"
                    placeholder="e.g. 32GB"
                  />
                </div>
                <div className="space-y-2">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">RAM Used</label>
                  <input 
                    type="text" 
                    value={formData.mem_used}
                    onChange={(e) => setFormData({...formData, mem_used: e.target.value})}
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-100 rounded-xl focus:border-brand-500 text-slate-900 font-bold outline-none"
                    placeholder="e.g. 8GB"
                  />
                </div>
                <div className="space-y-2">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Disk Total</label>
                  <input 
                    type="text" 
                    value={formData.disk_total}
                    onChange={(e) => setFormData({...formData, disk_total: e.target.value})}
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-100 rounded-xl focus:border-brand-500 text-slate-900 font-bold outline-none"
                    placeholder="e.g. 500GB"
                  />
                </div>
                <div className="space-y-2">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Disk Used</label>
                  <input 
                    type="text" 
                    value={formData.disk_used}
                    onChange={(e) => setFormData({...formData, disk_used: e.target.value})}
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-100 rounded-xl focus:border-brand-500 text-slate-900 font-bold outline-none"
                    placeholder="e.g. 120GB"
                  />
                </div>
              </div>
            )}
            {!editingNode && (
              <div className="bg-brand-50 p-4 rounded-2xl border border-brand-100">
                <p className="text-sm font-bold text-brand-700 flex items-center gap-2">
                  <Activity size={16} />
                  Node resources (CPU, RAM, Disk) will be automatically discovered upon connection.
                </p>
              </div>
            )}

            <button 
              type="submit"
              className="w-full md:w-auto px-12 bg-slate-900 hover:bg-brand-600 text-white font-black py-3.5 rounded-2xl transition-all duration-300 shadow-xl shadow-slate-900/20 active:scale-95"
            >
              {editingNode ? 'Save Changes' : 'Create Node'}
            </button>
          </form>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center p-20">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-500"></div>
        </div>
      ) : error ? (
        <div className="bg-red-50 text-red-600 p-6 rounded-3xl border border-red-100 font-bold">
          {error}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {nodes.map((node) => (
            <div 
              key={node.id} 
              className="bg-white rounded-[2rem] p-6 shadow-xl border border-slate-100 hover:shadow-2xl transition-all duration-300 group relative overflow-hidden"
            >
              {/* Status Indicator */}
              <div className={`absolute top-0 right-0 w-32 h-32 -mr-16 -mt-16 rounded-full blur-3xl opacity-10 transition-colors duration-500 ${
                node.status === 'online' ? 'bg-emerald-500' : 'bg-red-500'
              }`} />

              <div className="flex items-center justify-between mb-6 relative z-10">
                <div className={`p-4 rounded-2xl ${
                  node.role === 'main' ? 'bg-brand-600 text-white shadow-lg shadow-brand-500/30' : 'bg-slate-100 text-slate-600'
                }`}>
                  <Server size={24} />
                </div>
                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button 
                    onClick={() => startEdit(node)}
                    className="p-2 hover:bg-slate-100 rounded-xl text-slate-400 hover:text-brand-500 transition-colors"
                  >
                    <Edit2 size={18} />
                  </button>
                  <button 
                    onClick={() => handleDelete(node.id)}
                    className="p-2 hover:bg-red-50 rounded-xl text-slate-400 hover:text-red-500 transition-colors"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>

              <div className="space-y-1 relative z-10">
                <div className="flex items-center gap-2">
                  <h3 className="text-xl font-black text-slate-900">{node.name}</h3>
                  {node.role === 'main' && (
                    <span className="px-2 py-0.5 bg-brand-500/10 text-brand-500 text-[8px] font-black uppercase tracking-widest rounded-md">Main</span>
                  )}
                </div>
                <p className="text-slate-400 font-bold text-xs uppercase tracking-widest">
                  {node.ip || 'Local Node'}
                </p>
              </div>

              <div className="mt-8 space-y-4 relative z-10">
                {/* CPU Progress */}
                {node.cpu_total && (
                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center text-[9px] font-black uppercase tracking-widest">
                      <span className="text-slate-400">CPU Usage</span>
                      <span className="text-slate-600">{node.cpu_used} / {node.cpu_total} vCPUs</span>
                    </div>
                    <div className="w-full h-1.5 bg-slate-50 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-blue-500 rounded-full" 
                        style={{ width: `${(node.cpu_used! / node.cpu_total!) * 100}%` }}
                      />
                    </div>
                  </div>
                )}

                {/* RAM Progress */}
                {node.mem_total && (
                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center text-[9px] font-black uppercase tracking-widest">
                      <span className="text-slate-400">Memory</span>
                      <span className="text-slate-600">{node.mem_used} / {node.mem_total}</span>
                    </div>
                    <div className="w-full h-1.5 bg-slate-50 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-purple-500 rounded-full" 
                        style={{ width: '40%' }} // Simple estimation if we don't want to parse strings here
                      />
                    </div>
                  </div>
                )}

                {/* Disk Progress */}
                {node.disk_total && (
                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center text-[9px] font-black uppercase tracking-widest">
                      <span className="text-slate-400">Disk Storage</span>
                      <span className="text-slate-600">{node.disk_used} / {node.disk_total}</span>
                    </div>
                    <div className="w-full h-1.5 bg-slate-50 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-emerald-500 rounded-full" 
                        style={{ width: '25%' }}
                      />
                    </div>
                  </div>
                )}
              </div>

              <div className="mt-6 pt-6 border-t border-slate-50 grid grid-cols-2 gap-4 relative z-10">
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${node.status === 'online' ? 'bg-emerald-500 animate-pulse' : node.status === 'maintenance' ? 'bg-amber-500' : 'bg-red-500'}`} />
                  <span className="text-xs font-black text-slate-600 uppercase tracking-widest">{node.status}</span>
                </div>
                <div className="flex items-center gap-2 justify-end">
                  <Activity size={14} className="text-slate-300" />
                  <span className="text-xs font-bold text-slate-400">Health: 100%</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Cluster;
