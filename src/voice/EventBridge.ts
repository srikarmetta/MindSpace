import { useGraphStore } from '../state/graphStore';
import { detectIntent } from '../engine/intentManager';
import { planWithSummary } from '../engine/planner';
import { operationEngine } from '../engine/operationEngine';
import { createVoiceProvider } from './LiveKitVoiceProvider';
import type { VoiceProvider } from './types';
import { latencyTracker } from './latencyTracker';

export class EventBridge {
  private static instance: EventBridge;
  public provider: VoiceProvider;
  private currentAgentSpeech: string = '';
  private listeners: ((text: string) => void)[] = [];

  public autoSubmitOnTranscript: boolean = false;

  private constructor() {
    this.provider = createVoiceProvider();
    this.setupListeners();
  }

  public static getInstance(): EventBridge {
    if (!EventBridge.instance) {
      EventBridge.instance = new EventBridge();
    }
    return EventBridge.instance;
  }

  private setupListeners(): void {
    // 1. Voice Event -> Transcript received
    this.provider.onTranscript(async (transcript) => {
      if (this.autoSubmitOnTranscript) {
        await this.handleTranscript(transcript.text);
      }
    });

    // 2. Interruption Event
    this.provider.onUserInterrupt(() => {
      this.handleInterruption();
    });

    // 3. Agent Speech Feedback
    this.provider.onAgentSpeech((text) => {
      this.currentAgentSpeech = text;
      this.listeners.forEach((l) => l(text));
    });
  }

  /**
   * Main Pipeline:
   * Voice event -> Immediate Ack -> Intent event -> Revision Engine -> Operation Engine -> Graph Event -> UI
   */
  public async handleTranscript(rawText: string): Promise<void> {
    const text = rawText.trim();
    if (!text) return;

    if (!latencyTracker.getMetrics().timestamps.speechStarted) {
      latencyTracker.recordSpeechStart();
    }
    latencyTracker.recordTranscriptReceived();

    const store = useGraphStore.getState();
    const isExecuting = store.agentStatus === 'EXECUTING';
    const isInterruption =
      isExecuting ||
      text.toLowerCase().includes('actually') ||
      text.toLowerCase().startsWith('wait') ||
      text.toLowerCase().startsWith('no,');

    // 1. IMMEDIATE CONVERSATIONAL ACKNOWLEDGEMENT (Independent from expensive planning)
    if (isInterruption) {
      if (text.toLowerCase().includes('rabbitmq')) {
        this.speakImmediate('Understood, switching message queue to RabbitMQ now.');
      } else {
        this.speakImmediate('Understood, pivoting the architecture now.');
      }
    } else if (text.toLowerCase().includes('food') || text.toLowerCase().includes('delivery')) {
      this.speakImmediate("Got it — mapping the food delivery platform now.");
    } else if (text.toLowerCase().includes('billing') && (text.toLowerCase().includes('database') || text.toLowerCase().includes('db') || text.toLowerCase().includes('own'))) {
      this.speakImmediate('Understood — adding a dedicated database for billing.');
    } else if (text.toLowerCase().includes('support')) {
      this.speakImmediate("Got it — I'm mapping that now.");
    } else if (text.toLowerCase().includes('multi-agent') || text.toLowerCase().includes('multi agent')) {
      this.speakImmediate('Understood, pivoting to multi-agent now.');
    } else if (text.toLowerCase().includes('kafka')) {
      this.speakImmediate('Configuring the Kafka event stream.');
    } else {
      this.speakImmediate("Understood — synthesizing your architecture.");
    }

    // 2. INTENT EVENT
    latencyTracker.recordIntentDetected();
    const intent = detectIntent(text, store.nodes.length);

    if (isInterruption) {
      operationEngine.interrupt(`Voice interrupt: "${text}"`);
      intent.type = 'CORRECTION';
      intent.status = 'replanning';
      store.supersedeCurrentIntent(intent);
    } else {
      store.setAgentStatus('LISTENING');
      store.addActivity(`User voice: "${text}"`, 'info');
      store.setCurrentIntent(intent);
      store.setAgentStatus('UNDERSTANDING');
      store.addActivity(`Intent detected: ${intent.type} - "${intent.text}"`, 'info');
    }

    // 3. REVISION & PLANNING EVENT
    latencyTracker.recordPlanningStarted();
    store.setAgentStatus('PLANNING');
    store.addActivity('Planning architecture operations...', 'running');

    const freshStore = useGraphStore.getState();
    const planResult = planWithSummary(
      intent,
      { version: freshStore.version, nodes: freshStore.nodes, edges: freshStore.edges },
      freshStore.activeOperations
    );
    store.addActivity(`Planning completed: ${planResult.summary}`, 'completed');

    // 4. OPERATION ENGINE ASYNC EXECUTION
    latencyTracker.recordOperationStarted();
    await operationEngine.executeOperations(planResult.operations, isInterruption);

    // 5. GRAPH EVENT & FINAL CONFIRMATION (NO FALSE DONE!)
    // Only utter completion after the operations have actually committed to the store.
    latencyTracker.recordOperationCompleted();
    const finalStore = useGraphStore.getState();
    const isStillActive = finalStore.currentIntent?.id === intent.id;

    if (isStillActive) {
      if (text.toLowerCase().includes('billing') && (text.toLowerCase().includes('database') || text.toLowerCase().includes('db') || text.toLowerCase().includes('own'))) {
        this.speakCompletion(`Architecture committed at version v${finalStore.version}. Billing database connected.`);
      } else if (text.toLowerCase().includes('multi-agent') || text.toLowerCase().includes('multi agent')) {
        this.speakCompletion(`Architecture committed at version v${finalStore.version}. Multi-agent router is live.`);
      } else if (text.toLowerCase().includes('support')) {
        this.speakCompletion(`Architecture committed at version v${finalStore.version}. AI customer support system is live.`);
      } else {
        this.speakCompletion(`Architecture committed at version v${finalStore.version}.`);
      }
    }
  }

  public handleInterruption(): void {
    operationEngine.interrupt('User vocal interruption');
    this.speakImmediate('Pivoting...');
  }

  private speakImmediate(text: string): void {
    if ('speakImmediateAck' in this.provider) {
      (this.provider as any).speakImmediateAck(text);
    } else {
      this.currentAgentSpeech = text;
      this.listeners.forEach((l) => l(text));
    }
  }

  private speakCompletion(text: string): void {
    this.currentAgentSpeech = text;
    this.listeners.forEach((l) => l(text));
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 1.1;
        window.speechSynthesis.speak(utterance);
      } catch {
        // Fallback silently
      }
    }
  }

  public subscribeToAgentSpeech(callback: (text: string) => void): () => void {
    this.listeners.push(callback);
    if (this.currentAgentSpeech) callback(this.currentAgentSpeech);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== callback);
    };
  }
}

export const eventBridge = EventBridge.getInstance();
