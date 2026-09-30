import React, { useRef, useEffect } from 'react';
import { useGraphStore } from '../../state/graphStore';
import type { ActivityEvent } from '../../types/graph';
import {
  Check,
  Loader2,
  AlertCircle,
  Ban,
  Info,
  Clock,
  Activity as ActivityIcon
} from 'lucide-react';

export const ActivityPanel: React.FC = () => {
  const activities = useGraphStore((s) => s.activities);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to top when a new activity arrives
  useEffect(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = 0;
    }
  }, [activities]);

  const renderStatusIcon = (status: ActivityEvent['status']) => {
    switch (status) {
      case 'completed':
        return <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />;
      case 'running':
        return <Loader2 className="w-3.5 h-3.5 text-cyan-400 animate-spin shrink-0" />;
      case 'interrupted':
        return <AlertCircle className="w-3.5 h-3.5 text-amber-400 shrink-0" />;
      case 'superseded':
        return <Ban className="w-3.5 h-3.5 text-zinc-500 shrink-0" />;
      case 'error':
        return <AlertCircle className="w-3.5 h-3.5 text-rose-400 shrink-0" />;
      case 'info':
      default:
        return <Info className="w-3.5 h-3.5 text-indigo-400 shrink-0" />;
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#0d0f17] border-l border-zinc-800/80">
      {/* Panel Header */}
      <div className="h-10 px-3.5 border-b border-zinc-800/80 flex items-center justify-between bg-[#0a0c13] shrink-0">
        <div className="flex items-center gap-2">
          <ActivityIcon className="w-3.5 h-3.5 text-indigo-400" />
          <span className="text-xs font-semibold uppercase tracking-wider text-zinc-300 font-mono">
            Agent Activity
          </span>
        </div>
        <span className="text-[10px] font-mono text-zinc-500">
          {activities.length} events
        </span>
      </div>

      {/* Activity Timeline List */}
      <div
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto p-3 space-y-2 select-text"
      >
        {activities.map((item, idx) => (
          <div
            key={item.id}
            className={`flex items-start gap-2.5 p-2 rounded-md transition-all duration-200 text-xs font-mono border ${
              idx === 0
                ? 'bg-[#141724]/90 border-indigo-500/20 shadow-sm'
                : 'bg-[#10121c]/60 border-zinc-800/40 hover:bg-[#141724]/50'
            }`}
          >
            <div className="mt-0.5">{renderStatusIcon(item.status)}</div>
            <div className="flex-1 min-w-0">
              <p
                className={`text-xs leading-snug break-words ${
                  item.status === 'superseded'
                    ? 'text-zinc-500 line-through'
                    : item.status === 'interrupted'
                    ? 'text-amber-300 font-medium'
                    : item.status === 'running'
                    ? 'text-cyan-300'
                    : 'text-zinc-300'
                }`}
              >
                {item.message}
              </p>
              <div className="flex items-center gap-1 text-[10px] text-zinc-500 mt-1">
                <Clock className="w-2.5 h-2.5" />
                <span>{item.timestamp}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
