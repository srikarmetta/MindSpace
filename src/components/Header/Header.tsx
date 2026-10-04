import React, { useState } from 'react';
import { useGraphStore } from '../../state/graphStore';
import { eventBridge } from '../../voice/EventBridge';
import {
  Sparkles,
  History,
  RotateCcw,
  Sliders,
  Layers,
  Radio,
  X,
  Clock,
  Edit2
} from 'lucide-react';

interface HeaderProps {
  onToggleSidebar?: () => void;
  isSidebarOpen?: boolean;
}

export const Header: React.FC<HeaderProps> = ({ onToggleSidebar, isSidebarOpen = true }) => {
  const version = useGraphStore((s) => s.version);
  const agentStatus = useGraphStore((s) => s.agentStatus);
  const history = useGraphStore((s) => s.history);
  const resetGraph = useGraphStore((s) => s.resetGraph);
  const restoreSnapshot = useGraphStore((s) => s.restoreSnapshot);
  const nodes = useGraphStore((s) => s.nodes);
  const edges = useGraphStore((s) => s.edges);

  const [projectName, setProjectName] = useState('Untitled Architecture');
  const [isEditingName, setIsEditingName] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);

  // Active counts
  const activeNodesCount = nodes.filter((n) => n.status !== 'superseded').length;
  const activeEdgesCount = edges.filter((e) => e.status !== 'superseded').length;

  const handleNameSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsEditingName(false);
  };

  const voiceMode = eventBridge.provider.mode;
  const voiceState = eventBridge.provider.getState();

  return (
    <>
      <header className="h-12 border-b border-zinc-800 bg-[#09090b] px-4 flex items-center justify-between select-none z-20 shrink-0">
        {/* Left: Brand & Workspace / Project Name */}
        <div className="flex items-center gap-3 min-w-0">
          {/* Sidebar Toggle */}
          {onToggleSidebar && (
            <button
              onClick={onToggleSidebar}
              title={isSidebarOpen ? 'Hide Component Sidebar' : 'Show Component Sidebar'}
              className="p-1.5 rounded hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 transition-colors"
            >
              <Sliders className="w-4 h-4" />
            </button>
          )}

          {/* Logo & Product Name */}
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-zinc-800 border border-zinc-700/80 flex items-center justify-center shrink-0">
              <Sparkles className="w-3.5 h-3.5 text-zinc-100" />
            </div>
            <span className="font-semibold text-xs text-zinc-100 tracking-tight">MindSpace</span>
          </div>

          <span className="text-zinc-600 font-normal">/</span>

          {/* Project Title (Editable) */}
          {isEditingName ? (
            <form onSubmit={handleNameSubmit} className="flex items-center">
              <input
                type="text"
                autoFocus
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                onBlur={() => setIsEditingName(false)}
                className="bg-zinc-900 border border-zinc-700 text-xs text-zinc-100 px-2 py-0.5 rounded focus:outline-none focus:border-zinc-500 font-medium"
              />
            </form>
          ) : (
            <button
              onClick={() => setIsEditingName(true)}
              className="flex items-center gap-1.5 text-xs text-zinc-300 hover:text-white px-1.5 py-0.5 rounded hover:bg-zinc-800/60 transition-colors group"
              title="Click to rename project"
            >
              <span className="truncate max-w-[200px] font-medium">{projectName}</span>
              <Edit2 className="w-3 h-3 text-zinc-600 group-hover:text-zinc-400 transition-colors" />
            </button>
          )}

          {/* Version badge */}
          <span className="px-1.5 py-0.5 rounded bg-zinc-900 text-[10px] font-mono text-zinc-400 border border-zinc-800">
            v{version}
          </span>
        </div>

        {/* Center: Real Runtime Status Indicator */}
        <div className="hidden md:flex items-center gap-2 px-3 py-1 rounded bg-zinc-900/80 border border-zinc-800 text-[11px] font-mono">
          <span
            className={`w-1.5 h-1.5 rounded-full shrink-0 ${
              agentStatus === 'EXECUTING'
                ? 'bg-cyan-400 animate-pulse'
                : agentStatus === 'REPLANNING'
                ? 'bg-amber-400 animate-pulse'
                : agentStatus === 'PLANNING'
                ? 'bg-indigo-400'
                : agentStatus === 'LISTENING'
                ? 'bg-rose-400 animate-pulse'
                : 'bg-emerald-500'
            }`}
          />
          <span className="text-zinc-400">
            {agentStatus === 'EXECUTING'
              ? 'Executing Operations'
              : agentStatus === 'REPLANNING'
              ? 'Replanning Architecture'
              : agentStatus === 'PLANNING'
              ? 'Synthesizing Architecture'
              : agentStatus === 'LISTENING'
              ? 'Listening'
              : 'Local Runtime (Idle)'}
          </span>

          <span className="text-zinc-700">|</span>

          <span className="text-zinc-500">
            {activeNodesCount} components · {activeEdgesCount} links
          </span>
        </div>

        {/* Right: Telemetry, History, Canvas Actions */}
        <div className="flex items-center gap-2">
          {/* Real Voice Mode Indicator */}
          <div
            className="flex items-center gap-1.5 px-2 py-1 rounded bg-zinc-900 border border-zinc-800 text-[10px] font-mono text-zinc-400"
            title={`Voice provider: ${voiceMode}`}
          >
            <Radio className={`w-3 h-3 ${voiceState === 'LISTENING' ? 'text-rose-400 animate-pulse' : 'text-zinc-500'}`} />
            <span>
              {voiceMode === 'LIVEKIT'
                ? 'LiveKit'
                : voiceMode === 'BROWSER_SPEECH'
                ? 'Browser Mic'
                : 'Voice Ready'}
            </span>
          </div>

          {/* History / Snapshot Modal Trigger */}
          <button
            onClick={() => setShowHistoryModal(true)}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 hover:border-zinc-700 text-xs font-mono text-zinc-300 hover:text-white transition-colors"
            title="View architecture evolution history snapshots"
          >
            <History className="w-3.5 h-3.5 text-zinc-400" />
            <span className="hidden sm:inline">History</span>
            <span className="px-1 rounded bg-zinc-800 text-[10px] text-zinc-400 font-mono">
              {history.length}
            </span>
          </button>

          {/* Clean Reset Canvas */}
          <button
            onClick={() => resetGraph()}
            className="flex items-center gap-1 px-2.5 py-1 rounded bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 hover:border-zinc-700 text-xs font-mono text-zinc-400 hover:text-zinc-200 transition-colors"
            title="Reset architecture to empty canvas"
          >
            <RotateCcw className="w-3 h-3" />
            <span className="hidden sm:inline">Reset</span>
          </button>
        </div>
      </header>

      {/* Snapshots / History Modal */}
      {showHistoryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-[#10121a] border border-zinc-800 rounded-xl shadow-2xl max-w-lg w-full max-h-[80vh] flex flex-col overflow-hidden">
            <div className="px-4 py-3 border-b border-zinc-800 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <History className="w-4 h-4 text-zinc-300" />
                <span className="font-semibold text-sm text-zinc-100">
                  Architecture Revision History
                </span>
              </div>
              <button
                onClick={() => setShowHistoryModal(false)}
                className="text-zinc-500 hover:text-zinc-300 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {history.map((snap) => {
                const isCurrent = snap.version === version;
                return (
                  <div
                    key={snap.version}
                    className={`p-3 rounded-lg border text-left flex items-start justify-between gap-3 transition-colors ${
                      isCurrent
                        ? 'bg-zinc-800/80 border-zinc-700'
                        : 'bg-zinc-900/60 border-zinc-800/80 hover:bg-zinc-900'
                    }`}
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-zinc-200">
                          v{snap.version}
                        </span>
                        {isCurrent && (
                          <span className="px-1.5 py-0.2 rounded bg-emerald-950/80 text-emerald-400 text-[10px] font-mono border border-emerald-800/50">
                            Current
                          </span>
                        )}
                        <span className="text-[11px] font-mono text-zinc-500 flex items-center gap-1">
                          <Clock className="w-2.5 h-2.5" />
                          {snap.timestamp}
                        </span>
                      </div>
                      <p className="text-xs text-zinc-300 mt-1 font-medium leading-relaxed">
                        {snap.description}
                      </p>
                      <div className="flex items-center gap-2 text-[10px] font-mono text-zinc-500 mt-1.5">
                        <Layers className="w-2.5 h-2.5" />
                        <span>{snap.nodes.length} nodes · {snap.edges.length} edges</span>
                      </div>
                    </div>

                    {!isCurrent && (
                      <button
                        onClick={() => {
                          restoreSnapshot(snap.version);
                          setShowHistoryModal(false);
                        }}
                        className="px-2.5 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-mono font-medium transition-colors shrink-0"
                      >
                        Restore
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </>
  );
};
