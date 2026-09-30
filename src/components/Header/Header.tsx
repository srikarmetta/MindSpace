import React, { useState, useEffect } from 'react';
import { useGraphStore } from '../../state/graphStore';
import { DEMO_INTERRUPTS, DEMO_PROMPTS } from '../../demo/demoScenario';
import { officialDemoController, type DemoStepInfo } from '../../demo/OfficialDemoController';
import { eventBridge } from '../../voice/EventBridge';
import { operationEngine } from '../../engine/operationEngine';
import {
  Sparkles,
  History,
  RotateCcw,
  Play,
  Square,
  Zap,
  ChevronDown,
  X,
  Clock,
  Layers,
  Check,
  Database
} from 'lucide-react';

export const Header: React.FC = () => {
  const version = useGraphStore((s) => s.version);
  const agentStatus = useGraphStore((s) => s.agentStatus);
  const history = useGraphStore((s) => s.history);
  const resetGraph = useGraphStore((s) => s.resetGraph);
  const restoreSnapshot = useGraphStore((s) => s.restoreSnapshot);
  const nodes = useGraphStore((s) => s.nodes);
  const edges = useGraphStore((s) => s.edges);

  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [showDemoMenu, setShowDemoMenu] = useState(false);
  const [demoStep, setDemoStep] = useState<DemoStepInfo | null>(null);

  useEffect(() => {
    return officialDemoController.onStepChange((step) => {
      setDemoStep(step);
    });
  }, []);

  // Dedicated handler for the "Build Example" / "Build Food Delivery Platform" button
  const handleBuildExample = async () => {
    await eventBridge.handleTranscript("Build a real-time food delivery platform");
  };

  const handleInterrupt = async (interruptText: string) => {
    setShowDemoMenu(false);
    await eventBridge.handleTranscript(interruptText);
  };

  const handleRunDemo = async (promptText: string) => {
    setShowDemoMenu(false);
    await eventBridge.handleTranscript(promptText);
  };

  return (
    <>
      <header className="h-14 border-b border-zinc-800/80 bg-[#090b10] px-4 flex items-center justify-between select-none z-20 shrink-0">
        {/* Brand & Tagline */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center shadow-lg shadow-indigo-600/20 border border-indigo-400/30">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm text-white tracking-tight">MindSpace</span>
                <span className="px-1.5 py-0.5 rounded bg-zinc-800/80 text-[10px] font-mono text-indigo-400 border border-indigo-500/30 font-semibold">
                  v{version}
                </span>
                <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-950/60 border border-emerald-800/40 text-[11px] font-mono text-emerald-400">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                  </span>
                  <span>LIVE</span>
                </div>
                <span
                  className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold border ${
                    eventBridge.provider.mode === 'LIVEKIT'
                      ? 'bg-emerald-950/60 text-emerald-300 border-emerald-800/50'
                      : eventBridge.provider.mode === 'BROWSER_SPEECH'
                      ? 'bg-indigo-950/60 text-indigo-300 border-indigo-800/50'
                      : 'bg-amber-950/60 text-amber-300 border-amber-800/50'
                  }`}
                  title="Voice provider execution mode"
                >
                  {eventBridge.provider.mode === 'LIVEKIT'
                    ? 'LIVEKIT'
                    : eventBridge.provider.mode === 'BROWSER_SPEECH'
                    ? 'BROWSER MIC'
                    : 'DEMO MODE'}
                </span>
              </div>
              <p className="text-[11px] text-zinc-400 font-mono -mt-0.5 hidden sm:block">
                Think out loud. Watch it evolve.
              </p>
            </div>
          </div>
        </div>

        {/* Center / Agent Status badge */}
        <div className="hidden md:flex items-center gap-2 px-3 py-1 rounded-md bg-[#11141e] border border-zinc-800 text-xs font-mono">
          <span className="text-zinc-500">ENGINE:</span>
          <span
            className={`font-semibold ${
              agentStatus === 'EXECUTING'
                ? 'text-cyan-400 animate-pulse'
                : agentStatus === 'REPLANNING'
                ? 'text-amber-400 animate-pulse'
                : agentStatus === 'PLANNING'
                ? 'text-indigo-400'
                : agentStatus === 'LISTENING'
                ? 'text-violet-400'
                : 'text-zinc-400'
            }`}
          >
            {agentStatus}
          </span>
          <span className="text-zinc-600">|</span>
          <span className="text-zinc-400 font-normal">
            {nodes.length} nodes · {edges.length} edges
          </span>
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-2">
          {/* Official 60-90s Demo Runner Button */}
          {demoStep?.status === 'running' || demoStep?.status === 'interrupted' ? (
            <button
              onClick={() => officialDemoController.stop()}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-rose-600 hover:bg-rose-500 text-white text-xs font-mono font-semibold shadow-md shadow-rose-600/30 transition-all animate-pulse active:scale-95"
              title="Stop official demo"
            >
              <Square className="w-3.5 h-3.5 fill-current" />
              <span>Stop Demo ({demoStep.stepIndex}/3)</span>
            </button>
          ) : (
            <button
              onClick={() => officialDemoController.start()}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-md bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white text-xs font-mono font-bold shadow-md shadow-indigo-600/30 border border-indigo-400/40 transition-all active:scale-95 group"
              title="Run official 60-90s end-to-end voice interruption and architecture evolution demo"
            >
              <Play className="w-3.5 h-3.5 fill-current group-hover:scale-110 transition-transform" />
              <span>Run 60s Demo</span>
            </button>
          )}

          {/* Requested Button: "Build Food Delivery Platform" / "Build Example" */}
          <button
            onClick={handleBuildExample}
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-[#121520] hover:bg-[#181d2c] border border-zinc-800 hover:border-zinc-700 text-white text-xs font-mono font-medium transition-all active:scale-95"
            title="Execute food delivery platform architecture build"
          >
            <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
            <span>Build Example</span>
          </button>

          {/* Quick Interrupt Button: "Actually, RabbitMQ" */}
          {nodes.length > 0 && (
            <button
              onClick={() => handleInterrupt('Actually, use RabbitMQ instead of Kafka.')}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-300 text-xs font-mono font-medium transition-all active:scale-95 animate-in fade-in"
              title="Interrupt mid-flight: replace Kafka with RabbitMQ"
            >
              <Zap className="w-3 h-3 text-amber-400" />
              <span>Use RabbitMQ ⚡</span>
            </button>
          )}

          {/* Evolution Button: "Billing Database" */}
          {nodes.length > 0 && (
            <button
              onClick={() => eventBridge.handleTranscript('Billing should have its own database.')}
              className="hidden md:flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-xs font-mono font-medium transition-all active:scale-95 animate-in fade-in"
              title="Evolve architecture with dedicated billing database"
            >
              <Database className="w-3 h-3 text-emerald-400" />
              <span>Add Database 📊</span>
            </button>
          )}

          {/* Quick Demo Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowDemoMenu(!showDemoMenu)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-[#121520] hover:bg-[#181d2c] border border-zinc-800 hover:border-zinc-700 text-xs font-mono text-zinc-300 hover:text-white transition-colors"
            >
              <Zap className="w-3.5 h-3.5 text-indigo-400" />
              <span className="hidden sm:inline">Scenarios</span>
              <ChevronDown className="w-3 h-3 text-zinc-400" />
            </button>

            {showDemoMenu && (
              <div className="absolute right-0 mt-2 w-72 rounded-lg bg-[#11141e] border border-zinc-800 shadow-2xl p-2 z-50 animate-in fade-in zoom-in-95">
                <div className="text-[10px] font-mono text-zinc-500 uppercase px-2 py-1">
                  Preset Architectures
                </div>
                {DEMO_PROMPTS.map((d) => (
                  <button
                    key={d.id}
                    onClick={() => handleRunDemo(d.prompt)}
                    className="w-full text-left px-2.5 py-1.5 rounded text-xs text-zinc-300 hover:text-white hover:bg-indigo-600/20 transition-colors flex items-center justify-between group"
                  >
                    <span className="truncate">{d.title}</span>
                    <Play className="w-3 h-3 opacity-0 group-hover:opacity-100 text-indigo-400 shrink-0" />
                  </button>
                ))}

                <div className="h-px bg-zinc-800 my-1.5" />
                <div className="text-[10px] font-mono text-amber-500 uppercase px-2 py-1 flex items-center gap-1">
                  <span>⚡ Simulate Live Interruption</span>
                </div>
                {DEMO_INTERRUPTS.map((interruptText, i) => (
                  <button
                    key={i}
                    onClick={() => handleInterrupt(interruptText)}
                    className="w-full text-left px-2.5 py-1.5 rounded text-xs text-amber-300/90 hover:text-amber-200 hover:bg-amber-950/40 transition-colors flex items-center justify-between group"
                  >
                    <span className="truncate">{interruptText}</span>
                    <Zap className="w-3 h-3 text-amber-400 shrink-0" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* History Button */}
          <button
            onClick={() => setShowHistoryModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-[#121520] hover:bg-[#181d2c] border border-zinc-800 hover:border-zinc-700 text-xs font-mono text-zinc-300 hover:text-white transition-colors"
          >
            <History className="w-3.5 h-3.5 text-zinc-400" />
            <span className="hidden sm:inline">History</span>
            <span className="px-1 rounded bg-zinc-800 text-[10px] text-zinc-400 font-mono">
              {history.length}
            </span>
          </button>

          {/* Reset Button */}
          <button
            onClick={() => {
              operationEngine.interrupt('Architecture reset by user');
              resetGraph();
            }}
            title="Reset Architecture Canvas"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-[#121520] hover:bg-rose-950/30 border border-zinc-800 hover:border-rose-800/40 text-xs font-mono text-zinc-300 hover:text-rose-300 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5 text-zinc-400 group-hover:text-rose-400" />
            <span className="hidden sm:inline">Reset</span>
          </button>
        </div>
      </header>

      {/* History Snapshots Modal */}
      {showHistoryModal && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-lg rounded-xl bg-[#0f121b] border border-zinc-800 shadow-2xl overflow-hidden flex flex-col max-h-[80vh]">
            <div className="px-4 py-3 border-b border-zinc-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <History className="w-4 h-4 text-indigo-400" />
                <span className="text-sm font-semibold text-white">Architecture Revision History</span>
              </div>
              <button
                onClick={() => setShowHistoryModal(false)}
                className="p-1 rounded text-zinc-400 hover:text-white hover:bg-zinc-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 space-y-2.5 overflow-y-auto flex-1">
              {history.length === 0 ? (
                <p className="text-xs text-zinc-500 font-mono text-center py-6">No snapshots saved yet.</p>
              ) : (
                history.map((snap) => (
                  <div
                    key={snap.version}
                    className={`p-3 rounded-lg border transition-all flex items-center justify-between ${
                      snap.version === version
                        ? 'bg-indigo-950/30 border-indigo-500/50'
                        : 'bg-[#141724] border-zinc-800/80 hover:border-zinc-700'
                    }`}
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono font-bold text-indigo-400">
                          v{snap.version}
                        </span>
                        <span className="text-xs font-medium text-zinc-200">
                          {snap.description}
                        </span>
                        {snap.version === version && (
                          <span className="flex items-center gap-1 text-[10px] font-mono text-emerald-400 bg-emerald-950/60 px-1.5 py-0.2 rounded border border-emerald-800/40">
                            <Check className="w-3 h-3" /> Active
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-[11px] font-mono text-zinc-400 mt-1">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" /> {snap.timestamp}
                        </span>
                        <span className="flex items-center gap-1">
                          <Layers className="w-3 h-3" /> {snap.nodes.length} nodes · {snap.edges.length} edges
                        </span>
                      </div>
                    </div>

                    {snap.version !== version && (
                      <button
                        onClick={() => {
                          restoreSnapshot(snap.version);
                          setShowHistoryModal(false);
                        }}
                        className="px-2.5 py-1 text-xs font-mono rounded bg-zinc-800 hover:bg-indigo-600 text-zinc-300 hover:text-white transition-colors"
                      >
                        Restore
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>

            <div className="px-4 py-2.5 border-t border-zinc-800 bg-[#090b10] flex justify-end">
              <button
                onClick={() => setShowHistoryModal(false)}
                className="px-3 py-1.5 text-xs font-mono rounded bg-zinc-800 text-zinc-300 hover:bg-zinc-700 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
