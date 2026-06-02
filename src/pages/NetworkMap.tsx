import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  Panel,
  useNodesState,
  useEdgesState,
  MarkerType,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import {
  Monitor,
  Container,
  HardDrive,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import api from '../api/client';
import ContextMenu from '../components/network/ContextMenu';
import type { ContextMenuState, ResourceItem } from '../components/network/ContextMenu';
import Legend from '../components/network/Legend';
import MapHeader from '../components/network/MapHeader';
import { nodeTypes } from '../components/network/NetworkNodes';

interface ClusterNode {
  id: number;
  name: string;
  role: string;
  status?: string;
  ip?: string;
  cpu_total?: number | null;
  cpu_used?: number | null;
  mem_total?: string | null;
  mem_used?: string | null;
  disk_total?: string | null;
  disk_used?: string | null;
  created_at?: string;
}

interface Resource {
  id: number;
  name: string;
  type: 'vms' | 'containers' | 'jails';
  status: string;
  node_id?: number | null;
  icon: typeof Monitor;
}

type NodePosition = { x: number; y: number };

const NetworkMap: React.FC = () => {
  const { t } = useTranslation();
  const [nodes, setNodes, onNodesChange] = useNodesState<any>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<any>([]);
  const nodesRef = useRef<any[]>([]);
  useEffect(() => { nodesRef.current = nodes; }, [nodes]);
  const [resources, setResources] = useState<Resource[]>([]);
  const [clusterNodes, setClusterNodes] = useState<ClusterNode[]>([]);
  const [expandedNodes, setExpandedNodes] = useState<Record<string, boolean>>({ 'host-core': true });
  const [searchTerm, setSearchTerm] = useState('');
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [vms, containers, jails, nodesRes] = await Promise.all([
        api.get('/vms'),
        api.get('/containers'),
        api.get('/jails'),
        api.get('/nodes')
      ]);

      const allResources: Resource[] = [
        ...vms.data.map((r: any) => ({ ...r, type: 'vms' as const, icon: Monitor })),
        ...containers.data.map((r: any) => ({ ...r, type: 'containers' as const, icon: Container })),
        ...jails.data.map((r: any) => ({ ...r, type: 'jails' as const, icon: HardDrive }))
      ];
      setResources(allResources);
      setClusterNodes(nodesRes.data);

      // Initialize expanded state for new nodes if not present
      setExpandedNodes(prev => {
        const next = { ...prev };
        nodesRes.data.forEach((n: ClusterNode) => {
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

  const handleContextMenu = useCallback((event: React.MouseEvent, resource: ResourceItem) => {
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

    // Capture current node positions to preserve them. Read from a ref so
    // the `nodes` state isn't a dependency (which would cause a render loop
    // because setNodes inside this callback also updates `nodes`).
    const currentPositions: Record<string, NodePosition> = {};
    nodesRef.current.forEach((node: any) => {
      currentPositions[node.id] = node.position;
    });

    // Core system (Host) node usually represents the management plane
    const coreNodeData = clusterNodes.find(n => n.role === 'core');
    const coreNodeId = coreNodeData ? `node-${coreNodeData.id}` : 'host-core';

    newNodes.push({
      id: coreNodeId,
      type: 'host',
      position: currentPositions[coreNodeId] || { x: 400, y: 50 },
      data: {
        label: coreNodeData?.name || 'CloudBSD Core',
        isExpanded: expandedNodes[coreNodeId],
        onToggleExpand: () => toggleNodeExpand(coreNodeId),
        t
      },
    });

    // Add other cluster nodes
    const otherNodes = clusterNodes.filter(n => n.role !== 'core');
    otherNodes.forEach((node, idx) => {
      const nodeId = `node-${node.id}`;
      const xOffset = (idx - (otherNodes.length - 1) / 2) * 500;

      newNodes.push({
        id: nodeId,
        type: 'host',
        position: currentPositions[nodeId] || { x: 400 + xOffset, y: 350 },
        data: {
          label: node.name,
          isExpanded: expandedNodes[nodeId],
          onToggleExpand: () => toggleNodeExpand(nodeId),
          t
        },
      });

      // Connect agents to core
      newEdges.push({
        id: `edge-core-${nodeId}`,
        source: coreNodeId,
        target: nodeId,
        animated: true,
        style: { stroke: '#6366f1', strokeWidth: 3, strokeDasharray: '0' },
        markerEnd: { type: MarkerType.ArrowClosed, color: '#6366f1' },
      });
    });

    // Add resources under their respective nodes
    const allNodesInGraph = clusterNodes.length > 0 ? clusterNodes : [{ id: null, role: 'core' }];

    allNodesInGraph.forEach((node) => {
      const nodeId = node.id ? `node-${node.id}` : 'host-core';
      if (!expandedNodes[nodeId]) return;

      const nodeResources = filteredResources.filter(r => r.node_id === node.id || (node.role === 'core' && !r.node_id));

      nodeResources.forEach((res, resIdx) => {
        const resNodeId = `${res.type}-${res.id}`;

        // If node already exists, use its current position
        if (currentPositions[resNodeId]) {
          newNodes.push({
            id: resNodeId,
            type: 'resource',
            position: currentPositions[resNodeId],
            data: {
              label: res.name,
              status: res.status,
              type: res.type,
              icon: res.icon,
              resource: res,
              onContextMenu: handleContextMenu,
              t
            },
          });
        } else {
          // Calculate new position only for new nodes
          const hostNode = newNodes.find(n => n.id === nodeId);
          const nodePos = hostNode?.position || { x: 400, y: 0 };

          const angle = ((resIdx + 1) / (nodeResources.length + 1)) * Math.PI;
          const radius = 350;
          const x = nodePos.x + radius * Math.cos(angle + Math.PI);
          const y = nodePos.y + radius * Math.sin(angle) + 150;

          newNodes.push({
            id: resNodeId,
            type: 'resource',
            position: { x, y },
            data: {
              label: res.name,
              status: res.status,
              type: res.type,
              icon: res.icon,
              resource: res,
              onContextMenu: handleContextMenu,
              t
            },
          });
        }

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
  }, [resources, clusterNodes, expandedNodes, searchTerm, handleContextMenu, setNodes, setEdges, t]);

  useEffect(() => {
    if (resources.length > 0 || clusterNodes.length > 0) {
      createGraph();
      if (!isInitialized) setIsInitialized(true);
    }
  }, [createGraph, resources, clusterNodes, isInitialized]);

  return (
    <div className="h-screen w-full flex flex-col relative overflow-hidden">
      <MapHeader searchTerm={searchTerm} onSearchChange={setSearchTerm} />

      <div className="flex-1 w-full h-full">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          nodeTypes={nodeTypes}
          fitView={!isInitialized}
          fitViewOptions={{ padding: 0.5 }}
          onPaneClick={() => setContextMenu(null)}
        >
          <Background color="#f1f5f9" gap={20} />
          <Controls />
          <Panel position="bottom-right" className="bg-white/80 backdrop-blur-md p-2 rounded-xl border border-slate-100 shadow-lg m-4">
            <Legend />
          </Panel>
        </ReactFlow>

        <ContextMenu
          contextMenu={contextMenu}
          onAction={handleAction}
          onClose={() => setContextMenu(null)}
        />
      </div>
    </div>
  );
};

export default NetworkMap;
