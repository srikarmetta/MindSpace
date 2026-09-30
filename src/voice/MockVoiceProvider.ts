import type { VoiceProvider, VoiceState, VoiceTranscript, VoiceMode } from './types';
import { latencyTracker } from './latencyTracker';

export class MockVoiceProvider implements VoiceProvider {
  public mode: VoiceMode = 'MOCK_DEMO';
  private currentState: VoiceState = 'IDLE';

  private transcriptListeners: ((transcript: VoiceTranscript) => void)[] = [];
  private speechStartListeners: ((ts: number) => void)[] = [];
  private speechEndListeners: (() => void)[] = [];
  private interruptListeners: (() => void)[] = [];
  private stateListeners: ((state: VoiceState) => void)[] = [];
  private agentSpeechListeners: ((text: string) => void)[] = [];

  private isSimulating: boolean = false;
  private currentTimeout: ReturnType<typeof setTimeout> | null = null;

  public async start(): Promise<void> {
    this.setState('LISTENING');
    const startTs = performance.now();
    latencyTracker.recordSpeechStart(startTs);
    this.speechStartListeners.forEach((l) => l(startTs));
  }

  public async stop(): Promise<void> {
    if (this.currentTimeout) {
      clearTimeout(this.currentTimeout);
      this.currentTimeout = null;
    }
    this.isSimulating = false;
    this.setState('IDLE');
    this.speechEndListeners.forEach((l) => l());
  }

  public interrupt(): void {
    if (this.currentTimeout) {
      clearTimeout(this.currentTimeout);
      this.currentTimeout = null;
    }
    this.isSimulating = false;
    this.setState('INTERRUPTED');
    this.interruptListeners.forEach((l) => l());

    // Transition to REPLANNING
    setTimeout(() => {
      if (this.currentState === 'INTERRUPTED') {
        this.setState('REPLANNING');
      }
    }, 200);
  }

  /**
   * Simulates user speech stream with realistic VAD and transcript delivery
   */
  public async simulateSpeech(text: string): Promise<void> {
    // If agent is currently executing or speaking, this is an interruption!
    if (this.currentState === 'SPEAKING' || this.currentState === 'PROCESSING') {
      this.interrupt();
    }

    this.isSimulating = true;
    const startTs = performance.now();
    latencyTracker.recordSpeechStart(startTs);
    this.setState('LISTENING');
    this.speechStartListeners.forEach((l) => l(startTs));

    // Simulated short speech audio buffer delay (~180ms)
    await this.delay(180);
    if (!this.isSimulating) return;

    this.setState('PROCESSING');
    const transcriptTs = performance.now();
    latencyTracker.recordTranscriptReceived(transcriptTs);

    const transcript: VoiceTranscript = {
      text: text.trim(),
      isFinal: true,
      timestamp: Date.now(),
    };

    this.transcriptListeners.forEach((l) => l(transcript));
    this.speechEndListeners.forEach((l) => l());
  }

  /**
   * Immediate verbal acknowledgement independently of expensive planning
   */
  public speakImmediateAck(text: string): void {
    this.setState('SPEAKING');
    latencyTracker.recordResponseStarted();
    this.agentSpeechListeners.forEach((l) => l(text));

    // Speak using Web Speech Synthesis if available in browser
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
        // Fallback silently if audio context restricted
      }
    }

    // Auto-reset state after speaking duration
    setTimeout(() => {
      if (this.currentState === 'SPEAKING') {
        this.setState('IDLE');
      }
    }, 1400);
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

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => {
      this.currentTimeout = setTimeout(() => {
        this.currentTimeout = null;
        resolve();
      }, ms);
    });
  }
}
