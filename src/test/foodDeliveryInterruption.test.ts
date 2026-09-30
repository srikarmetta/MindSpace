import { eventBridge } from '../voice/EventBridge';
import { useGraphStore } from '../state/graphStore';
import { toReactFlowNodes, toReactFlowEdges } from '../engine/graphEngine';

function assert(condition: boolean, msg: string) {
  if (!condition) {
    console.error(`❌ ASSERTION FAILED: ${msg}`);
    (globalThis as any).process?.exit(1);
  }
  console.log(`✅ ${msg}`);
}

async function runFoodDeliveryTests() {
  console.log('\n==================================================');
  console.log('TEST SUITE: Food Delivery Platform & Visual Interruption');
  console.log('MindSpace Live Architecture Graph Validation');
  console.log('==================================================\n');

  // Track speech & activities
  const speechHistory: string[] = [];
  const unsubSpeech = eventBridge.subscribeToAgentSpeech((text) => {
    speechHistory.push(text);
  });

  // --- TEST 1: Initial Empty Canvas State ---
  console.log('--- TEST 1: Clean Canvas State ---');
  useGraphStore.getState().resetGraph();
  const initialStore = useGraphStore.getState();
  assert(initialStore.nodes.length === 0, 'Initial graph has 0 nodes (empty state ready)');
  assert(initialStore.edges.length === 0, 'Initial graph has 0 edges');
  assert(initialStore.version === 1, 'Initial graph starts at version 1');

  // --- TEST 2: Food Delivery Platform Progressive Construction ---
  console.log('\n--- TEST 2: Real-Time Food Delivery Platform Build ---');
  speechHistory.length = 0;

  const buildPromise = eventBridge.handleTranscript('Build a real-time food delivery platform');

  // Fast check: conversational acknowledgment emitted
  await new Promise((r) => setTimeout(r, 60));
  assert(
    speechHistory.some((s) => s.toLowerCase().includes('food') || s.toLowerCase().includes('mapping')),
    'Immediate verbal acknowledgement emitted for Food Delivery Platform'
  );

  // Allow operations to progress
  await buildPromise;
  await new Promise((r) => setTimeout(r, 200));

  const builtStore = useGraphStore.getState();
  console.log(`Committed Nodes (${builtStore.nodes.length}):`, builtStore.nodes.map((n) => n.label));
  console.log(`Committed Edges (${builtStore.edges.length}):`, builtStore.edges.map((e) => `${e.source} → ${e.target}`));

  // Verify all 8 required nodes exist
  const labels = builtStore.nodes.map((n) => n.label);
  assert(labels.includes('Customer App'), 'Node Customer App present');
  assert(labels.includes('API Gateway'), 'Node API Gateway present');
  assert(labels.includes('Order Service'), 'Node Order Service present');
  assert(labels.includes('Restaurant Service'), 'Node Restaurant Service present');
  assert(labels.includes('Payment Service'), 'Node Payment Service present');
  assert(labels.includes('Kafka'), 'Node Kafka present');
  assert(labels.includes('Delivery Service'), 'Node Delivery Service present');
  assert(labels.includes('PostgreSQL'), 'Node PostgreSQL present');

  // Verify required edge connections
  const edges = builtStore.edges;
  assert(edges.some((e) => e.source === 'node-customer-app' && e.target === 'node-api-gateway'), 'Edge Customer App → API Gateway exists');
  assert(edges.some((e) => e.source === 'node-api-gateway' && e.target === 'node-order-service'), 'Edge API Gateway → Order Service exists');
  assert(edges.some((e) => e.source === 'node-order-service' && e.target === 'node-restaurant-service'), 'Edge Order Service → Restaurant Service exists');
  assert(edges.some((e) => e.source === 'node-order-service' && e.target === 'node-payment-service'), 'Edge Order Service → Payment Service exists');
  assert(edges.some((e) => e.source === 'node-order-service' && e.target === 'node-kafka'), 'Edge Order Service → Kafka exists');
  assert(edges.some((e) => e.source === 'node-kafka' && e.target === 'node-delivery-service'), 'Edge Kafka → Delivery Service exists');
  assert(edges.some((e) => e.source === 'node-delivery-service' && e.target === 'node-postgres'), 'Edge Delivery Service → PostgreSQL exists');

  // Verify node positions are valid numbers
  for (const n of builtStore.nodes) {
    assert(
      Boolean(n.position) &&
        typeof n.position?.x === 'number' &&
        typeof n.position?.y === 'number' &&
        !isNaN(n.position.x) &&
        !isNaN(n.position.y),
      `Node "${n.label}" has valid non-NaN position (${n.position?.x}, ${n.position?.y})`
    );
  }

  // Verify React Flow data mapping
  const rfNodes = toReactFlowNodes(builtStore.nodes);
  const rfEdges = toReactFlowEdges(builtStore.edges, builtStore.nodes);

  assert(rfNodes.length === builtStore.nodes.length, `React Flow received ${rfNodes.length} mapped nodes`);
  assert(rfNodes.every((n) => n.type === 'architecture'), 'All React Flow nodes use "architecture" type');
  assert(rfNodes.every((n) => Boolean(n.data && (n.data as any).label)), 'All React Flow nodes have valid data payload');
  assert(rfEdges.length === builtStore.edges.length, `React Flow received ${rfEdges.length} mapped edges`);

  // --- TEST 3: Mid-Flight Interruption & Self-Correction (Kafka → RabbitMQ) ---
  console.log('\n--- TEST 3: Interruption: Kafka → RabbitMQ ---');
  useGraphStore.getState().resetGraph();
  speechHistory.length = 0;

  // Start fresh build
  const p1 = eventBridge.handleTranscript('Build a real-time food delivery platform');

  // Allow build to get past Customer App, API Gateway, and Order Service
  await new Promise((r) => setTimeout(r, 3600));

  // User interrupts: "Actually, use RabbitMQ instead of Kafka."
  const interruptPromise = eventBridge.handleTranscript('Actually, use RabbitMQ instead of Kafka.');

  // Immediate verbal ack for RabbitMQ
  await new Promise((r) => setTimeout(r, 80));
  assert(
    speechHistory.some((s) => s.toLowerCase().includes('rabbitmq') || s.toLowerCase().includes('pivoting')),
    'Immediate verbal ack emitted for RabbitMQ interruption'
  );

  // Await pipeline resolution
  await Promise.all([p1, interruptPromise]);
  await new Promise((r) => setTimeout(r, 200));

  const correctedStore = useGraphStore.getState();
  console.log('Nodes after RabbitMQ correction:', correctedStore.nodes.map((n) => `${n.label} (${n.status})`));

  // Verify RabbitMQ exists and is active/completed
  const rabbitNode = correctedStore.nodes.find(
    (n) => n.label.toLowerCase().includes('rabbitmq') && n.status !== 'superseded'
  );
  assert(Boolean(rabbitNode), 'Active RabbitMQ node exists in graph');

  // Verify Kafka is superseded (or cancelled from pending)
  const kafkaNode = correctedStore.nodes.find((n) => n.label.toLowerCase().includes('kafka'));
  if (kafkaNode) {
    assert(kafkaNode.status === 'superseded', 'Committed Kafka node transitioned to superseded');
  } else {
    console.log('✅ Kafka operation was cancelled before node committed (stale operation superseded)');
  }

  // Verify other valid nodes remain in graph
  const activeLabels = correctedStore.nodes
    .filter((n) => n.status !== 'superseded')
    .map((n) => n.label);
  assert(activeLabels.includes('Customer App'), 'Customer App preserved');
  assert(activeLabels.includes('API Gateway'), 'API Gateway preserved');
  assert(activeLabels.includes('Order Service'), 'Order Service preserved');

  // Verify activity panel log has interruption & replanning entries
  const activities = correctedStore.activities.map((a) => a.message.toLowerCase());
  assert(
    activities.some((m) => m.includes('interrupt') || m.includes('supersed')),
    'Activity panel logs user interruption and supersession'
  );

  // --- TEST 4: Clean Reset ---
  console.log('\n--- TEST 4: Clean Reset ---');
  correctedStore.resetGraph();
  assert(useGraphStore.getState().nodes.length === 0, 'Canvas cleanly resets to 0 nodes');
  assert(useGraphStore.getState().edges.length === 0, 'Canvas cleanly resets to 0 edges');

  unsubSpeech();

  console.log('\n==================================================');
  console.log('🎉 ALL FOOD DELIVERY & VISUAL INTERRUPTION TESTS PASSED!');
  console.log('==================================================\n');
}

runFoodDeliveryTests().catch((err) => {
  console.error('Test execution failed:', err);
  (globalThis as any).process?.exit(1);
});
