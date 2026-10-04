import React from 'react';
import { useGraphStore } from '../../state/graphStore';
import {
  Zap,
  RotateCcw,
  Check,
  AlertTriangle,
  ArrowRight,
  X
} from 'lucide-react';

export const InterruptionHUD: React.FC = () => {
  const interruptionBanner = useGraphStore((s) => s.interruptionBanner);
  const setInterruptionBanner = useGraphStore((s) => s.setInterruptionBanner);
  const currentIntent = useGraphStore((s) => s.currentIntent);
  const version = useGraphStore((s) => s.version);

  if (!interruptionBanner || !interruptionBanner.visible) {
    return null;
  }

  const { stage, message, staleIntentText, newIntentText } = interruptionBanner;

  return (
    <div className="absolute top-3 left-1/2 -translate-x-1/2 z-30 max-w-xl w-[90%] animate-in fade-in slide-in-from-top-2 duration-200 pointer-events-auto">
      <div className="rounded-lg border border-zinc-700/80 bg-[#12131a]/95 backdrop-blur-md shadow-xl px-3.5 py-2 transition-all">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            {/* Status indicator icon */}
            <div className="shrink-0">
              {stage === 'USER_INTERRUPTED' && (
                <div className="w-5 h-5 rounded bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400">
                  <Zap className="w-3 h-3 fill-current" />
                </div>
              )}
              {stage === 'STALE_PLAN' && (
                <div className="w-5 h-5 rounded bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
                  <AlertTriangle className="w-3 h-3" />
                </div>
              )}
              {stage === 'REPLANNING' && (
                <div className="w-5 h-5 rounded bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
                  <RotateCcw className="w-3 h-3 animate-spin" />
                </div>
              )}
              {(stage === 'NEW_INTENT' || stage === 'STATE_COMMITTED') && (
                <div className="w-5 h-5 rounded bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                  <Check className="w-3 h-3" />
                </div>
              )}
            </div>

            {/* Label and Message */}
            <div className="min-w-0 text-xs font-mono">
              <div className="flex items-center gap-2">
                <span
                  className={`text-[10px] font-bold uppercase tracking-wider ${
                    stage === 'USER_INTERRUPTED'
                      ? 'text-rose-400'
                      : stage === 'STALE_PLAN'
                      ? 'text-amber-400'
                      : stage === 'REPLANNING'
                      ? 'text-indigo-400'
                      : 'text-emerald-400'
                  }`}
                >
                  {stage === 'USER_INTERRUPTED' && 'User Interrupted'}
                  {stage === 'STALE_PLAN' && 'Stale Plan Superseded'}
                  {stage === 'REPLANNING' && 'Replanning'}
                  {stage === 'NEW_INTENT' && 'New Requirement'}
                  {stage === 'STATE_COMMITTED' && `Committed (v${version})`}
                </span>

                <span className="text-zinc-500">·</span>

                <span className="text-zinc-300 truncate text-[11px]">
                  {message || (stage === 'STATE_COMMITTED' ? `Committed v${version}` : 'Synthesizing live graph')}
                </span>
              </div>

              {/* Requirement Transition */}
              {(staleIntentText || newIntentText || currentIntent?.text) && (
                <div className="flex items-center gap-1.5 mt-0.5 text-[11px] text-zinc-400 truncate">
                  {staleIntentText && (
                    <span className="line-through text-zinc-500 truncate max-w-[180px]">
                      "{staleIntentText}"
                    </span>
                  )}
                  {staleIntentText && (newIntentText || currentIntent?.text) && (
                    <ArrowRight className="w-2.5 h-2.5 text-zinc-500 shrink-0" />
                  )}
                  {(newIntentText || currentIntent?.text) && (
                    <span className="text-zinc-200 font-medium truncate max-w-[220px]">
                      "{newIntentText || currentIntent?.text}"
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Dismiss button */}
          <button
            onClick={() => setInterruptionBanner(null)}
            className="text-zinc-500 hover:text-zinc-300 p-0.5 rounded transition-colors shrink-0"
            title="Dismiss"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
