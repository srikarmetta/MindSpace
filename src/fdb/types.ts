/**
 * Full-Duplex-Bench v3 (FDB-v3) Core Types
 * Generic interfaces for interruptible tool execution, argument correction,
 * chained workflows, and session isolation.
 */

export type SideEffectLevel = 'READ_ONLY' | 'STATE_CHANGING';

export type ToolExecutionStatus =
  | 'PENDING'
  | 'RUNNING'
  | 'COMPLETED'
  | 'INTERRUPTED'
  | 'SUPERSEDED'
  | 'FAILED';

export interface FDBLoggerInterface {
  log(entry: Omit<FDBLogEntry, 'timestamp' | 'epochMs'>): void;
}

export interface ToolContext {
  sessionId: string;
  intentId: string;
  executionId: string;
  signal: AbortSignal;
  logger: FDBLoggerInterface;
}

export interface ToolResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  appliedChanges?: boolean;
  metadata?: Record<string, unknown>;
}

export interface ToolDefinition<TArgs = unknown, TResult = unknown> {
  name: string;
  description: string;
  inputSchema: unknown;
  sideEffectLevel: SideEffectLevel;
  execute(args: TArgs, context: ToolContext): Promise<ToolResult<TResult>>;
}

export interface ToolExecution<TArgs = unknown> {
  id: string;
  toolName: string;
  arguments: TArgs;
  intentId: string;
  status: ToolExecutionStatus;
  idempotencyKey: string;
  startedAt: number;
  completedAt?: number;
  error?: string;
  isCancellable: boolean;
}

export interface FDBLogEntry {
  timestamp: string;
  epochMs: number;
  sessionId: string;
  intentId: string;
  toolName: string;
  arguments: unknown;
  operationId: string;
  status: ToolExecutionStatus;
  cancellation: boolean;
  supersession: boolean;
  latencyMs: number | null;
}

export interface SessionState {
  sessionId: string;
  currentIntentId: string | null;
  activeExecutions: Map<string, ToolExecution>;
  committedIdempotencyKeys: Set<string>;
  history: ToolExecution[];
  startedAt: number;
}

export interface ChainedStep<TArgs = unknown> {
  stepId: string;
  toolName: string;
  resolveArguments: (prevResults: Record<string, unknown>, context: ToolContext) => TArgs | Promise<TArgs>;
}

export interface ChainExecutionResult {
  chainId: string;
  success: boolean;
  stepResults: Record<string, ToolResult>;
  completedSteps: string[];
  interruptedSteps: string[];
  supersededSteps: string[];
}
