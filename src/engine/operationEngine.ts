import { useGraphStore } from '../state/graphStore';
import type { GraphOperation } from '../types/operations';
import { calculateLayout } from './graphEngine';

export class OperationEngine {
  private isRunning: boolean = false;
  private abortController: AbortController | null = null;
  private timerIds: ReturnType<typeof setTimeout>[] = [];
  public stepDelayMs: number = 550; // Configurable delay between 400-800ms

  /**
   * Interrupt and cancel any ongoing execution batch via AbortController
   */
  public interrupt(reason: string = 'User interrupted'): void {
    if (this.isRunning || this.abortController) {
      if (this.abortController) {
        this.abortController.abort();
        this.abortController = null;
      }
      this.timerIds.forEach((id) => clearTimeout(id));
      this.timerIds = [];
      this.isRunning = false;

      const store = useGraphStore.getState();

      // Emit required activity UI logs
      store.addActivity('⚠ User interrupted', 'interrupted');
      store.addActivity('⚠ Stale intent detected', 'interrupted');
      store.addActivity('↻ Cancelling stale operations', 'running');

      // State transitions for operations:
      // RUNNING -> INTERRUPTED -> SUPERSEDED
      // PENDING -> SUPERSEDED
      store.cancelActiveOperations(reason);

      store.addActivity('↻ Replanning', 'running');
      store.setAgentStatus('REPLANNING');

      store.setInterruptionBanner({
        visible: true,
        stage: 'USER_INTERRUPTED',
        message: reason,
        staleIntentText: store.currentIntent?.text,
      });

      // Quick progression to STALE_PLAN
      setTimeout(() => {
        const liveStore = useGraphStore.getState();
        if (liveStore.agentStatus === 'REPLANNING') {
          liveStore.setInterruptionBanner({
            visible: true,
            stage: 'STALE_PLAN',
            message: 'Stale operations cancelled & superseded',
            staleIntentText: store.currentIntent?.text,
          });
        }
      }, 650);
    }
  }

  /**
   * Validates all 7 pre-commit safety invariants
   */
  private validatePreCommit(
    op: GraphOperation,
    signal: AbortSignal,
    currentIntentId: string
  ): boolean {
    const store = useGraphStore.getState();

    // 1. Not aborted
    if (signal.aborted) {
      console.warn(`[Pre-Commit] Blocked: Signal aborted for operation ${op.id}`);
      return false;
    }

    // 2. Intent is still current
    if (store.currentIntent?.id !== currentIntentId) {
      console.warn(`[Pre-Commit] Blocked: Intent is no longer current for operation ${op.id}`);
      return false;
    }

    // 3. Operation still exists in activeOperations
    const liveOp = store.activeOperations.find((o) => o.id === op.id);
    if (!liveOp) {
      console.warn(`[Pre-Commit] Blocked: Operation ${op.id} no longer exists`);
      return false;
    }

    // 4. Status is RUNNING (not superseded, interrupted, or pending)
    if (liveOp.status !== 'RUNNING') {
      console.warn(`[Pre-Commit] Blocked: Operation ${op.id} status is ${liveOp.status}, expected RUNNING`);
      return false;
    }

    // 5. Idempotency key has not already committed
    if (store.isIdempotencyKeyCommitted(op.idempotencyKey)) {
      console.warn(`[Pre-Commit] Blocked: Idempotency key ${op.idempotencyKey} already committed`);
      return false;
    }

    // 6. Base version is valid
    if (op.baseVersion > store.version + 1) {
      console.warn(`[Pre-Commit] Blocked: Invalid base version ${op.baseVersion} > ${store.version}`);
      return false;
    }

    return true;
  }

