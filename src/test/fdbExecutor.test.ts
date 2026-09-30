import { InterruptibleToolExecutor } from '../fdb/InterruptibleToolExecutor';
import { ToolRegistry } from '../fdb/ToolRegistry';
import { FDBLogger } from '../fdb/logger';
import type { ToolDefinition, ChainedStep } from '../fdb/types';

function assert(condition: boolean, msg: string) {
  if (!condition) {
    console.error(`❌ ASSERTION FAILED: ${msg}`);
    (globalThis as any).process?.exit(1);
  }
  console.log(`✅ ${msg}`);
}

async function runTests() {
  console.log('\n==================================================');
  console.log('TEST SUITE: Full-Duplex-Bench v3 (FDB-v3) Integration');
  console.log('Samsung GenAI Hackathon - Theme 05');
  console.log('==================================================\n');

  const registry = new ToolRegistry();
  const logger = new FDBLogger();
  const executor = new InterruptibleToolExecutor(registry, logger);

  // Register generic test tools (zero hardcoded benchmark scenarios)
  const echoTool: ToolDefinition<{ message: string }, { reply: string }> = {
    name: 'echo_service',
    description: 'Echoes message back with simulated delay',
    inputSchema: { type: 'object', properties: { message: { type: 'string' } } },
    sideEffectLevel: 'READ_ONLY',
    async execute(args, context) {
      await new Promise((r) => setTimeout(r, 60));
      if (context.signal.aborted) throw new DOMException('Aborted', 'AbortError');
      return { success: true, data: { reply: `Echo: ${args.message}` } };
    },
  };

  let dbRecords: string[] = [];
  const stateChangingTool: ToolDefinition<{ item: string }, { id: string }> = {
    name: 'database_insert',
    description: 'Inserts record into database',
    inputSchema: { type: 'object', properties: { item: { type: 'string' } } },
    sideEffectLevel: 'STATE_CHANGING',
    async execute(args, context) {
      await new Promise((r) => setTimeout(r, 80));
      if (context.signal.aborted) throw new DOMException('Aborted', 'AbortError');
      dbRecords.push(args.item);
      return { success: true, data: { id: `rec_${dbRecords.length}` }, appliedChanges: true };
    },
  };

  const bookedFlights: string[] = [];
  const flightTool: ToolDefinition<{ destination: string }, { bookingId: string }> = {
    name: 'book_flight',
    description: 'Books a flight to a specified destination',
    inputSchema: { type: 'object', properties: { destination: { type: 'string' } } },
    sideEffectLevel: 'STATE_CHANGING',
    async execute(args, context) {
      // Simulate booking delay
      await new Promise((r) => setTimeout(r, 120));
      if (context.signal.aborted) throw new DOMException('Aborted', 'AbortError');
      bookedFlights.push(args.destination);
      return { success: true, data: { bookingId: `fl_${Date.now()}` }, appliedChanges: true };
    },
  };

  registry.registerTool(echoTool);
  registry.registerTool(stateChangingTool);
  registry.registerTool(flightTool);

  // --- TEST 1: Duplicate Prevention (Idempotency) ---
  console.log('--- TEST 1: Duplicate State-Changing Prevention (Idempotency) ---');
  executor.resetSession('scenario_idemp');
  dbRecords = [];

  const res1 = await executor.executeTool(
    'database_insert',
    { item: 'test_record_1' },
    'intent_1',
    'idemp_tx_999'
  );
  assert(res1.success === true, 'First state-changing call executes successfully');
  assert(dbRecords.length === 1, 'Database received 1 insertion');

  // Attempt duplicate call with same idempotency key
  const res2 = await executor.executeTool(
    'database_insert',
    { item: 'test_record_1' },
    'intent_1',
    'idemp_tx_999'
  );
  assert(res2.success === false, 'Duplicate state-changing call is rejected');
  assert(Boolean(res2.metadata?.duplicateBlocked), 'Duplicate blocked flag present in metadata');
  assert(dbRecords.length === 1, 'Database records unchanged; no duplicate side-effect committed');

  // --- TEST 2: Cancellation via AbortController ---
  console.log('\n--- TEST 2: In-Flight Cancellation via AbortController ---');
  executor.resetSession('scenario_cancel');

  const cancelPromise = executor.executeTool(
    'book_flight',
    { destination: 'Paris' },
    'intent_cancel',
    'tx_paris'
  );

  // Wait for execution to enter RUNNING state
  await new Promise((r) => setTimeout(r, 30));
  const activeOps = Array.from(executor.getSession().activeExecutions.values());
  assert(activeOps.length === 1, 'Active execution registered in session');
  const runningOp = activeOps[0];
  assert(runningOp.status === 'RUNNING', 'Operation is in RUNNING state');

  // Cancel execution mid-flight
  executor.cancelExecution(runningOp.id, 'User changed mind');
  assert(runningOp.status === 'SUPERSEDED', 'Operation status transitioned to SUPERSEDED');

  const cancelResult = await cancelPromise;
  assert(cancelResult.success === false, 'Cancelled operation returned unsuccessful result');
  assert(
    !bookedFlights.includes('Paris'),
    'Pre-commit gate prevented ghost commit; Paris flight was not booked'
  );

  // --- TEST 3: Argument Correction ---
  console.log('\n--- TEST 3: Argument Correction ("Delhi" -> "Actually, Mumbai") ---');
  executor.resetSession('scenario_arg_correction');
  bookedFlights.length = 0;

  // Start booking Delhi
  const delhiPromise = executor.executeTool(
    'book_flight',
    { destination: 'Delhi' },
    'intent_flight_1',
    'tx_flight_delhi'
  );

  await new Promise((r) => setTimeout(r, 40));
  const delhiOp = Array.from(executor.getSession().activeExecutions.values())[0];
  assert(delhiOp.status === 'RUNNING', 'Delhi booking in progress');

  // User corrects: "Actually, Mumbai."
  const mumbaiPromise = executor.updateExecutionArguments(
    delhiOp.id,
    { destination: 'Mumbai' },
    'intent_correction_mumbai'
  );

  assert(delhiOp.status === 'SUPERSEDED', 'Old Delhi execution immediately marked SUPERSEDED');

  const [delhiRes, mumbaiRes] = await Promise.all([delhiPromise, mumbaiPromise]);

  assert(delhiRes.success === false, 'Stale Delhi booking was rejected');
  assert(mumbaiRes.success === true, 'Updated Mumbai booking completed successfully');
  assert(!bookedFlights.includes('Delhi'), 'Delhi booking was NOT committed');
  assert(bookedFlights.includes('Mumbai'), 'Mumbai booking was committed');
  console.log('Booked flights:', bookedFlights);

  // --- TEST 4: Chained Tools Execution & Mid-Chain Interruption ---
  console.log('\n--- TEST 4: Chained Tools Execution & Mid-Chain Interruption ---');
  executor.resetSession('scenario_chain');

  // Define 3 chained steps: Step 1 -> Step 2 -> Step 3
  const chainSteps: ChainedStep[] = [
    {
      stepId: 'step_query',
      toolName: 'echo_service',
      resolveArguments: () => ({ message: 'Query system graph' }),
    },
    {
      stepId: 'step_insert',
      toolName: 'database_insert',
      resolveArguments: (prev) => ({ item: `Node based on ${prev.step_query || 'unknown'}` }),
    },
    {
      stepId: 'step_notify',
      toolName: 'echo_service',
      resolveArguments: (prev) => ({ message: `Inserted ${(prev.step_insert as any)?.id}` }),
    },
  ];

  // 4A: Normal full chain completion
  const chainResNormal = await executor.executeChain('chain_normal', chainSteps, 'intent_chain_1');
  assert(chainResNormal.success === true, 'Complete chained execution succeeded');
  assert(chainResNormal.completedSteps.length === 3, 'All 3 chained steps completed');
  assert(chainResNormal.supersededSteps.length === 0, 'No steps superseded in normal execution');

  // 4B: Chain with interruption during Step 2
  const chainPromise = executor.executeChain('chain_interrupted', chainSteps, 'intent_chain_2');

  // Let Step 1 complete (~60ms) and Step 2 begin
  await new Promise((r) => setTimeout(r, 90));

  // User interrupts during Step 2
  executor.interruptChain('chain_interrupted', 'User interrupted chain');

  const chainResInterrupted = await chainPromise;
  assert(chainResInterrupted.success === false, 'Interrupted chain marked failure');
  assert(chainResInterrupted.completedSteps.includes('step_query'), 'Valid completed upstream work (Step 1) preserved');
  assert(
    chainResInterrupted.interruptedSteps.includes('step_insert'),
    'Active step (Step 2) marked interrupted'
  );
  assert(
    chainResInterrupted.supersededSteps.includes('step_notify'),
    'Downstream step (Step 3) safely cancelled and superseded'
  );

  // --- TEST 5: Session Isolation ---
  console.log('\n--- TEST 5: Scenario Session Isolation ---');
  executor.resetSession('scenario_alpha');
  const alphaRes = await executor.executeTool(
    'database_insert',
    { item: 'alpha_item' },
    'intent_alpha',
    'idemp_shared_key'
  );
  assert(alphaRes.success === true, 'Scenario Alpha executed tool');
  assert(executor.getSession().committedIdempotencyKeys.has('idemp_shared_key'), 'Key stored in Scenario Alpha');

  // Switch scenario -> Fresh Session
  executor.resetSession('scenario_beta');
  const betaSession = executor.getSession();
  assert(betaSession.sessionId === 'scenario_beta', 'Session ID switched to Scenario Beta');
  assert(betaSession.committedIdempotencyKeys.size === 0, 'Scenario Beta has fresh empty idempotency state');
  assert(betaSession.activeExecutions.size === 0, 'Scenario Beta has fresh empty executions');

  // Using the exact same idempotency key in Beta must succeed (No cross-scenario caching!)
  const betaRes = await executor.executeTool(
    'database_insert',
    { item: 'beta_item' },
    'intent_beta',
    'idemp_shared_key'
  );
  assert(betaRes.success === true, 'Same idempotency key succeeds in fresh isolated scenario session');

  // --- TEST 6: Stale Result Rejection (Intent Change) ---
  console.log('\n--- TEST 6: Stale Result Rejection on Intent Change ---');
  executor.resetSession('scenario_stale');
  executor.setCurrentIntent('intent_A');

  const stalePromise = executor.executeTool(
    'book_flight',
    { destination: 'London' },
    'intent_A',
    'tx_london'
  );

  await new Promise((r) => setTimeout(r, 30));
  // User changes intent before tool commits
  executor.setCurrentIntent('intent_B');

  const staleRes = await stalePromise;
  assert(staleRes.success === false, 'Execution under superseded intent_A rejected by pre-commit gate');
  assert(!bookedFlights.includes('London'), 'London booking was blocked from committing');

  // --- TEST 7: Structured Logging & Secrets Redaction ---
  console.log('\n--- TEST 7: Structured Logging & Secrets Redaction ---');
  logger.log({
    sessionId: 'sec_test',
    intentId: 'intent_sec',
    toolName: 'api_tool',
    arguments: {
      username: 'alice',
      api_key: 'sk-secret123456789',
      bearerToken: 'livekit_token_xyz',
      nested: { password: 'my_super_secret_pw' },
    },
    operationId: 'op_sec',
    status: 'COMPLETED',
    cancellation: false,
    supersession: false,
    latencyMs: 145,
  });

  const secLogs = logger.getLogs('sec_test');
  assert(secLogs.length === 1, 'Log recorded in logger');
  const loggedArgs = secLogs[0].arguments as any;
  assert(loggedArgs.api_key === '[REDACTED_SECRET]', 'API key scrubbed');
  assert(loggedArgs.bearerToken === '[REDACTED_SECRET]', 'Bearer token scrubbed');
  assert(loggedArgs.nested.password === '[REDACTED_SECRET]', 'Nested password scrubbed');
  assert(loggedArgs.username === 'alice', 'Non-sensitive field preserved');
  assert(secLogs[0].latencyMs === 145, 'Latency recorded');

  const jsonlOutput = logger.exportJSONL('sec_test');
  assert(jsonlOutput.includes('[REDACTED_SECRET]'), 'Exported JSONL contains redacted secrets');
  assert(!jsonlOutput.includes('sk-secret123456789'), 'Raw API secret is NOT present in exported JSONL');

  console.log('\n==================================================');
  console.log('🎉 ALL FDB-v3 EXECUTOR & ADAPTER TESTS PASSED PERFECTLY!');
  console.log('==================================================\n');
}

runTests().catch((err) => {
  console.error('Test execution failed:', err);
  (globalThis as any).process?.exit(1);
});
