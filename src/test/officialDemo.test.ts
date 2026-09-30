import { eventBridge } from '../voice/EventBridge';
import { useGraphStore } from '../state/graphStore';

function assert(condition: boolean, msg: string) {
  if (!condition) {
    console.error(`❌ ASSERTION FAILED: ${msg}`);
    (globalThis as any).process?.exit(1);
  }
  console.log(`✅ ${msg}`);
}

async function runOfficialDemoTest() {
  console.log('\n==================================================');
  console.log('TEST SUITE: Official Extension Use Case Demo Test');
  console.log('Voice-Driven Evolving Architecture (Samsung Theme 05)');
  console.log('==================================================\n');

  // Track verbal outputs from eventBridge
  const speechHistory: string[] = [];
  const unsubSpeech = eventBridge.subscribeToAgentSpeech((text) => {
    speechHistory.push(text);
  });

  // Track interruption banner state changes
  const bannerHistory: string[] = [];
  const unsubBanner = useGraphStore.subscribe((state) => {
    if (state.interruptionBanner) {
      const bannerKey = `${state.interruptionBanner.stage}:${state.interruptionBanner.message}`;
      if (!bannerHistory.includes(bannerKey)) {
        bannerHistory.push(bannerKey);
      }
    }
  });

  // Reset store
  useGraphStore.getState().resetGraph();
  assert(useGraphStore.getState().nodes.length === 0, 'Initial graph is empty');
  assert(useGraphStore.getState().version === 1, 'Initial graph version is 1');

  // =========================================================================
  // STAGE 1: Initial Requirement
  // "I'm building an AI customer support system."
  // =========================================================================
  console.log('\n--- STAGE 1: Initial Requirement ("AI customer support system") ---');
  const stage1Promise = eventBridge.handleTranscript("I'm building an AI customer support system.");

  // Fast check: verbal ack emitted immediately
  await new Promise((r) => setTimeout(r, 60));
  assert(
    speechHistory.some((s) => s.includes("Got it — I'm mapping that now")),
    'Immediate verbal ack emitted for Stage 1'
  );

  // Give it a brief slice so operations enter RUNNING
  await new Promise((r) => setTimeout(r, 200));
  assert(
    useGraphStore.getState().agentStatus === 'EXECUTING' || useGraphStore.getState().agentStatus === 'PLANNING',
    'Stage 1 operations actively running'
  );

  // =========================================================================
  // STAGE 2: Mid-Flight Interruption & Replanning
  // "Actually, make it multi-agent."
  // =========================================================================
  console.log('\n--- STAGE 2: Mid-Flight Interruption ("Actually, make it multi-agent") ---');
  const stage2Promise = eventBridge.handleTranscript('Actually, make it a multi-agent system.');

  // Immediate interruption ack check
  await new Promise((r) => setTimeout(r, 80));
  assert(
    speechHistory.some((s) => s.includes('pivoting') || s.includes('Understood')),
    'Immediate interruption ack emitted ("Understood, pivoting the architecture now.")'
  );

  // Interruption HUD banner check
  const hasInterruptedBanner = bannerHistory.some(
    (b) => b.includes('USER_INTERRUPTED') || b.includes('STALE_PLAN') || b.includes('REPLANNING')
  );
  assert(hasInterruptedBanner, 'Interruption banner entered USER_INTERRUPTED / STALE_PLAN / REPLANNING stage');

  // Await completion of both stages
  await Promise.all([stage1Promise, stage2Promise]);
  await new Promise((r) => setTimeout(r, 300));

  const stateStage2 = useGraphStore.getState();
  console.log(`Stage 2 Graph Nodes (${stateStage2.nodes.length}):`, stateStage2.nodes.map((n) => n.label));

  // Verify superseded operations
  const supersededOps = stateStage2.activeOperations.filter(
    (op) => op.status === 'SUPERSEDED' || op.status === 'INTERRUPTED'
  );
  assert(supersededOps.length > 0, `Stale operations marked SUPERSEDED/INTERRUPTED (Count: ${supersededOps.length})`);

  // Verify multi-agent nodes committed
  const nodeLabels = stateStage2.nodes.map((n) => n.label.toLowerCase());
  assert(nodeLabels.some((l) => l.includes('router')), 'Agent Router node present in graph');
  assert(nodeLabels.some((l) => l.includes('sales')), 'Sales Agent node present in graph');
  assert(nodeLabels.some((l) => l.includes('billing')), 'Billing Agent node present in graph');
  assert(nodeLabels.some((l) => l.includes('technical')), 'Technical Agent node present in graph');
  assert(stateStage2.version >= 2, `Graph version incremented to v${stateStage2.version} after Stage 2`);

  // =========================================================================
  // STAGE 3: Architecture Evolution
  // "Billing should have its own database."
  // =========================================================================
  console.log('\n--- STAGE 3: Architecture Evolution ("Billing should have its own database") ---');
  const stage3Promise = eventBridge.handleTranscript('Billing should have its own database.');

  await new Promise((r) => setTimeout(r, 80));
  assert(
    speechHistory.some((s) => s.includes('database') || s.includes('Got it') || s.includes('mapping')),
    'Spoken conversational acknowledgement emitted for Stage 3'
  );

  await stage3Promise;
  await new Promise((r) => setTimeout(r, 300));

  const stateStage3 = useGraphStore.getState();
  console.log(`Stage 3 Graph Nodes (${stateStage3.nodes.length}):`, stateStage3.nodes.map((n) => n.label));
  console.log(`Stage 3 Graph Edges (${stateStage3.edges.length}):`, stateStage3.edges.map((e) => `${e.source} -> ${e.target} (${e.label || ''})`));

  // Check Billing Database exists
  const billingDbNode = stateStage3.nodes.find(
    (n) => n.label.toLowerCase().includes('billing database') || n.id.includes('billing-database')
  );
  assert(Boolean(billingDbNode), 'Dedicated Billing Database node created');

  // Check preserved multi-agent nodes (non-destructive evolution)
  const finalLabels = stateStage3.nodes.map((n) => n.label.toLowerCase());
  assert(finalLabels.some((l) => l.includes('router')), 'Agent Router preserved after Stage 3 evolution');
  assert(finalLabels.some((l) => l.includes('sales')), 'Sales Agent preserved after Stage 3 evolution');
  assert(finalLabels.some((l) => l.includes('billing agent')), 'Billing Agent preserved after Stage 3 evolution');
  assert(finalLabels.some((l) => l.includes('technical')), 'Technical Agent preserved after Stage 3 evolution');

  // Check edge connects Billing Agent -> Billing Database
  const billingAgentNode = stateStage3.nodes.find((n) => n.label.toLowerCase().includes('billing agent'));
  assert(Boolean(billingAgentNode), 'Billing Agent node exists for edge connection');

  if (billingAgentNode && billingDbNode) {
    const edge = stateStage3.edges.find(
      (e) => e.source === billingAgentNode.id && e.target === billingDbNode.id
    );
    assert(Boolean(edge), `Edge Billing Agent (${billingAgentNode.id}) -> Billing Database (${billingDbNode.id}) exists`);
  }

  // Version and State Banner check
  assert(stateStage3.version >= 3, `Graph version incremented to v${stateStage3.version} after Stage 3`);
  assert(
    stateStage3.interruptionBanner?.stage === 'STATE_COMMITTED',
    `Final HUD banner status is STATE_COMMITTED (Current: ${stateStage3.interruptionBanner?.stage})`
  );

  unsubSpeech();
  unsubBanner();

  console.log('\n==================================================');
  console.log('🎉 ALL OFFICIAL DEMO END-TO-END TESTS PASSED!');
  console.log('==================================================\n');
}

runOfficialDemoTest().catch((err) => {
  console.error('Test execution failed:', err);
  (globalThis as any).process?.exit(1);
});
