import React, { useState, useEffect } from 'react';
import { useGraphStore } from '../../state/graphStore';
import { latencyTracker } from '../../voice/latencyTracker';
import { Cpu, Layers, GitBranch, ShieldCheck, Gauge } from 'lucide-react';

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

  return (
    <footer className="h-7 border-t border-zinc-900 bg-[#06070a] px-3 flex items-center justify-between text-[11px] font-mono text-zinc-400 select-none shrink-0 z-20">
      <div className="flex items-center gap-3">
        {/* Full duplex status indicator */}
        <div className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-zinc-400">DUPLEX ARCHITECT</span>
        </div>

        <span className="text-zinc-700">|</span>

        <div className="flex items-center gap-1 text-zinc-400">
          <span>STATE:</span>
          <span
            className={`font-semibold ${
              agentStatus === 'EXECUTING'
                ? 'text-cyan-400'
                : agentStatus === 'REPLANNING'
                ? 'text-amber-400'
                : agentStatus === 'PLANNING'
                ? 'text-indigo-400'
                : 'text-zinc-300'
            }`}
          >
            {agentStatus}
          </span>
        </div>

        {pendingOps > 0 && (
          <>
            <span className="text-zinc-700">|</span>
            <div className="flex items-center gap-1 text-cyan-400">
              <Cpu className="w-3 h-3 animate-spin" />
              <span>{pendingOps} ops executing</span>
            </div>
          </>
        )}

        {e2eLatency !== null && (
          <>
            <span className="text-zinc-700">|</span>
            <div className="flex items-center gap-1 text-indigo-400">
              <Gauge className="w-3 h-3" />
              <span>{e2eLatency}ms measured E2E</span>
            </div>
          </>
        )}
      </div>

      <div className="flex items-center gap-4">
        <div className="flex items-center gap-1 text-zinc-400">
          <Layers className="w-3 h-3" />
          <span>{nodes.length} nodes · {edges.length} edges</span>
        </div>

        <span className="text-zinc-700">|</span>

        <div className="flex items-center gap-1 text-zinc-400">
          <GitBranch className="w-3 h-3 text-indigo-400" />
          <span>v{version}</span>
        </div>

        <span className="text-zinc-700">|</span>

        <div className="flex items-center gap-1 text-emerald-400/80">
          <ShieldCheck className="w-3 h-3" />
          <span>Non-destructive Evolution</span>
        </div>
      </div>
    </footer>
  );
};
