import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  ReactFlow, 
  Background, 
  Controls, 
  Panel, 
  useNodesState, 
  useEdgesState,
  MarkerType,
  Handle,
  Position
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { 
  Monitor, 
  Container, 
  HardDrive, 
  Server, 
  Search, 
  MoreVertical,
  Play,
  Square,
  Settings as SettingsIcon,
  ChevronRight,
  ChevronDown
} from 'lucide-react';
import api from '../api/client';
import { useNavigate } from 'react-router-dom';

// Custom Node Components
const HostNode = ({ data }: any) => {
  return (
    <div className={`px-4 py-3 rounded-2xl border-2 shadow-xl min-w-[200px] transition-all duration-300 ${data.isExpanded ? 'bg-slate-900 border-brand-500 text-white' : 'bg-white border-slate-200 text-slate-900'}`}>
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className={`p-2 rounded-xl ${data.isExpanded ? 'bg-brand-500/20 text-brand-400' : 'bg-slate-100 text-slate-600'}`}>
            <Server size={20} />
          </div>
          <div>
            <div className="text-xs font-bold uppercase tracking-widest opacity-60">Host System</div>
            <div className="font-black text-sm">{data.label}</div>
          </div>
        </div>
        <button 
          onClick={(e) => {
            e.stopPropagation();
            data.onToggleExpand();
          }}
          className={`p-1 rounded-lg transition-colors ${data.isExpanded ? 'hover:bg-white/10' : 'hover:bg-slate-100'}`}
        >
          {data.isExpanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
        </button>
      </div>
      <Handle type="source" position={Position.Bottom} className="w-3 h-3 bg-brand-500 border-2 border-white" />
    </div>
  );
};

const ResourceNode = ({ data }: any) => {
  const Icon = data.icon;
  const statusColors: any = {
    running: 'bg-emerald-500',
    up: 'bg-emerald-500',
    active: 'bg-emerald-500',
    stopped: 'bg-slate-400',
    exited: 'bg-red-500',
    error: 'bg-red-500'
  };

  const statusColor = statusColors[data.status] || 'bg-slate-400';

  return (
    <div 
      className="px-4 py-3 rounded-2xl bg-white border border-slate-200 shadow-lg min-w-[180px] hover:border-brand-500 transition-all group"
      onContextMenu={(e) => data.onContextMenu(e, data.resource)}
    >
      <Handle type="target" position={Position.Top} className="w-2 h-2 bg-slate-300" />
      <div className="flex items-center gap-3">
        <div className={`p-2 rounded-xl bg-slate-50 text-slate-600 group-hover:text-brand-500 transition-colors`}>
          <Icon size={18} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <div className={`w-1.5 h-1.5 rounded-full ${statusColor}`} />
            <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{data.type}</div>
          </div>
          <div className="font-bold text-sm truncate text-slate-900">{data.label}</div>
        </div>
        <div className="text-slate-300 group-hover:text-slate-400">
          <MoreVertical size={14} />
        </div>
      </div>
    </div>
  );
};

const nodeTypes = {
  host: HostNode,
  resource: ResourceNode,
};

const NetworkMap: React.FC = () => {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [resources, setResources] = useState<any[]>([]);
  const [clusterNodes, setClusterNodes] = useState<any[]>([]);
  const [expandedNodes, setExpandedNodes] = useState<Record<string, boolean>>({ 'host-core': true });
  const [searchTerm, setSearchTerm] = useState('');
  const [contextMenu, setContextMenu] = useState<{ x: number, y: number, resource: any } | null>(null);
  const navigate = useNavigate();

  const fetchData = useCallback(async () => {
    try {
      const [vms, containers, jails, nodesRes] = await Promise.all([
        api.get('/vms'),
        api.get('/containers'),
        api.get('/jails'),
        api.get('/nodes')
      ]);

      const allResources = [
        ...vms.data.map((r: any) => ({ ...r, type: 'vms', icon: Monitor })),
        ...containers.data.map((r: any) => ({ ...r, type: 'containers', icon: Container })),
        ...jails.data.map((r: any) => ({ ...r, type: 'jails', icon: HardDrive }))
      ];
      setResources(allResources);
      setClusterNodes(nodesRes.data);
      
      // Initialize expanded state for new nodes if not present
      setExpandedNodes(prev => {
        const next = { ...prev };
        nodesRes.data.forEach((n: any) => {
          const key = `node-${n.id}`;
          if (next[key] === undefined) next[key] = true;
        });
        return next;
      });
    } catch (err) {
      console.error('Failed to fetch data for network map', err);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 10000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const toggleNodeExpand = (nodeKey: string) => {
    setExpandedNodes(prev => ({
      ...prev,
      [nodeKey]: !prev[nodeKey]
    }));
  };

  const handleContextMenu = useCallback((event: React.MouseEvent, resource: any) => {
    event.preventDefault();
    setContextMenu({
      x: event.clientX,
      y: event.clientY,
      resource
    });
  }, []);

  const handleAction = async (action: string) => {
    if (!contextMenu) return;
    const { resource } = contextMenu;
    try {
      await api.post(`/${resource.type}/${resource.id}/${action}`);
      fetchData();
    } catch (err) {
      console.error(`Failed to ${action} resource`, err);
    }
    setContextMenu(null);
  };

  const createGraph = useCallback(() => {
    const filteredResources = resources.filter(r => 
      r.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.type.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const newNodes: any[] = [];
    const newEdges: any[] = [];

    // Core system (Host) node usually represents the management plane
    const coreNodeData = clusterNodes.find(n => n.role === 'core');
    const coreNodeId = coreNodeData ? `node-${coreNodeData.id}` : 'host-core';
    
    newNodes.push({
      id: coreNodeId,
      type: 'host',
      position: { x: 400, y: 0 },
      data: { 
        label: coreNodeData?.name || 'CloudBSD Core', 
        isExpanded: expandedNodes[coreNodeId],
        onToggleExpand: () => toggleNodeExpand(coreNodeId)
      },
    });

    // Add other cluster nodes
    const otherNodes = clusterNodes.filter(n => n.role !== 'core');
    otherNodes.forEach((node, idx) => {
      const nodeId = `node-${node.id}`;
      const xOffset = (idx - (otherNodes.length - 1) / 2) * 350;
      
      newNodes.push({
        id: nodeId,
        type: 'host',
        position: { x: 400 + xOffset, y: 250 },
        data: { 
          label: node.name, 
          isExpanded: expandedNodes[nodeId],
          onToggleExpand: () => toggleNodeExpand(nodeId)
        },
      });

      // Connect agents to core
      newEdges.push({
        id: `edge-core-${nodeId}`,
        source: coreNodeId,
        target: nodeId,
        style: { stroke: '#94a3b8', strokeWidth: 2, strokeDasharray: '5,5' },
        markerEnd: { type: MarkerType.ArrowClosed, color: '#94a3b8' },
      });
    });

    // Add resources under their respective nodes
    const allNodes = clusterNodes.length > 0 ? clusterNodes : [{ id: null, role: 'core' }];
    
    allNodes.forEach((node) => {
      const nodeId = node.id ? `node-${node.id}` : 'host-core';
      if (!expandedNodes[nodeId]) return;

      const nodeResources = filteredResources.filter(r => r.node_id === node.id || (node.role === 'core' && !r.node_id));
      
      nodeResources.forEach((res, resIdx) => {
        const resNodeId = `${res.type}-${res.id}`;
        const nodePos = newNodes.find(n => n.id === nodeId)?.position || { x: 400, y: 0 };
        
        // Layout resources in a semi-circle below the node
        const angle = ((resIdx + 1) / (nodeResources.length + 1)) * Math.PI;
        const radius = 180;
        const x = nodePos.x + radius * Math.cos(angle + Math.PI/2 - Math.PI/2);
        const y = nodePos.y + radius * Math.sin(angle);

        newNodes.push({
          id: resNodeId,
          type: 'resource',
          position: { x, y: nodePos.y + 150 },
          data: { 
            label: res.name, 
            status: res.status, 
            type: res.type,
            icon: res.icon,
            resource: res,
            onContextMenu: handleContextMenu
          },
        });

        newEdges.push({
          id: `edge-${resNodeId}`,
          source: nodeId,
          target: resNodeId,
          animated: res.status === 'running' || res.status === 'up' || res.status === 'active',
          style: { stroke: '#6366f1', strokeWidth: 2 },
          markerEnd: { type: MarkerType.ArrowClosed, color: '#6366f1' },
        });
      });
    });

    setNodes(newNodes);
    setEdges(newEdges);
  }, [resources, clusterNodes, expandedNodes, searchTerm, handleContextMenu, setNodes, setEdges]);

  useEffect(() => {
    createGraph();
  }, [createGraph]);

  return (
    <div className="h-[calc(100vh-120px)] w-full flex flex-col space-y-4">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Network Map</h1>
          <p className="text-slate-500 mt-1 font-medium">Visual infrastructure overview and node management</p>
        </div>
        
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input 
            type="text"
            placeholder="Search nodes..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-12 pr-6 py-2.5 bg-white border border-slate-100 rounded-2xl shadow-soft focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 outline-none w-full md:w-64 transition-all"
          />
        </div>
      </div>

      <div className="flex-1 bg-white rounded-[2.5rem] border border-slate-100 shadow-soft overflow-hidden relative">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          nodeTypes={nodeTypes}
          fitView
          onPaneClick={() => setContextMenu(null)}
        >
          <Background color="#f1f5f9" gap={20} />
          <Controls />
          <Panel position="top-right" className="bg-white/80 backdrop-blur-md p-2 rounded-xl border border-slate-100 shadow-lg m-4">
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2 px-2 py-1">
                <div className="w-3 h-3 rounded-full bg-emerald-500" />
                <span className="text-[10px] font-bold uppercase text-slate-500">Running</span>
              </div>
              <div className="flex items-center gap-2 px-2 py-1">
                <div className="w-3 h-3 rounded-full bg-slate-400" />
                <span className="text-[10px] font-bold uppercase text-slate-500">Stopped</span>
              </div>
            </div>
          </Panel>
        </ReactFlow>

        {contextMenu && (
          <div 
            className="fixed z-[100] bg-white rounded-2xl shadow-2xl border border-slate-100 p-2 min-w-[160px] animate-in fade-in zoom-in duration-200"
            style={{ left: contextMenu.x, top: contextMenu.y }}
          >
            <div className="px-3 py-2 border-b border-slate-50 mb-1">
              <div className="text-[10px] font-bold uppercase text-slate-400 tracking-widest">{contextMenu.resource.type}</div>
              <div className="font-bold text-slate-900">{contextMenu.resource.name}</div>
            </div>
            
            <button 
              onClick={() => handleAction('start')}
              className="w-full flex items-center gap-3 px-3 py-2 hover:bg-emerald-50 text-slate-700 hover:text-emerald-600 rounded-xl transition-colors text-sm font-semibold"
            >
              <Play size={16} />
              <span>Start</span>
            </button>
            
            <button 
              onClick={() => handleAction('stop')}
              className="w-full flex items-center gap-3 px-3 py-2 hover:bg-red-50 text-slate-700 hover:text-red-600 rounded-xl transition-colors text-sm font-semibold"
            >
              <Square size={16} />
              <span>Stop</span>
            </button>
            
            <button 
              onClick={() => {
                navigate(`/${contextMenu.resource.type}`);
                setContextMenu(null);
              }}
              className="w-full flex items-center gap-3 px-3 py-2 hover:bg-slate-50 text-slate-700 hover:text-brand-600 rounded-xl transition-colors text-sm font-semibold border-t border-slate-50 mt-1 pt-2"
            >
              <SettingsIcon size={16} />
              <span>Settings</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default NetworkMap;
