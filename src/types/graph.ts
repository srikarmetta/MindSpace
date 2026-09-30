export type NodeType =
  | 'user'
  | 'agent'
  | 'service'
  | 'database'
  | 'queue'
  | 'api'
  | 'cache'
  | 'storage'
  | 'generic';

export type NodeStatus =
  | 'pending'
  | 'running'
  | 'completed'
  | 'interrupted'
  | 'superseded'
  | 'failed';

export type EdgeStatus =
  | 'pending'
  | 'active'
  | 'completed'
  | 'superseded';

export type AgentStatus =
  | 'LISTENING'
  | 'UNDERSTANDING'
  | 'PLANNING'
  | 'EXECUTING'
  | 'REPLANNING'
  | 'COMMITTING'
  | 'IDLE';

export interface GraphNode {
  id: string;
  type: NodeType;
  label: string;
  description?: string;
  status: NodeStatus;
  metadata?: Record<string, unknown>;
  position?: { x: number; y: number };
}

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  label?: string;
  status: EdgeStatus;
}

export interface GraphSnapshot {
  version: number;
  timestamp: string;
  nodes: GraphNode[];
  edges: GraphEdge[];
  description: string;
}

export interface ActivityEvent {
  id: string;
  status: 'info' | 'running' | 'completed' | 'interrupted' | 'superseded' | 'error';
  message: string;
  timestamp: string;
}
