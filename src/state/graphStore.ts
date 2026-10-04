import { create } from 'zustand';
import type { 
  GraphNode, 
  GraphEdge, 
  GraphSnapshot, 
  AgentStatus, 
  ActivityEvent,
  NodeStatus,
  EdgeStatus
} from '../types/graph';
import type { GraphOperation, OperationLifecycle } from '../types/operations';
import type { Intent, IntentLifecycle } from '../types/intent';
import type { ArchitectureIR } from '../types/ir';

export type InterruptionStage =
  | 'USER_INTERRUPTED'
  | 'STALE_PLAN'
  | 'REPLANNING'
  | 'NEW_INTENT'
  | 'STATE_COMMITTED';

export interface InterruptionBannerState {
  visible: boolean;
  stage: InterruptionStage;
  message?: string;
  staleIntentText?: string;
  newIntentText?: string;
  version?: number;
}

export interface GraphState {
  version: number;
  nodes: GraphNode[];
  edges: GraphEdge[];
  history: GraphSnapshot[];
  activeOperations: GraphOperation[];
  committedIdempotencyKeys: string[];
  currentIntent: Intent | null;
  previousIntent: Intent | null;
  agentStatus: AgentStatus;
  activities: ActivityEvent[];
  isVoiceListening: boolean;
  interruptionBanner: InterruptionBannerState | null;
  inputPrompt: string;
  currentIR: ArchitectureIR | null;

  // Actions
  setInputPrompt: (prompt: string) => void;
  setCurrentIR: (ir: ArchitectureIR | null) => void;
  setInterruptionBanner: (banner: InterruptionBannerState | null) => void;
  setNodes: (nodes: GraphNode[] | ((prev: GraphNode[]) => GraphNode[])) => void;
  setEdges: (edges: GraphEdge[] | ((prev: GraphEdge[]) => GraphEdge[])) => void;
  addNode: (node: GraphNode) => void;
  updateNode: (id: string, patch: Partial<GraphNode>) => void;
  setNodeStatus: (id: string, status: NodeStatus) => void;
  supersedeNode: (id: string, reason?: string) => void;
  addEdge: (edge: GraphEdge) => void;
  updateEdge: (id: string, patch: Partial<GraphEdge>) => void;
  setEdgeStatus: (id: string, status: EdgeStatus) => void;
  
  setAgentStatus: (status: AgentStatus) => void;
  setCurrentIntent: (intent: Intent | null) => void;
  setPreviousIntent: (intent: Intent | null) => void;
  supersedeCurrentIntent: (newIntent: Intent) => void;
  updateIntentStatus: (status: IntentLifecycle) => void;
  
  setActiveOperations: (ops: GraphOperation[]) => void;
  addOperation: (op: GraphOperation) => void;
  updateOperation: (id: string, patch: Partial<GraphOperation>) => void;
  setOperationStatus: (id: string, newStatus: OperationLifecycle) => void;
  cancelActiveOperations: (reason?: string) => void;

  addCommittedIdempotencyKey: (key: string) => void;
  isIdempotencyKeyCommitted: (key: string) => boolean;

  addActivity: (message: string, status?: ActivityEvent['status']) => void;
  clearActivities: () => void;
  
  setVoiceListening: (listening: boolean) => void;
  toggleVoiceListening: () => void;

  takeSnapshot: (description: string) => void;
  restoreSnapshot: (version: number) => void;
  resetGraph: () => void;
  incrementVersion: () => void;
}

const initialSnapshot: GraphSnapshot = {
  version: 1,
  timestamp: new Date().toLocaleTimeString(),
  nodes: [],
  edges: [],
  description: 'Initial empty architecture'
};

