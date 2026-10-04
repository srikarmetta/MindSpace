import { DeterministicArchitectureInterpreter } from '../engine/deterministicInterpreter';
import { planFromIR } from '../engine/planner';
import type { GraphOperation } from '../types/operations';
import type { GraphNode, GraphEdge } from '../types/graph';

function assert(condition: boolean, msg: string) {
  if (!condition) {
    console.error(`❌ ASSERTION FAILED: ${msg}`);
    (globalThis as any).process?.exit(1);
  }
  console.log(`✅ ${msg}`);
}

async function runArchitectureIRTests() {
  console.log('\n==================================================');
  console.log('TEST SUITE: Architecture IR (Intermediate Representation)');
  console.log('Generic, Typed, Model-Ready Architecture Pipeline');
  console.log('==================================================\n');

  const interpreter = new DeterministicArchitectureInterpreter();

  // Helper to create mock GraphOperation
  const createMockOp = (
    type: GraphOperation['type'],
    desc: string,
    targetKey: string,
    data: { node?: GraphNode; edge?: GraphEdge }
  ): GraphOperation => ({
    id: `op-test-${Math.random().toString(36).substring(2, 7)}`,
    idempotencyKey: `mock-intent:1:${type}:${targetKey}`,
    intentId: 'mock-intent',
    baseVersion: 1,
    type,
    status: 'PENDING',
    timestamp: Date.now(),
    description: desc,
    ...data,
  });

  // --- TEST A: Video Streaming Platform ---
  console.log('--- TEST A: Video Streaming Platform ---');
  const promptA =
    'Build a video streaming platform with web client, API gateway, video service, recommendation service, Redis cache, PostgreSQL database, object storage';

  const irA = await interpreter.interpret(promptA);

  console.log('Test A Components:', irA.components.map((c) => `${c.name} [${c.type}]`));
  console.log('Test A Technologies:', irA.technologies);
  console.log('Test A Relationships:', irA.relationships.map((r) => `${r.source} -(${r.relationship})-> ${r.target}`));

  assert(irA.components.length >= 7, `Expected at least 7 components, got ${irA.components.length}`);
  assert(irA.components.some((c) => c.type === 'client' && c.name.toLowerCase().includes('web')), 'Web client classified as client type');
  assert(irA.components.some((c) => c.type === 'api'), 'API Gateway classified as api type');
  assert(irA.components.some((c) => c.type === 'service' && c.name.toLowerCase().includes('video')), 'Video Service classified as service type');
  assert(irA.components.some((c) => c.type === 'service' && c.name.toLowerCase().includes('recommendation')), 'Recommendation Service classified as service type');
  assert(irA.components.some((c) => c.type === 'cache' && c.technology === 'Redis'), 'Redis Cache classified as cache with technology Redis');
  assert(irA.components.some((c) => c.type === 'database' && c.technology === 'PostgreSQL'), 'PostgreSQL Database classified as database with technology PostgreSQL');
  assert(irA.components.some((c) => c.type === 'storage'), 'Object Storage classified as storage type');

  assert(Boolean(irA.technologies?.includes('Redis')), 'Redis captured in technologies list');
  assert(Boolean(irA.technologies?.includes('PostgreSQL')), 'PostgreSQL captured in technologies list');

  // Verify valid directional relationships
  assert(irA.relationships.length > 0, 'Relationships generated for Test A');
  const gwNode = irA.components.find((c) => c.type === 'api')!;
  const webClient = irA.components.find((c) => c.type === 'client')!;
  assert(
    irA.relationships.some((r) => r.source === webClient.id && r.target === gwNode.id),
    'Web Client connects to API Gateway'
  );

  // --- TEST B: Ride-Sharing System ---
  console.log('\n--- TEST B: Ride-Sharing System ---');
  const promptB =
    'Create a ride sharing system with rider app, driver app, API gateway, trip service, payment service, location service, Redis, PostgreSQL';

  const irB = await interpreter.interpret(promptB);

  console.log('Test B Components:', irB.components.map((c) => `${c.name} [${c.type}]`));
  console.log('Test B Technologies:', irB.technologies);

  assert(irB.components.length >= 8, `Expected at least 8 components, got ${irB.components.length}`);
  assert(irB.components.some((c) => c.type === 'client' && c.name.toLowerCase().includes('rider')), 'Rider App classified as client');
  assert(irB.components.some((c) => c.type === 'client' && c.name.toLowerCase().includes('driver')), 'Driver App classified as client');
  assert(irB.components.some((c) => c.type === 'api'), 'API Gateway classified as api');
  assert(irB.components.some((c) => c.name.toLowerCase().includes('trip')), 'Trip Service identified');
  assert(irB.components.some((c) => c.name.toLowerCase().includes('payment')), 'Payment Service identified');
  assert(irB.components.some((c) => c.name.toLowerCase().includes('location')), 'Location Service identified');
  assert(irB.components.some((c) => c.type === 'cache' && c.technology === 'Redis'), 'Redis identified as cache');
  assert(irB.components.some((c) => c.type === 'database' && c.technology === 'PostgreSQL'), 'PostgreSQL identified as database');

  const bGateway = irB.components.find((c) => c.type === 'api')!;
  const bRider = irB.components.find((c) => c.name.toLowerCase().includes('rider'))!;
  const bDriver = irB.components.find((c) => c.name.toLowerCase().includes('driver'))!;
  assert(irB.relationships.some((r) => r.source === bRider.id && r.target === bGateway.id), 'Rider App connects to API Gateway');
  assert(irB.relationships.some((r) => r.source === bDriver.id && r.target === bGateway.id), 'Driver App connects to API Gateway');

  // --- TEST C: E-Commerce Pipeline ---
  console.log('\n--- TEST C: E-Commerce Arrow Pipeline ---');
  const promptC =
    'User -> Web App -> API Gateway -> Order Service -> Payment Service, PostgreSQL, Redis';

  const irC = await interpreter.interpret(promptC);

  console.log('Test C Components:', irC.components.map((c) => `${c.name} [${c.type}]`));
  console.log('Test C Relationships:', irC.relationships.map((r) => `${r.source} -(${r.relationship})-> ${r.target}`));

  assert(irC.components.some((c) => c.type === 'user'), 'User actor identified');
  assert(irC.components.some((c) => c.type === 'client'), 'Web App client identified');
  assert(irC.components.some((c) => c.type === 'api'), 'API Gateway identified');
  assert(irC.components.some((c) => c.name.toLowerCase().includes('order')), 'Order Service identified');
  assert(irC.components.some((c) => c.name.toLowerCase().includes('payment')), 'Payment Service identified');
  assert(irC.components.some((c) => c.type === 'database'), 'PostgreSQL database identified');
  assert(irC.components.some((c) => c.type === 'cache'), 'Redis cache identified');

  const userComp = irC.components.find((c) => c.type === 'user')!;
  const appComp = irC.components.find((c) => c.type === 'client')!;
  const apiComp = irC.components.find((c) => c.type === 'api')!;
  const orderComp = irC.components.find((c) => c.name.toLowerCase().includes('order'))!;
  const payComp = irC.components.find((c) => c.name.toLowerCase().includes('payment'))!;

  assert(irC.relationships.some((r) => r.source === userComp.id && r.target === appComp.id), 'User -> Web App relationship');
  assert(irC.relationships.some((r) => r.source === appComp.id && r.target === apiComp.id), 'Web App -> API Gateway relationship');
  assert(irC.relationships.some((r) => r.source === apiComp.id && r.target === orderComp.id), 'API Gateway -> Order Service relationship');
  assert(irC.relationships.some((r) => r.source === orderComp.id && r.target === payComp.id), 'Order Service -> Payment Service relationship');

  // --- TEST D: Healthcare Appointment ---
  console.log('\n--- TEST D: Healthcare Appointment & External Provider ---');
  const promptD =
    'Patient -> Mobile App -> Auth & Appointment Services -> PostgreSQL, Notification Service -> External SMS Provider';

  const irD = await interpreter.interpret(promptD);

  console.log('Test D Components:', irD.components.map((c) => `${c.name} [${c.type}]`));
  console.log('Test D Relationships:', irD.relationships.map((r) => `${r.source} -(${r.relationship})-> ${r.target}`));

  assert(irD.components.some((c) => c.type === 'user' && c.name.toLowerCase().includes('patient')), 'Patient classified as user');
  assert(irD.components.some((c) => c.type === 'client' && c.name.toLowerCase().includes('mobile')), 'Mobile App classified as client');
  assert(irD.components.some((c) => c.name.toLowerCase().includes('auth')), 'Auth Service split and identified');
  assert(irD.components.some((c) => c.name.toLowerCase().includes('appointment')), 'Appointment Service split and identified');
  assert(irD.components.some((c) => c.type === 'database'), 'PostgreSQL database identified');
  assert(irD.components.some((c) => c.name.toLowerCase().includes('notification')), 'Notification Service identified');
  assert(
    irD.components.some((c) => c.type === 'external_service' && c.name.toLowerCase().includes('sms')),
    'External SMS Provider classified as external_service'
  );

  const notifComp = irD.components.find((c) => c.name.toLowerCase().includes('notification'))!;
  const smsComp = irD.components.find((c) => c.type === 'external_service')!;
  assert(
    irD.relationships.some((r) => r.source === notifComp.id && r.target === smsComp.id),
    'Notification Service calls External SMS Provider'
  );

  // --- TEST E: Explicit Verbal Grammatical Patterns ---
  console.log('\n--- TEST E: Explicit Verbal Grammatical Patterns ---');
  const promptE =
    'Customer accesses system through Web Portal. Order Service publishes events to Kafka Queue. Billing Worker consumes from Kafka Queue. Order Service stores data in PostgreSQL Database. Authentication Service authenticated by Auth0.';

  const irE = await interpreter.interpret(promptE);
  console.log('Test E Relationships:', irE.relationships.map((r) => `${r.source} -(${r.relationship})-> ${r.target}`));

  assert(irE.relationships.some((r) => r.relationship === 'PUBLISHES_TO'), 'PUBLISHES_TO extracted from "publishes events to"');
  assert(irE.relationships.some((r) => r.relationship === 'CONSUMES_FROM'), 'CONSUMES_FROM extracted from "consumes from"');
  assert(irE.relationships.some((r) => r.relationship === 'STORES_IN'), 'STORES_IN extracted from "stores data in"');
  assert(irE.relationships.some((r) => r.relationship === 'AUTHENTICATES'), 'AUTHENTICATES extracted from "authenticated by"');
  assert(irE.relationships.some((r) => r.relationship === 'CONNECTS_TO'), 'CONNECTS_TO extracted from "accesses system through"');

  // --- TEST F: Deduplication & No Self Loops ---
  console.log('\n--- TEST F: Deduplication & Self-Loop Prevention ---');
  const duplicatePrompt =
    'User with Redis, redis, Redis Cache, PostgreSQL, postgresql and PostgreSQL';

  const irF = await interpreter.interpret(duplicatePrompt);
  console.log('Test F Components:', irF.components.map((c) => c.name));

  const redisComps = irF.components.filter((c) => c.name.toLowerCase().includes('redis'));
  const pgComps = irF.components.filter((c) => c.name.toLowerCase().includes('postgres'));
  assert(redisComps.length === 1, `Redis deduplicated to 1 component (Actual: ${redisComps.length})`);
  assert(pgComps.length === 1, `PostgreSQL deduplicated to 1 component (Actual: ${pgComps.length})`);
  assert(!irF.relationships.some((r) => r.source === r.target), 'No self-loops exist in relationships');

  // --- TEST G: planFromIR Operation Generation & Progressive Layout ---
  console.log('\n--- TEST G: planFromIR Generation & Non-Negative Layout ---');
  const planResult = planFromIR(irA, 1, createMockOp);

  console.log(`Plan Result Operations count: ${planResult.operations.length}`);
  console.log(`Summary: ${planResult.summary}`);

  assert(planResult.operations.length > 0, 'Operations created from ArchitectureIR');
  const addNodeOps = planResult.operations.filter((op) => op.type === 'ADD_NODE');
  const addEdgeOps = planResult.operations.filter((op) => op.type === 'ADD_EDGE');

  assert(addNodeOps.length === irA.components.length, 'One ADD_NODE operation per component');
  assert(addEdgeOps.length === irA.relationships.length, 'One ADD_EDGE operation per relationship');

  // Verify non-negative positions on all nodes
  addNodeOps.forEach((op) => {
    assert(Boolean(op.node), `Node payload exists for ${op.description}`);
    const pos = op.node?.position;
    assert(Boolean(pos && typeof pos.x === 'number' && typeof pos.y === 'number'), `Node ${op.node?.label} has valid position object`);
    assert(!isNaN(pos!.x) && !isNaN(pos!.y), `Node ${op.node?.label} has non-NaN coordinates`);
    assert(pos!.x >= 0 && pos!.y >= 0, `Node ${op.node?.label} has non-negative position (${pos!.x}, ${pos!.y})`);
  });

  console.log('\n==================================================');
  console.log('🎉 ALL ARCHITECTURE IR TESTS PASSED PERFECTLY!');
  console.log('==================================================\n');
}

runArchitectureIRTests().catch((err) => {
  console.error('Test failed:', err);
  (globalThis as any).process?.exit(1);
});
