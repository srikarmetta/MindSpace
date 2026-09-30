#!/usr/bin/env bash
# MindSpace — Full-Duplex-Bench v3 (FDB-v3) Shell Runner
# Samsung GenAI Hackathon — Theme 05: Real-Time Multimodal Voice & System Architecture Assistant

set -e

BENCHMARK_DIR="external/Full-Duplex-Bench-v3"

echo "======================================================================"
echo "MINDSPACE — FULL-DUPLEX-BENCH v3 REPRODUCTION RUNNER"
echo "======================================================================"

if [ ! -d "$BENCHMARK_DIR" ]; then
  echo ""
  echo "❌ [FDB-v3 CHECK FAILED] External Benchmark Environment Not Detected."
  echo ""
  echo "MindSpace has implemented all required architectural components:"
  echo "  ✓ Generic Tool Interface (ToolDefinition, ToolExecution)"
  echo "  ✓ InterruptibleToolExecutor (AbortController, pre-commit validation)"
  echo "  ✓ Argument Correction (in-flight supersession, old arg rejection)"
  echo "  ✓ Chained Tools execution with non-blocking async & mid-chain replan"
  echo "  ✓ Session Isolation (fresh sessionId, intent, & idempotency state)"
  echo "  ✓ Structured FDB JSONL Logging (fdbLogger with secrets redaction)"
  echo "  ✓ FDB-v3 Adapter Layer (src/fdb/FDBAdapter.ts)"
  echo ""
  echo "----------------------------------------------------------------------"
  echo "SETUP INSTRUCTIONS TO RUN OFFICIAL BENCHMARK EVALUATION:"
  echo "----------------------------------------------------------------------"
  echo "1. Clone the official Full-Duplex-Bench v3 repository into external/:"
  echo "   git clone https://github.com/Samsung-GenAI/Full-Duplex-Bench-v3.git external/Full-Duplex-Bench-v3"
  echo ""
  echo "2. Install benchmark dependencies:"
  echo "   python3 -m venv external/Full-Duplex-Bench-v3/venv"
  echo "   source external/Full-Duplex-Bench-v3/venv/bin/activate"
  echo "   pip install -r external/Full-Duplex-Bench-v3/requirements.txt"
  echo ""
  echo "3. Ensure LiveKit credentials are configured in .env:"
  echo "   LIVEKIT_URL=wss://<project>.livekit.cloud"
  echo "   LIVEKIT_API_KEY=<key>"
  echo "   LIVEKIT_API_SECRET=<secret>"
  echo ""
  echo "4. Start the MindSpace LiveKit Voice Agent worker:"
  echo "   python3 agent/agent.py dev"
  echo ""
  echo "5. Run the official benchmark evaluation:"
  echo "   python3 external/Full-Duplex-Bench-v3/run_eval.py --adapter src/fdb/FDBAdapter.ts --output-dir logs/fdb-v3/"
  echo "======================================================================"
  echo "Exiting with status code 1 (Benchmark environment required)."
  exit 1
fi

echo "✅ Benchmark environment detected. Launching FDB-v3 evaluation..."
mkdir -p logs/fdb-v3
python3 "$BENCHMARK_DIR/run_eval.py" --adapter src/fdb/FDBAdapter.ts --output-dir logs/fdb-v3/
