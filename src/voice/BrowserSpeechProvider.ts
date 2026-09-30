import type { VoiceProvider, VoiceState, VoiceTranscript, VoiceMode } from './types';
import { latencyTracker } from './latencyTracker';

// Browser Web Speech API interface declarations
interface SpeechRecognitionResultItem {
  transcript: string;
  confidence: number;
}

interface SpeechRecognitionResultLike {
  isFinal: boolean;
  length: number;
  [index: number]: SpeechRecognitionResultItem;
}

interface SpeechRecognitionEventLike {
  resultIndex: number;
  results: {
    length: number;
    [index: number]: SpeechRecognitionResultLike;
  };
}

interface SpeechRecognitionLike extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  abort(): void;
  onstart: (() => void) | null;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
}

/**
 * BrowserSpeechProvider:
 * Truthful voice provider using the browser's native Web Speech API
 * (SpeechRecognition / webkitSpeechRecognition).
 */
export class BrowserSpeechProvider implements VoiceProvider {
  public mode: VoiceMode = 'BROWSER_SPEECH';
  private currentState: VoiceState = 'IDLE';

  private transcriptListeners: ((transcript: VoiceTranscript) => void)[] = [];
  private speechStartListeners: ((ts: number) => void)[] = [];
  private speechEndListeners: (() => void)[] = [];
  private interruptListeners: (() => void)[] = [];
  private stateListeners: ((state: VoiceState) => void)[] = [];
  private agentSpeechListeners: ((text: string) => void)[] = [];

  private recognition: SpeechRecognitionLike | null = null;
  private isListeningActive: boolean = false;

  constructor() {
    this.initRecognition();
  }

  private initRecognition(): void {
    if (typeof window === 'undefined') return;

    const SpeechRecognitionClass =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognitionClass) {
      console.warn('[BrowserSpeechProvider] Web Speech API not supported in this browser.');
      return;
    }

    try {
      this.recognition = new SpeechRecognitionClass();
      if (this.recognition) {
        this.recognition.continuous = true;
        this.recognition.interimResults = true;
        this.recognition.lang = 'en-US';

        this.recognition.onstart = () => {
          this.isListeningActive = true;
          this.setState('LISTENING');
          const startTs = performance.now();
          latencyTracker.recordSpeechStart(startTs);
          this.speechStartListeners.forEach((l) => l(startTs));
        };

        this.recognition.onresult = (event: SpeechRecognitionEventLike) => {
          let interimTranscript = '';
          let finalTranscript = '';

          for (let i = event.resultIndex; i < event.results.length; ++i) {
            const res = event.results[i];
            if (res.isFinal) {
              finalTranscript += res[0].transcript;
            } else {
              interimTranscript += res[0].transcript;
            }
          }

          const captured = (finalTranscript || interimTranscript).trim();
          if (captured) {
            const isFinal = Boolean(finalTranscript);
            const transcript: VoiceTranscript = {
              text: captured,
              isFinal,
              timestamp: Date.now(),
            };
            this.transcriptListeners.forEach((l) => l(transcript));
          }
        };

        this.recognition.onerror = (event: { error: string }) => {
          console.warn('[BrowserSpeechProvider] Speech recognition error:', event.error);
          if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
            this.isListeningActive = false;
            this.setState('IDLE');
          }
        };

        this.recognition.onend = () => {
          this.isListeningActive = false;
          if (this.currentState === 'LISTENING') {
            this.setState('IDLE');
          }
          this.speechEndListeners.forEach((l) => l());
        };
      }
    } catch (err) {
      console.error('[BrowserSpeechProvider] Failed to initialize SpeechRecognition:', err);
    }
  }

  public async start(): Promise<void> {
    if (!this.recognition) {
      this.initRecognition();
    }

    if (!this.recognition) {
      throw new Error('Web Speech API is not supported in this browser environment.');
    }

    try {
      if (this.isListeningActive) {
        this.recognition.stop();
      }
      this.recognition.start();
    } catch (err: any) {
      // In case start is called while already starting
      if (err?.name !== 'InvalidStateError') {
        console.error('[BrowserSpeechProvider] Error starting speech recognition:', err);
      }
    }
  }

  public async stop(): Promise<void> {
    this.isListeningActive = false;
    if (this.recognition) {
      try {
        this.recognition.stop();
      } catch {
        // ignore if already stopped
      }
    }
    this.setState('IDLE');
    this.speechEndListeners.forEach((l) => l());
  }

  public interrupt(): void {
    this.isListeningActive = false;
    if (this.recognition) {
      try {
        this.recognition.abort();
      } catch {
        // ignore
      }
    }
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

    const transcript: VoiceTranscript = {
      text: text.trim(),
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
