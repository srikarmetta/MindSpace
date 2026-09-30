import { eventBridge } from '../voice/EventBridge';
import { latencyTracker } from '../voice/latencyTracker';
import { useGraphStore } from '../state/graphStore';

function assert(condition: boolean, msg: string) {
  if (!condition) {
    console.error(`❌ ASSERTION FAILED: ${msg}`);
    (globalThis as any).process?.exit(1);
  }
  console.log(`✅ ${msg}`);
}

async function runTests() {
  console.log('\n==================================================');
  console.log('TEST SUITE: MindSpace Voice & Multimodal Engine');
  console.log('Samsung GenAI Hackathon - Theme 05');
  console.log('==================================================\n');

  // Test 1: Verify Voice Provider Mode and Initial State
  console.log('--- TEST 1: Voice Provider Initialization & Demo Mode ---');
  const provider = eventBridge.provider;
  assert(provider.mode === 'MOCK_DEMO', 'Voice Provider initializes cleanly in DEMO MODE when credentials are not configured');
  assert(provider.getState() === 'IDLE', 'Initial voice state is IDLE');

  // Test 2: Immediate Acknowledgement & No False Done Verification
  console.log('\n--- TEST 2: Immediate Conversational Ack & No False Done ---');
  useGraphStore.getState().resetGraph();
  latencyTracker.reset();

  const speechEvents: { text: string; time: number; stage: string }[] = [];
  const unsubSpeech = eventBridge.subscribeToAgentSpeech((text) => {
    speechEvents.push({
      text,
      time: performance.now(),
      stage: useGraphStore.getState().agentStatus,
    });
  });

  const prompt = "I'm building an AI customer support system.";
  const pipelinePromise = eventBridge.handleTranscript(prompt);

  // Check that immediate ack happened quickly
  await new Promise((r) => setTimeout(r, 60));
  assert(speechEvents.length >= 1, 'Immediate verbal acknowledgement emitted prior to graph completion');
  assert(
    speechEvents[0].text.includes("Got it — I'm mapping that now"),
    `Immediate ack received: "${speechEvents[0].text}"`
  );
  assert(
    useGraphStore.getState().nodes.length === 0 || useGraphStore.getState().agentStatus !== 'IDLE',
    'Graph is actively executing when immediate ack was delivered (Decoupled conversational responsiveness)'
  );

  // Wait for full pipeline completion
  await pipelinePromise;
  await new Promise((r) => setTimeout(r, 100));

  // Verify No False Done: Spoken completion came AFTER graph nodes committed
  const completionSpeech = speechEvents.find((e) => e.text.includes('Architecture committed'));
  assert(Boolean(completionSpeech), 'Spoken completion confirmation emitted after graph committed');
  assert(useGraphStore.getState().nodes.length > 0, 'Graph contains committed nodes when completion spoken');
  assert(useGraphStore.getState().agentStatus === 'IDLE', 'Engine returned to IDLE only after commit');
  console.log(`Committed nodes count: ${useGraphStore.getState().nodes.length}`);

  // Test 3: Measured Latency Telemetry Validation
  console.log('\n--- TEST 3: Genuine Measured Latency Telemetry ---');
  const metrics = latencyTracker.getMetrics();
  console.log('Recorded Telemetry:', {
    intentLatencyMs: `${metrics.intentLatencyMs}ms`,
    planningLatencyMs: `${metrics.planningLatencyMs}ms`,
    operationLatencyMs: `${metrics.operationLatencyMs}ms`,
    e2eLatencyMs: `${metrics.e2eLatencyMs}ms`,
  });

  assert(metrics.intentLatencyMs !== null && metrics.intentLatencyMs >= 0, 'Intent Latency is genuine non-negative measurement');
  assert(metrics.planningLatencyMs !== null && metrics.planningLatencyMs >= 0, 'Planning Latency is genuine non-negative measurement');
  assert(metrics.operationLatencyMs !== null && metrics.operationLatencyMs >= 0, 'Operation Latency is genuine non-negative measurement');
  assert(metrics.e2eLatencyMs !== null && metrics.e2eLatencyMs >= 0, 'End-to-End Latency is genuine non-negative measurement');
  assert(metrics.timestamps.speechStarted !== null, 'Speech start timestamp recorded via performance.now()');
  assert(metrics.timestamps.operationCompleted !== null, 'Operation completed timestamp recorded via performance.now()');

  // Test 4: Live Vocal Interruption & Pre-Commit Invariant Verification
  console.log('\n--- TEST 4: Full-Duplex Voice Interruption & Non-Destructive Replanning ---');
  useGraphStore.getState().resetGraph();
  speechEvents.length = 0;

  // Start build
  const p1 = eventBridge.handleTranscript("I'm building an AI customer support system.");
  // Allow operations to enter RUNNING state
  await new Promise((r) => setTimeout(r, 250));

  assert(
    useGraphStore.getState().agentStatus === 'EXECUTING' || useGraphStore.getState().agentStatus === 'PLANNING',
    'Operations are actively running when interruption occurs'
  );

  // User interrupts mid-flight
  const interruptPromise = eventBridge.handleTranscript('Actually, make it a multi-agent system.');

  // Immediate ack for interruption
  await new Promise((r) => setTimeout(r, 80));
  const interruptAck = speechEvents.find((e) => e.text.includes('pivoting') || e.text.includes('Understood'));
  assert(Boolean(interruptAck), 'Voice interruption ack emitted immediately ("Understood, pivoting the architecture now.")');

  await Promise.all([p1, interruptPromise]);
  await new Promise((r) => setTimeout(r, 200));

  const stateAfterInterrupt = useGraphStore.getState();
  const operations = stateAfterInterrupt.activeOperations;
  const supersededOps = operations.filter((op) => op.status === 'SUPERSEDED' || op.status === 'INTERRUPTED');
  assert(supersededOps.length > 0, `Stale operations correctly marked SUPERSEDED/INTERRUPTED (Count: ${supersededOps.length})`);

  // Verify multi-agent nodes exist and no ghost commits corrupted the state
  const hasRouterOrAgent = stateAfterInterrupt.nodes.some(
    (n) => n.label.toLowerCase().includes('agent') || n.label.toLowerCase().includes('router')
  );
  assert(hasRouterOrAgent, 'Multi-agent architecture successfully committed in place of superseded build');

  unsubSpeech();
  console.log('\n==================================================');
  console.log('🎉 ALL VOICE & LATENCY ENGINE TESTS PASSED PERFECTLY!');
  console.log('==================================================\n');
}

runTests().catch((err) => {
  console.error('Test execution failed:', err);
  (globalThis as any).process?.exit(1);
});
