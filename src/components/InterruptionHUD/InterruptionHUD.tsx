import React from 'react';
import { useGraphStore } from '../../state/graphStore';
import {
  Zap,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  X,
  Sparkles
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
    <div className="absolute top-4 left-1/2 -translate-x-1/2 z-40 max-w-2xl w-[92%] animate-in fade-in slide-in-from-top-4 duration-300 pointer-events-auto">
      <div
        className={`rounded-xl border backdrop-blur-md shadow-2xl p-3.5 transition-all duration-300 ${
          stage === 'USER_INTERRUPTED'
            ? 'bg-rose-950/90 border-rose-500/80 shadow-rose-950/60 ring-2 ring-rose-500/40'
            : stage === 'STALE_PLAN'
            ? 'bg-amber-950/90 border-amber-500/80 shadow-amber-950/60 ring-2 ring-amber-500/40'
            : stage === 'REPLANNING'
            ? 'bg-indigo-950/90 border-indigo-500/80 shadow-indigo-950/60 ring-2 ring-indigo-500/40'
            : stage === 'NEW_INTENT'
            ? 'bg-violet-950/90 border-violet-500/80 shadow-violet-950/60 ring-2 ring-violet-500/40'
            : 'bg-emerald-950/90 border-emerald-500/80 shadow-emerald-950/60 ring-2 ring-emerald-500/40'
        }`}
      >
        <div className="flex items-start justify-between gap-3">
          {/* Main Visual Indicator */}
          <div className="flex items-center gap-3">
            <div
              className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 border ${
                stage === 'USER_INTERRUPTED'
                  ? 'bg-rose-500/20 border-rose-400 text-rose-300 animate-pulse'
                  : stage === 'STALE_PLAN'
                  ? 'bg-amber-500/20 border-amber-400 text-amber-300 animate-pulse'
                  : stage === 'REPLANNING'
                  ? 'bg-indigo-500/20 border-indigo-400 text-indigo-300 animate-spin'
                  : stage === 'NEW_INTENT'
                  ? 'bg-violet-500/20 border-violet-400 text-violet-300 animate-bounce'
                  : 'bg-emerald-500/20 border-emerald-400 text-emerald-300'
              }`}
            >
              {stage === 'USER_INTERRUPTED' ? (
                <Zap className="w-5 h-5 text-rose-400 fill-current" />
              ) : stage === 'STALE_PLAN' ? (
                <AlertTriangle className="w-5 h-5 text-amber-400" />
              ) : stage === 'REPLANNING' ? (
                <RotateCcw className="w-5 h-5 text-indigo-400" />
              ) : stage === 'NEW_INTENT' ? (
                <Sparkles className="w-5 h-5 text-violet-400" />
              ) : (
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
              )}
            </div>

            <div>
              {/* Top Status Header */}
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={`text-xs font-mono font-bold tracking-wider uppercase px-2 py-0.5 rounded border ${
                    stage === 'USER_INTERRUPTED'
                      ? 'bg-rose-900/60 border-rose-500 text-rose-200'
                      : stage === 'STALE_PLAN'
                      ? 'bg-amber-900/60 border-amber-500 text-amber-200'
                      : stage === 'REPLANNING'
                      ? 'bg-indigo-900/60 border-indigo-500 text-indigo-200'
                      : stage === 'NEW_INTENT'
                      ? 'bg-violet-900/60 border-violet-500 text-violet-200'
                      : 'bg-emerald-900/60 border-emerald-500 text-emerald-200'
                  }`}
                >
                  {stage === 'USER_INTERRUPTED' && '⚡ USER INTERRUPTED'}
                  {stage === 'STALE_PLAN' && '⚠ STALE PLAN SUPERSEDED'}
                  {stage === 'REPLANNING' && '↻ REPLANNING'}
                  {stage === 'NEW_INTENT' && '🎯 NEW INTENT DETECTED'}
                  {stage === 'STATE_COMMITTED' && `✓ STATE COMMITTED (v${version})`}
                </span>

                <span className="text-[11px] font-mono text-zinc-300">
                  {message || (stage === 'STATE_COMMITTED' ? `Committed v${version}` : 'Real-time duplex steering active')}
                </span>
              </div>

              {/* Detail Intent Progression Display */}
              <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-xs font-mono">
                {staleIntentText && (
                  <span className="text-zinc-400 line-through bg-zinc-900/60 px-2 py-0.5 rounded border border-zinc-800 text-[11px]">
                    "{staleIntentText}"
                  </span>
                )}

                {staleIntentText && (newIntentText || currentIntent?.text) && (
                  <ArrowRight className="w-3 h-3 text-zinc-400 shrink-0" />
                )}

                {(newIntentText || currentIntent?.text) && (
                  <span
                    className={`font-semibold px-2 py-0.5 rounded border text-[11px] ${
                      stage === 'STATE_COMMITTED'
                        ? 'bg-emerald-950/60 border-emerald-600/60 text-emerald-200'
                        : 'bg-indigo-950/60 border-indigo-600/60 text-indigo-200'
                    }`}
                  >
                    "{newIntentText || currentIntent?.text}"
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Dismiss button */}
          <button
            onClick={() => setInterruptionBanner(null)}
            className="text-zinc-400 hover:text-white p-1 rounded hover:bg-black/30 transition-colors shrink-0"
            title="Dismiss notification"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
