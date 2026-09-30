import { eventBridge } from '../voice/EventBridge';
import { useGraphStore } from '../state/graphStore';
import { toReactFlowNodes, toReactFlowEdges } from '../engine/graphEngine';
import { ArchitectureInterpreter } from '../engine/architectureInterpreter';

function assert(condition: boolean, msg: string) {
  if (!condition) {
    console.error(`❌ ASSERTION FAILED: ${msg}`);
    (globalThis as any).process?.exit(1);
  }
  console.log(`✅ ${msg}`);
}

async function runGenericPlannerTests() {
  console.log('\n==================================================');
  console.log('TEST SUITE: MindSpace General Architecture Planner');
  console.log('Natural Language Systems & Microphone Review Flow');
  console.log('==================================================\n');

  // --- SCENARIO 1: Video Streaming Platform ---
  console.log('--- TEST 1: Arbitrary System — Video Streaming Platform ---');
  useGraphStore.getState().resetGraph();
  assert(useGraphStore.getState().nodes.length === 0, 'Clean slate before test');

  const videoPrompt =
    'Build a video streaming platform with user, API gateway, video upload service, transcoder worker, S3 storage, and PostgreSQL database';

  await eventBridge.handleTranscript(videoPrompt);
  await new Promise((r) => setTimeout(r, 200));

  const videoStore = useGraphStore.getState();
  console.log(`Video Platform Nodes (${videoStore.nodes.length}):`, videoStore.nodes.map((n) => `${n.label} [${n.type}]`));
  console.log(`Video Platform Edges (${videoStore.edges.length}):`, videoStore.edges.map((e) => `${e.source} → ${e.target} (${e.label})`));

  assert(videoStore.nodes.length >= 6, `At least 6 nodes deployed (Actual: ${videoStore.nodes.length})`);
  
  const hasUser = videoStore.nodes.some((n) => n.type === 'user');
  const hasApi = videoStore.nodes.some((n) => n.type === 'api');
  const hasUpload = videoStore.nodes.some((n) => n.label.toLowerCase().includes('upload'));
  const hasTranscoder = videoStore.nodes.some((n) => n.label.toLowerCase().includes('transcoder'));
  const hasS3 = videoStore.nodes.some((n) => n.type === 'storage' && n.label.toLowerCase().includes('s3'));
  const hasPostgres = videoStore.nodes.some((n) => n.type === 'database');

  assert(hasUser, 'User client node inferred');
  assert(hasApi, 'API Gateway node inferred');
  assert(hasUpload, 'Video Upload Service inferred');
  assert(hasTranscoder, 'Transcoder Worker inferred');
  assert(hasS3, 'S3 Storage node inferred');
  assert(hasPostgres, 'PostgreSQL Database node inferred');

  // Verify React Flow coordinates
  const rfNodes = toReactFlowNodes(videoStore.nodes);
  const rfEdges = toReactFlowEdges(videoStore.edges);
  assert(rfNodes.length === videoStore.nodes.length, 'All nodes mapped to React Flow');
  rfNodes.forEach((node) => {
    assert(!isNaN(node.position.x) && !isNaN(node.position.y), `Node ${node.data.label} has non-NaN coordinates`);
    assert(node.position.x >= 0 && node.position.y >= 0, `Node ${node.data.label} has non-negative position (${node.position.x}, ${node.position.y})`);
  });
  assert(rfEdges.length === videoStore.edges.length, 'All edges mapped to React Flow');

  // --- SCENARIO 2: Ride-Sharing System ---
  console.log('\n--- TEST 2: Arbitrary System — Ride-Sharing System ---');
  useGraphStore.getState().resetGraph();

  const ridePrompt =
    'Design a ride-sharing system with passenger app, driver app, trip matching service, geolocation cache in Redis, and payments service';

  await eventBridge.handleTranscript(ridePrompt);
  await new Promise((r) => setTimeout(r, 200));

  const rideStore = useGraphStore.getState();
  console.log(`Ride-Sharing Nodes (${rideStore.nodes.length}):`, rideStore.nodes.map((n) => `${n.label} [${n.type}]`));

  assert(rideStore.nodes.some((n) => n.label.toLowerCase().includes('passenger')), 'Passenger App node deployed');
  assert(rideStore.nodes.some((n) => n.label.toLowerCase().includes('driver')), 'Driver App node deployed');
  assert(rideStore.nodes.some((n) => n.label.toLowerCase().includes('matching')), 'Trip Matching Service deployed');
  assert(rideStore.nodes.some((n) => n.type === 'cache'), 'Geolocation Cache (Redis) deployed as cache type');
  assert(rideStore.nodes.some((n) => n.label.toLowerCase().includes('payment')), 'Payments Service deployed');
  assert(rideStore.edges.length > 0, 'Edges synthesized for ride-sharing system');

  // --- SCENARIO 3: Social Media App ---
  console.log('\n--- TEST 3: Arbitrary System — Social Media App ---');
  useGraphStore.getState().resetGraph();

  const socialPrompt =
    'A social media app with mobile client, graphql gateway, feed service, notification worker, cassandra, and neo4j';

  await eventBridge.handleTranscript(socialPrompt);
  await new Promise((r) => setTimeout(r, 200));

  const socialStore = useGraphStore.getState();
  console.log(`Social App Nodes (${socialStore.nodes.length}):`, socialStore.nodes.map((n) => `${n.label} [${n.type}]`));

  assert(socialStore.nodes.some((n) => n.label.toLowerCase().includes('mobile')), 'Mobile Client deployed');
  assert(socialStore.nodes.some((n) => n.label.toLowerCase().includes('graphql')), 'GraphQL Gateway deployed');
  assert(socialStore.nodes.some((n) => n.label.toLowerCase().includes('feed')), 'Feed Service deployed');
  assert(socialStore.nodes.some((n) => n.label.toLowerCase().includes('notification')), 'Notification Worker deployed');
  assert(socialStore.nodes.some((n) => n.label.toLowerCase().includes('cassandra')), 'Cassandra DB deployed');
  assert(socialStore.nodes.some((n) => n.label.toLowerCase().includes('neo4j')), 'Neo4j Graph DB deployed');

  // --- SCENARIO 4: E-Commerce Platform & Generic Modifications ---
  console.log('\n--- TEST 4: E-Commerce Platform & Generic Modifications ---');
  useGraphStore.getState().resetGraph();

  const ecomPrompt =
    'Build an e-commerce platform with web app, product catalog service, shopping cart in redis, checkout service, order queue in kafka, and postgres database';

  await eventBridge.handleTranscript(ecomPrompt);
  await new Promise((r) => setTimeout(r, 200));

  const ecomStore = useGraphStore.getState();
  assert(ecomStore.nodes.some((n) => n.label.toLowerCase().includes('kafka')), 'Initial Kafka node deployed');

  // Step 4B: Generic Replacement: "Replace kafka with rabbitmq"
  console.log('-> Executing generic replacement: "Replace kafka with rabbitmq"');
  await eventBridge.handleTranscript('Replace kafka with rabbitmq');
  await new Promise((r) => setTimeout(r, 200));

  const modStore = useGraphStore.getState();
  const rabbitNode = modStore.nodes.find((n) => n.label.toLowerCase().includes('rabbitmq'));
  const supersededKafka = modStore.nodes.find((n) => n.label.toLowerCase().includes('kafka'));

  assert(Boolean(rabbitNode && rabbitNode.status !== 'superseded'), 'Replacement RabbitMQ node active in graph');
  assert(Boolean(supersededKafka && supersededKafka.status === 'superseded'), 'Original Kafka node marked SUPERSEDED');

  // Step 4C: Generic Addition: "Add recommendation service connected to product catalog and redis"
  console.log('-> Executing generic addition: "Add recommendation service connected to product catalog and redis"');
  await eventBridge.handleTranscript('Add recommendation service connected to product catalog and redis');
  await new Promise((r) => setTimeout(r, 200));

  const addStore = useGraphStore.getState();
  const recoNode = addStore.nodes.find((n) => n.label.toLowerCase().includes('recommendation'));
  assert(Boolean(recoNode && recoNode.status !== 'superseded'), 'Recommendation Service added to graph');
  const recoEdges = addStore.edges.filter((e) => e.source === recoNode?.id || e.target === recoNode?.id);
  assert(recoEdges.length > 0, 'Recommendation Service wired to connected components');

  // --- SCENARIO 5: Component Classification & Fallback ---
  console.log('\n--- TEST 5: Standalone Classifier Unit Validation ---');
  const comp1 = ArchitectureInterpreter.classifyComponent('shopping cart in redis');
  assert(comp1?.type === 'cache', 'shopping cart in redis classified as cache');
  assert(comp1?.label === 'Shopping Cart (Redis)', `Formatted label: ${comp1?.label}`);

  const comp2 = ArchitectureInterpreter.classifyComponent('order queue in kafka');
  assert(comp2?.type === 'queue', 'order queue in kafka classified as queue');

  const comp3 = ArchitectureInterpreter.classifyComponent('compliance audit worker');
  assert(comp3?.type === 'service' && comp3.isWorker === true, 'compliance audit worker classified as worker service');

  const comp4 = ArchitectureInterpreter.classifyComponent('s3 storage');
  assert(comp4?.type === 'storage', 's3 storage classified as storage');

  const comp5 = ArchitectureInterpreter.classifyComponent('customer portal');
  assert(comp5?.type === 'user', 'customer portal classified as user');

  console.log('\n==================================================');
  console.log('🎉 ALL GENERAL ARCHITECTURE PLANNER TESTS PASSED!');
  console.log('==================================================\n');
}

runGenericPlannerTests().catch((err) => {
  console.error('Test failed:', err);
  (globalThis as any).process?.exit(1);
});
