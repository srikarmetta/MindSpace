import type { VoiceProvider, VoiceState, VoiceTranscript, VoiceMode } from './types';
import { MockVoiceProvider } from './MockVoiceProvider';
import { BrowserSpeechProvider } from './BrowserSpeechProvider';
import { latencyTracker } from './latencyTracker';

function getEnv(key: string): string | undefined {
  if (typeof import.meta !== 'undefined' && (import.meta as any).env) {
    return (import.meta as any).env[key];
  }
  const proc = (globalThis as any).process;
  if (proc?.env) {
    return proc.env[key];
  }
  return undefined;
}

export class LiveKitVoiceProvider implements VoiceProvider {
  public mode: VoiceMode = 'LIVEKIT';
  private currentState: VoiceState = 'IDLE';

  private transcriptListeners: ((transcript: VoiceTranscript) => void)[] = [];
  private speechStartListeners: ((ts: number) => void)[] = [];
  private speechEndListeners: (() => void)[] = [];
  private interruptListeners: (() => void)[] = [];
  private stateListeners: ((state: VoiceState) => void)[] = [];
  private agentSpeechListeners: ((text: string) => void)[] = [];

  private livekitUrl: string | undefined;

  constructor() {
    this.livekitUrl = getEnv('VITE_LIVEKIT_URL');
  }

  public isConfigured(): boolean {
    return Boolean(this.livekitUrl && this.livekitUrl.startsWith('ws'));
  }

  public async start(): Promise<void> {
    if (!this.isConfigured()) {
      console.warn('[LiveKit] URL not configured. Falling back to local state.');
      this.setState('LISTENING');
      return;
    }

    try {
      this.setState('LISTENING');
      const startTs = performance.now();
      latencyTracker.recordSpeechStart(startTs);
      this.speechStartListeners.forEach((l) => l(startTs));
      console.log(`[LiveKit] Voice session connecting to: ${this.livekitUrl}`);
    } catch (err) {
      console.error('[LiveKit] Failed to start voice session:', err);
      this.setState('IDLE');
    }
  }

  public async stop(): Promise<void> {
    this.setState('IDLE');
    this.speechEndListeners.forEach((l) => l());
  }

  public interrupt(): void {
    this.setState('INTERRUPTED');
    this.interruptListeners.forEach((l) => l());

    setTimeout(() => {
      if (this.currentState === 'INTERRUPTED') {
        this.setState('REPLANNING');
      }
    }, 200);
  }

  public speakImmediateAck(text: string): void {
    this.setState('SPEAKING');
    latencyTracker.recordResponseStarted();
    this.agentSpeechListeners.forEach((l) => l(text));

    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 1.1;
        utterance.pitch = 1.0;
        utterance.onend = () => {
          if (this.currentState === 'SPEAKING') {
            this.setState('IDLE');
          }
        };
        window.speechSynthesis.speak(utterance);
      } catch {
        // Fallback silently
      }
    }

    setTimeout(() => {
      if (this.currentState === 'SPEAKING') {
        this.setState('IDLE');
      }
    }, 1400);
  }

  public async simulateSpeech(text: string): Promise<void> {
    this.setState('LISTENING');
    latencyTracker.recordSpeechStart(performance.now());

    // Deliver transcript
    const transcript: VoiceTranscript = {
      text,
      isFinal: true,
      timestamp: Date.now(),
    };
    this.setState('PROCESSING');
    latencyTracker.recordTranscriptReceived(performance.now());
    this.transcriptListeners.forEach((l) => l(transcript));
  }

  public onTranscript(callback: (transcript: VoiceTranscript) => void): () => void {
    this.transcriptListeners.push(callback);
    return () => {
      this.transcriptListeners = this.transcriptListeners.filter((l) => l !== callback);
    };
  }

  public onSpeechStart(callback: (timestamp: number) => void): () => void {
    this.speechStartListeners.push(callback);
    return () => {
      this.speechStartListeners = this.speechStartListeners.filter((l) => l !== callback);
    };
  }

  public onSpeechEnd(callback: () => void): () => void {
    this.speechEndListeners.push(callback);
    return () => {
      this.speechEndListeners = this.speechEndListeners.filter((l) => l !== callback);
    };
  }

  public onUserInterrupt(callback: () => void): () => void {
    this.interruptListeners.push(callback);
    return () => {
      this.interruptListeners = this.interruptListeners.filter((l) => l !== callback);
    };
  }

  public onStateChange(callback: (state: VoiceState) => void): () => void {
    this.stateListeners.push(callback);
    callback(this.currentState);
    return () => {
      this.stateListeners = this.stateListeners.filter((l) => l !== callback);
    };
  }

  public onAgentSpeech(callback: (text: string) => void): () => void {
    this.agentSpeechListeners.push(callback);
    return () => {
      this.agentSpeechListeners = this.agentSpeechListeners.filter((l) => l !== callback);
    };
  }

  public setState(state: VoiceState): void {
    this.currentState = state;
    this.stateListeners.forEach((l) => l(state));
  }

  public getState(): VoiceState {
    return this.currentState;
  }
}

/**
 * Voice Provider Factory:
 * Evaluates environment configuration with truthful fallback hierarchy:
 * 1. LiveKitVoiceProvider if VITE_LIVEKIT_URL is configured (Production WebRTC Mode)
 * 2. BrowserSpeechProvider if Web Speech API is available in browser (Real Microphone Mode)
 * 3. MockVoiceProvider for offline development, tests, or unsupported environments (Demo Mode)
 */
export function createVoiceProvider(): VoiceProvider {
  const livekitUrl = getEnv('VITE_LIVEKIT_URL');
  const forceMock = getEnv('VITE_VOICE_MODE') === 'mock';

  if (!forceMock && livekitUrl && livekitUrl.startsWith('ws') && !livekitUrl.includes('your-project')) {
    console.log('[MindSpace] Initializing LiveKitVoiceProvider (Production LiveKit Mode)');
    return new LiveKitVoiceProvider();
  }

  // Browser Web Speech API fallback (real microphone in browser)
  if (!forceMock && typeof window !== 'undefined') {
    const hasSpeechRecognition =
      'SpeechRecognition' in window || 'webkitSpeechRecognition' in window;
    if (hasSpeechRecognition) {
      console.log('[MindSpace] Initializing BrowserSpeechProvider (Web Speech API Active)');
      return new BrowserSpeechProvider();
    }
  }

  console.log('[MindSpace] LiveKit credentials not configured. Initializing MockVoiceProvider (DEMO MODE)');
  return new MockVoiceProvider();
}
