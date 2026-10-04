import React, { useState, useEffect } from 'react';
import { useGraphStore } from '../../state/graphStore';
import { latencyTracker } from '../../voice/latencyTracker';
import { Cpu, Layers, GitBranch, Gauge } from 'lucide-react';

export const StatusBar: React.FC = () => {
  const agentStatus = useGraphStore((s) => s.agentStatus);
  const version = useGraphStore((s) => s.version);
  const nodes = useGraphStore((s) => s.nodes);
  const edges = useGraphStore((s) => s.edges);
  const activeOperations = useGraphStore((s) => s.activeOperations);
  const [e2eLatency, setE2eLatency] = useState<number | null>(null);

  useEffect(() => {
    return latencyTracker.subscribe((metrics) => {
      setE2eLatency(metrics.e2eLatencyMs);
    });
  }, []);

  const pendingOps = activeOperations.filter(
    (op) => op.status === 'PENDING' || op.status === 'RUNNING'
  ).length;

  const activeNodesCount = nodes.filter((n) => n.status !== 'superseded').length;
  const activeEdgesCount = edges.filter((e) => e.status !== 'superseded').length;

  return (
    <footer className="h-6 border-t border-zinc-800/80 bg-[#09090b] px-3 flex items-center justify-between text-[11px] font-mono text-zinc-500 select-none shrink-0 z-20">
      <div className="flex items-center gap-3">
        {/* Runtime Engine State */}
        <div className="flex items-center gap-1.5">
          <span
            className={`w-1.5 h-1.5 rounded-full ${
              agentStatus === 'EXECUTING'
                ? 'bg-cyan-400 animate-pulse'
                : agentStatus === 'REPLANNING'
                ? 'bg-amber-400 animate-pulse'
                : agentStatus === 'PLANNING'
                ? 'bg-indigo-400'
                : 'bg-emerald-500'
            }`}
          />
          <span className="text-zinc-400 uppercase text-[10px]">
            {agentStatus}
          </span>
        </div>

        {pendingOps > 0 && (
          <>
            <span className="text-zinc-800">|</span>
            <div className="flex items-center gap-1 text-cyan-400 text-[10px]">
              <Cpu className="w-3 h-3 animate-spin" />
              <span>{pendingOps} ops executing</span>
            </div>
          </>
        )}

        {e2eLatency !== null && (
          <>
            <span className="text-zinc-800">|</span>
            <div className="flex items-center gap-1 text-zinc-400 text-[10px]">
              <Gauge className="w-3 h-3 text-zinc-500" />
              <span>{e2eLatency}ms measured E2E</span>
            </div>
          </>
        )}
      </div>

      <div className="flex items-center gap-3 text-[10px]">
        <div className="flex items-center gap-1 text-zinc-400">
          <Layers className="w-3 h-3 text-zinc-500" />
          <span>{activeNodesCount} nodes · {activeEdgesCount} edges</span>
        </div>

        <span className="text-zinc-800">|</span>

        <div className="flex items-center gap-1 text-zinc-400">
          <GitBranch className="w-3 h-3 text-zinc-500" />
          <span>v{version}</span>
        </div>
      </div>
    </footer>
  );
};
