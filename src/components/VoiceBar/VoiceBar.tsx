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
  X,
  Square
} from 'lucide-react';

export const VoiceBar: React.FC = () => {
  const [inputValue, setInputValue] = useState('');
  const [voiceState, setVoiceState] = useState<VoiceState>(eventBridge.provider.getState());
  const [voiceMode] = useState<VoiceMode>(eventBridge.provider.mode);
  const [agentSpeech, setAgentSpeech] = useState<string>('');
  const [showSpeechBubble, setShowSpeechBubble] = useState(false);
  const [showLatencyModal, setShowLatencyModal] = useState(false);
  const [latencyMetrics, setLatencyMetrics] = useState<VoiceLatencyMetrics>(latencyTracker.getMetrics());
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

  // Canonical submission handler for all requirement inputs (typed or reviewed voice)
  const submitRequirement = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;

    setInputValue('');
    setCapturedFromVoice(false);
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

  // Toggle microphone
  const handleMicClick = async () => {
    setVoiceNotice(null);
    if (voiceState === 'LISTENING') {
      await eventBridge.provider.stop();
    } else {
      try {
        await eventBridge.provider.start();
      } catch (err: unknown) {
        console.warn('[VoiceBar] Failed to start microphone:', err);
        setVoiceNotice('Microphone access unavailable in this environment. You can type requirements directly.');
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
      <div className="border-t border-zinc-800 bg-[#09090b] px-4 py-2.5 shrink-0 relative z-20 select-none">
        {/* Live Agent Vocal Speech Bubble */}
        {showSpeechBubble && agentSpeech && (
          <div className="absolute -top-11 left-1/2 -translate-x-1/2 max-w-lg w-[90%] z-30 animate-in fade-in slide-in-from-bottom-2 duration-200">
            <div className="bg-[#18181b] border border-zinc-700/80 rounded-lg px-3.5 py-1.5 shadow-xl flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 min-w-0">
                <Volume2 className="w-3.5 h-3.5 text-zinc-300 shrink-0" />
                <span className="text-[10px] font-mono uppercase text-zinc-400 font-bold shrink-0">
                  Agent:
                </span>
                <span className="text-xs text-zinc-100 italic truncate font-normal">
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
          {/* Voice Captured Review Banner */}
          {capturedFromVoice && inputValue && (
            <div className="flex items-center justify-between px-3 py-1.5 rounded-md bg-zinc-900 border border-zinc-700 text-xs font-mono text-zinc-200 animate-in fade-in duration-200">
              <div className="flex items-center gap-2">
                <Mic className="w-3.5 h-3.5 text-zinc-300 animate-pulse" />
                <span>
                  Voice captured — review or edit prompt, then press <strong>Enter</strong> to submit
                </span>
              </div>
              <button
                type="button"
                onClick={() => setCapturedFromVoice(false)}
                className="text-zinc-500 hover:text-zinc-300 p-0.5"
                title="Dismiss"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          )}

          {/* User Notice / Fallback Info */}
          {voiceNotice && (
            <div className="flex items-center justify-between px-3 py-1.5 rounded-md bg-zinc-900 border border-zinc-700 text-xs font-mono text-zinc-300 animate-in fade-in duration-200">
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

          {/* Main Input Form */}
          <form onSubmit={handleSubmit} className="relative flex items-center gap-2">
            {/* Microphone Button */}
            <button
              type="button"
              onClick={handleMicClick}
              title={voiceState === 'LISTENING' ? 'Stop listening' : 'Start microphone listening'}
              className={`p-2 rounded-md border transition-all duration-200 flex items-center justify-center shrink-0 ${
                voiceState === 'LISTENING'
                  ? 'bg-rose-500/20 border-rose-500/80 text-rose-400'
                  : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:border-zinc-700'
              }`}
            >
              {voiceState === 'LISTENING' ? (
                <Square className="w-4 h-4 text-rose-400 fill-current" />
              ) : (
                <Mic className="w-4 h-4" />
              )}
            </button>

            {/* Listening Waveform indicator */}
            {voiceState === 'LISTENING' && (
              <div className="absolute left-12 top-1/2 -translate-y-1/2 flex items-center gap-1 pointer-events-none z-10 px-2 py-0.5 rounded bg-zinc-900 border border-rose-500/40">
                <span className="w-1 h-3 bg-rose-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-1 h-4 bg-rose-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-1 h-2 bg-rose-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                <span className="text-[10px] font-mono text-rose-400 ml-1">LISTENING</span>
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
                    ? "Type to interrupt and steer the architecture in real-time..."
                    : "Describe a system architecture (e.g., streaming service, SaaS backend, payment flow)..."
                }
                className={`w-full bg-zinc-900 border rounded-md py-2 pl-3 pr-24 text-xs text-zinc-100 placeholder:text-zinc-500 font-normal focus:outline-none transition-all ${
                  isExecuting
                    ? 'border-amber-500/60 focus:border-amber-500'
                    : 'border-zinc-800 focus:border-zinc-700'
                } ${voiceState === 'LISTENING' ? 'pl-36' : ''}`}
              />

              {/* Enter key badge or Latency shortcut */}
              <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center gap-1.5 pointer-events-none">
                {isExecuting ? (
                  <span className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-950/80 border border-amber-800/60 text-[10px] font-mono text-amber-400">
                    <Zap className="w-2.5 h-2.5" />
                    <span>INTERRUPTIBLE</span>
                  </span>
                ) : (
                  <span className="text-[10px] font-mono text-zinc-500 bg-zinc-800/80 px-1.5 py-0.5 rounded border border-zinc-700/60 hidden sm:inline-block">
                    ↵ Enter
                  </span>
                )}
              </div>
            </div>

            {/* Submit / Interrupt Button */}
            <button
              type="submit"
              disabled={!inputValue.trim() && !isExecuting}
              onClick={isExecuting && !inputValue.trim() ? handleInterruptClick : undefined}
              className={`px-3.5 py-2 rounded-md text-xs font-mono font-medium transition-all duration-150 flex items-center gap-1.5 shrink-0 disabled:opacity-40 disabled:cursor-not-allowed ${
                isExecuting
                  ? 'bg-amber-600 hover:bg-amber-500 text-black font-semibold'
                  : 'bg-zinc-100 hover:bg-white text-zinc-900 font-semibold'
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
                  <Send className="w-3 h-3" />
                </>
              )}
            </button>

            {/* Latency Telemetry Modal Trigger */}
            <button
              type="button"
              onClick={() => setShowLatencyModal(true)}
              className="p-2 rounded-md bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:border-zinc-700 shrink-0 transition-colors"
              title="Telemetry latency breakdown"
            >
              <Gauge className="w-4 h-4" />
            </button>
          </form>
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
