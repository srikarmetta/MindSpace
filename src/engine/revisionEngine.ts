import type { GraphNode, GraphEdge } from '../types/graph';
import type { GraphOperation } from '../types/operations';
import type { Intent } from '../types/intent';
import { ArchitectureInterpreter } from './architectureInterpreter';

export interface RevisionOutput {
  operationsToCancel: GraphOperation[];
  operationsToPreserve: GraphOperation[];
  nodesToSupersede: string[];
  edgesToSupersede: string[];
  preservedNodeIds: string[];
  newOperations: GraphOperation[];
  summary: string;
}

export class RevisionEngine {
  /**
   * Evaluates incoming revision intent against existing graph state and active operations.
   * Produces an atomic plan to cancel/supersede stale work while preserving valid components.
   */
  public static evaluate(
    newIntent: Intent,
    graphState: { nodes: GraphNode[]; edges: GraphEdge[]; version: number },
    activeOperations: GraphOperation[]
  ): RevisionOutput {
    const text = newIntent.text.toLowerCase();
    const baseVersion = graphState.version;

    // Helper to build idempotent operation
    const createOp = (
      type: GraphOperation['type'],
      desc: string,
      targetKey: string,
      data: { node?: GraphNode; edge?: GraphEdge; targetId?: string }
    ): GraphOperation => ({
      id: `op-rev-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      idempotencyKey: `${newIntent.id}:${baseVersion}:${type}:${targetKey}`,
      intentId: newIntent.id,
      baseVersion,
      type,
      status: 'PENDING',
      timestamp: Date.now(),
      description: desc,
      ...data,
    });

    // 1. SCENARIO: Multi-Agent Revision ("Actually, make it a multi-agent system")
    if (
      text.includes('multi-agent') ||
      text.includes('multi agent') ||
      text.includes('router') ||
      (text.includes('agent') && text.includes('actually'))
    ) {
      return this.planMultiAgentRevision(newIntent, graphState, activeOperations, createOp);
    }

    // 2. SCENARIO: Billing Database Evolution ("Billing should have its own database")
    if (
      text.includes('billing') &&
      (text.includes('database') || text.includes('db') || text.includes('postgres') || text.includes('store') || text.includes('own'))
    ) {
      return this.planBillingDatabaseEvolution(newIntent, graphState, activeOperations, createOp);
    }

    // 3. SCENARIO: Queue Self-Correction (Kafka -> RabbitMQ)
    if (
      text.includes('rabbitmq') ||
      (text.includes('queue') && text.includes('actually'))
    ) {
      return this.planQueueCorrection(newIntent, graphState, activeOperations, createOp);
    }

    // 4. SCENARIO: Database Self-Correction (e.g. Postgres -> Vector DB)
    if (
      text.includes('vector db') ||
      text.includes('qdrant') ||
      (text.includes('database') && text.includes('actually'))
    ) {
      return this.planDatabaseCorrection(newIntent, graphState, activeOperations, createOp);
    }

    // 5. GENERIC REPLACEMENT: "Replace X with Y" / "Change X to Y" / "Use Y instead of X"
    if (
      text.includes('replace') ||
      text.includes('change') ||
      (text.includes('use') && (text.includes('instead') || text.includes('rather than')))
    ) {
      const repl = this.planGenericReplacement(newIntent, graphState, activeOperations, createOp);
      if (repl) return repl;
    }

    // 6. GENERIC REMOVAL: "Remove X" / "Delete X" / "Drop X"
    if (
      text.includes('remove') ||
      text.includes('delete') ||
      text.includes('drop') ||
      text.includes('disconnect')
    ) {
      const rem = this.planGenericRemoval(newIntent, graphState, activeOperations, createOp);
      if (rem) return rem;
    }

    // 7. GENERIC CONNECTION: "Connect X to Y" / "Link X to Y"
    if (
      text.includes('connect') ||
      text.includes('link')
    ) {
      const conn = this.planGenericConnection(newIntent, graphState, activeOperations, createOp);
      if (conn) return conn;
    }

    // 8. GENERIC ADDITION: "Add X connected to Y and Z" / "Add X"
    if (
      text.includes('add') ||
      text.includes('attach') ||
      text.includes('provision') ||
      text.includes('introduce')
    ) {
      const add = this.planGenericAddition(newIntent, graphState, activeOperations, createOp);
      if (add) return add;
    }

    // Default fallback revision
    return this.planDefaultRevision(newIntent, graphState, activeOperations, createOp);
  }

  /**
   * Multi-Agent Revision:
   * - Supersedes 'Support Agent'
   * - Preserves 'User', 'RAG', and 'Knowledge Base'
   * - Deploys 'Agent Router', 'Sales Agent', 'Billing Agent', 'Technical Agent'
   * - Rewires connections seamlessly
   */
  private static planMultiAgentRevision(
    _newIntent: Intent,
    graphState: { nodes: GraphNode[]; edges: GraphEdge[]; version: number },
    activeOperations: GraphOperation[],
    createOp: (type: GraphOperation['type'], desc: string, targetKey: string, data: { node?: GraphNode; edge?: GraphEdge; targetId?: string }) => GraphOperation
  ): RevisionOutput {
    const operationsToCancel: GraphOperation[] = [];
    const operationsToPreserve: GraphOperation[] = [];
    const nodesToSupersede: string[] = [];
    const edgesToSupersede: string[] = [];
    const preservedNodeIds: string[] = [];
    const newOperations: GraphOperation[] = [];

    // Identify stale single-agent operations to cancel
    activeOperations.forEach((op) => {
      const targetId = op.targetId || op.node?.id || op.edge?.id || '';
      if (
        targetId.includes('support-agent') ||
        op.description.toLowerCase().includes('support agent')
      ) {
        operationsToCancel.push(op);
      } else {
        operationsToPreserve.push(op);
      }
    });

    // Check existing nodes in graph
    const supportAgentNode = graphState.nodes.find(
      (n) => n.id === 'node-support-agent' || n.label.toLowerCase().includes('support agent')
    );

    if (supportAgentNode) {
      nodesToSupersede.push(supportAgentNode.id);
      newOperations.push(
        createOp('SUPERSEDE_NODE', `Supersede ${supportAgentNode.label} (replaced by Multi-Agent Router)`, supportAgentNode.id, {
          targetId: supportAgentNode.id,
        })
      );

      // Supersede connected edges to support agent
      graphState.edges.forEach((e) => {
        if (e.source === supportAgentNode.id || e.target === supportAgentNode.id) {
          edgesToSupersede.push(e.id);
          newOperations.push(
            createOp('SUPERSEDE_EDGE', `Deprecate link ${e.id}`, e.id, { targetId: e.id })
          );
        }
      });
    }

    // Preserve User, RAG, and Knowledge Base nodes
    graphState.nodes.forEach((n) => {
      if (n.id !== supportAgentNode?.id) {
        preservedNodeIds.push(n.id);
      }
    });

    // 1. Ensure User node exists (create if not present)
    const hasUser = graphState.nodes.some((n) => n.id === 'node-user');
    if (!hasUser) {
      const userNode: GraphNode = {
        id: 'node-user',
        type: 'user',
        label: 'User',
        description: 'End customer touchpoint',
        status: 'pending',
      };
      newOperations.push(
        createOp('ADD_NODE', 'Create User client node', userNode.id, { node: userNode })
      );
    }

    // 2. Create Agent Router
    const routerNode: GraphNode = {
      id: 'node-agent-router',
      type: 'agent',
      label: 'Agent Router',
      description: 'Dynamic triage & orchestrator',
      status: 'pending',
    };
    newOperations.push(
      createOp('ADD_NODE', 'Create Agent Router node', routerNode.id, { node: routerNode })
    );

    // Connect User → Agent Router
    const edgeUserRouter: GraphEdge = {
      id: `edge-user-router-${Date.now().toString(36)}`,
      source: 'node-user',
      target: routerNode.id,
      label: 'Triage request',
      status: 'pending',
    };
    newOperations.push(
      createOp('ADD_EDGE', 'Connect User → Agent Router', edgeUserRouter.id, { edge: edgeUserRouter })
    );

    // 3. Create Sales Agent
    const salesNode: GraphNode = {
      id: 'node-sales-agent',
      type: 'agent',
      label: 'Sales Agent',
      description: 'Product queries & subscriptions',
      status: 'pending',
    };
    newOperations.push(
      createOp('ADD_NODE', 'Create Sales Agent node', salesNode.id, { node: salesNode })
    );
    const edgeRouterSales: GraphEdge = {
      id: `edge-router-sales-${Date.now().toString(36)}`,
      source: routerNode.id,
      target: salesNode.id,
      label: 'Route: Sales',
      status: 'pending',
    };
    newOperations.push(
      createOp('ADD_EDGE', 'Connect Agent Router → Sales Agent', edgeRouterSales.id, { edge: edgeRouterSales })
    );

    // 4. Create Billing Agent
    const billingNode: GraphNode = {
      id: 'node-billing-agent',
      type: 'agent',
      label: 'Billing Agent',
      description: 'Invoices, refunds & payment issues',
      status: 'pending',
    };
    newOperations.push(
      createOp('ADD_NODE', 'Create Billing Agent node', billingNode.id, { node: billingNode })
    );
    const edgeRouterBilling: GraphEdge = {
      id: `edge-router-billing-${Date.now().toString(36)}`,
      source: routerNode.id,
      target: billingNode.id,
      label: 'Route: Billing',
      status: 'pending',
    };
    newOperations.push(
      createOp('ADD_EDGE', 'Connect Agent Router → Billing Agent', edgeRouterBilling.id, { edge: edgeRouterBilling })
    );

    // 5. Create Technical Agent
    const techNode: GraphNode = {
      id: 'node-technical-agent',
      type: 'agent',
      label: 'Technical Agent',
      description: 'Debugging & technical support',
      status: 'pending',
    };
    newOperations.push(
      createOp('ADD_NODE', 'Create Technical Agent node', techNode.id, { node: techNode })
    );
    const edgeRouterTech: GraphEdge = {
      id: `edge-router-tech-${Date.now().toString(36)}`,
      source: routerNode.id,
      target: techNode.id,
      label: 'Route: Technical',
      status: 'pending',
    };
    newOperations.push(
      createOp('ADD_EDGE', 'Connect Agent Router → Technical Agent', edgeRouterTech.id, { edge: edgeRouterTech })
    );

    // 6. Connect Technical Agent to preserved RAG component if RAG exists
    const ragNode = graphState.nodes.find((n) => n.id === 'node-rag');
    if (ragNode) {
      const edgeTechRAG: GraphEdge = {
        id: `edge-tech-rag-${Date.now().toString(36)}`,
        source: techNode.id,
        target: ragNode.id,
        label: 'Context lookup',
        status: 'pending',
      };
      newOperations.push(
        createOp('ADD_EDGE', 'Connect Technical Agent → RAG', edgeTechRAG.id, { edge: edgeTechRAG })
      );
    }

    return {
      operationsToCancel,
      operationsToPreserve,
      nodesToSupersede,
      edgesToSupersede,
      preservedNodeIds,
      newOperations,
      summary: 'Interrupted & Replanned: Superseded Support Agent with Multi-Agent Router while preserving User, RAG, and Knowledge Base.',
    };
  }

  /**
   * Queue Self-Correction:
   * "Use Kafka" → "Actually, use RabbitMQ"
   */
  private static planQueueCorrection(
    _newIntent: Intent,
    graphState: { nodes: GraphNode[]; edges: GraphEdge[]; version: number },
    activeOperations: GraphOperation[],
    createOp: (type: GraphOperation['type'], desc: string, targetKey: string, data: { node?: GraphNode; edge?: GraphEdge; targetId?: string }) => GraphOperation
  ): RevisionOutput {
    const operationsToCancel: GraphOperation[] = [];
    const operationsToPreserve: GraphOperation[] = [];
    const nodesToSupersede: string[] = [];
    const edgesToSupersede: string[] = [];
    const preservedNodeIds: string[] = [];
    const newOperations: GraphOperation[] = [];

    // Cancel pending/running Kafka operations
    activeOperations.forEach((op) => {
      const desc = op.description.toLowerCase();
      if (desc.includes('kafka') || (op.node && op.node.label.toLowerCase().includes('kafka'))) {
        operationsToCancel.push(op);
      } else {
        operationsToPreserve.push(op);
      }
    });

    // Check if Kafka node was already committed
    const kafkaNode = graphState.nodes.find(
      (n) => n.label.toLowerCase().includes('kafka') && n.status !== 'superseded'
    );

    let predecessorId = 'node-user';
    let successorId = '';
    if (kafkaNode) {
      nodesToSupersede.push(kafkaNode.id);
      newOperations.push(
        createOp('SUPERSEDE_NODE', `Supersede ${kafkaNode.label} (corrected to RabbitMQ)`, kafkaNode.id, {
          targetId: kafkaNode.id,
        })
      );

      // Deprecate incident edges (both incoming and outgoing)
      graphState.edges.forEach((e) => {
        if (e.target === kafkaNode.id) {
          predecessorId = e.source;
          edgesToSupersede.push(e.id);
          newOperations.push(
            createOp('SUPERSEDE_EDGE', `Deprecate link to ${kafkaNode.label}`, e.id, { targetId: e.id })
          );
        } else if (e.source === kafkaNode.id) {
          successorId = e.target;
          edgesToSupersede.push(e.id);
          newOperations.push(
            createOp('SUPERSEDE_EDGE', `Deprecate link from ${kafkaNode.label}`, e.id, { targetId: e.id })
          );
        }
      });
    } else {
      // Find latest active agent or service to connect to (e.g. Order Service)
      const orderService = graphState.nodes.find(
        (n) => n.id.includes('order') || n.label.toLowerCase().includes('order')
      );
      const lastActive = orderService || graphState.nodes.find(
        (n) => (n.type === 'agent' || n.type === 'service') && n.status !== 'superseded'
      );
      if (lastActive) predecessorId = lastActive.id;
    }

    // Preserve all non-Kafka nodes
    graphState.nodes.forEach((n) => {
      if (n.id !== kafkaNode?.id) preservedNodeIds.push(n.id);
    });

    // Deploy replacement RabbitMQ node
    const rabbitMqNode: GraphNode = {
      id: `node-rabbitmq-${Date.now().toString(36)}`,
      type: 'queue',
      label: 'RabbitMQ',
      description: 'AMQP broker for reliable async messaging',
      status: 'pending',
    };
    newOperations.push(
      createOp('ADD_NODE', 'Deploy RabbitMQ async message broker', rabbitMqNode.id, {
        node: rabbitMqNode,
      })
    );

    // Connect from predecessor to RabbitMQ
    const rabbitEdge: GraphEdge = {
      id: `edge-to-rabbitmq-${Date.now().toString(36)}`,
      source: predecessorId,
      target: rabbitMqNode.id,
      label: 'AMQP events',
      status: 'pending',
    };
    newOperations.push(
      createOp('ADD_EDGE', `Connect ${predecessorId} → RabbitMQ`, rabbitEdge.id, {
        edge: rabbitEdge,
      })
    );

    // If downstream successor exists (e.g. Delivery Service), connect RabbitMQ → Successor
    const deliveryNode = graphState.nodes.find(
      (n) => n.id.includes('delivery') || n.label.toLowerCase().includes('delivery')
    );
    const targetSuccessorId = successorId || (deliveryNode && deliveryNode.status !== 'superseded' ? deliveryNode.id : '');
    if (targetSuccessorId) {
      const downstreamEdge: GraphEdge = {
        id: `edge-rabbitmq-to-successor-${Date.now().toString(36)}`,
        source: rabbitMqNode.id,
        target: targetSuccessorId,
        label: 'Consume orders',
        status: 'pending',
      };
      newOperations.push(
        createOp('ADD_EDGE', `Connect RabbitMQ → ${targetSuccessorId}`, downstreamEdge.id, {
          edge: downstreamEdge,
        })
      );
    }

    return {
      operationsToCancel,
      operationsToPreserve,
      nodesToSupersede,
      edgesToSupersede,
      preservedNodeIds,
      newOperations,
      summary: 'Self-Correction: Cancelled/superseded Kafka and provisioned RabbitMQ broker.',
    };
  }

  /**
   * Database Self-Correction
   */
  private static planDatabaseCorrection(
    _newIntent: Intent,
    graphState: { nodes: GraphNode[]; edges: GraphEdge[]; version: number },
    _activeOperations: GraphOperation[],
    createOp: (type: GraphOperation['type'], desc: string, targetKey: string, data: { node?: GraphNode; edge?: GraphEdge; targetId?: string }) => GraphOperation
  ): RevisionOutput {
    const nodesToSupersede: string[] = [];
    const edgesToSupersede: string[] = [];
    const preservedNodeIds: string[] = [];
    const newOperations: GraphOperation[] = [];

    const dbNode = graphState.nodes.find((n) => n.type === 'database' && n.status !== 'superseded');

    if (dbNode) {
      nodesToSupersede.push(dbNode.id);
      newOperations.push(
        createOp('SUPERSEDE_NODE', `Supersede ${dbNode.label} (migrated to Qdrant Vector DB)`, dbNode.id, {
          targetId: dbNode.id,
        })
      );

      const newDb: GraphNode = {
        id: `node-qdrant-vector-${Date.now().toString(36)}`,
        type: 'database',
        label: 'Qdrant Vector DB',
        description: 'HNSW vector store & hybrid embeddings search',
        status: 'pending',
      };
      newOperations.push(
        createOp('ADD_NODE', 'Deploy Qdrant Vector DB', newDb.id, { node: newDb })
      );

      graphState.edges.forEach((e) => {
        if (e.target === dbNode.id) {
          edgesToSupersede.push(e.id);
          newOperations.push(
            createOp('SUPERSEDE_EDGE', `Deprecate link to ${dbNode.label}`, e.id, { targetId: e.id })
          );
          const newEdge: GraphEdge = {
            id: `edge-rewired-${Date.now().toString(36)}`,
            source: e.source,
            target: newDb.id,
            label: 'Vector queries',
            status: 'pending',
          };
          newOperations.push(
            createOp('ADD_EDGE', `Rewire ${e.source} → Qdrant Vector DB`, newEdge.id, { edge: newEdge })
          );
        }
      });
    }

    graphState.nodes.forEach((n) => {
      if (n.id !== dbNode?.id) preservedNodeIds.push(n.id);
    });

    return {
      operationsToCancel: [],
      operationsToPreserve: [],
      nodesToSupersede,
      edgesToSupersede,
      preservedNodeIds,
      newOperations,
      summary: 'Revision: Superseded legacy database with Qdrant Vector DB.',
    };
  }

  /**
   * Default generic revision
   */
  private static planDefaultRevision(
    newIntent: Intent,
    graphState: { nodes: GraphNode[]; edges: GraphEdge[]; version: number },
    _activeOperations: GraphOperation[],
    createOp: (type: GraphOperation['type'], desc: string, targetKey: string, data: { node?: GraphNode; edge?: GraphEdge }) => GraphOperation
  ): RevisionOutput {
    const newOperations: GraphOperation[] = [];

    const queueNode: GraphNode = {
      id: `node-async-buffer-${Date.now().toString(36)}`,
      type: 'queue',
      label: 'Async Backpressure Buffer',
      description: 'Decoupled queue buffer for burst traffic',
      status: 'pending',
    };
    newOperations.push(
      createOp('ADD_NODE', 'Attach Async Backpressure Queue', queueNode.id, {
        node: queueNode,
      })
    );

    const lastNode = graphState.nodes.find((n) => n.status !== 'superseded');
    if (lastNode) {
      const edge: GraphEdge = {
        id: `edge-rev-${Date.now().toString(36)}`,
        source: lastNode.id,
        target: queueNode.id,
        label: 'Async stream',
        status: 'pending',
      };
      newOperations.push(
        createOp('ADD_EDGE', `Linked ${lastNode.label} to backpressure queue`, edge.id, {
          edge,
        })
      );
    }

    return {
      operationsToCancel: [],
      operationsToPreserve: [],
      nodesToSupersede: [],
      edgesToSupersede: [],
      preservedNodeIds: graphState.nodes.map((n) => n.id),
      newOperations,
      summary: `Evolved architecture: Incorporated updates based on "${newIntent.text}"`,
    };
  }

  /**
   * Billing Database Evolution:
   * Adds: Billing Agent → Billing Database
   * Preserves all valid v2 nodes (User, Agent Router, Sales Agent, Billing Agent, Technical Agent).
   */
  private static planBillingDatabaseEvolution(
    _newIntent: Intent,
    graphState: { nodes: GraphNode[]; edges: GraphEdge[]; version: number },
    _activeOperations: GraphOperation[],
    createOp: (type: GraphOperation['type'], desc: string, targetKey: string, data: { node?: GraphNode; edge?: GraphEdge; targetId?: string }) => GraphOperation
  ): RevisionOutput {
    const newOperations: GraphOperation[] = [];
    const preservedNodeIds = graphState.nodes.map((n) => n.id);

    // 1. Locate or provision Billing Agent
    let billingAgent = graphState.nodes.find(
      (n) => n.id === 'node-billing-agent' || n.label.toLowerCase().includes('billing')
    );

    if (!billingAgent) {
      billingAgent = {
        id: 'node-billing-agent',
        type: 'agent',
        label: 'Billing Agent',
        description: 'Invoices, refunds & payment issues',
        status: 'pending',
      };
      newOperations.push(
        createOp('ADD_NODE', 'Create Billing Agent node', billingAgent.id, { node: billingAgent })
      );
    }

    // 2. Provision dedicated Billing Database
    const billingDb: GraphNode = {
      id: 'node-billing-database',
      type: 'database',
      label: 'Billing Database',
      description: 'Dedicated financial ledger & transaction store (PostgreSQL/ACID)',
      status: 'pending',
    };

    newOperations.push(
      createOp('ADD_NODE', 'Provision dedicated Billing Database', billingDb.id, { node: billingDb })
    );

    // 3. Connect Billing Agent → Billing Database
    const edgeBillingToDb: GraphEdge = {
      id: `edge-billing-agent-db-${Date.now().toString(36)}`,
      source: billingAgent.id,
      target: billingDb.id,
      label: 'ACID Ledger',
      status: 'pending',
    };

    newOperations.push(
      createOp('ADD_EDGE', 'Connect Billing Agent → Billing Database', edgeBillingToDb.id, { edge: edgeBillingToDb })
    );

    return {
      operationsToCancel: [],
      operationsToPreserve: [],
      nodesToSupersede: [],
      edgesToSupersede: [],
      preservedNodeIds,
      newOperations,
      summary: 'Architecture Evolution: Attached dedicated Billing Database to Billing Agent while preserving active topology.',
    };
  }

  /**
   * Generic Replacement:
   * "Replace X with Y" / "Change X to Y" / "Use Y instead of X"
   */
  private static planGenericReplacement(
    newIntent: Intent,
    graphState: { nodes: GraphNode[]; edges: GraphEdge[]; version: number },
    activeOperations: GraphOperation[],
    createOp: (type: GraphOperation['type'], desc: string, targetKey: string, data: { node?: GraphNode; edge?: GraphEdge; targetId?: string }) => GraphOperation
  ): RevisionOutput | null {
    const text = newIntent.text;
    let oldTargetName = '';
    let newTargetName = '';

    const match1 = text.match(/(?:replace|change|switch)\s+([a-z0-9\s_-]+?)\s+(?:with|to|for)\s+([a-z0-9\s_-]+)/i);
    const match2 = text.match(/(?:actually,?\s*)?(?:use|switch to)\s+([a-z0-9\s_-]+?)\s+(?:instead of|rather than)\s+([a-z0-9\s_-]+)/i);

    if (match1) {
      oldTargetName = match1[1].trim();
      newTargetName = match1[2].trim().replace(/\.$/, '');
    } else if (match2) {
      newTargetName = match2[1].trim();
      oldTargetName = match2[2].trim().replace(/\.$/, '');
    } else {
      return null;
    }

    const operationsToCancel: GraphOperation[] = [];
    const operationsToPreserve: GraphOperation[] = [];
    const nodesToSupersede: string[] = [];
    const edgesToSupersede: string[] = [];
    const preservedNodeIds: string[] = [];
    const newOperations: GraphOperation[] = [];

    const oldTargetLower = oldTargetName.toLowerCase();

    // 1. Cancel active operations matching old target
    activeOperations.forEach((op) => {
      const desc = op.description.toLowerCase();
      const nodeLabel = op.node?.label.toLowerCase() || '';
      if (desc.includes(oldTargetLower) || nodeLabel.includes(oldTargetLower)) {
        operationsToCancel.push(op);
      } else {
        operationsToPreserve.push(op);
      }
    });

    // 2. Find committed node to supersede
    const oldNode = graphState.nodes.find(
      (n) => n.status !== 'superseded' && (n.label.toLowerCase().includes(oldTargetLower) || oldTargetLower.includes(n.label.toLowerCase()))
    );

    const predecessors: string[] = [];
    const successors: string[] = [];

    if (oldNode) {
      nodesToSupersede.push(oldNode.id);
      newOperations.push(
        createOp('SUPERSEDE_NODE', `Supersede ${oldNode.label} (replaced by ${newTargetName})`, oldNode.id, {
          targetId: oldNode.id,
        })
      );

      // Deprecate incident edges and record topological attachments
      graphState.edges.forEach((e) => {
        if (e.target === oldNode.id) {
          predecessors.push(e.source);
          edgesToSupersede.push(e.id);
          newOperations.push(
            createOp('SUPERSEDE_EDGE', `Deprecate link to ${oldNode.label}`, e.id, { targetId: e.id })
          );
        } else if (e.source === oldNode.id) {
          successors.push(e.target);
          edgesToSupersede.push(e.id);
          newOperations.push(
            createOp('SUPERSEDE_EDGE', `Deprecate link from ${oldNode.label}`, e.id, { targetId: e.id })
          );
        }
      });
    }

    // Preserve non-replaced nodes
    graphState.nodes.forEach((n) => {
      if (n.id !== oldNode?.id) preservedNodeIds.push(n.id);
    });

    // 3. Classify and create replacement node
    const classified = ArchitectureInterpreter.classifyComponent(newTargetName) || {
      id: `node-${Date.now().toString(36)}`,
      label: newTargetName,
      type: 'service',
      layer: 2,
      description: `Replacement component: ${newTargetName}`,
    };

    const newNode: GraphNode = {
      id: classified.id,
      type: classified.type,
      label: classified.label,
      description: classified.description,
      status: 'pending',
    };

    newOperations.push(
      createOp('ADD_NODE', `Deploy replacement ${newNode.label}`, newNode.id, { node: newNode })
    );

    // 4. Rewire predecessors → new node
    predecessors.forEach((predId) => {
      const edge: GraphEdge = {
        id: `edge-rewire-${predId.replace('node-', '')}-${newNode.id.replace('node-', '')}-${Date.now().toString(36)}`,
        source: predId,
        target: newNode.id,
        label: 'Rewired link',
        status: 'pending',
      };
      newOperations.push(
        createOp('ADD_EDGE', `Rewire ${predId} → ${newNode.label}`, edge.id, { edge })
      );
    });

    // 5. Rewire new node → successors
    successors.forEach((succId) => {
      const edge: GraphEdge = {
        id: `edge-rewire-${newNode.id.replace('node-', '')}-${succId.replace('node-', '')}-${Date.now().toString(36)}`,
        source: newNode.id,
        target: succId,
        label: 'Rewired downstream',
        status: 'pending',
      };
      newOperations.push(
        createOp('ADD_EDGE', `Rewire ${newNode.label} → ${succId}`, edge.id, { edge })
      );
    });

    return {
      operationsToCancel,
      operationsToPreserve,
      nodesToSupersede,
      edgesToSupersede,
      preservedNodeIds,
      newOperations,
      summary: `Self-Correction: Replaced ${oldNode?.label || oldTargetName} with ${newNode.label} and rewired topological connections.`,
    };
  }

  /**
   * Generic Removal:
   * "Remove X" / "Delete X" / "Drop X"
   */
  private static planGenericRemoval(
    newIntent: Intent,
    graphState: { nodes: GraphNode[]; edges: GraphEdge[]; version: number },
    activeOperations: GraphOperation[],
    createOp: (type: GraphOperation['type'], desc: string, targetKey: string, data: { node?: GraphNode; edge?: GraphEdge; targetId?: string }) => GraphOperation
  ): RevisionOutput | null {
    const match = newIntent.text.match(/(?:remove|delete|drop|disconnect)\s+([a-z0-9\s_-]+)/i);
    if (!match) return null;
    const targetName = match[1].trim().toLowerCase().replace(/\.$/, '');

    const operationsToCancel: GraphOperation[] = [];
    const operationsToPreserve: GraphOperation[] = [];
    const nodesToSupersede: string[] = [];
    const edgesToSupersede: string[] = [];
    const preservedNodeIds: string[] = [];
    const newOperations: GraphOperation[] = [];

    activeOperations.forEach((op) => {
      const desc = op.description.toLowerCase();
      const nodeLabel = op.node?.label.toLowerCase() || '';
      if (desc.includes(targetName) || nodeLabel.includes(targetName)) {
        operationsToCancel.push(op);
      } else {
        operationsToPreserve.push(op);
      }
    });

    const targetNode = graphState.nodes.find(
      (n) => n.status !== 'superseded' && (n.label.toLowerCase().includes(targetName) || targetName.includes(n.label.toLowerCase()))
    );

    if (targetNode) {
      nodesToSupersede.push(targetNode.id);
      newOperations.push(
        createOp('SUPERSEDE_NODE', `Remove ${targetNode.label}`, targetNode.id, { targetId: targetNode.id })
      );

      graphState.edges.forEach((e) => {
        if (e.source === targetNode.id || e.target === targetNode.id) {
          edgesToSupersede.push(e.id);
          newOperations.push(
            createOp('SUPERSEDE_EDGE', `Deprecate edge ${e.id}`, e.id, { targetId: e.id })
          );
        }
      });
    }

    graphState.nodes.forEach((n) => {
      if (n.id !== targetNode?.id) preservedNodeIds.push(n.id);
    });

    return {
      operationsToCancel,
      operationsToPreserve,
      nodesToSupersede,
      edgesToSupersede,
      preservedNodeIds,
      newOperations,
      summary: `Revision: Removed ${targetNode?.label || targetName} from active architecture.`,
    };
  }

  /**
   * Generic Connection:
   * "Connect X to Y" / "Link X to Y"
   */
  private static planGenericConnection(
    newIntent: Intent,
    graphState: { nodes: GraphNode[]; edges: GraphEdge[]; version: number },
    _activeOperations: GraphOperation[],
    createOp: (type: GraphOperation['type'], desc: string, targetKey: string, data: { node?: GraphNode; edge?: GraphEdge }) => GraphOperation
  ): RevisionOutput | null {
    const match = newIntent.text.match(/(?:connect|link|route)\s+([a-z0-9\s_-]+?)\s+(?:to|with|into)\s+([a-z0-9\s_-]+)/i);
    if (!match) return null;
    const srcName = match[1].trim().toLowerCase();
    const tgtName = match[2].trim().toLowerCase().replace(/\.$/, '');

    const srcNode = graphState.nodes.find(
      (n) => n.status !== 'superseded' && (n.label.toLowerCase().includes(srcName) || srcName.includes(n.label.toLowerCase()))
    );
    const tgtNode = graphState.nodes.find(
      (n) => n.status !== 'superseded' && (n.label.toLowerCase().includes(tgtName) || tgtName.includes(n.label.toLowerCase()))
    );

    if (!srcNode || !tgtNode) return null;

    const edge: GraphEdge = {
      id: `edge-${srcNode.id.replace('node-', '')}-${tgtNode.id.replace('node-', '')}-${Date.now().toString(36)}`,
      source: srcNode.id,
      target: tgtNode.id,
      label: 'Direct Link',
      status: 'pending',
    };

    const newOperations = [
      createOp('ADD_EDGE', `Connect ${srcNode.label} → ${tgtNode.label}`, edge.id, { edge }),
    ];

    return {
      operationsToCancel: [],
      operationsToPreserve: [],
      nodesToSupersede: [],
      edgesToSupersede: [],
      preservedNodeIds: graphState.nodes.map((n) => n.id),
      newOperations,
      summary: `Revision: Connected ${srcNode.label} → ${tgtNode.label}.`,
    };
  }

  /**
   * Generic Addition:
   * "Add X connected to Y and Z" / "Add X"
   */
  private static planGenericAddition(
    newIntent: Intent,
    graphState: { nodes: GraphNode[]; edges: GraphEdge[]; version: number },
    _activeOperations: GraphOperation[],
    createOp: (type: GraphOperation['type'], desc: string, targetKey: string, data: { node?: GraphNode; edge?: GraphEdge }) => GraphOperation
  ): RevisionOutput | null {
    const match = newIntent.text.match(/(?:add|attach|provision|deploy|introduce)\s+([a-z0-9\s_-]+?)(?:\s+(?:connected to|linked to|to|with)\s+([a-z0-9\s,_-]+))?$/i);
    if (!match) return null;
    const compName = match[1].trim();
    const targetString = match[2] ? match[2].trim() : '';

    const classified = ArchitectureInterpreter.classifyComponent(compName) || {
      id: `node-${Date.now().toString(36)}`,
      label: compName,
      type: 'service',
      layer: 2,
      description: `Evolved component: ${compName}`,
    };

    const newNode: GraphNode = {
      id: classified.id,
      type: classified.type,
      label: classified.label,
      description: classified.description,
      status: 'pending',
    };

    const newOperations: GraphOperation[] = [
      createOp('ADD_NODE', `Deploy ${newNode.label}`, newNode.id, { node: newNode }),
    ];

    if (targetString) {
      const targets = targetString
        .split(/(?:,|\band\b)/i)
        .map((t) => t.trim().toLowerCase())
        .filter((t) => t.length > 0);

      targets.forEach((tgtName) => {
        const found = graphState.nodes.find(
          (n) => n.status !== 'superseded' && (n.label.toLowerCase().includes(tgtName) || tgtName.includes(n.label.toLowerCase()))
        );
        if (found) {
          const isUpstream =
            found.type === 'user' ||
            found.type === 'api' ||
            (found.type === 'service' && (classified.type === 'database' || classified.type === 'cache' || classified.type === 'queue'));
          const srcId = isUpstream ? found.id : newNode.id;
          const tgtId = isUpstream ? newNode.id : found.id;
          const edge: GraphEdge = {
            id: `edge-${srcId.replace('node-', '')}-${tgtId.replace('node-', '')}-${Date.now().toString(36)}`,
            source: srcId,
            target: tgtId,
            label: 'Integrated link',
            status: 'pending',
          };
          newOperations.push(
            createOp('ADD_EDGE', `Connect ${srcId} → ${tgtId}`, edge.id, { edge })
          );
        }
      });
    } else {
      const lastActive = graphState.nodes.find((n) => n.status !== 'superseded');
      if (lastActive) {
        const edge: GraphEdge = {
          id: `edge-${lastActive.id.replace('node-', '')}-${newNode.id.replace('node-', '')}-${Date.now().toString(36)}`,
          source: lastActive.id,
          target: newNode.id,
          label: 'Evolved Link',
          status: 'pending',
        };
        newOperations.push(
          createOp('ADD_EDGE', `Connect ${lastActive.label} → ${newNode.label}`, edge.id, { edge })
        );
      }
    }

    return {
      operationsToCancel: [],
      operationsToPreserve: [],
      nodesToSupersede: [],
      edgesToSupersede: [],
      preservedNodeIds: graphState.nodes.map((n) => n.id),
      newOperations,
      summary: `Evolution: Added ${newNode.label} and wired into existing architecture.`,
    };
  }
}
