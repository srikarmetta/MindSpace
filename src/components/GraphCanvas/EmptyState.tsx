import React from 'react';
import { useGraphStore } from '../../state/graphStore';
import { Sparkles, ArrowRight, Layers } from 'lucide-react';
import { FOOD_DELIVERY_PROMPT } from '../../demo/demoScenario';

interface EmptyStateProps {
  onSelectPrompt?: (promptText: string) => void;
}

export const EmptyState: React.FC<EmptyStateProps> = () => {
  const setInputPrompt = useGraphStore((s) => s.setInputPrompt);

  const handleExampleClick = () => {
    setInputPrompt(FOOD_DELIVERY_PROMPT);
  };

  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center p-6 pointer-events-auto z-10 bg-transparent">
      <div className="max-w-2xl w-full text-center space-y-6 animate-in fade-in zoom-in-95 duration-300">
        {/* Badge */}
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs font-mono tracking-wide">
          <Sparkles className="w-3.5 h-3.5 text-indigo-400 animate-pulse" />
          <span>Full-Duplex Architecture Engine</span>
        </div>

        {/* Required Headline & Tagline */}
        <div className="space-y-2">
          <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
            Your architecture starts here
          </h2>
          <p className="text-base text-zinc-400 max-w-lg mx-auto leading-relaxed">
            Describe a system and watch MindSpace build it.
          </p>
        </div>

        {/* Clickable Food Delivery Platform Featured Card */}
        <div className="text-left pt-2">
          <div className="text-xs font-mono text-zinc-500 uppercase tracking-wider px-1 mb-2">
            Try an architecture prompt (Click to populate):
          </div>

          <button
            onClick={handleExampleClick}
            className="group w-full relative flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 rounded-xl bg-[#10131e]/90 hover:bg-[#161a29] border border-zinc-800/90 hover:border-indigo-500/60 transition-all duration-200 text-left shadow-2xl shadow-black/50 group"
          >
            <div className="flex items-start gap-3.5 min-w-0">
              <div className="mt-1 p-2.5 rounded-lg bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 group-hover:scale-105 transition-transform shrink-0">
                <Layers className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <div className="text-sm font-semibold text-zinc-100 group-hover:text-indigo-200 transition-colors flex items-center gap-2">
                  <span>"{FOOD_DELIVERY_PROMPT}"</span>
                </div>
                <p className="text-xs text-zinc-400 mt-1 font-normal leading-relaxed">
                  Real-time distributed food ordering, async event streaming, courier tracking & persistent ledger.
                </p>
                <div className="flex flex-wrap gap-1.5 mt-2.5">
                  {['Customer App', 'API Gateway', 'Order Service', 'Kafka', 'Delivery Service', 'PostgreSQL'].map(
                    (tag) => (
                      <span
                        key={tag}
                        className="text-[10px] font-mono text-zinc-300 bg-zinc-900/90 px-2 py-0.5 rounded border border-zinc-800"
                      >
                        {tag}
                      </span>
                    )
                  )}
                </div>
              </div>
            </div>

            <div className="mt-3 sm:mt-0 sm:ml-4 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600/20 text-indigo-300 border border-indigo-500/30 group-hover:bg-indigo-600 group-hover:text-white transition-all shrink-0 text-xs font-mono font-medium">
              <span>Use Prompt</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
            </div>
          </button>
        </div>

        {/* Mini Flow preview */}
        <div className="p-3.5 rounded-lg bg-[#0c0e17]/80 border border-zinc-900 text-xs font-mono text-zinc-500 flex flex-wrap items-center justify-center gap-2">
          <span className="text-sky-400">Customer App</span>
          <span>→</span>
          <span className="text-cyan-400">API Gateway</span>
          <span>→</span>
          <span className="text-emerald-400">Order Service</span>
          <span>→</span>
          <span className="text-indigo-400">Kafka</span>
          <span>→</span>
          <span className="text-emerald-400">Delivery Service</span>
          <span>→</span>
          <span className="text-amber-400">PostgreSQL</span>
        </div>

        <p className="text-[11px] text-zinc-500 font-mono">
          Interrupt or pivot requirements at any second while the graph constructs live.
        </p>
      </div>
    </div>
  );
};
