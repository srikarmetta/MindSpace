import type { VoiceLatencyTimestamps, VoiceLatencyMetrics } from './types';

class LatencyTracker {
  private timestamps: VoiceLatencyTimestamps = {
    speechStarted: null,
    transcriptReceived: null,
    intentDetected: null,
    planningStarted: null,
    operationStarted: null,
    operationCompleted: null,
    responseStarted: null,
  };

  private listeners: ((metrics: VoiceLatencyMetrics) => void)[] = [];

  public reset(): void {
    this.timestamps = {
      speechStarted: null,
      transcriptReceived: null,
      intentDetected: null,
      planningStarted: null,
      operationStarted: null,
      operationCompleted: null,
      responseStarted: null,
    };
    this.notify();
  }

  public recordSpeechStart(ts: number = performance.now()): void {
    this.reset();
    this.timestamps.speechStarted = ts;
    this.notify();
  }

  public recordTranscriptReceived(ts: number = performance.now()): void {
    this.timestamps.transcriptReceived = ts;
    this.notify();
  }

  public recordIntentDetected(ts: number = performance.now()): void {
    this.timestamps.intentDetected = ts;
    this.notify();
  }

  public recordPlanningStarted(ts: number = performance.now()): void {
    this.timestamps.planningStarted = ts;
    this.notify();
  }

  public recordOperationStarted(ts: number = performance.now()): void {
    this.timestamps.operationStarted = ts;
    this.notify();
  }

  public recordOperationCompleted(ts: number = performance.now()): void {
    this.timestamps.operationCompleted = ts;
    this.notify();
  }

  public recordResponseStarted(ts: number = performance.now()): void {
    this.timestamps.responseStarted = ts;
    this.notify();
  }

  public getMetrics(): VoiceLatencyMetrics {
    const {
      speechStarted,
      transcriptReceived,
      intentDetected,
      planningStarted,
      operationStarted,
      operationCompleted,
    } = this.timestamps;

    const round = (val: number | null): number | null => (val !== null ? Math.round(val) : null);

    const intentLatency =
      intentDetected !== null && speechStarted !== null
        ? intentDetected - speechStarted
        : transcriptReceived !== null && speechStarted !== null
        ? transcriptReceived - speechStarted
        : null;

    const planningLatency =
      operationStarted !== null && planningStarted !== null
        ? operationStarted - planningStarted
        : null;

    const operationLatency =
      operationCompleted !== null && operationStarted !== null
        ? operationCompleted - operationStarted
        : null;

    const e2eLatency =
      operationCompleted !== null && speechStarted !== null
        ? operationCompleted - speechStarted
        : null;

    return {
      timestamps: { ...this.timestamps },
      intentLatencyMs: round(intentLatency),
      planningLatencyMs: round(planningLatency),
      operationLatencyMs: round(operationLatency),
      e2eLatencyMs: round(e2eLatency),
    };
  }

  public subscribe(callback: (metrics: VoiceLatencyMetrics) => void): () => void {
    this.listeners.push(callback);
    callback(this.getMetrics());
    return () => {
      this.listeners = this.listeners.filter((l) => l !== callback);
    };
  }

  private notify(): void {
    const metrics = this.getMetrics();
    this.listeners.forEach((l) => l(metrics));
  }
}

export const latencyTracker = new LatencyTracker();
