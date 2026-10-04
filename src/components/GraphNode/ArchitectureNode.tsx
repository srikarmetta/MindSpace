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
  const technology = nodeData.metadata?.technology as string | undefined;

  const theme = getNodeTheme(nodeType);

  const isRunning = status === 'running';
  const isSuperseded = status === 'superseded';
  const isInterrupted = status === 'interrupted';
  const isFailed = status === 'failed';

  // Status badge styling
  const renderStatusBadge = () => {
    switch (status) {
      case 'running':
        return (
          <span className="flex items-center gap-1 text-[10px] text-cyan-400 font-mono tracking-tight bg-cyan-950/60 px-1.5 py-0.2 rounded border border-cyan-800/40">
            <Loader2 className="w-2.5 h-2.5 animate-spin" />
            <span>running</span>
          </span>
        );
      case 'completed':
        return (
          <span className="flex items-center gap-1 text-[10px] text-emerald-400 font-mono tracking-tight">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            <span className="text-zinc-500 text-[9px]">v1</span>
          </span>
        );
      case 'superseded':
        return (
          <span className="flex items-center gap-1 text-[10px] text-zinc-500 font-mono tracking-tight bg-zinc-900 px-1 py-0.2 rounded border border-zinc-800">
            <Ban className="w-2.5 h-2.5 text-zinc-600" />
            <span className="line-through">superseded</span>
          </span>
        );
      case 'interrupted':
        return (
          <span className="flex items-center gap-1 text-[10px] text-amber-400 font-mono tracking-tight bg-amber-950/40 px-1 py-0.2 rounded border border-amber-800/40">
            <AlertCircle className="w-2.5 h-2.5" />
            <span>interrupted</span>
          </span>
        );
      case 'failed':
        return (
          <span className="flex items-center gap-1 text-[10px] text-rose-400 font-mono tracking-tight bg-rose-950/40 px-1 py-0.2 rounded border border-rose-800/40">
            <AlertCircle className="w-2.5 h-2.5" />
            <span>failed</span>
          </span>
        );
      case 'pending':
      default:
        return (
          <span className="flex items-center gap-1 text-[10px] text-zinc-500 font-mono tracking-tight">
            <span className="w-1.5 h-1.5 rounded-full bg-zinc-600" />
            <span>pending</span>
          </span>
        );
    }
  };

  return (
    <div
      className={`
        relative w-[210px] rounded-lg transition-all duration-150 select-none
        ${isSuperseded
          ? 'opacity-35 bg-zinc-950/40 border border-dashed border-zinc-800'
          : 'bg-[#18181b] border border-zinc-800 shadow-lg shadow-black/30 hover:border-zinc-700'
        }
        ${isRunning ? 'border-cyan-500/80 ring-1 ring-cyan-500/30' : ''}
        ${isInterrupted ? 'border-amber-500/70 bg-amber-950/10' : ''}
        ${isFailed ? 'border-rose-500/70' : ''}
        ${selected && !isSuperseded ? 'border-zinc-400 ring-1 ring-zinc-500' : ''}
      `}
    >
      {/* Target handle on left */}
      <Handle
        type="target"
        position={Position.Left}
        className="!bg-zinc-400 !w-2 !h-2 !border-2 !border-[#18181b]"
      />

      {/* Card Header: Type badge & Status */}
      <div className="flex items-center justify-between px-2.5 py-1.5 border-b border-zinc-800/80">
        <div className="flex items-center gap-1.5">
          <div className={`p-0.5 rounded ${theme.bg} border flex items-center justify-center shrink-0`}>
            <NodeIcon type={nodeType} className="w-3 h-3" />
          </div>
          <span className="text-[10px] font-semibold tracking-wider uppercase text-zinc-400 font-mono">
            {nodeType}
          </span>
        </div>
        {renderStatusBadge()}
      </div>

      {/* Card Body: Label, Tech Tag & Description */}
      <div className="px-2.5 py-2 space-y-1">
        <div className="flex items-center justify-between gap-1">
          <span
            className={`text-xs font-medium text-zinc-100 truncate ${
              isSuperseded ? 'line-through text-zinc-500' : ''
            }`}
            title={label}
          >
            {label}
          </span>

          {technology && !isSuperseded && (
            <span className="text-[9px] font-mono text-zinc-400 bg-zinc-800 px-1 py-0.2 rounded border border-zinc-700/60 shrink-0">
              {technology}
            </span>
          )}
        </div>

        {description && !isSuperseded && (
          <p className="text-[10px] text-zinc-500 line-clamp-1 font-normal leading-normal">
            {description}
          </p>
        )}
      </div>

      {/* Source handle on right */}
      <Handle
        type="source"
        position={Position.Right}
        className="!bg-zinc-400 !w-2 !h-2 !border-2 !border-[#18181b]"
      />
    </div>
  );
});

ArchitectureNode.displayName = 'ArchitectureNode';
