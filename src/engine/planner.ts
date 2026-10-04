import type { GraphNode, GraphEdge, NodeType } from '../types/graph';
import type { GraphOperation } from '../types/operations';
import type { Intent } from '../types/intent';
import type { GraphState } from '../state/graphStore';
import { useGraphStore } from '../state/graphStore';
import type { ArchitectureIR } from '../types/ir';
import { RevisionEngine } from './revisionEngine';
import { calculateLayout } from './graphEngine';
import { DeterministicArchitectureInterpreter } from './deterministicInterpreter';
import { replanArchitecture } from './architectureReplanner';

export interface PlanResult {
  operations: GraphOperation[];
  summary: string;
}

/**
 * Main planning entry point:
 * plan(intent, graphState) -> GraphOperation[]
 */
export function plan(intent: Intent, graphState: GraphState): GraphOperation[] {
  const result = planWithSummary(intent, graphState, graphState.activeOperations);
  return result.operations;
}

/**
 * Enhanced planner that returns operations along with an executive summary
 */
export function planWithSummary(
  intent: Intent,
  graphState: { version: number; nodes: GraphNode[]; edges: GraphEdge[] },
  activeOperations: GraphOperation[] = []
): PlanResult {
  const prompt = intent.text.toLowerCase();
  const baseVersion = graphState.version;

  // Helper to build idempotent operation
  const createOp = (
    type: GraphOperation['type'],
    desc: string,
    targetKey: string,
    data: { node?: GraphNode; edge?: GraphEdge; targetId?: string }
  ): GraphOperation => ({
    id: `op-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    idempotencyKey: `${intent.id}:${baseVersion}:${type}:${targetKey}`,
    intentId: intent.id,
    baseVersion,
    type,
    status: 'PENDING',
    timestamp: Date.now(),
    description: desc,
    ...data,
  });

  // Handle Cancellation intent
  if (intent.type === 'CANCELLATION') {
    return {
      operations: [],
      summary: 'Requirement cancelled. No new operations generated.',
    };
  }

  // Handle Correction / Interrupt / Revision
  if (
    intent.type === 'CORRECTION' ||
    prompt.includes('actually') ||
    prompt.includes('rabbitmq') ||
    (graphState.nodes.length > 0 && (
      intent.type === 'MODIFICATION' ||
      prompt.includes('multi-agent') ||
      prompt.includes('replace') ||
      prompt.includes('change') ||
      prompt.includes('remove') ||
      prompt.includes('delete') ||
      prompt.includes('add') ||
      prompt.includes('connect')
    ))
  ) {
    // 1. Official demo multi-agent scenario:
    if (
      prompt.includes('multi-agent') ||
      prompt.includes('multi agent') ||
      prompt.includes('agent router')
    ) {
      const revision = RevisionEngine.evaluate(intent, graphState, activeOperations);
      return {
        operations: revision.newOperations,
        summary: revision.summary,
      };
    }

    // 2. Official demo billing database scenario:
    if (
      prompt.includes('billing') &&
      (prompt.includes('database') || prompt.includes('db') || prompt.includes('own'))
    ) {
      const revision = RevisionEngine.evaluate(intent, graphState, activeOperations);
      return {
        operations: revision.newOperations,
        summary: revision.summary,
      };
    }

    // 3. Complete Replanning for all architecture modifications / interruptions
    const fallbackIR = useGraphStore.getState().currentIR;
    const replanResult = replanArchitecture(
      intent,
      graphState,
      activeOperations,
      fallbackIR,
      createOp
    );
    useGraphStore.getState().setCurrentIR(replanResult.updatedIR);
    return {
      operations: replanResult.operations,
      summary: replanResult.summary,
    };
  }

  // Food Delivery Platform: "Build a real-time food delivery platform"
  if (
    prompt.includes('food delivery') ||
    prompt.includes('delivery platform') ||
    (prompt.includes('food') && prompt.includes('delivery'))
  ) {
    return planFoodDeliveryPlatform(intent.id, baseVersion, createOp);
  }

  // Standalone Kafka scenario (e.g. "Use Kafka for async/asynchronous communication")
  if (
    prompt.includes('kafka for async') ||
    prompt.includes('kafka for asynchronous') ||
    prompt === 'use kafka' ||
    prompt === 'kafka queue'
  ) {
    return planKafkaScenario(intent.id, baseVersion, graphState, createOp);
  }

  // Minimum Required Support Scenario: "multi-agent support"
  if (
    prompt.includes('multi-agent') ||
    prompt.includes('multi agent') ||
    prompt.includes('agent router')
  ) {
    return planMultiAgentSupport(intent.id, baseVersion, createOp);
  }

  // Minimum Required Support Scenario: "AI customer support system"
  if (
    prompt.includes('support system') ||
    prompt.includes('customer support') ||
    prompt.includes('ai customer')
  ) {
    return planAICustomerSupportSystem(intent.id, baseVersion, createOp);
  }

  // General Architecture Planner: ArchitectureInterpreter -> ArchitectureIR -> planFromIR
  const interpreter = new DeterministicArchitectureInterpreter();
  const ir = interpreter.parseArchitectureIR(intent.text);
  useGraphStore.getState().setCurrentIR(ir);
  return planFromIR(ir, baseVersion, createOp);
}

/**
 * Converts an ArchitectureIR into progressive GraphOperations.
 */
export function planFromIR(
  ir: ArchitectureIR,
  _baseVersion: number,
  createOp: (
    type: GraphOperation['type'],
    desc: string,
    targetKey: string,
    data: { node?: GraphNode; edge?: GraphEdge }
  ) => GraphOperation
): PlanResult {
  const operations: GraphOperation[] = [];

  // 1. Convert IR components to GraphNodes
  const unpositionedNodes: GraphNode[] = ir.components.map((comp) => ({
    id: comp.id,
    type: comp.type as NodeType,
    label: comp.name,
    description: comp.description,
    status: 'pending',
    metadata: {
      technology: comp.technology,
      ...comp.metadata,
    },
  }));

  // 2. Convert IR relationships to GraphEdges
  const unpositionedEdges: GraphEdge[] = ir.relationships.map((rel) => {
    const edgeId = `edge-${rel.source.replace(/^node-/, '')}-${rel.target.replace(/^node-/, '')}`;
    return {
      id: edgeId,
      source: rel.source,
      target: rel.target,
      label: rel.description || rel.relationship,
      status: 'pending',
    };
  });

  // 3. Calculate clean non-negative layout coordinates using Dagre and deterministic fallback
  const { nodes: layoutedNodes, edges: layoutedEdges } = calculateLayout(
    unpositionedNodes,
    unpositionedEdges,
    'LR'
  );

  // 4. Progressive construction: Add nodes first by horizontal layer (position.x), then add connecting edges
  const sortedNodes = [...layoutedNodes].sort((a, b) => {
    const posA = a.position?.x ?? 0;
    const posB = b.position?.x ?? 0;
    return posA - posB;
  });

  sortedNodes.forEach((node) => {
    operations.push(
      createOp(
        'ADD_NODE',
        `Deploy ${node.label} (${node.type.toUpperCase()})`,
        node.id,
        { node }
      )
    );
  });

  layoutedEdges.forEach((edge) => {
    const srcNode = layoutedNodes.find((n) => n.id === edge.source);
    const tgtNode = layoutedNodes.find((n) => n.id === edge.target);
    const srcLabel = srcNode ? srcNode.label : edge.source;
    const tgtLabel = tgtNode ? tgtNode.label : edge.target;

    operations.push(
      createOp(
        'ADD_EDGE',
        `Connect ${srcLabel} → ${tgtLabel} (${edge.label || 'Link'})`,
        edge.id,
        { edge }
      )
    );
  });

  const techText =
    ir.technologies && ir.technologies.length > 0
      ? ` using ${ir.technologies.join(', ')}`
      : '';
  const summary = `Synthesized architecture with ${sortedNodes.length} components${techText} and ${layoutedEdges.length} connections.`;

  return {
    operations,
    summary,
  };
}

/**
 * Food Delivery Platform Scenario:
 * Customer App → API Gateway → Order Service → Restaurant Service
 * Order Service → Payment Service
 * Order Service → Kafka → Delivery Service → PostgreSQL
 */
function planFoodDeliveryPlatform(
  _intentId: string,
  _baseVersion: number,
  createOp: (type: GraphOperation['type'], desc: string, targetKey: string, data: { node?: GraphNode; edge?: GraphEdge }) => GraphOperation
): PlanResult {
  const operations: GraphOperation[] = [];

  // Nodes
  const customerApp: GraphNode = {
    id: 'node-customer-app',
    type: 'user',
    label: 'Customer App',
    description: 'Mobile & Web client touchpoint',
    status: 'pending',
  };

  const apiGateway: GraphNode = {
    id: 'node-api-gateway',
    type: 'api',
    label: 'API Gateway',
    description: 'Routing, auth & rate limiting proxy',
    status: 'pending',
  };

  const orderService: GraphNode = {
    id: 'node-order-service',
    type: 'service',
    label: 'Order Service',
    description: 'Core order lifecycle orchestrator',
    status: 'pending',
  };

  const restaurantService: GraphNode = {
    id: 'node-restaurant-service',
    type: 'service',
    label: 'Restaurant Service',
    description: 'Menu catalog & merchant confirmation',
    status: 'pending',
  };

  const paymentService: GraphNode = {
    id: 'node-payment-service',
    type: 'service',
    label: 'Payment Service',
    description: 'Payment gateway & escrow handling',
    status: 'pending',
  };

  const kafkaNode: GraphNode = {
    id: 'node-kafka',
    type: 'queue',
    label: 'Kafka',
    description: 'Real-time distributed event streaming',
    status: 'pending',
  };

  const deliveryService: GraphNode = {
    id: 'node-delivery-service',
    type: 'service',
    label: 'Delivery Service',
    description: 'Courier assignment & GPS tracking',
    status: 'pending',
  };

  const postgresNode: GraphNode = {
    id: 'node-postgres',
    type: 'database',
    label: 'PostgreSQL',
    description: 'ACID transactional data store',
    status: 'pending',
  };

  // Edges
  const edgeAppGateway: GraphEdge = {
    id: 'edge-app-gateway',
    source: customerApp.id,
    target: apiGateway.id,
    label: 'HTTPS / REST',
    status: 'pending',
  };

  const edgeGatewayOrder: GraphEdge = {
    id: 'edge-gateway-order',
    source: apiGateway.id,
    target: orderService.id,
    label: 'gRPC Route',
    status: 'pending',
  };

  const edgeOrderRestaurant: GraphEdge = {
    id: 'edge-order-restaurant',
    source: orderService.id,
    target: restaurantService.id,
    label: 'Order Validation',
    status: 'pending',
  };

  const edgeOrderPayment: GraphEdge = {
    id: 'edge-order-payment',
    source: orderService.id,
    target: paymentService.id,
    label: 'Process Payment',
    status: 'pending',
  };

  const edgeOrderKafka: GraphEdge = {
    id: 'edge-order-kafka',
    source: orderService.id,
    target: kafkaNode.id,
    label: 'publish: order_created',
    status: 'pending',
  };

  const edgeKafkaDelivery: GraphEdge = {
    id: 'edge-kafka-delivery',
    source: kafkaNode.id,
    target: deliveryService.id,
    label: 'subscribe: order_placed',
    status: 'pending',
  };

  const edgeDeliveryPostgres: GraphEdge = {
    id: 'edge-delivery-postgres',
    source: deliveryService.id,
    target: postgresNode.id,
    label: 'Courier State',
    status: 'pending',
  };

  // Progressive construction: each node appears, then its edge appears
  operations.push(
    createOp('ADD_NODE', 'Deploy Customer App client interface', customerApp.id, { node: customerApp }),
    createOp('ADD_NODE', 'Provision API Gateway reverse proxy', apiGateway.id, { node: apiGateway }),
    createOp('ADD_EDGE', 'Connect Customer App → API Gateway', edgeAppGateway.id, { edge: edgeAppGateway }),
    createOp('ADD_NODE', 'Deploy Order Orchestration Service', orderService.id, { node: orderService }),
    createOp('ADD_EDGE', 'Connect API Gateway → Order Service', edgeGatewayOrder.id, { edge: edgeGatewayOrder }),
    createOp('ADD_NODE', 'Deploy Restaurant Service', restaurantService.id, { node: restaurantService }),
    createOp('ADD_EDGE', 'Connect Order Service → Restaurant Service', edgeOrderRestaurant.id, { edge: edgeOrderRestaurant }),
    createOp('ADD_NODE', 'Deploy Payment Processing Service', paymentService.id, { node: paymentService }),
    createOp('ADD_EDGE', 'Connect Order Service → Payment Service', edgeOrderPayment.id, { edge: edgeOrderPayment }),
    createOp('ADD_NODE', 'Provision Kafka distributed event log', kafkaNode.id, { node: kafkaNode }),
    createOp('ADD_EDGE', 'Connect Order Service → Kafka topic', edgeOrderKafka.id, { edge: edgeOrderKafka }),
    createOp('ADD_NODE', 'Deploy Delivery & Fleet Dispatch Service', deliveryService.id, { node: deliveryService }),
    createOp('ADD_EDGE', 'Connect Kafka → Delivery Service', edgeKafkaDelivery.id, { edge: edgeKafkaDelivery }),
    createOp('ADD_NODE', 'Provision PostgreSQL persistent ACID ledger', postgresNode.id, { node: postgresNode }),
    createOp('ADD_EDGE', 'Connect Delivery Service → PostgreSQL', edgeDeliveryPostgres.id, { edge: edgeDeliveryPostgres })
  );

  useGraphStore.getState().setCurrentIR({
    components: [
      { id: customerApp.id, name: customerApp.label, type: customerApp.type, description: customerApp.description },
      { id: apiGateway.id, name: apiGateway.label, type: apiGateway.type, description: apiGateway.description },
      { id: orderService.id, name: orderService.label, type: orderService.type, description: orderService.description },
      { id: restaurantService.id, name: restaurantService.label, type: restaurantService.type, description: restaurantService.description },
      { id: paymentService.id, name: paymentService.label, type: paymentService.type, description: paymentService.description },
      { id: kafkaNode.id, name: kafkaNode.label, type: kafkaNode.type, technology: 'Kafka', description: kafkaNode.description },
      { id: deliveryService.id, name: deliveryService.label, type: deliveryService.type, description: deliveryService.description },
      { id: postgresNode.id, name: postgresNode.label, type: postgresNode.type, technology: 'PostgreSQL', description: postgresNode.description },
    ],
    relationships: [
      { source: customerApp.id, target: apiGateway.id, relationship: 'CONNECTS_TO', description: 'HTTPS / REST' },
      { source: apiGateway.id, target: orderService.id, relationship: 'CALLS', description: 'gRPC Route' },
      { source: orderService.id, target: restaurantService.id, relationship: 'CALLS', description: 'Order Validation' },
      { source: orderService.id, target: paymentService.id, relationship: 'CALLS', description: 'Process Payment' },
      { source: orderService.id, target: kafkaNode.id, relationship: 'PUBLISHES_TO', description: 'publish: order_created' },
      { source: kafkaNode.id, target: deliveryService.id, relationship: 'CONSUMES_FROM', description: 'subscribe: order_placed' },
      { source: deliveryService.id, target: postgresNode.id, relationship: 'STORES_IN', description: 'Courier State' },
    ],
    technologies: ['Kafka', 'PostgreSQL'],
  });

  return {
    operations,
    summary: 'Planned Food Delivery Platform: Customer App → API Gateway → Order Service (Restaurant, Payment, Kafka) → Delivery Service → PostgreSQL.',
  };
}

/**
 * Kafka scenario planner:
 * "Use Kafka for async communication."
 */
function planKafkaScenario(
  _intentId: string,
  _baseVersion: number,
  graphState: { nodes: GraphNode[]; edges: GraphEdge[] },
  createOp: (type: GraphOperation['type'], desc: string, targetKey: string, data: { node?: GraphNode; edge?: GraphEdge }) => GraphOperation
): PlanResult {
  const operations: GraphOperation[] = [];

  const kafkaNode: GraphNode = {
    id: 'node-kafka',
    type: 'queue',
    label: 'Kafka Queue',
    description: 'High-throughput distributed event log',
    status: 'pending',
  };

  operations.push(
    createOp('ADD_NODE', 'Deploy Kafka distributed event queue', kafkaNode.id, { node: kafkaNode })
  );

  // If other nodes exist, connect to the latest active node
  const lastActive = graphState.nodes.find((n) => n.status !== 'superseded');
  if (lastActive) {
    const edge: GraphEdge = {
      id: `edge-to-kafka-${Date.now().toString(36)}`,
      source: lastActive.id,
      target: kafkaNode.id,
      label: 'Async event stream',
      status: 'pending',
    };
    operations.push(
      createOp('ADD_EDGE', `Connect ${lastActive.label} → Kafka`, edge.id, { edge })
    );
  } else {
    // Standalone setup: User -> API Service -> Kafka
    const client: GraphNode = { id: 'node-user', type: 'user', label: 'User', status: 'pending' };
    const svc: GraphNode = { id: 'node-producer-svc', type: 'service', label: 'Producer Service', status: 'pending' };
    const e1: GraphEdge = { id: 'edge-u-svc', source: 'node-user', target: 'node-producer-svc', label: 'HTTP Request', status: 'pending' };
    const e2: GraphEdge = { id: 'edge-svc-k', source: 'node-producer-svc', target: 'node-kafka', label: 'Publish event', status: 'pending' };

    operations.unshift(
      createOp('ADD_NODE', 'Create User client node', client.id, { node: client }),
      createOp('ADD_NODE', 'Create Producer Service', svc.id, { node: svc }),
      createOp('ADD_EDGE', 'Connect User → Producer Service', e1.id, { edge: e1 })
    );
    operations.push(
      createOp('ADD_EDGE', 'Connect Producer Service → Kafka', e2.id, { edge: e2 })
    );
  }

  useGraphStore.getState().setCurrentIR({
    components: [
      { id: 'node-user', name: 'User', type: 'user', description: 'User client' },
      { id: 'node-producer-svc', name: 'Producer Service', type: 'service', description: 'Service producer' },
      { id: kafkaNode.id, name: kafkaNode.label, type: kafkaNode.type, technology: 'Kafka', description: kafkaNode.description },
    ],
    relationships: [
      { source: 'node-user', target: 'node-producer-svc', relationship: 'CALLS', description: 'HTTP Request' },
      { source: 'node-producer-svc', target: kafkaNode.id, relationship: 'PUBLISHES_TO', description: 'Publish event' },
    ],
    technologies: ['Kafka'],
  });

  return {
    operations,
    summary: 'Planned Kafka asynchronous message queue architecture.',
  };
}

/**
 * Minimum Required Scenario 1:
 * User → Support Agent → RAG → Knowledge Base
 */
function planAICustomerSupportSystem(
  _intentId: string,
  _baseVersion: number,
  createOp: (type: GraphOperation['type'], desc: string, targetKey: string, data: { node?: GraphNode; edge?: GraphEdge }) => GraphOperation
): PlanResult {
  const operations: GraphOperation[] = [];

  // Nodes
  const userNode: GraphNode = {
    id: 'node-user',
    type: 'user',
    label: 'User',
    description: 'End customer touchpoint',
    status: 'pending',
  };

  const supportAgent: GraphNode = {
    id: 'node-support-agent',
    type: 'agent',
    label: 'Support Agent',
    description: 'LLM reasoning & workflow coordinator',
    status: 'pending',
  };

  const ragService: GraphNode = {
    id: 'node-rag',
    type: 'service',
    label: 'RAG',
    description: 'Retrieval Augmented Generation service',
    status: 'pending',
  };

  const knowledgeBase: GraphNode = {
    id: 'node-kb',
    type: 'database',
    label: 'Knowledge Base',
    description: 'Vector embeddings & documentation store',
    status: 'pending',
  };

  // Edges
  const edgeUserSupport: GraphEdge = {
    id: 'edge-user-support',
    source: 'node-user',
    target: 'node-support-agent',
    label: 'User Query',
    status: 'pending',
  };

  const edgeSupportRAG: GraphEdge = {
    id: 'edge-support-rag',
    source: 'node-support-agent',
    target: 'node-rag',
    label: 'Retrieve Context',
    status: 'pending',
  };

  const edgeRAGKB: GraphEdge = {
    id: 'edge-rag-kb',
    source: 'node-rag',
    target: 'node-kb',
    label: 'Vector Search',
    status: 'pending',
  };

  // Add operations in progressive order: User -> Support Agent -> Edge -> RAG -> Edge -> Knowledge Base -> Edge
  operations.push(
    createOp('ADD_NODE', 'Create User client node', userNode.id, { node: userNode }),
    createOp('ADD_NODE', 'Create Support Agent node', supportAgent.id, { node: supportAgent }),
    createOp('ADD_EDGE', 'Connect User → Support Agent', edgeUserSupport.id, { edge: edgeUserSupport }),
    createOp('ADD_NODE', 'Create RAG service node', ragService.id, { node: ragService }),
    createOp('ADD_EDGE', 'Connect Support Agent → RAG', edgeSupportRAG.id, { edge: edgeSupportRAG }),
    createOp('ADD_NODE', 'Create Knowledge Base database node', knowledgeBase.id, { node: knowledgeBase }),
    createOp('ADD_EDGE', 'Connect RAG → Knowledge Base', edgeRAGKB.id, { edge: edgeRAGKB })
  );

  useGraphStore.getState().setCurrentIR({
    components: [
      { id: userNode.id, name: userNode.label, type: userNode.type, description: userNode.description },
      { id: supportAgent.id, name: supportAgent.label, type: supportAgent.type, description: supportAgent.description },
      { id: ragService.id, name: ragService.label, type: ragService.type, description: ragService.description },
      { id: knowledgeBase.id, name: knowledgeBase.label, type: knowledgeBase.type, description: knowledgeBase.description },
    ],
    relationships: [
      { source: userNode.id, target: supportAgent.id, relationship: 'CALLS', description: 'User Query' },
      { source: supportAgent.id, target: ragService.id, relationship: 'CALLS', description: 'Retrieve Context' },
      { source: ragService.id, target: knowledgeBase.id, relationship: 'STORES_IN', description: 'Vector Search' },
    ],
    technologies: [],
  });

  return {
    operations,
    summary: 'Planned AI Customer Support Architecture (User → Support Agent → RAG → Knowledge Base)',
  };
}

/**
 * Minimum Required Scenario 2:
 * Agent Router → Sales Agent, Billing Agent, Technical Agent
 */
function planMultiAgentSupport(
  _intentId: string,
  _baseVersion: number,
  createOp: (type: GraphOperation['type'], desc: string, targetKey: string, data: { node?: GraphNode; edge?: GraphEdge }) => GraphOperation
): PlanResult {
  const operations: GraphOperation[] = [];

  const router: GraphNode = {
    id: 'node-agent-router',
    type: 'agent',
    label: 'Agent Router',
    description: 'Triage & prompt coordinator',
    status: 'pending',
  };

  const salesAgent: GraphNode = {
    id: 'node-sales-agent',
    type: 'agent',
    label: 'Sales Agent',
    description: 'Product queries & subscriptions',
    status: 'pending',
  };

  const billingAgent: GraphNode = {
    id: 'node-billing-agent',
    type: 'agent',
    label: 'Billing Agent',
    description: 'Invoices, refunds & payment issues',
    status: 'pending',
  };

  const techAgent: GraphNode = {
    id: 'node-technical-agent',
    type: 'agent',
    label: 'Technical Agent',
    description: 'Debugging & technical support',
    status: 'pending',
  };

  const edgeRouterSales: GraphEdge = {
    id: 'edge-router-sales',
    source: 'node-agent-router',
    target: 'node-sales-agent',
    label: 'Route: Sales',
    status: 'pending',
  };

  const edgeRouterBilling: GraphEdge = {
    id: 'edge-router-billing',
    source: 'node-agent-router',
    target: 'node-billing-agent',
    label: 'Route: Billing',
    status: 'pending',
  };

  const edgeRouterTech: GraphEdge = {
    id: 'edge-router-tech',
    source: 'node-agent-router',
    target: 'node-technical-agent',
    label: 'Route: Technical',
    status: 'pending',
  };

  operations.push(
    createOp('ADD_NODE', 'Create Agent Router node', router.id, { node: router }),
    createOp('ADD_NODE', 'Create Sales Agent node', salesAgent.id, { node: salesAgent }),
    createOp('ADD_EDGE', 'Connect Agent Router → Sales Agent', edgeRouterSales.id, { edge: edgeRouterSales }),
    createOp('ADD_NODE', 'Create Billing Agent node', billingAgent.id, { node: billingAgent }),
    createOp('ADD_EDGE', 'Connect Agent Router → Billing Agent', edgeRouterBilling.id, { edge: edgeRouterBilling }),
    createOp('ADD_NODE', 'Create Technical Agent node', techAgent.id, { node: techAgent }),
    createOp('ADD_EDGE', 'Connect Agent Router → Technical Agent', edgeRouterTech.id, { edge: edgeRouterTech })
  );

  useGraphStore.getState().setCurrentIR({
    components: [
      { id: router.id, name: router.label, type: router.type, description: router.description },
      { id: salesAgent.id, name: salesAgent.label, type: salesAgent.type, description: salesAgent.description },
      { id: billingAgent.id, name: billingAgent.label, type: billingAgent.type, description: billingAgent.description },
      { id: techAgent.id, name: techAgent.label, type: techAgent.type, description: techAgent.description },
    ],
    relationships: [
      { source: router.id, target: salesAgent.id, relationship: 'CALLS', description: 'Route: Sales' },
      { source: router.id, target: billingAgent.id, relationship: 'CALLS', description: 'Route: Billing' },
      { source: router.id, target: techAgent.id, relationship: 'CALLS', description: 'Route: Technical' },
    ],
    technologies: [],
  });

  return {
    operations,
    summary: 'Planned Multi-Agent Support System (Agent Router → Sales, Billing, Technical Agents)',
  };
}
