import { eventBridge } from '../voice/EventBridge';
import { useGraphStore } from '../state/graphStore';

export interface DemoStepInfo {
  stepIndex: number;
  totalSteps: number;
  title: string;
  userPrompt: string;
  status: 'pending' | 'running' | 'completed' | 'interrupted';
}

export class OfficialDemoController {
  private static instance: OfficialDemoController;
  private isRunning: boolean = false;
  private activeTimeouts: ReturnType<typeof setTimeout>[] = [];
  private stepListeners: ((step: DemoStepInfo | null) => void)[] = [];

  private currentStep: DemoStepInfo | null = null;

  public static getInstance(): OfficialDemoController {
    if (!OfficialDemoController.instance) {
      OfficialDemoController.instance = new OfficialDemoController();
    }
    return OfficialDemoController.instance;
  }

  public getStatus(): { isRunning: boolean; currentStep: DemoStepInfo | null } {
    return {
      isRunning: this.isRunning,
      currentStep: this.currentStep,
    };
  }

  public onStepChange(callback: (step: DemoStepInfo | null) => void): () => void {
    this.stepListeners.push(callback);
    callback(this.currentStep);
    return () => {
      this.stepListeners = this.stepListeners.filter((l) => l !== callback);
    };
  }

  private setStep(step: DemoStepInfo | null): void {
    this.currentStep = step;
    this.stepListeners.forEach((l) => l(step));
  }

  private schedule(fn: () => void | Promise<void>, ms: number): void {
    const timer = setTimeout(async () => {
      this.activeTimeouts = this.activeTimeouts.filter((t) => t !== timer);
      if (this.isRunning) {
        await fn();
      }
    }, ms);
    this.activeTimeouts.push(timer);
  }

  /**
   * Stop the running demo
   */
  public stop(): void {
    this.isRunning = false;
    this.activeTimeouts.forEach((t) => clearTimeout(t));
    this.activeTimeouts = [];
    this.setStep(null);
  }

  /**
   * Start the official 60-90 second end-to-end interactive demo
   */
  public async start(): Promise<void> {
    if (this.isRunning) {
      this.stop();
      await new Promise((r) => setTimeout(r, 200));
    }

    this.isRunning = true;
    const store = useGraphStore.getState();

    // 0. Clean reset
    store.resetGraph();

    // --- PHASE 1: User speaks requirement (T = 0.5s) ---
    this.schedule(async () => {
      this.setStep({
        stepIndex: 1,
        totalSteps: 3,
        title: 'Initial Requirement',
        userPrompt: "I'm building an AI customer support system.",
        status: 'running',
      });

      // Dispatch through the real multimodal voice pipeline
      await eventBridge.handleTranscript("I'm building an AI customer support system.");
    }, 600);

    // --- PHASE 2: User interrupts mid-flight (T = 3.2s) ---
    // While the support agent is executing, user interrupts with "Actually, make it multi-agent."
    this.schedule(async () => {
      this.setStep({
        stepIndex: 2,
        totalSteps: 3,
        title: 'Live Vocal Interruption & Replanning',
        userPrompt: 'Actually, make it a multi-agent system.',
        status: 'interrupted',
      });

      // Mid-flight voice interrupt through the pipeline
      await eventBridge.handleTranscript('Actually, make it a multi-agent system.');
    }, 3200);

    // --- PHASE 3: Second requirement arrives (T = 17.0s) ---
    // User evolves architecture: "Billing should have its own database."
    this.schedule(async () => {
      this.setStep({
        stepIndex: 3,
        totalSteps: 3,
        title: 'Evolution: Dedicated Billing Database',
        userPrompt: 'Billing should have its own database.',
        status: 'running',
      });

      // Second requirement through the pipeline
      await eventBridge.handleTranscript('Billing should have its own database.');
    }, 16500);

    // --- CONCLUSION: Final Celebration & Completion (T = 24.0s) ---
    this.schedule(() => {
      this.setStep({
        stepIndex: 3,
        totalSteps: 3,
        title: 'Architecture Evolution Complete',
        userPrompt: 'Fully committed v3 Multi-Agent + Billing DB',
        status: 'completed',
      });

      this.isRunning = false;
    }, 24000);
  }
}

export const officialDemoController = OfficialDemoController.getInstance();