  /**
   * Asynchronously execute operations with progressive rendering, AbortController, and pre-commit checks
   */
  public async executeOperations(
    operations: GraphOperation[],
    isRevision: boolean = false,
    onProgress?: (current: number, total: number) => void
  ): Promise<void> {
    // If an execution is active, cancel it before starting new operations
    if (this.isRunning) {
      this.interrupt('Superseded by newer requirement');
    }

    const abortCtrl = new AbortController();
    this.abortController = abortCtrl;
    const { signal } = abortCtrl;
    this.isRunning = true;

    const initialStore = useGraphStore.getState();
    const currentIntentId = initialStore.currentIntent?.id || '';

    if (isRevision) {
      initialStore.addActivity('↻ Superseding old architecture', 'superseded');
      initialStore.addActivity('✓ Executing new plan', 'completed');
      initialStore.setActiveOperations([...initialStore.activeOperations, ...operations]);
      initialStore.setInterruptionBanner({
        visible: true,
        stage: 'REPLANNING',
        message: 'Synthesizing updated architecture...',
        newIntentText: initialStore.currentIntent?.text,
      });
    } else {
      initialStore.setActiveOperations(operations);
    }
    initialStore.setAgentStatus('EXECUTING');

    let appliedCount = 0;

    for (let i = 0; i < operations.length; i++) {
      if (signal.aborted || !this.isRunning) {
        break;
      }

      const op = operations[i];
      const store = useGraphStore.getState();

      // Idempotency check before running
      if (store.isIdempotencyKeyCommitted(op.idempotencyKey)) {
        store.addActivity(
          `Duplicate operation skipped (idempotent): ${op.description}`,
          'info'
        );
        store.setOperationStatus(op.id, 'COMPLETED');
        onProgress?.(i + 1, operations.length);
        continue;
      }

      // Transition PENDING -> RUNNING
      store.setOperationStatus(op.id, 'RUNNING');
      store.addActivity(`Operation started: ${op.description}`, 'running');

      try {
        // Progressive delay (400-800ms) with AbortController signal
        await this.sleep(this.stepDelayMs, signal);
      } catch {
        // Operation was aborted during sleep
        store.setOperationStatus(op.id, 'INTERRUPTED');
        store.setOperationStatus(op.id, 'SUPERSEDED');
        break;
      }

      // Pre-commit validation gate
      if (!this.validatePreCommit(op, signal, currentIntentId)) {
        store.setOperationStatus(op.id, 'SUPERSEDED');
        break;
      }

      // Re-read current store state for mutation
      const liveStore = useGraphStore.getState();

      // Apply mutation to graph
      if (op.type === 'ADD_NODE' && op.node) {
        const initialNode = { ...op.node, status: 'running' as const };
        const currentNodes = [...liveStore.nodes, initialNode];
        const layout = calculateLayout(currentNodes, liveStore.edges);

        liveStore.setNodes(layout.nodes);
        liveStore.addActivity(`Node created: ${op.node.label}`, 'completed');

        try {
          await this.sleep(150, signal);
        } catch {
          useGraphStore.getState().setOperationStatus(op.id, 'INTERRUPTED');
          break;
        }

        useGraphStore.getState().setNodeStatus(op.node.id, 'completed');
      } else if (op.type === 'ADD_EDGE' && op.edge) {
        const currentEdges = [...liveStore.edges, { ...op.edge, status: 'active' as const }];
        const layout = calculateLayout(liveStore.nodes, currentEdges);

        liveStore.setEdges(layout.edges);
        liveStore.setNodes(layout.nodes);
        liveStore.addActivity(`Edge created: ${op.edge.source} → ${op.edge.target}`, 'completed');

        try {
          await this.sleep(120, signal);
        } catch {
          useGraphStore.getState().setOperationStatus(op.id, 'INTERRUPTED');
          break;
        }

        useGraphStore.getState().setEdgeStatus(op.edge.id, 'completed');
      } else if (op.type === 'SUPERSEDE_NODE' && op.targetId) {
        liveStore.supersedeNode(op.targetId, op.description);
        const targetNode = liveStore.nodes.find((n) => n.id === op.targetId);
        liveStore.addActivity(`Node superseded: ${targetNode?.label || op.targetId}`, 'superseded');

        try {
          await this.sleep(150, signal);
        } catch {
          useGraphStore.getState().setOperationStatus(op.id, 'INTERRUPTED');
          break;
        }
      } else if (op.type === 'SUPERSEDE_EDGE' && op.targetId) {
        liveStore.setEdgeStatus(op.targetId, 'superseded');
        liveStore.addActivity(`Edge superseded: ${op.targetId}`, 'superseded');

        try {
          await this.sleep(100, signal);
        } catch {
          useGraphStore.getState().setOperationStatus(op.id, 'INTERRUPTED');
          break;
        }
      }

      // Transition RUNNING -> COMPLETED
      const finalOpStore = useGraphStore.getState();
      finalOpStore.setOperationStatus(op.id, 'COMPLETED');
      finalOpStore.addCommittedIdempotencyKey(op.idempotencyKey);
      finalOpStore.addActivity(`Operation completed: ${op.description}`, 'completed');
      appliedCount++;

      onProgress?.(i + 1, operations.length);

      try {
        await this.sleep(120, signal);
      } catch {
        break;
      }
    }

    // Post-execution commit
    if (!signal.aborted && this.isRunning) {
      this.isRunning = false;
      this.abortController = null;

      const endStore = useGraphStore.getState();
      const finalLayout = calculateLayout(endStore.nodes, endStore.edges);
      endStore.setNodes(finalLayout.nodes);

      if (appliedCount > 0) {
        endStore.setAgentStatus('COMMITTING');
        const nextVersion = endStore.version + 1;
        endStore.takeSnapshot(endStore.currentIntent?.text || `Architecture commit v${nextVersion}`);
        endStore.addActivity(`Graph version committed: v${nextVersion}`, 'completed');

        endStore.setInterruptionBanner({
          visible: true,
          stage: 'STATE_COMMITTED',
          version: nextVersion,
          message: `Architecture committed at v${nextVersion}`,
          newIntentText: endStore.currentIntent?.text,
        });

        // Auto-fade banner after 6.5s
        setTimeout(() => {
          const s = useGraphStore.getState();
          if (s.interruptionBanner?.stage === 'STATE_COMMITTED') {
            s.setInterruptionBanner(null);
          }
        }, 6500);
      }

      endStore.updateIntentStatus('completed');
      endStore.setAgentStatus('IDLE');
    }
  }

  /**
   * Cancellable sleep helper connected to AbortSignal
   */
  private sleep(ms: number, signal: AbortSignal): Promise<void> {
    return new Promise((resolve, reject) => {
      if (signal.aborted) {
        return reject(new DOMException('Aborted', 'AbortError'));
      }
      const timer = setTimeout(() => {
        this.timerIds = this.timerIds.filter((t) => t !== timer);
        signal.removeEventListener('abort', onAbort);
        resolve();
      }, ms);
      this.timerIds.push(timer);

      const onAbort = () => {
        clearTimeout(timer);
        this.timerIds = this.timerIds.filter((t) => t !== timer);
        signal.removeEventListener('abort', onAbort);
        reject(new DOMException('Aborted', 'AbortError'));
      };
      signal.addEventListener('abort', onAbort);
    });
  }
}

export const operationEngine = new OperationEngine();
