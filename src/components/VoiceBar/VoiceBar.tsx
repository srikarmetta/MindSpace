import React, { useState, useEffect, useRef } from 'react';
import { useGraphStore } from '../../state/graphStore';
import { eventBridge } from '../../voice/EventBridge';
import { latencyTracker } from '../../voice/latencyTracker';
import type { VoiceState, VoiceMode, VoiceLatencyMetrics } from '../../voice/types';
import { LatencyModal } from './LatencyModal';
import {
  Mic,
  Send,
  Zap,
  Volume2,
  Gauge,
  Radio,
  Sparkles,
  X
} from 'lucide-react';

export const VoiceBar: React.FC = () => {
  const [inputValue, setInputValue] = useState('');
  const [voiceState, setVoiceState] = useState<VoiceState>(eventBridge.provider.getState());
  const [voiceMode] = useState<VoiceMode>(eventBridge.provider.mode);
  const [agentSpeech, setAgentSpeech] = useState<string>('');
  const [showSpeechBubble, setShowSpeechBubble] = useState(false);
  const [showLatencyModal, setShowLatencyModal] = useState(false);
  const [latencyMetrics, setLatencyMetrics] = useState<VoiceLatencyMetrics>(latencyTracker.getMetrics());
  const [showVoiceChips, setShowVoiceChips] = useState(false);
  const [capturedFromVoice, setCapturedFromVoice] = useState(false);
  const [voiceNotice, setVoiceNotice] = useState<string | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);
  const speechBubbleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const agentStatus = useGraphStore((s) => s.agentStatus);
  const inputPrompt = useGraphStore((s) => s.inputPrompt);
  const setInputPrompt = useGraphStore((s) => s.setInputPrompt);
  const isExecuting = agentStatus === 'EXECUTING';

  useEffect(() => {
    if (inputPrompt) {
      const timer = setTimeout(() => {
        setInputValue(inputPrompt);
        setInputPrompt('');
        inputRef.current?.focus();
      }, 10);
      return () => clearTimeout(timer);
    }
  }, [inputPrompt, setInputPrompt]);

  // Subscribe to voice transcripts, state, agent speech, and latency telemetry
  useEffect(() => {
    // Microphone transcript captures into input box for review before sending
    const unsubTranscript = eventBridge.provider.onTranscript((transcript) => {
      setInputValue(transcript.text);
      setCapturedFromVoice(true);
      inputRef.current?.focus();

      if (transcript.isFinal) {
        eventBridge.provider.stop();
      }
    });

    const unsubState = eventBridge.provider.onStateChange((state) => {
      setVoiceState(state);
    });

    const unsubSpeech = eventBridge.subscribeToAgentSpeech((text) => {
      if (text) {
        setAgentSpeech(text);
        setShowSpeechBubble(true);
        if (speechBubbleTimerRef.current) {
          clearTimeout(speechBubbleTimerRef.current);
        }
        speechBubbleTimerRef.current = setTimeout(() => {
          setShowSpeechBubble(false);
        }, 5500);
      }
    });

    const unsubLatency = latencyTracker.subscribe((metrics) => {
      setLatencyMetrics(metrics);
    });

    return () => {
      unsubTranscript();
      unsubState();
      unsubSpeech();
      unsubLatency();
      if (speechBubbleTimerRef.current) {
        clearTimeout(speechBubbleTimerRef.current);
      }
    };
  }, []);

  // Canonical submission handler for all requirement inputs (typed, reviewed voice, or example)
  const submitRequirement = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;

    setInputValue('');
    setCapturedFromVoice(false);
    setShowVoiceChips(false);
    setVoiceNotice(null);

    // Route directly through the EventBridge full-duplex pipeline
    await eventBridge.handleTranscript(trimmed);
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    await submitRequirement(inputValue);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (isExecuting && !inputValue.trim()) {
        handleInterruptClick();
      } else {
        submitRequirement(inputValue);
      }
    }
  };

  // Trigger simulated voice input into input box for review
  const handleSimulateVoice = (promptText: string) => {
    setInputValue(promptText);
    setCapturedFromVoice(true);
    setShowVoiceChips(false);
    inputRef.current?.focus();
  };

  // Toggle microphone
  const handleMicClick = async () => {
    setVoiceNotice(null);
    if (voiceState === 'LISTENING') {
      await eventBridge.provider.stop();
      setShowVoiceChips(false);
    } else {
      if (voiceMode === 'MOCK_DEMO') {
        setShowVoiceChips(true);
        setVoiceNotice('Microphone in Demo Mode. Select a simulated speech phrase below or type directly.');
      } else {
        try {
          await eventBridge.provider.start();
        } catch (err: any) {
          console.warn('[VoiceBar] Failed to start microphone:', err);
          setShowVoiceChips(true);
          setVoiceNotice('Microphone access unavailable. You can use simulation chips or type directly.');
        }
      }
    }
  };

  const handleInterruptClick = () => {
    if (inputValue.trim()) {
      submitRequirement(inputValue);
    } else {
      eventBridge.handleInterruption();
    }
  };

  return (
    <>
      <div className="border-t border-zinc-800/80 bg-[#090b10] px-4 py-3 shrink-0 relative">
        {/* Live Agent Vocal Speech Bubble */}
        {showSpeechBubble && agentSpeech && (
          <div className="absolute -top-12 left-1/2 -translate-x-1/2 max-w-lg w-[90%] z-30 animate-in fade-in slide-in-from-bottom-2 duration-200">
            <div className="bg-[#121624] border border-indigo-500/40 rounded-lg px-3.5 py-2 shadow-xl shadow-indigo-950/40 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 min-w-0">
                <Volume2 className="w-4 h-4 text-indigo-400 shrink-0 animate-pulse" />
                <span className="text-[10px] font-mono uppercase text-indigo-400 font-bold shrink-0">
                  Agent:
                </span>
                <span className="text-xs text-zinc-100 italic truncate font-medium">
                  "{agentSpeech}"
                </span>
              </div>
              <button
                onClick={() => setShowSpeechBubble(false)}
                className="text-zinc-500 hover:text-zinc-300 p-0.5"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        <div className="max-w-4xl mx-auto space-y-2">
          {/* Top Voice Status & Latency Ribbon */}
          <div className="flex items-center justify-between text-xs font-mono">
            {/* Left: Mode Badge & Live Voice State */}
            <div className="flex items-center gap-2">
              {/* Mode indicator */}
              <span
                className={`flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold border ${
                  voiceMode === 'LIVEKIT'
                    ? 'bg-emerald-950/40 border-emerald-800/50 text-emerald-300'
                    : voiceMode === 'BROWSER_SPEECH'
                    ? 'bg-indigo-950/40 border-indigo-800/50 text-indigo-300'
                    : 'bg-amber-950/40 border-amber-800/50 text-amber-300'
                }`}
                title={
                  voiceMode === 'LIVEKIT'
                    ? 'LiveKit WebRTC active'
                    : voiceMode === 'BROWSER_SPEECH'
                    ? 'Browser Web Speech API active (Real Microphone)'
                    : 'Mock Voice active (offline/demo mode)'
                }
              >
                <Radio className="w-3 h-3" />
                <span>
                  {voiceMode === 'LIVEKIT'
                    ? 'LIVEKIT'
                    : voiceMode === 'BROWSER_SPEECH'
                    ? 'BROWSER MIC'
                    : 'DEMO MODE'}
                </span>
              </span>

              {/* Real Voice State */}
              <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-[#11141f] border border-zinc-800">
                <span
                  className={`w-2 h-2 rounded-full ${
                    voiceState === 'LISTENING'
                      ? 'bg-rose-500 animate-ping'
                      : voiceState === 'PROCESSING'
                      ? 'bg-indigo-400 animate-pulse'
                      : voiceState === 'SPEAKING'
                      ? 'bg-violet-400 animate-pulse'
                      : voiceState === 'INTERRUPTED' || voiceState === 'REPLANNING'
                      ? 'bg-amber-400 animate-pulse'
                      : 'bg-zinc-600'
                  }`}
                />
                <span
                  className={`text-[11px] font-medium ${
                    voiceState === 'LISTENING'
                      ? 'text-rose-400'
                      : voiceState === 'PROCESSING'
                      ? 'text-indigo-400'
                      : voiceState === 'SPEAKING'
                      ? 'text-violet-400'
                      : voiceState === 'INTERRUPTED' || voiceState === 'REPLANNING'
                      ? 'text-amber-400'
                      : 'text-zinc-400'
                  }`}
                >
                  {voiceState === 'LISTENING'
                    ? 'Listening...'
                    : voiceState === 'PROCESSING'
                    ? 'Processing Intent...'
                    : voiceState === 'SPEAKING'
                    ? 'Speaking Ack...'
                    : voiceState === 'INTERRUPTED'
                    ? 'Interrupted'
                    : voiceState === 'REPLANNING'
                    ? 'Replanning...'
                    : 'Voice Ready'}
                </span>
              </div>
            </div>

            {/* Right: Latency HUD Pill */}
            <button
              type="button"
              onClick={() => setShowLatencyModal(true)}
              className="flex items-center gap-1.5 px-2.5 py-0.5 rounded bg-[#11141f] hover:bg-[#161a29] border border-zinc-800 hover:border-zinc-700 text-zinc-400 hover:text-zinc-200 transition-colors"
              title="Click to view measured latency breakdown"
            >
              <Gauge className="w-3 h-3 text-indigo-400" />
              <span className="text-[11px]">
                {latencyMetrics.e2eLatencyMs !== null
                  ? `Measured E2E: ${latencyMetrics.e2eLatencyMs}ms`
                  : 'Telemetry: Ready'}
              </span>
              <span className="text-[10px] text-indigo-400/80 underline ml-0.5">Details</span>
            </button>
          </div>

          {/* Voice Captured Review Banner */}
          {capturedFromVoice && inputValue && (
            <div className="flex items-center justify-between px-3 py-1.5 rounded-lg bg-indigo-950/50 border border-indigo-500/30 text-xs font-mono text-indigo-300 animate-in fade-in duration-200">
              <div className="flex items-center gap-2">
                <Mic className="w-3.5 h-3.5 text-indigo-400 animate-pulse" />
                <span>
                  Voice captured — review or edit prompt, then press <strong>Enter</strong> or click <strong>Send</strong>
                </span>
              </div>
              <button
                type="button"
                onClick={() => setCapturedFromVoice(false)}
                className="text-zinc-500 hover:text-zinc-300 p-0.5"
                title="Dismiss banner"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          )}

          {/* User Notice / Fallback Info */}
          {voiceNotice && (
            <div className="flex items-center justify-between px-3 py-1.5 rounded-lg bg-amber-950/40 border border-amber-500/30 text-xs font-mono text-amber-300 animate-in fade-in duration-200">
              <span>{voiceNotice}</span>
              <button
                type="button"
                onClick={() => setVoiceNotice(null)}
                className="text-zinc-500 hover:text-zinc-300 p-0.5"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          )}

          {/* Quick Voice Chips (when listening or toggled) */}
          {showVoiceChips && (
            <div className="flex flex-wrap items-center gap-1.5 p-2 rounded-lg bg-[#111420] border border-zinc-800/80 animate-in fade-in duration-150">
              <span className="text-[10px] font-mono text-zinc-400 flex items-center gap-1 mr-1">
                <Sparkles className="w-3 h-3 text-indigo-400" /> Voice Simulation:
              </span>
              <button
                type="button"
                onClick={() => handleSimulateVoice("Build a real-time food delivery platform")}
                className="px-2 py-1 rounded bg-indigo-950/40 hover:bg-indigo-900/60 border border-indigo-800/40 text-[11px] font-mono text-indigo-300 transition-colors"
              >
                🎙️ "Food delivery platform"
              </button>
              <button
                type="button"
                onClick={() => handleSimulateVoice("Actually, use RabbitMQ instead of Kafka.")}
                className="px-2 py-1 rounded bg-amber-950/40 hover:bg-amber-900/60 border border-amber-800/40 text-[11px] font-mono text-amber-300 transition-colors"
              >
                ⚡ "Actually, use RabbitMQ"
              </button>
              <button
                type="button"
                onClick={() => handleSimulateVoice('Billing should have its own database.')}
                className="px-2 py-1 rounded bg-emerald-950/40 hover:bg-emerald-900/60 border border-emerald-800/40 text-[11px] font-mono text-emerald-300 transition-colors"
              >
                📊 "Billing database"
              </button>
            </div>
          )}

          {/* Main Input Form */}
          <form onSubmit={handleSubmit} className="relative flex items-center gap-2">
            {/* Microphone Button */}
            <button
              type="button"
              onClick={handleMicClick}
              title={voiceState === 'LISTENING' ? 'Stop listening' : 'Start microphone listening'}
              className={`relative p-2.5 rounded-lg border transition-all duration-300 flex items-center justify-center shrink-0 ${
                voiceState === 'LISTENING'
                  ? 'bg-rose-500/20 border-rose-500/80 text-rose-400 ring-2 ring-rose-500/30'
                  : 'bg-[#121520] border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-700'
              }`}
            >
              {voiceState === 'LISTENING' ? (
                <>
                  <Mic className="w-5 h-5 text-rose-400 animate-pulse" />
                  <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-500"></span>
                  </span>
                </>
              ) : (
                <Mic className="w-5 h-5" />
              )}
            </button>

            {/* Audio Waveform simulation indicator when mic is listening */}
            {voiceState === 'LISTENING' && (
              <div className="absolute left-14 top-1/2 -translate-y-1/2 flex items-center gap-1 pointer-events-none z-10 px-2 py-1 rounded bg-[#0e111a] border border-rose-500/30">
                <span className="w-1 h-3 bg-rose-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-1 h-5 bg-rose-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-1 h-2 bg-rose-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                <span className="w-1 h-4 bg-rose-400 rounded-full animate-bounce" style={{ animationDelay: '75ms' }} />
                <span className="text-[10px] font-mono text-rose-400 ml-1">VAD ACTIVE</span>
              </div>
            )}

            {/* Main Input Field */}
            <div className="relative flex-1">
              <input
                ref={inputRef}
                type="text"
                value={inputValue}
                onChange={(e) => {
                  setInputValue(e.target.value);
                  if (capturedFromVoice && !e.target.value) setCapturedFromVoice(false);
                }}
                onKeyDown={handleKeyDown}
                placeholder={
                  isExecuting
                    ? "⚡ Type to interrupt & steer the architecture live..."
                    : "Describe a system you want to build..."
                }
                className={`w-full bg-[#11141f] border rounded-lg py-2.5 pl-3.5 pr-28 text-sm text-zinc-100 placeholder:text-zinc-500 font-normal focus:outline-none transition-all ${
                  isExecuting
                    ? 'border-amber-500/50 focus:border-amber-500 focus:ring-1 focus:ring-amber-500/30'
                    : capturedFromVoice
                    ? 'border-indigo-500/60 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/40'
                    : 'border-zinc-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30'
                } ${voiceState === 'LISTENING' ? 'pl-36' : ''}`}
              />

              {/* Quick Keyboard shortcut or Interrupt badge */}
              <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center gap-1.5 pointer-events-none">
                {isExecuting ? (
                  <span className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-950/80 border border-amber-800/60 text-[10px] font-mono text-amber-400">
                    <Zap className="w-2.5 h-2.5" />
                    <span>INTERRUPTIBLE</span>
                  </span>
                ) : (
                  <span className="text-[10px] font-mono text-zinc-500 bg-zinc-900 px-1.5 py-0.5 rounded border border-zinc-800 hidden sm:inline-block">
                    ↵ Enter
                  </span>
                )}
              </div>
            </div>

            {/* Send / Interrupt Button */}
            <button
              type="submit"
              disabled={!inputValue.trim() && !isExecuting}
              onClick={isExecuting && !inputValue.trim() ? handleInterruptClick : undefined}
              className={`px-4 py-2.5 rounded-lg text-xs font-mono font-medium transition-all duration-200 flex items-center gap-1.5 shrink-0 disabled:opacity-40 disabled:cursor-not-allowed ${
                isExecuting
                  ? 'bg-amber-600 hover:bg-amber-500 text-black font-semibold shadow-lg shadow-amber-600/20'
                  : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/20'
              }`}
            >
              {isExecuting ? (
                <>
                  <Zap className="w-3.5 h-3.5" />
                  <span>Interrupt</span>
                </>
              ) : (
                <>
                  <span>Send</span>
                  <Send className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </form>

          {/* Clickable Example Beneath Input (populates, does not auto-execute) */}
          <div className="flex items-center gap-1.5 text-xs text-zinc-400 font-mono px-1">
            <span className="text-zinc-500">Try:</span>
            <button
              type="button"
              onClick={() => {
                setInputValue("Build a real-time food delivery platform");
                setCapturedFromVoice(false);
                inputRef.current?.focus();
              }}
              className="text-indigo-400 hover:text-indigo-300 underline underline-offset-2 decoration-indigo-500/50 hover:decoration-indigo-300 transition-colors text-left"
            >
              "Build a real-time food delivery platform"
            </button>
          </div>
        </div>
      </div>

      {/* Latency Telemetry Modal */}
      <LatencyModal
        isOpen={showLatencyModal}
        onClose={() => setShowLatencyModal(false)}
        metrics={latencyMetrics}
        voiceState={voiceState}
        voiceMode={voiceMode}
      />
    </>
  );
};
