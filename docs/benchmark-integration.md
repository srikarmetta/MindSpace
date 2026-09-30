# Full-Duplex-Bench v3 (FDB-v3) Integration

This document outlines MindSpace's integration with the Full-Duplex-Bench v3 evaluation standard for full-duplex conversational agents.

---

## 1. Compliance Status

| Component | Status | Details |
|---|---|---|
| **Generic Tool Interface** | **`IMPLEMENTED`** | `ToolDefinition`, `ToolExecution` with `READ_ONLY` vs `STATE_CHANGING` classification |
| **Interruptible Tool Executor** | **`IMPLEMENTED`** | `InterruptibleToolExecutor` with in-flight cancellation via `AbortController` |
| **Argument Updates** | **`IMPLEMENTED`** | In-flight argument correction (e.g. "Delhi" → "Actually, Mumbai") without ghost commits |
| **Chained Tool Execution** | **`IMPLEMENTED`** | Multi-step workflows (`A → B → C`) with mid-chain interruption and upstream preservation |
| **Session Isolation** | **`IMPLEMENTED`** | Zero cross-scenario cache leakage via per-scenario sessions (`resetSession`) |
| **Structured JSONL Logging** | **`IMPLEMENTED`** | Full telemetry logging with automatic redaction of API keys, bearer tokens, and secrets |
| **Benchmark Runner Scripts** | **`IMPLEMENTED`** | Cross-platform scripts (`scripts/run-fdb-v3.py`, `scripts/run-fdb-v3.sh`, `scripts/run-fdb-v3.ps1`) |
| **Benchmark Test Suite** | **`IMPLEMENTED`** | Unit & scenario verification test (`src/test/fdbExecutor.test.ts`) |
| **Official Benchmark Dataset** | **`REQUIRES EXTERNAL BENCHMARK ENVIRONMENT`** | Official benchmark test suite and evaluation harness must be supplied externally |
| **Official Benchmark Score** | **`NOT YET RUN`** | **No benchmark score is claimed.** The integration adapter is ready to connect when the external benchmark environment is provided |

> [!IMPORTANT]
> MindSpace does **NOT** hardcode benchmark scenarios, expected answers, tool sequences, or test items. The adapter exercises general full-duplex agent capabilities.

---

## 2. Benchmark Architecture

```
Full-Duplex-Bench v3 Harness (External)
                 ↓ WebRTC / RPC
        FDBAdapter (src/fdb/FDBAdapter.ts)
                 ↓
      ToolRegistry (src/fdb/ToolRegistry.ts)
                 ↓
InterruptibleToolExecutor (src/fdb/InterruptibleToolExecutor.ts)
    ├── Idempotency Check (STATE_CHANGING protection)
    ├── In-flight AbortController
    ├── Argument Update Handler
    └── Pre-Commit Gate
                 ↓
FDBLogger (src/fdb/logger.ts)
    └── Sanitized JSONL Export (logs/fdb-v3/)
```

---

## 3. Running Benchmark Tests

### Automated Unit Test
To verify the FDB-v3 executor, idempotency, in-flight cancellation, argument updating, chained tools, and session isolation locally:

```bash
npm run test:fdb
```

### External Benchmark Runner Scripts
When the official Full-Duplex-Bench v3 environment is available:

**Python**:
```bash
python scripts/run-fdb-v3.py --host localhost --port 8080 --scenario all
```

**Bash**:
```bash
./scripts/run-fdb-v3.sh --scenario all
```

**PowerShell**:
```powershell
.\scripts\run-fdb-v3.ps1 -Scenario all
```

*(Note: The scripts validate the presence of the benchmark environment and report clear setup instructions if the harness is absent.)*
