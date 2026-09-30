import React, { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import type { NodeProps } from '@xyflow/react';
import { NodeIcon } from './NodeIcon';
import { getNodeTheme } from './nodeThemes';
import type { NodeType, NodeStatus } from '../../types/graph';
import { Loader2, AlertCircle, Ban } from 'lucide-react';

export interface ArchitectureNodeData {
  id?: string;
  type?: NodeType;
  nodeType?: NodeType;
  label?: string;
  description?: string;
  status?: NodeStatus;
  metadata?: Record<string, unknown>;
}

export const ArchitectureNode: React.FC<NodeProps> = memo(({ data, selected }) => {
  const nodeData = (data || {}) as unknown as ArchitectureNodeData;
  const nodeType = (nodeData.nodeType || nodeData.type || 'generic') as NodeType;
  const label = nodeData.label || 'Node';
  const description = nodeData.description;
  const status = (nodeData.status || 'completed') as NodeStatus;

  const theme = getNodeTheme(nodeType);

  const isRunning = status === 'running';
  const isSuperseded = status === 'superseded';
  const isInterrupted = status === 'interrupted';

  // Status badge styling
  const renderStatusBadge = () => {
    switch (status) {
      case 'running':
        return (
          <span className="flex items-center gap-1 text-[10px] text-cyan-400 font-mono tracking-tight bg-cyan-950/60 px-1.5 py-0.5 rounded border border-cyan-800/40">
            <Loader2 className="w-2.5 h-2.5 animate-spin" />
            <span>running</span>
          </span>
        );
      case 'completed':
        return (
          <span className="flex items-center gap-1 text-[10px] text-emerald-400 font-mono tracking-tight bg-emerald-950/50 px-1.5 py-0.5 rounded border border-emerald-800/40">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            <span>completed</span>
          </span>
        );
      case 'superseded':
        return (
          <span className="flex items-center gap-1 text-[10px] text-zinc-400 font-mono tracking-tight bg-zinc-800/80 px-1.5 py-0.5 rounded border border-zinc-700/60">
            <Ban className="w-2.5 h-2.5 text-zinc-400" />
            <span className="line-through decoration-zinc-500">superseded</span>
          </span>
        );
      case 'interrupted':
        return (
          <span className="flex items-center gap-1 text-[10px] text-amber-400 font-mono tracking-tight bg-amber-950/50 px-1.5 py-0.5 rounded border border-amber-800/40">
            <AlertCircle className="w-2.5 h-2.5 text-amber-400" />
            <span>interrupted</span>
          </span>
        );
      case 'failed':
        return (
          <span className="flex items-center gap-1 text-[10px] text-rose-400 font-mono tracking-tight bg-rose-950/50 px-1.5 py-0.5 rounded border border-rose-800/40">
            <AlertCircle className="w-2.5 h-2.5 text-rose-400" />
            <span>failed</span>
          </span>
        );
      case 'pending':
      default:
        return (
          <span className="flex items-center gap-1 text-[10px] text-zinc-500 font-mono tracking-tight bg-zinc-900 px-1.5 py-0.5 rounded border border-zinc-800">
            <span className="w-1.5 h-1.5 rounded-full bg-zinc-500" />
            <span>pending</span>
          </span>
        );
    }
  };

  return (
    <div
      className={`
        relative w-[230px] rounded-lg transition-all duration-300 backdrop-blur-md select-none
        ${isSuperseded 
          ? 'opacity-40 bg-zinc-950/60 border border-dashed border-zinc-700 hover:opacity-75' 
          : 'bg-[#10131d]/90 border border-zinc-800/90 shadow-lg shadow-black/40 hover:border-zinc-700 hover:shadow-indigo-500/5'
        }
        ${isRunning ? 'border-cyan-500 ring-2 ring-cyan-500/20 node-running-pulse shadow-cyan-950/50' : ''}
        ${isInterrupted ? 'border-amber-500/80 bg-amber-950/10' : ''}
        ${selected ? 'ring-1 ring-indigo-500 border-indigo-500' : ''}
      `}
    >
      {/* Target handle on left */}
      <Handle
        type="target"
        position={Position.Left}
        className="!bg-indigo-400 !w-2.5 !h-2.5 !border-2 !border-[#090a0f]"
      />

      {/* Card Header: Type badge & Status */}
      <div className="flex items-center justify-between px-3 pt-2.5 pb-1.5 border-b border-zinc-800/60">
        <div className="flex items-center gap-1.5">
          <div className={`p-1 rounded ${theme.bg} border flex items-center justify-center`}>
            <NodeIcon type={nodeType} className="w-3.5 h-3.5" />
          </div>
          <span className="text-[10px] font-semibold tracking-wider uppercase text-zinc-400 font-mono">
            {nodeType}
          </span>
        </div>
        {renderStatusBadge()}
      </div>

      {/* Card Body: Label & Description */}
      <div className="px-3 py-2">
        <div className={`text-xs font-semibold text-zinc-100 truncate ${isSuperseded ? 'line-through text-zinc-400' : ''}`}>
          {label}
        </div>
        {description && (
          <p className="text-[11px] text-zinc-400 mt-0.5 line-clamp-1 font-normal leading-relaxed">
            {description}
          </p>
        )}
      </div>

      {/* Source handle on right */}
      <Handle
        type="source"
        position={Position.Right}
        className="!bg-indigo-400 !w-2.5 !h-2.5 !border-2 !border-[#090a0f]"
      />
    </div>
  );
});

ArchitectureNode.displayName = 'ArchitectureNode';
