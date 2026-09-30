export type VoiceState =
  | 'IDLE'
  | 'LISTENING'
  | 'PROCESSING'
  | 'SPEAKING'
  | 'INTERRUPTED'
  | 'REPLANNING';

export type VoiceMode = 'LIVEKIT' | 'MOCK_DEMO' | 'BROWSER_SPEECH';

export interface VoiceTranscript {
  text: string;
  isFinal: boolean;
  timestamp: number;
}

export interface VoiceLatencyTimestamps {
  speechStarted: number | null;
  transcriptReceived: number | null;
  intentDetected: number | null;
  planningStarted: number | null;
  operationStarted: number | null;
  operationCompleted: number | null;
  responseStarted: number | null;
}

export interface VoiceLatencyMetrics {
  timestamps: VoiceLatencyTimestamps;
  intentLatencyMs: number | null;
  planningLatencyMs: number | null;
  operationLatencyMs: number | null;
  e2eLatencyMs: number | null;
}

export interface VoiceProvider {
  mode: VoiceMode;
  start(): Promise<void>;
  stop(): Promise<void>;
  interrupt(): void;
  simulateSpeech(text: string): Promise<void>;
  
  getState(): VoiceState;
  onTranscript(callback: (transcript: VoiceTranscript) => void): () => void;
  onSpeechStart(callback: (timestamp: number) => void): () => void;
  onSpeechEnd(callback: () => void): () => void;
  onUserInterrupt(callback: () => void): () => void;
  onStateChange(callback: (state: VoiceState) => void): () => void;
  onAgentSpeech(callback: (text: string) => void): () => void;
}
