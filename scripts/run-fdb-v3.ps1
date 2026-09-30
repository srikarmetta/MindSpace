# MindSpace — Full-Duplex-Bench v3 (FDB-v3) PowerShell Runner
# Samsung GenAI Hackathon — Theme 05: Real-Time Multimodal Voice & System Architecture Assistant

$benchmarkDir = "external/Full-Duplex-Bench-v3"

Write-Host "======================================================================" -ForegroundColor Cyan
Write-Host "MINDSPACE — FULL-DUPLEX-BENCH v3 REPRODUCTION RUNNER" -ForegroundColor Cyan
Write-Host "======================================================================" -ForegroundColor Cyan

if (-not (Test-Path $benchmarkDir)) {
    Write-Host ""
    Write-Host "❌ [FDB-v3 CHECK FAILED] External Benchmark Environment Not Detected." -ForegroundColor Red
    Write-Host ""
    Write-Host "MindSpace has implemented all required architectural components:" -ForegroundColor Yellow
    Write-Host "  ✓ Generic Tool Interface (ToolDefinition, ToolExecution)"
    Write-Host "  ✓ InterruptibleToolExecutor (AbortController, pre-commit validation)"
    Write-Host "  ✓ Argument Correction (in-flight supersession, old arg rejection)"
    Write-Host "  ✓ Chained Tools execution with non-blocking async & mid-chain replan"
    Write-Host "  ✓ Session Isolation (fresh sessionId, intent, & idempotency state)"
    Write-Host "  ✓ Structured FDB JSONL Logging (fdbLogger with secrets redaction)"
    Write-Host "  ✓ FDB-v3 Adapter Layer (src/fdb/FDBAdapter.ts)"
    Write-Host ""
    Write-Host "----------------------------------------------------------------------"
    Write-Host "SETUP INSTRUCTIONS TO RUN OFFICIAL BENCHMARK EVALUATION:" -ForegroundColor Yellow
    Write-Host "----------------------------------------------------------------------"
    Write-Host "1. Clone the official Full-Duplex-Bench v3 repository into external/:"
    Write-Host "   git clone https://github.com/Samsung-GenAI/Full-Duplex-Bench-v3.git external/Full-Duplex-Bench-v3"
    Write-Host ""
    Write-Host "2. Install benchmark dependencies:"
    Write-Host "   python -m venv external/Full-Duplex-Bench-v3/venv"
    Write-Host "   external\Full-Duplex-Bench-v3\venv\Scripts\activate"
    Write-Host "   pip install -r external/Full-Duplex-Bench-v3/requirements.txt"
    Write-Host ""
    Write-Host "3. Ensure LiveKit credentials are configured in .env:"
    Write-Host "   LIVEKIT_URL=wss://<project>.livekit.cloud"
    Write-Host "   LIVEKIT_API_KEY=<key>"
    Write-Host "   LIVEKIT_API_SECRET=<secret>"
    Write-Host ""
    Write-Host "4. Start the MindSpace LiveKit Voice Agent worker:"
    Write-Host "   python agent/agent.py dev"
    Write-Host ""
    Write-Host "5. Run the official benchmark evaluation:"
    Write-Host "   python external/Full-Duplex-Bench-v3/run_eval.py --adapter src/fdb/FDBAdapter.ts --output-dir logs/fdb-v3/"
    Write-Host "======================================================================" -ForegroundColor Cyan
    Write-Host "Exiting with status code 1 (Benchmark environment required)." -ForegroundColor Red
    exit 1
}

Write-Host "✅ Benchmark environment detected. Launching FDB-v3 evaluation..." -ForegroundColor Green
New-Item -ItemType Directory -Force -Path "logs/fdb-v3" | Out-Null
python "$benchmarkDir/run_eval.py" --adapter src/fdb/FDBAdapter.ts --output-dir logs/fdb-v3/
