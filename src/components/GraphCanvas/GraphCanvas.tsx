import React, { useMemo, useEffect, useCallback, useRef } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  BackgroundVariant,
  useReactFlow,
  ReactFlowProvider,
} from '@xyflow/react';
import type { NodeChange, EdgeChange } from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import { useGraphStore } from '../../state/graphStore';
import { ArchitectureNode } from '../GraphNode/ArchitectureNode';
import { EmptyState } from './EmptyState';
import { InterruptionHUD } from '../InterruptionHUD/InterruptionHUD';
import { toReactFlowNodes, toReactFlowEdges } from '../../engine/graphEngine';
import { Maximize2 } from 'lucide-react';

const nodeTypes = {
  architecture: ArchitectureNode,
  architectureNode: ArchitectureNode,
};

const GraphCanvasInner: React.FC = () => {
  const { fitView } = useReactFlow();
  const nodes = useGraphStore((s) => s.nodes);
  const edges = useGraphStore((s) => s.edges);
  const setNodes = useGraphStore((s) => s.setNodes);

  // Convert internal representation to React Flow
  const rfNodes = useMemo(() => toReactFlowNodes(nodes), [nodes]);
  const rfEdges = useMemo(() => toReactFlowEdges(edges, nodes), [edges, nodes]);

  // Keep a ref to previous node count to auto-fit view when graph expands
  const prevCountRef = useRef(nodes.length);

  useEffect(() => {
    if (nodes.length > 0 && Math.abs(nodes.length - prevCountRef.current) >= 1) {
      prevCountRef.current = nodes.length;
      const timeout = setTimeout(() => {
        fitView({ padding: 0.2, duration: 350 });
      }, 70);
      return () => clearTimeout(timeout);
    }
    prevCountRef.current = nodes.length;
  }, [nodes.length, fitView]);

  // Only handle node dragging from user, preventing infinite dimension loops
  const handleNodesChange = useCallback(
    (changes: NodeChange[]) => {
      const positionChanges = changes.filter(
        (c) => c.type === 'position' && c.position && c.dragging
      );
      if (positionChanges.length === 0) return;

      setNodes((currentNodes) =>
        currentNodes.map((n) => {
          const change = positionChanges.find((c) => c.type === 'position' && c.id === n.id);
          if (change && change.type === 'position' && change.position) {
            return { ...n, position: change.position };
          }
          return n;
        })
      );
    },
    [setNodes]
  );

  const handleEdgesChange = useCallback(
    (_changes: EdgeChange[]) => {
      // Edges are managed by Zustand graph store
    },
    []
  );

  return (
    <div className="relative w-full h-full bg-[#07080c] overflow-hidden select-none">
      {/* High-Visibility Interruption & Evolution HUD */}
      <InterruptionHUD />

      <ReactFlow
        nodes={rfNodes}
        edges={rfEdges}
        nodeTypes={nodeTypes}
        onNodesChange={handleNodesChange}
        onEdgesChange={handleEdgesChange}
        minZoom={0.2}
        maxZoom={1.5}
        defaultViewport={{ x: 60, y: 60, zoom: 0.85 }}
        proOptions={{ hideAttribution: true }}
      >
        <Background
          variant={BackgroundVariant.Dots}
          gap={24}
          size={1.2}
          color="#1e2230"
          className="bg-[#07080c]"
        />

        <Controls
          className="!bg-[#11141d] !border !border-zinc-800 !rounded-lg !shadow-xl !overflow-hidden"
          showInteractive={false}
        />
      </ReactFlow>

      {/* Fit View Shortcut Button */}
      {nodes.length > 0 && (
        <div className="absolute top-4 right-4 flex items-center gap-2 z-10">
          <button
            onClick={() => fitView({ padding: 0.2, duration: 400 })}
            title="Auto-Fit Architecture"
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-[#121520]/90 border border-zinc-800 hover:border-indigo-500/40 text-xs font-mono text-zinc-300 hover:text-white transition-all shadow-md"
          >
            <Maximize2 className="w-3.5 h-3.5 text-indigo-400" />
            <span>Fit View</span>
          </button>
        </div>
      )}

      {/* Empty State Overlay */}
      {nodes.length === 0 && <EmptyState />}
    </div>
  );
};

export const GraphCanvas: React.FC = () => {
  return (
    <ReactFlowProvider>
      <GraphCanvasInner />
    </ReactFlowProvider>
  );
};
