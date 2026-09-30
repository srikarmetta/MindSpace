import type { GraphNode, GraphEdge } from './graph';

export type OperationType =
  | 'ADD_NODE'
  | 'UPDATE_NODE'
  | 'SUPERSEDE_NODE'
  | 'REMOVE_NODE'
  | 'ADD_EDGE'
  | 'UPDATE_EDGE'
  | 'SUPERSEDE_EDGE'
  | 'REMOVE_EDGE';

export type OperationLifecycle =
  | 'PENDING'
  | 'RUNNING'
  | 'COMPLETED'
  | 'INTERRUPTED'
  | 'SUPERSEDED'
  | 'FAILED';

export interface GraphOperation {
  id: string;
  idempotencyKey: string;
  intentId: string;
  baseVersion: number;
  type: OperationType;
  status: OperationLifecycle;
  node?: GraphNode;
  edge?: GraphEdge;
  targetId?: string;
  patch?: Partial<GraphNode> | Partial<GraphEdge>;
  timestamp: number;
  description: string;
}