// Valid transition validator
function isValidTransition(current: OperationLifecycle, next: OperationLifecycle): boolean {
  if (current === next) return true;
  switch (current) {
    case 'PENDING':
      return next === 'RUNNING' || next === 'SUPERSEDED';
    case 'RUNNING':
      return next === 'COMPLETED' || next === 'INTERRUPTED' || next === 'FAILED' || next === 'SUPERSEDED';
    case 'INTERRUPTED':
      return next === 'SUPERSEDED' || next === 'FAILED';
    case 'COMPLETED':
      return next === 'SUPERSEDED';
    case 'SUPERSEDED':
    case 'FAILED':
      return false; // Terminal
    default:
      return true;
  }
}

export const useGraphStore = create<GraphState>((set, get) => ({
  version: 1,
  nodes: [],
  edges: [],
  history: [initialSnapshot],
  activeOperations: [],
  committedIdempotencyKeys: [],
  currentIntent: null,
  previousIntent: null,
  agentStatus: 'IDLE',
  activities: [
    {
      id: 'init-1',
      status: 'info',
      message: 'MindSpace architect engine initialized',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
    },
    {
      id: 'init-2',
      status: 'completed',
      message: 'Ready for requirements. Speak or type below.',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
    }
  ],
  isVoiceListening: false,
  interruptionBanner: null,
  inputPrompt: '',
  currentIR: null,

  setInputPrompt: (inputPrompt) => set({ inputPrompt }),
  setCurrentIR: (currentIR) => set({ currentIR }),
  setInterruptionBanner: (interruptionBanner) => set({ interruptionBanner }),

  setNodes: (nodesOrUpdater) =>
    set((state) => ({
      nodes: typeof nodesOrUpdater === 'function' ? nodesOrUpdater(state.nodes) : nodesOrUpdater,
    })),

  setEdges: (edgesOrUpdater) =>
    set((state) => ({
      edges: typeof edgesOrUpdater === 'function' ? edgesOrUpdater(state.edges) : edgesOrUpdater,
    })),

  addNode: (node) =>
    set((state) => {
      const exists = state.nodes.some((n) => n.id === node.id);
      if (exists) {
        return {
          nodes: state.nodes.map((n) => (n.id === node.id ? { ...n, ...node } : n)),
        };
      }
      return { nodes: [...state.nodes, node] };
    }),

  updateNode: (id, patch) =>
    set((state) => ({
      nodes: state.nodes.map((n) => (n.id === id ? { ...n, ...patch } : n)),
    })),

  setNodeStatus: (id, status) =>
    set((state) => ({
      nodes: state.nodes.map((n) => (n.id === id ? { ...n, status } : n)),
    })),

  supersedeNode: (id, reason) =>
    set((state) => ({
      nodes: state.nodes.map((n) =>
        n.id === id
          ? {
              ...n,
              status: 'superseded' as const,
              metadata: { ...n.metadata, supersededReason: reason || 'Superseded by user interruption' },
            }
          : n
      ),
      edges: state.edges.map((e) =>
        e.source === id || e.target === id
          ? { ...e, status: 'superseded' as const }
          : e
      ),
    })),

  addEdge: (edge) =>
    set((state) => {
      const exists = state.edges.some((e) => e.id === edge.id);
      if (exists) {
        return {
          edges: state.edges.map((e) => (e.id === edge.id ? { ...e, ...edge } : e)),
        };
      }
      return { edges: [...state.edges, edge] };
    }),

  updateEdge: (id, patch) =>
    set((state) => ({
      edges: state.edges.map((e) => (e.id === id ? { ...e, ...patch } : e)),
    })),

  setEdgeStatus: (id, status) =>
    set((state) => ({
      edges: state.edges.map((e) => (e.id === id ? { ...e, status } : e)),
    })),

  setAgentStatus: (agentStatus) => set({ agentStatus }),

  setCurrentIntent: (currentIntent) => set({ currentIntent }),

  setPreviousIntent: (previousIntent) => set({ previousIntent }),

  supersedeCurrentIntent: (newIntent) =>
    set((state) => {
      const prev = state.currentIntent
        ? { ...state.currentIntent, status: 'superseded' as const }
        : null;
      return {
        previousIntent: prev,
        currentIntent: newIntent,
        agentStatus: 'REPLANNING',
      };
    }),

  updateIntentStatus: (status) =>
    set((state) => ({
      currentIntent: state.currentIntent ? { ...state.currentIntent, status } : null,
    })),

  setActiveOperations: (activeOperations) => set({ activeOperations }),

  addOperation: (op) =>
    set((state) => ({
      activeOperations: [...state.activeOperations, op],
    })),

  updateOperation: (id, patch) =>
    set((state) => ({
      activeOperations: state.activeOperations.map((op) =>
        op.id === id ? { ...op, ...patch } : op
      ),
    })),

  setOperationStatus: (id, newStatus) =>
    set((state) => ({
      activeOperations: state.activeOperations.map((op) => {
        if (op.id !== id) return op;
        if (!isValidTransition(op.status, newStatus)) {
          console.warn(`[State Guard] Invalid operation transition from ${op.status} to ${newStatus}`);
          return op;
        }
        return { ...op, status: newStatus };
      }),
    })),

  cancelActiveOperations: (reason) =>
    set((state) => ({
      activeOperations: state.activeOperations.map((op) => {
        if (op.status === 'RUNNING') {
          return { ...op, status: 'INTERRUPTED' as const };
        }
        if (op.status === 'PENDING') {
          return { ...op, status: 'SUPERSEDED' as const };
        }
        return op;
      }),
      activities: [
        {
          id: `cancel-${Date.now()}`,
          status: 'interrupted',
          message: reason || 'Ongoing operations interrupted by user',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        },
        ...state.activities,
      ],
    })),

  addCommittedIdempotencyKey: (key: string) =>
    set((state) => ({
      committedIdempotencyKeys: [...state.committedIdempotencyKeys, key],
    })),

  isIdempotencyKeyCommitted: (key: string) => {
    return get().committedIdempotencyKeys.includes(key);
  },

  addActivity: (message, status = 'info') =>
    set((state) => ({
      activities: [
        {
          id: `act-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          status,
          message,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        },
        ...state.activities.slice(0, 99),
      ],
    })),

  clearActivities: () => set({ activities: [] }),

  setVoiceListening: (listening) => set({ isVoiceListening: listening }),
  toggleVoiceListening: () => set((state) => ({ isVoiceListening: !state.isVoiceListening })),

  takeSnapshot: (description) =>
    set((state) => {
      const newVersion = state.version + 1;
      const snapshot: GraphSnapshot = {
        version: newVersion,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        nodes: JSON.parse(JSON.stringify(state.nodes)),
        edges: JSON.parse(JSON.stringify(state.edges)),
        description,
      };
      return {
        version: newVersion,
        history: [...state.history, snapshot],
      };
    }),

  restoreSnapshot: (targetVersion) =>
    set((state) => {
      const snap = state.history.find((h) => h.version === targetVersion);
      if (!snap) return state;
      return {
        version: snap.version,
        nodes: JSON.parse(JSON.stringify(snap.nodes)),
        edges: JSON.parse(JSON.stringify(snap.edges)),
        activities: [
          {
            id: `restore-${Date.now()}`,
            status: 'completed',
            message: `Restored architecture snapshot v${snap.version}: ${snap.description}`,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
          },
          ...state.activities,
        ],
      };
    }),

  resetGraph: () =>
    set({
      version: 1,
      nodes: [],
      edges: [],
      history: [initialSnapshot],
      activeOperations: [],
      committedIdempotencyKeys: [],
      currentIntent: null,
      previousIntent: null,
      agentStatus: 'IDLE',
      interruptionBanner: null,
      inputPrompt: '',
      currentIR: null,
      activities: [
        {
          id: `reset-${Date.now()}`,
          status: 'info',
          message: 'Architecture graph reset to clean canvas.',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        },
      ],
    }),

  incrementVersion: () => set((state) => ({ version: state.version + 1 })),
}));
