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
        <span className="px-1.5 py-0.2 rounded bg-amber-950/80 border border-amber-800/60 text-amber-400 text-[10px] font-mono font-bold animate-pulse">
          REPLANNING
        </span>
      );
    }
    if (agentStatus === 'EXECUTING') {
      return (
        <span className="px-1.5 py-0.2 rounded bg-cyan-950/60 border border-cyan-800/40 text-cyan-400 text-[10px] font-mono animate-pulse">
          EXECUTING
        </span>
      );
    }
    if (currentIntent?.status === 'completed' || agentStatus === 'IDLE') {
      return (
        <span className="px-1.5 py-0.2 rounded bg-emerald-950/60 border border-emerald-800/40 text-emerald-400 text-[10px] font-mono">
          COMMITTED
        </span>
      );
    }
    if (agentStatus === 'PLANNING') {
      return (
        <span className="px-1.5 py-0.2 rounded bg-indigo-950/60 border border-indigo-800/40 text-indigo-400 text-[10px] font-mono">
          PLANNING
        </span>
      );
    }
    return (
      <span className="px-1.5 py-0.2 rounded bg-zinc-900 border border-zinc-800 text-zinc-500 text-[10px] font-mono">
        IDLE
      </span>
    );
  };

  return (
    <div className="flex flex-col bg-[#090a0f] border-l border-t border-zinc-800/80 p-3 select-text">
      {/* Panel Header */}
      <div className="flex items-center justify-between pb-2 mb-2 border-b border-zinc-800/60">
        <div className="flex items-center gap-1.5">
          <Target className="w-3.5 h-3.5 text-zinc-400" />
          <span className="text-xs font-semibold uppercase tracking-wider text-zinc-300 font-mono">
            Active Intent
          </span>
        </div>
        {renderStatusBadge()}
      </div>

      {/* Content */}
      {!currentIntent ? (
        <div className="py-3 text-center">
          <p className="text-[11px] text-zinc-500 font-mono">
            Awaiting architecture prompt...
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {/* CURRENT INTENT */}
          <div className="p-2 rounded bg-zinc-900 border border-zinc-700/80 shadow-sm">
            <span className="text-[9px] font-mono text-zinc-400 uppercase font-semibold block mb-0.5">
              CURRENT REQUIREMENT
            </span>
            <p className="text-xs font-medium text-zinc-100 leading-relaxed break-words">
              "{currentIntent.text}"
            </p>
          </div>

          {/* PREVIOUS INTENT (if superseded/interrupted) */}
          {previousIntent && (
            <div className="p-2 rounded bg-zinc-950 border border-zinc-800 text-zinc-400">
              <div className="flex items-center gap-1 text-[9px] font-mono text-zinc-500 uppercase font-semibold mb-0.5">
                <HistoryIcon className="w-2.5 h-2.5 text-zinc-500" />
                <span>SUPERSEDED REQUIREMENT</span>
              </div>
              <p className="text-xs text-zinc-500 line-through leading-snug">
                "{previousIntent.text}"
              </p>
            </div>
          )}

          {/* Metadata Grid */}
          <div className="grid grid-cols-2 gap-1.5 text-[11px] font-mono">
            <div className="p-1.5 rounded bg-zinc-900/60 border border-zinc-800/60">
              <span className="text-zinc-500 text-[9px] block">TYPE</span>
              <span className="text-zinc-300 font-semibold truncate block mt-0.5">
                {currentIntent.type}
              </span>
            </div>

            <div className="p-1.5 rounded bg-zinc-900/60 border border-zinc-800/60">
              <span className="text-zinc-500 text-[9px] block">VERSION</span>
              <span className="text-zinc-300 font-semibold block mt-0.5">
                v{version}
              </span>
            </div>

            <div className="p-1.5 rounded bg-zinc-900/60 border border-zinc-800/60">
              <span className="text-zinc-500 text-[9px] block">DOMAIN</span>
              <span className="text-zinc-300 truncate block mt-0.5" title={currentIntent.targetDomain}>
                {currentIntent.targetDomain || 'General'}
              </span>
            </div>

            <div className="p-1.5 rounded bg-zinc-900/60 border border-zinc-800/60">
              <span className="text-zinc-500 text-[9px] block">OPS RUNNING</span>
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
