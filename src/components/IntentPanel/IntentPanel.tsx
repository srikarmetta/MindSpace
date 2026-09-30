import React from 'react';
import { useGraphStore } from '../../state/graphStore';
import { Target, History as HistoryIcon } from 'lucide-react';

export const IntentPanel: React.FC = () => {
  const currentIntent = useGraphStore((s) => s.currentIntent);
  const previousIntent = useGraphStore((s) => s.previousIntent);
  const agentStatus = useGraphStore((s) => s.agentStatus);
  const version = useGraphStore((s) => s.version);
  const activeOperations = useGraphStore((s) => s.activeOperations);
  const pendingOrRunningCount = activeOperations.filter(
    (op) => op.status === 'PENDING' || op.status === 'RUNNING'
  ).length;

  const renderStatusBadge = () => {
    if (agentStatus === 'REPLANNING') {
      return (
        <span className="px-2 py-0.5 rounded bg-amber-950/80 border border-amber-800/60 text-amber-400 text-[10px] font-mono font-bold animate-pulse">
          STATUS: REPLANNING
        </span>
      );
    }
    if (agentStatus === 'EXECUTING') {
      return (
        <span className="px-2 py-0.5 rounded bg-cyan-950/60 border border-cyan-800/40 text-cyan-400 text-[10px] font-mono animate-pulse">
          STATUS: EXECUTING
        </span>
      );
    }
    if (currentIntent?.status === 'completed' || agentStatus === 'IDLE') {
      return (
        <span className="px-2 py-0.5 rounded bg-emerald-950/60 border border-emerald-800/40 text-emerald-400 text-[10px] font-mono">
          STATUS: COMPLETED
        </span>
      );
    }
    if (agentStatus === 'PLANNING') {
      return (
        <span className="px-2 py-0.5 rounded bg-indigo-950/60 border border-indigo-800/40 text-indigo-400 text-[10px] font-mono">
          STATUS: PLANNING
        </span>
      );
    }
    return (
      <span className="px-2 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-zinc-400 text-[10px] font-mono">
        STATUS: IDLE
      </span>
    );
  };

  return (
    <div className="flex flex-col bg-[#0b0d14] border-l border-t border-zinc-800/80 p-3.5 select-text">
      {/* Panel Header */}
      <div className="flex items-center justify-between pb-2 mb-2 border-b border-zinc-800/60">
        <div className="flex items-center gap-1.5">
          <Target className="w-3.5 h-3.5 text-indigo-400" />
          <span className="text-xs font-semibold uppercase tracking-wider text-zinc-300 font-mono">
            Intent Telemetry
          </span>
        </div>
        {renderStatusBadge()}
      </div>

      {/* Content */}
      {!currentIntent ? (
        <div className="py-4 text-center">
          <p className="text-xs text-zinc-500 font-mono italic">
            Waiting for your requirement...
          </p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {/* CURRENT INTENT */}
          <div className="p-2.5 rounded-md bg-[#121520] border border-indigo-500/40 shadow-sm">
            <span className="text-[10px] font-mono text-indigo-400 uppercase font-semibold block mb-1">
              CURRENT INTENT
            </span>
            <p className="text-xs font-medium text-zinc-100 leading-relaxed break-words">
              "{currentIntent.text}"
            </p>
          </div>

          {/* PREVIOUS INTENT (if superseded/interrupted) */}
          {previousIntent && (
            <div className="p-2 rounded-md bg-zinc-950/80 border border-zinc-800 text-zinc-400">
              <div className="flex items-center gap-1.5 text-[10px] font-mono text-zinc-500 uppercase font-semibold mb-0.5">
                <HistoryIcon className="w-3 h-3 text-zinc-500" />
                <span>PREVIOUS INTENT (SUPERSEDED)</span>
              </div>
              <p className="text-xs text-zinc-400 line-through decoration-zinc-600 leading-snug">
                "{previousIntent.text}"
              </p>
            </div>
          )}

          {/* Metadata Grid */}
          <div className="grid grid-cols-2 gap-2 text-[11px] font-mono">
            <div className="p-2 rounded bg-[#10121c] border border-zinc-800/50">
              <span className="text-zinc-500 text-[10px] block">INTENT TYPE</span>
              <span className="text-indigo-300 font-semibold truncate block mt-0.5">
                {currentIntent.type}
              </span>
            </div>

            <div className="p-2 rounded bg-[#10121c] border border-zinc-800/50">
              <span className="text-zinc-500 text-[10px] block">GRAPH VERSION</span>
              <span className="text-zinc-200 font-semibold block mt-0.5">
                v{version}
              </span>
            </div>

            <div className="p-2 rounded bg-[#10121c] border border-zinc-800/50">
              <span className="text-zinc-500 text-[10px] block">TARGET DOMAIN</span>
              <span className="text-zinc-300 truncate block mt-0.5" title={currentIntent.targetDomain}>
                {currentIntent.targetDomain || 'General'}
              </span>
            </div>

            <div className="p-2 rounded bg-[#10121c] border border-zinc-800/50">
              <span className="text-zinc-500 text-[10px] block">ACTIVE OPS</span>
              <span
                className={`font-semibold block mt-0.5 ${
                  pendingOrRunningCount > 0 ? 'text-cyan-400 animate-pulse' : 'text-zinc-400'
                }`}
              >
                {pendingOrRunningCount} pending
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
