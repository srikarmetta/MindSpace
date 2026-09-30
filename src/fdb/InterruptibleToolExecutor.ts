import type {
  ToolExecution,
  ToolResult,
  ToolContext,
  SessionState,
  ChainedStep,
  ChainExecutionResult,
} from './types';
import { toolRegistry, ToolRegistry } from './ToolRegistry';
import { fdbLogger, FDBLogger } from './logger';

export class InterruptibleToolExecutor {
  private registry: ToolRegistry;
  private logger: FDBLogger;
  private currentSession: SessionState;
  private abortControllers: Map<string, AbortController> = new Map();
  private activeChains: Map<string, { abortController: AbortController; isInterrupted: boolean }> = new Map();

  constructor(registry: ToolRegistry = toolRegistry, logger: FDBLogger = fdbLogger) {
    this.registry = registry;
    this.logger = logger;
    this.currentSession = this.createFreshSession();
  }

  /**
   * Generates a completely isolated session state with zero cross-scenario caches
   */
  private createFreshSession(sessionId?: string): SessionState {
    return {
      sessionId: sessionId || `fdb_session_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      currentIntentId: null,
      activeExecutions: new Map(),
      committedIdempotencyKeys: new Set(),
      history: [],
      startedAt: Date.now(),
    };
  }

  /**
   * Resets session state completely for FDB-v3 scenario isolation.
   * Cancels any pending in-flight executions from previous scenarios.
   */
  public resetSession(newSessionId?: string): SessionState {
    // Abort all ongoing executions
    this.cancelAllInFlight('Scenario session reset');
    this.abortControllers.clear();
    this.activeChains.clear();

    this.currentSession = this.createFreshSession(newSessionId);
    return this.currentSession;
  }

  public getSession(): SessionState {
    return this.currentSession;
  }

  public setCurrentIntent(intentId: string, abortStale: boolean = true): void {
    const oldIntent = this.currentSession.currentIntentId;
    this.currentSession.currentIntentId = intentId;

    if (abortStale && oldIntent && oldIntent !== intentId) {
      for (const [id, execution] of this.currentSession.activeExecutions.entries()) {
        if (
          execution.intentId === oldIntent &&
          (execution.status === 'RUNNING' || execution.status === 'PENDING')
        ) {
          this.cancelExecution(id, `Intent superseded from "${oldIntent}" to "${intentId}"`);
        }
      }
    }
  }

  public getCurrentIntent(): string | null {
    return this.currentSession.currentIntentId;
  }

  /**
   * Execute a tool asynchronously with AbortController, idempotency, and pre-commit gate.
   */
  public async executeTool<TArgs = unknown, TResult = unknown>(
    toolName: string,
    args: TArgs,
    intentId: string,
    idempotencyKey?: string,
    options?: { isCancellable?: boolean; parentSignal?: AbortSignal }
  ): Promise<ToolResult<TResult>> {
    const session = this.currentSession;
    const effectiveIntentId = intentId || session.currentIntentId || `intent_${Date.now()}`;
    const idKey = idempotencyKey || `idemp_${toolName}_${JSON.stringify(args)}_${effectiveIntentId}`;

    const tool = this.registry.getTool(toolName);
    if (!tool) {
      const errResult: ToolResult<TResult> = {
        success: false,
        error: `Tool "${toolName}" is not registered in ToolRegistry.`,
      };
      this.logger.log({
        sessionId: session.sessionId,
        intentId: effectiveIntentId,
        toolName,
        arguments: args,
        operationId: `err_${Date.now()}`,
        status: 'FAILED',
        cancellation: false,
        supersession: false,
        latencyMs: 0,
      });
      return errResult;
    }

    // 1. Idempotency Check & Duplicate Prevention for STATE_CHANGING calls
    if (tool.sideEffectLevel === 'STATE_CHANGING' && session.committedIdempotencyKeys.has(idKey)) {
      const duplicateMsg = `Duplicate state-changing call rejected for idempotencyKey "${idKey}".`;
      this.logger.log({
        sessionId: session.sessionId,
        intentId: effectiveIntentId,
        toolName,
        arguments: args,
        operationId: `dup_${Date.now()}`,
        status: 'FAILED',
        cancellation: false,
        supersession: false,
        latencyMs: 0,
      });
      return {
        success: false,
        error: duplicateMsg,
        metadata: { duplicateBlocked: true, idempotencyKey: idKey },
      };
    }

    // 2. Setup Execution Object
    const executionId = `exec_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const execution: ToolExecution<TArgs> = {
      id: executionId,
      toolName,
      arguments: args,
      intentId: effectiveIntentId,
      status: 'PENDING',
      idempotencyKey: idKey,
      startedAt: performance.now(),
      isCancellable: options?.isCancellable ?? true,
    };

    session.activeExecutions.set(executionId, execution);

    // 3. Setup AbortController
    const abortCtrl = new AbortController();
    this.abortControllers.set(executionId, abortCtrl);

    // If a parent signal is provided (e.g. from chained execution), link it
    if (options?.parentSignal) {
      if (options.parentSignal.aborted) {
        abortCtrl.abort();
      } else {
        options.parentSignal.addEventListener('abort', () => abortCtrl.abort());
      }
    }

    execution.status = 'RUNNING';

    const context: ToolContext = {
      sessionId: session.sessionId,
      intentId: effectiveIntentId,
      executionId,
      signal: abortCtrl.signal,
      logger: this.logger,
    };

    try {
      // Execute the underlying tool asynchronously
      const result = await tool.execute(args, context);

      // 4. Pre-Commit Validation Gate
      const isValidToCommit = this.validatePreCommit(execution, context.signal, session);

      if (!isValidToCommit.valid) {
        execution.status = 'SUPERSEDED';
        this.logger.log({
          sessionId: session.sessionId,
          intentId: effectiveIntentId,
          toolName,
          arguments: args,
          operationId: executionId,
          status: execution.status,
          cancellation: true,
          supersession: true,
          latencyMs: performance.now() - execution.startedAt,
        });

        return {
          success: false,
          error: `Commit rejected: ${isValidToCommit.reason}`,
          metadata: { rejectedReason: isValidToCommit.reason },
        };
      }

      // 5. Commit Successful Result
      execution.status = 'COMPLETED';
      execution.completedAt = performance.now();
      session.history.push(execution);

      if (tool.sideEffectLevel === 'STATE_CHANGING') {
        session.committedIdempotencyKeys.add(idKey);
      }

      this.logger.log({
        sessionId: session.sessionId,
        intentId: effectiveIntentId,
        toolName,
        arguments: args,
        operationId: executionId,
        status: 'COMPLETED',
        cancellation: false,
        supersession: false,
        latencyMs: execution.completedAt - execution.startedAt,
      });

      return result as ToolResult<TResult>;
    } catch (err: unknown) {
      const isAbort = (err as Error)?.name === 'AbortError' || abortCtrl.signal.aborted;
      execution.status = isAbort ? 'INTERRUPTED' : 'FAILED';
      execution.completedAt = performance.now();
      execution.error = (err as Error)?.message || String(err);

      if (isAbort) {
        execution.status = 'SUPERSEDED';
      }

      this.logger.log({
        sessionId: session.sessionId,
        intentId: effectiveIntentId,
        toolName,
        arguments: args,
        operationId: executionId,
        status: execution.status,
        cancellation: isAbort,
        supersession: isAbort,
        latencyMs: execution.completedAt - execution.startedAt,
      });

      return {
        success: false,
        error: isAbort ? 'Execution cancelled by user interruption.' : execution.error,
        metadata: { aborted: isAbort },
      };
    } finally {
      this.abortControllers.delete(executionId);
    }
  }

  /**
   * Pre-Commit Validation Gate
   * Enforces 4 safety invariants before committing tool output to session state.
   */
  private validatePreCommit(
    execution: ToolExecution,
    signal: AbortSignal,
    session: SessionState
  ): { valid: boolean; reason?: string } {
    // 1. Not aborted
    if (signal.aborted) {
      return { valid: false, reason: 'AbortSignal triggered during execution' };
    }

    // 2. Session state is still current
    if (session.sessionId !== this.currentSession.sessionId) {
      return { valid: false, reason: 'Scenario session was reset during execution' };
    }

    // 3. Intent is still current
    if (session.currentIntentId && session.currentIntentId !== execution.intentId) {
      return {
        valid: false,
        reason: `Intent mismatch: current "${session.currentIntentId}" vs execution "${execution.intentId}"`,
      };
    }

    // 4. Status is RUNNING (not INTERRUPTED, SUPERSEDED, or FAILED)
    if (execution.status !== 'RUNNING') {
      return { valid: false, reason: `Operation status is ${execution.status}, expected RUNNING` };
    }

    // 5. Idempotency key not already committed
    if (session.committedIdempotencyKeys.has(execution.idempotencyKey)) {
      return { valid: false, reason: `Idempotency key ${execution.idempotencyKey} already committed` };
    }

    return { valid: true };
  }

  /**
   * Argument Correction:
   * Replaces an ongoing or prior execution with updated arguments.
   * Cancels the old execution immediately if it is still cancellable,
   * transitions status RUNNING -> INTERRUPTED -> SUPERSEDED,
   * and executes the latest valid arguments under the new intent.
   */
  public async updateExecutionArguments<TArgs = unknown, TResult = unknown>(
    executionId: string,
    newArgs: TArgs,
    newIntentId: string
  ): Promise<ToolResult<TResult>> {
    const session = this.currentSession;
    const oldExecution = session.activeExecutions.get(executionId);

    if (!oldExecution) {
      throw new Error(`Execution "${executionId}" not found for argument update.`);
    }

    // 1. Set current intent to the new correction intent
    this.setCurrentIntent(newIntentId);

    // 2. Cancel the old execution if still active/cancellable
    if (oldExecution.isCancellable && (oldExecution.status === 'RUNNING' || oldExecution.status === 'PENDING')) {
      const abortCtrl = this.abortControllers.get(executionId);
      if (abortCtrl) {
        abortCtrl.abort();
      }
      oldExecution.status = 'INTERRUPTED';
      oldExecution.completedAt = performance.now();

      this.logger.log({
        sessionId: session.sessionId,
        intentId: oldExecution.intentId,
        toolName: oldExecution.toolName,
        arguments: oldExecution.arguments,
        operationId: oldExecution.id,
        status: 'INTERRUPTED',
        cancellation: true,
        supersession: true,
        latencyMs: oldExecution.completedAt - oldExecution.startedAt,
      });

      // Transition to SUPERSEDED
      oldExecution.status = 'SUPERSEDED';
    }

    // 3. Execute with updated arguments under new intent
    const newIdempotencyKey = `idemp_${oldExecution.toolName}_${JSON.stringify(newArgs)}_${newIntentId}`;
    return this.executeTool<TArgs, TResult>(
      oldExecution.toolName,
      newArgs,
      newIntentId,
      newIdempotencyKey
    );
  }

  /**
   * Chained Tool Execution:
   * Executes a sequence of dependent tools without blocking conversational responsiveness.
   * Preserves valid completed upstream results and cancels downstream steps if interrupted.
   */
  public async executeChain(
    chainId: string,
    steps: ChainedStep[],
    intentId: string
  ): Promise<ChainExecutionResult> {
    const chainAbortCtrl = new AbortController();
    this.activeChains.set(chainId, { abortController: chainAbortCtrl, isInterrupted: false });

    const stepResults: Record<string, ToolResult> = {};
    const completedSteps: string[] = [];
    const interruptedSteps: string[] = [];
    const supersededSteps: string[] = [];

    let chainFailed = false;

    for (let i = 0; i < steps.length; i++) {
      const step = steps[i];

      // Check if chain was interrupted before starting step
      if (chainAbortCtrl.signal.aborted) {
        supersededSteps.push(step.stepId);
        continue;
      }

      try {
        // Resolve arguments based on previous step results
        const dummyContext: ToolContext = {
          sessionId: this.currentSession.sessionId,
          intentId,
          executionId: `${chainId}_${step.stepId}`,
          signal: chainAbortCtrl.signal,
          logger: this.logger,
        };

        const resolvedArgs = await step.resolveArguments(
          Object.fromEntries(
            Object.entries(stepResults).map(([k, v]) => [k, v.data])
          ),
          dummyContext
        );

        // Execute step tool
        const result = await this.executeTool(
          step.toolName,
          resolvedArgs,
          intentId,
          `chain_${chainId}_step_${step.stepId}`,
          { parentSignal: chainAbortCtrl.signal }
        );

        stepResults[step.stepId] = result;

        if (result.success) {
          completedSteps.push(step.stepId);
        } else if (chainAbortCtrl.signal.aborted) {
          interruptedSteps.push(step.stepId);
          chainFailed = true;
          // Mark all remaining downstream steps as superseded
          for (let j = i + 1; j < steps.length; j++) {
            supersededSteps.push(steps[j].stepId);
          }
          break;
        } else {
          chainFailed = true;
          // Downstream steps superseded due to failure
          for (let j = i + 1; j < steps.length; j++) {
            supersededSteps.push(steps[j].stepId);
          }
          break;
        }
      } catch {
        if (chainAbortCtrl.signal.aborted) {
          interruptedSteps.push(step.stepId);
        } else {
          chainFailed = true;
        }
        for (let j = i + 1; j < steps.length; j++) {
          supersededSteps.push(steps[j].stepId);
        }
        break;
      }
    }

    this.activeChains.delete(chainId);

    return {
      chainId,
      success: !chainFailed && completedSteps.length === steps.length,
      stepResults,
      completedSteps,
      interruptedSteps,
      supersededSteps,
    };
  }

  /**
   * Interrupt a running chain of tools
   */
  public interruptChain(chainId: string, reason: string = 'User interrupted tool chain'): void {
    const chain = this.activeChains.get(chainId);
    if (chain) {
      chain.isInterrupted = true;
      chain.abortController.abort();
      this.logger.log({
        sessionId: this.currentSession.sessionId,
        intentId: this.currentSession.currentIntentId || 'interrupt',
        toolName: `chain_${chainId}`,
        arguments: { reason },
        operationId: chainId,
        status: 'INTERRUPTED',
        cancellation: true,
        supersession: true,
        latencyMs: null,
      });
    }
  }

  /**
   * Cancel an individual in-flight execution
   */
  public cancelExecution(executionId: string, reason: string = 'User cancelled operation'): void {
    const session = this.currentSession;
    const execution = session.activeExecutions.get(executionId);
    if (!execution) return;

    const abortCtrl = this.abortControllers.get(executionId);
    if (abortCtrl) {
      abortCtrl.abort();
    }

    if (execution.status === 'RUNNING') {
      execution.status = 'INTERRUPTED';
      execution.completedAt = performance.now();
      this.logger.log({
        sessionId: session.sessionId,
        intentId: execution.intentId,
        toolName: execution.toolName,
        arguments: { args: execution.arguments, reason },
        operationId: execution.id,
        status: 'INTERRUPTED',
        cancellation: true,
        supersession: true,
        latencyMs: execution.completedAt - execution.startedAt,
      });
      execution.status = 'SUPERSEDED';
    } else if (execution.status === 'PENDING') {
      execution.status = 'SUPERSEDED';
      execution.completedAt = performance.now();
      this.logger.log({
        sessionId: session.sessionId,
        intentId: execution.intentId,
        toolName: execution.toolName,
        arguments: { args: execution.arguments, reason },
        operationId: execution.id,
        status: 'SUPERSEDED',
        cancellation: true,
        supersession: true,
        latencyMs: 0,
      });
    }
  }

  /**
   * Cancel all currently running / pending executions in the active session
   */
  public cancelAllInFlight(reason: string = 'User interruption'): void {
    const session = this.currentSession;
    for (const [id, execution] of session.activeExecutions.entries()) {
      if (execution.status === 'RUNNING' || execution.status === 'PENDING') {
        this.cancelExecution(id, reason);
      }
    }
    // Also abort active chains
    for (const [chainId] of this.activeChains.entries()) {
      this.interruptChain(chainId, reason);
    }
  }
}

export const interruptibleToolExecutor = new InterruptibleToolExecutor();
