import React, { useState } from 'react';
import { useGraphStore } from '../../state/graphStore';
import type { NodeType, GraphNode } from '../../types/graph';
import { NodeIcon } from '../GraphNode/NodeIcon';
import {
  Layers,
  Network,
  Cpu,
  Database,
  Radio,
  HardDrive,
  Users,
  Bot,
  Globe,
  ChevronRight,
  ChevronDown,
  Info,
  Search
} from 'lucide-react';

interface ArchitectureSidebarProps {
  isOpen: boolean;
  onToggle: () => void;
  onSelectNode?: (nodeId: string) => void;
}

export const ArchitectureSidebar: React.FC<ArchitectureSidebarProps> = ({
  isOpen,
  onSelectNode
}) => {
  const nodes = useGraphStore((s) => s.nodes);
  const edges = useGraphStore((s) => s.edges);
  const version = useGraphStore((s) => s.version);
  const currentIR = useGraphStore((s) => s.currentIR);

  const [activeTab, setActiveTab] = useState<'components' | 'dependencies' | 'overview'>('components');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [collapsedCategories, setCollapsedCategories] = useState<Record<string, boolean>>({});

  if (!isOpen) {
    return null;
  }

  // Active (non-superseded) nodes and edges
  const activeNodes = nodes.filter((n) => n.status !== 'superseded' && n.status !== 'failed');
  const supersededNodes = nodes.filter((n) => n.status === 'superseded');
  const activeEdges = edges.filter((e) => e.status !== 'superseded');

  // Filter nodes by search query
  const filteredNodes = activeNodes.filter((n) =>
    n.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
    n.type.toLowerCase().includes(searchQuery.toLowerCase()) ||
    ((n.metadata?.technology as string) || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Group nodes by architectural category
  const categories: { key: NodeType; title: string; icon: React.ReactNode }[] = [
    { key: 'client', title: 'Clients & Touchpoints', icon: <Users className="w-3.5 h-3.5 text-blue-400" /> },
    { key: 'user', title: 'Actors & Users', icon: <Users className="w-3.5 h-3.5 text-blue-400" /> },
    { key: 'api', title: 'API Gateways & Ingress', icon: <Network className="w-3.5 h-3.5 text-purple-400" /> },
    { key: 'service', title: 'Services & Workers', icon: <Cpu className="w-3.5 h-3.5 text-emerald-400" /> },
    { key: 'agent', title: 'AI & Autonomous Agents', icon: <Bot className="w-3.5 h-3.5 text-cyan-400" /> },
    { key: 'queue', title: 'Message Brokers & Queues', icon: <Radio className="w-3.5 h-3.5 text-amber-400" /> },
    { key: 'database', title: 'Databases & Storage', icon: <Database className="w-3.5 h-3.5 text-violet-400" /> },
    { key: 'cache', title: 'Caches & Memory Stores', icon: <Layers className="w-3.5 h-3.5 text-rose-400" /> },
    { key: 'storage', title: 'Object Stores & CDN', icon: <HardDrive className="w-3.5 h-3.5 text-orange-400" /> },
    { key: 'external_service', title: 'External Integrations', icon: <Globe className="w-3.5 h-3.5 text-sky-400" /> },
  ];

  const toggleCategory = (catKey: string) => {
    setCollapsedCategories((prev) => ({ ...prev, [catKey]: !prev[catKey] }));
  };

  const handleNodeClick = (node: GraphNode) => {
    setSelectedNodeId(node.id === selectedNodeId ? null : node.id);
    onSelectNode?.(node.id);
  };

  const selectedNode = nodes.find((n) => n.id === selectedNodeId);

  // Find incoming and outgoing edges for selected node
  const selectedNodeIncoming = selectedNode
    ? activeEdges.filter((e) => e.target === selectedNode.id)
    : [];
  const selectedNodeOutgoing = selectedNode
    ? activeEdges.filter((e) => e.source === selectedNode.id)
    : [];

  return (
    <aside className="w-72 lg:w-80 h-full border-r border-zinc-800/80 bg-[#0c0d12] flex flex-col shrink-0 select-none z-10">
      {/* Top Header / Tabs */}
      <div className="h-10 border-b border-zinc-800/80 px-3 flex items-center justify-between shrink-0 bg-[#090a0f]">
        <div className="flex items-center gap-1">
          <button
            onClick={() => setActiveTab('components')}
            className={`px-2.5 py-1 text-xs font-medium rounded transition-colors ${
              activeTab === 'components'
                ? 'bg-zinc-800 text-zinc-100 font-semibold'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Components
            {activeNodes.length > 0 && (
              <span className="ml-1.5 px-1.5 py-0.2 rounded text-[10px] font-mono bg-zinc-700/60 text-zinc-300">
                {activeNodes.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('dependencies')}
            className={`px-2.5 py-1 text-xs font-medium rounded transition-colors ${
              activeTab === 'dependencies'
                ? 'bg-zinc-800 text-zinc-100 font-semibold'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Dependencies
            {activeEdges.length > 0 && (
              <span className="ml-1.5 px-1.5 py-0.2 rounded text-[10px] font-mono bg-zinc-700/60 text-zinc-300">
                {activeEdges.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('overview')}
            className={`px-2.5 py-1 text-xs font-medium rounded transition-colors ${
              activeTab === 'overview'
                ? 'bg-zinc-800 text-zinc-100 font-semibold'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Overview
          </button>
        </div>
      </div>

      {/* Main Tab Content */}
      <div className="flex-1 overflow-y-auto min-h-0 flex flex-col">
        {/* TAB 1: COMPONENTS */}
        {activeTab === 'components' && (
          <div className="flex-1 flex flex-col min-h-0">
            {/* Search box if nodes exist */}
            {activeNodes.length > 4 && (
              <div className="p-2 border-b border-zinc-800/60 shrink-0">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-500" />
                  <input
                    type="text"
                    placeholder="Filter components..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-[#14151e] border border-zinc-800 rounded py-1 pl-8 pr-2.5 text-xs text-zinc-200 placeholder:text-zinc-500 focus:outline-none focus:border-zinc-700"
                  />
                </div>
              </div>
            )}

            {/* Empty state */}
            {activeNodes.length === 0 ? (
              <div className="p-6 text-center my-auto">
                <div className="w-9 h-9 rounded-lg bg-zinc-800/50 border border-zinc-700/40 flex items-center justify-center mx-auto mb-3 text-zinc-400">
                  <Layers className="w-4 h-4" />
                </div>
                <p className="text-xs font-medium text-zinc-300">No components yet</p>
                <p className="text-[11px] text-zinc-500 mt-1 leading-relaxed">
                  Describe a system requirement to generate components live.
                </p>
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto p-2 space-y-3">
                {categories.map((cat) => {
                  const catNodes = filteredNodes.filter((n) => n.type === cat.key);
                  if (catNodes.length === 0) return null;

                  const isCollapsed = collapsedCategories[cat.key];

                  return (
                    <div key={cat.key} className="space-y-1">
                      <button
                        onClick={() => toggleCategory(cat.key)}
                        className="w-full flex items-center justify-between px-1.5 py-1 text-[11px] font-semibold text-zinc-400 hover:text-zinc-200 rounded hover:bg-zinc-800/40 transition-colors"
                      >
                        <div className="flex items-center gap-1.5">
                          {cat.icon}
                          <span className="uppercase tracking-wider font-mono text-[10px]">{cat.title}</span>
                          <span className="text-zinc-600 font-mono text-[10px]">({catNodes.length})</span>
                        </div>
                        {isCollapsed ? (
                          <ChevronRight className="w-3 h-3 text-zinc-500" />
                        ) : (
                          <ChevronDown className="w-3 h-3 text-zinc-500" />
                        )}
                      </button>

                      {!isCollapsed && (
                        <div className="space-y-0.5 pl-1">
                          {catNodes.map((node) => {
                            const isSelected = selectedNodeId === node.id;
                            const tech = node.metadata?.technology as string | undefined;

                            return (
                              <button
                                key={node.id}
                                onClick={() => handleNodeClick(node)}
                                className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded text-left transition-all text-xs group ${
                                  isSelected
                                    ? 'bg-zinc-800 text-white font-medium border border-zinc-700'
                                    : 'text-zinc-300 hover:bg-zinc-800/60 hover:text-white border border-transparent'
                                }`}
                              >
                                <div className="flex items-center gap-2 min-w-0">
                                  <NodeIcon type={node.type} className="w-3.5 h-3.5 shrink-0 text-zinc-400 group-hover:text-zinc-200" />
                                  <span className="truncate">{node.label}</span>
                                </div>

                                {tech && (
                                  <span className="text-[10px] font-mono text-zinc-400 bg-zinc-800/80 px-1.5 py-0.2 rounded border border-zinc-700/40 shrink-0 ml-1">
                                    {tech}
                                  </span>
                                )}
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}

                {/* Superseded nodes drawer */}
                {supersededNodes.length > 0 && (
                  <div className="pt-2 border-t border-zinc-800/60">
                    <button
                      onClick={() => toggleCategory('superseded')}
                      className="w-full flex items-center justify-between px-1.5 py-1 text-[11px] font-mono text-zinc-500 hover:text-zinc-400 rounded"
                    >
                      <span>Superseded Components ({supersededNodes.length})</span>
                      {collapsedCategories['superseded'] ? (
                        <ChevronRight className="w-3 h-3" />
                      ) : (
                        <ChevronDown className="w-3 h-3" />
                      )}
                    </button>

                    {!collapsedCategories['superseded'] && (
                      <div className="space-y-0.5 pl-1 mt-1">
                        {supersededNodes.map((node) => (
                          <div
                            key={node.id}
                            className="px-2 py-1 text-xs text-zinc-500 line-through truncate font-mono"
                          >
                            {node.label}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: DEPENDENCIES */}
        {activeTab === 'dependencies' && (
          <div className="flex-1 overflow-y-auto p-3">
            {activeEdges.length === 0 ? (
              <div className="p-6 text-center my-auto">
                <Network className="w-5 h-5 text-zinc-600 mx-auto mb-2" />
                <p className="text-xs text-zinc-400">No active dependencies</p>
              </div>
            ) : (
              <div className="space-y-1.5">
                <div className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider mb-2">
                  System Relationships ({activeEdges.length})
                </div>
                {activeEdges.map((edge) => {
                  const src = nodes.find((n) => n.id === edge.source);
                  const tgt = nodes.find((n) => n.id === edge.target);

                  return (
                    <div
                      key={edge.id}
                      className="p-2 rounded bg-[#12131b] border border-zinc-800/60 text-xs font-mono space-y-1"
                    >
                      <div className="flex items-center gap-1.5 text-zinc-200">
                        <span className="font-semibold text-zinc-100 truncate">{src?.label || edge.source}</span>
                        <span className="text-zinc-500">→</span>
                        <span className="font-semibold text-zinc-100 truncate">{tgt?.label || edge.target}</span>
                      </div>
                      <div className="text-[10px] text-zinc-500">
                        {edge.label || 'Direct Call'}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB 3: OVERVIEW */}
        {activeTab === 'overview' && (
          <div className="p-3.5 space-y-4 text-xs font-mono">
            <div>
              <span className="text-zinc-500 text-[10px] uppercase tracking-wider block mb-1">
                Architecture Spec
              </span>
              <div className="p-2.5 rounded bg-[#12131b] border border-zinc-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-zinc-400">Graph Version:</span>
                  <span className="font-semibold text-zinc-200">v{version}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-zinc-400">Active Components:</span>
                  <span className="font-semibold text-zinc-200">{activeNodes.length}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-zinc-400">Active Links:</span>
                  <span className="font-semibold text-zinc-200">{activeEdges.length}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-zinc-400">Superseded:</span>
                  <span className="font-semibold text-zinc-500">{supersededNodes.length}</span>
                </div>
              </div>
            </div>

            {/* Detected Technologies */}
            {currentIR?.technologies && currentIR.technologies.length > 0 && (
              <div>
                <span className="text-zinc-500 text-[10px] uppercase tracking-wider block mb-1.5">
                  Detected Technologies
                </span>
                <div className="flex flex-wrap gap-1">
                  {currentIR.technologies.map((t) => (
                    <span
                      key={t}
                      className="px-2 py-0.5 rounded bg-zinc-800/80 border border-zinc-700/60 text-zinc-300 text-[11px]"
                    >
                      {t}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div>
              <span className="text-zinc-500 text-[10px] uppercase tracking-wider block mb-1">
                Evolution Invariants
              </span>
              <div className="p-2.5 rounded bg-[#12131b] border border-zinc-800 text-[11px] text-zinc-400 space-y-1">
                <div className="flex items-center gap-1.5 text-emerald-400">
                  <span>✓</span>
                  <span>Non-destructive updates</span>
                </div>
                <div className="flex items-center gap-1.5 text-emerald-400">
                  <span>✓</span>
                  <span>Idempotent execution</span>
                </div>
                <div className="flex items-center gap-1.5 text-emerald-400">
                  <span>✓</span>
                  <span>LiveKit Full-Duplex</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Selected Node Details Drawer */}
      {selectedNode && (
        <div className="border-t border-zinc-800/80 p-3 bg-[#0a0b10] shrink-0 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Info className="w-3.5 h-3.5 text-zinc-400" />
              <span className="text-xs font-semibold text-zinc-200">
                {selectedNode.label}
              </span>
            </div>
            <button
              onClick={() => setSelectedNodeId(null)}
              className="text-zinc-500 hover:text-zinc-300 text-xs"
            >
              ✕
            </button>
          </div>

          <div className="text-[11px] font-mono text-zinc-400 space-y-1">
            <div className="flex justify-between">
              <span>Type:</span>
              <span className="text-zinc-200 font-semibold">{selectedNode.type}</span>
            </div>
            <div className="flex justify-between">
              <span>Status:</span>
              <span className="text-emerald-400">{selectedNode.status || 'active'}</span>
            </div>
            {selectedNodeIncoming.length > 0 && (
              <div className="text-[10px] text-zinc-500">
                Incoming links: {selectedNodeIncoming.length}
              </div>
            )}
            {selectedNodeOutgoing.length > 0 && (
              <div className="text-[10px] text-zinc-500">
                Outgoing links: {selectedNodeOutgoing.length}
              </div>
            )}
          </div>
        </div>
      )}
    </aside>
  );
};
