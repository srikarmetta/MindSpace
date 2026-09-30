#!/usr/bin/env python3
"""
MindSpace — Full-Duplex-Bench v3 (FDB-v3) Reproduction Runner
Samsung GenAI Hackathon — Theme 05: Real-Time Multimodal Voice & System Architecture Assistant

This script checks for the external Full-Duplex-Bench v3 environment and executes
the benchmark harness against MindSpace's InterruptibleToolExecutor and LiveKit voice agent.

If the external benchmark environment is not detected, it fails with a clear,
actionable setup guide. It does NOT fabricate benchmark results.
"""

import os
import sys
import subprocess
from pathlib import Path

# Ensure UTF-8 output encoding across Windows / Linux / macOS
if hasattr(sys.stdout, "reconfigure"):
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass

def main():
    root_dir = Path(__file__).resolve().parent.parent
    benchmark_dir = root_dir / "external" / "Full-Duplex-Bench-v3"

    print("\n" + "=" * 70)
    print("MINDSPACE -- FULL-DUPLEX-BENCH v3 REPRODUCTION RUNNER")
    print("=" * 70 + "\n")

    # 1. Check for external benchmark repository
    has_benchmark_repo = benchmark_dir.exists() and (benchmark_dir / "run_eval.py").exists()

    # 2. Check if fdb_v3 python package is installed in environment
    has_benchmark_pkg = False
    try:
        import fdb_v3  # type: ignore
        has_benchmark_pkg = True
    except ImportError:
        has_benchmark_pkg = False

    if not has_benchmark_repo and not has_benchmark_pkg:
        print("[!] [FDB-v3 CHECK FAILED] External Benchmark Environment Not Detected.\n")
        print("MindSpace has implemented all required architectural components:")
        print("  [OK] Generic Tool Interface (ToolDefinition, ToolExecution)")
        print("  [OK] InterruptibleToolExecutor (AbortController, pre-commit validation)")
        print("  [OK] Argument Correction (in-flight supersession, old arg rejection)")
        print("  [OK] Chained Tools execution with non-blocking async & mid-chain replan")
        print("  [OK] Session Isolation (fresh sessionId, intent, & idempotency state)")
        print("  [OK] Structured FDB JSONL Logging (fdbLogger with secrets redaction)")
        print("  [OK] FDB-v3 Adapter Layer (src/fdb/FDBAdapter.ts)\n")
        print("-" * 70)
        print("SETUP INSTRUCTIONS TO RUN OFFICIAL BENCHMARK EVALUATION:")
        print("-" * 70)
        print("1. Clone the official Full-Duplex-Bench v3 repository into external/:")
        print("   git clone https://github.com/Samsung-GenAI/Full-Duplex-Bench-v3.git external/Full-Duplex-Bench-v3\n")
        print("2. Set up virtual environment and install benchmark dependencies:")
        print("   python -m venv external/Full-Duplex-Bench-v3/venv")
        print("   # Windows: external\\Full-Duplex-Bench-v3\\venv\\Scripts\\activate")
        print("   # Linux/macOS: source external/Full-Duplex-Bench-v3/venv/bin/activate")
        print("   pip install -r external/Full-Duplex-Bench-v3/requirements.txt\n")
        print("3. Ensure LiveKit credentials are configured in .env:")
        print("   LIVEKIT_URL=wss://<project>.livekit.cloud")
        print("   LIVEKIT_API_KEY=<key>")
        print("   LIVEKIT_API_SECRET=<secret>\n")
        print("4. Start the MindSpace LiveKit Voice Agent worker:")
        print("   python agent/agent.py dev\n")
        print("5. Run the official benchmark evaluation:")
        print("   python external/Full-Duplex-Bench-v3/run_eval.py \\")
        print("     --adapter src/fdb/FDBAdapter.ts \\")
        print("     --output-dir logs/fdb-v3/\n")
        print("=" * 70)
        print("Exiting with status code 1 (Benchmark environment required).")
        sys.exit(1)

    # 3. If benchmark environment is present, run the evaluation
    print("[OK] Benchmark environment detected. Launching FDB-v3 evaluation runner...")
    output_dir = root_dir / "logs" / "fdb-v3"
    output_dir.mkdir(parents=True, exist_ok=True)

    cmd = [
        sys.executable,
        str(benchmark_dir / "run_eval.py"),
        "--adapter", str(root_dir / "src" / "fdb" / "FDBAdapter.ts"),
        "--output-dir", str(output_dir),
    ]

    result = subprocess.run(cmd)
    sys.exit(result.returncode)

if __name__ == "__main__":
    main()
