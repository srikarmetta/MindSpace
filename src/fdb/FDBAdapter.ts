import type {
  ToolDefinition,
  ToolResult,
  ToolExecution,
  FDBLogEntry,
  SessionState,
} from './types';
import { interruptibleToolExecutor, InterruptibleToolExecutor } from './InterruptibleToolExecutor';
import { toolRegistry, ToolRegistry } from './ToolRegistry';
import { fdbLogger, FDBLogger } from './logger';

export interface FDBScenarioContext {
  scenarioId: string;
  metadata?: Record<string, unknown>;
  startedAt: number;
}

/**
 * FDB-v3 Adapter Layer
 * Connects the official Full-Duplex-Bench v3 evaluation harness and LiveKit
 * data channels to MindSpace's InterruptibleToolExecutor without hardcoding scenarios.
 */
export class FDBAdapter {
  private executor: InterruptibleToolExecutor;
  private registry: ToolRegistry;
  private logger: FDBLogger;
  private activeScenario: FDBScenarioContext | null = null;

  constructor(
    executor: InterruptibleToolExecutor = interruptibleToolExecutor,
    registry: ToolRegistry = toolRegistry,
    logger: FDBLogger = fdbLogger
  ) {
    this.executor = executor;
    this.registry = registry;
    this.logger = logger;
  }

  /**
   * Called by the benchmark evaluation harness when a scenario starts.
   * Forces complete session isolation — resets intent, active executions, and idempotency keys.
   */
  public onScenarioStart(scenarioId: string, metadata?: Record<string, unknown>): SessionState {
    this.activeScenario = {
      scenarioId,
      metadata,
      startedAt: Date.now(),
    };

    const session = this.executor.resetSession(scenarioId);
    this.logger.log({
      sessionId: scenarioId,
      intentId: 'scenario_init',
      toolName: 'fdb_lifecycle',
      arguments: { action: 'start', metadata },
      operationId: `init_${scenarioId}`,
      status: 'COMPLETED',
      cancellation: false,
      supersession: false,
      latencyMs: 0,
    });

    return session;
  }

  /**
   * Called by the benchmark harness when a scenario concludes.
   * Flushes and returns structured execution logs for evaluation.
   */
  public onScenarioEnd(scenarioId: string): {
    scenarioId: string;
    logs: FDBLogEntry[];
    history: ToolExecution[];
  } {
    const session = this.executor.getSession();
    const logs = this.logger.getLogs(scenarioId);

    this.logger.log({
      sessionId: scenarioId,
      intentId: 'scenario_teardown',
      toolName: 'fdb_lifecycle',
      arguments: { action: 'end', completedOpsCount: session.history.length },
      operationId: `end_${scenarioId}`,
      status: 'COMPLETED',
      cancellation: false,
      supersession: false,
      latencyMs: Date.now() - (this.activeScenario?.startedAt || Date.now()),
    });

    this.activeScenario = null;

    return {
      scenarioId,
      logs,
      history: [...session.history],
    };
  }

  /**
   * Registers dynamic tools supplied by the benchmark runtime or evaluation runner.
   */
  public registerDynamicTools(tools: ToolDefinition[]): void {
    for (const tool of tools) {
      this.registry.registerTool(tool);
    }
  }

  /**
   * Handles user speech / text utterance during benchmark interaction.
   * If speech is an interruption, automatically cancels in-flight operations.
   */
  public async onUserUtterance(
    text: string,
    intentId: string,
    isInterrupt: boolean = false
  ): Promise<{ acknowledged: boolean; immediateAck: string }> {
    if (isInterrupt) {
      this.executor.cancelAllInFlight(`User vocal interruption: "${text}"`);
    }

    this.executor.setCurrentIntent(intentId);

    const immediateAck = isInterrupt
      ? 'Understood, pivoting the plan now.'
      : "Understood — processing your request.";

    return {
      acknowledged: true,
      immediateAck,
    };
  }

  /**
   * Dispatches a tool execution request through the interruptible executor.
   */
  public async onToolRequest<TArgs = unknown, TResult = unknown>(
    toolName: string,
    args: TArgs,
    intentId: string,
    idempotencyKey?: string
  ): Promise<ToolResult<TResult>> {
    return this.executor.executeTool<TArgs, TResult>(toolName, args, intentId, idempotencyKey);
  }

  /**
   * Handles argument correction from the user or benchmark runner.
   */
  public async onArgumentCorrection<TArgs = unknown, TResult = unknown>(
    executionId: string,
    newArgs: TArgs,
    newIntentId: string
  ): Promise<ToolResult<TResult>> {
    return this.executor.updateExecutionArguments<TArgs, TResult>(
      executionId,
      newArgs,
      newIntentId
    );
  }

  /**
   * Exports structured JSONL logs for benchmark evaluation.
   */
  public exportLogsJSONL(scenarioId?: string): string {
    return this.logger.exportJSONL(scenarioId);
  }
}

export const fdbAdapter = new FDBAdapter();
