# MindSpace
> **Think out loud. Watch it evolve.**

[![Samsung PRISM Hackathon 2026](https://img.shields.io/badge/Samsung%20PRISM%20Hackathon-Theme%2005%3A%20Voice%20%26%20Multimodal-blue?style=flat-square)](https://github.com)
[![Hackathon Tag](https://img.shields.io/badge/Tag-PRISM__GENAI__HACKATHON__Y2026-indigo?style=flat-square)](https://github.com)
[![License: MIT](https://img.shields.io/badge/License-MIT-emerald.svg?style=flat-square)](LICENSE)
[![Build Status](https://img.shields.io/badge/build-passing-brightgreen?style=flat-square)](https://github.com)
[![Lint Status](https://img.shields.io/badge/lint-0%20errors-brightgreen?style=flat-square)](https://github.com)

---

## 📑 Submission Information

- **Project Name:** MindSpace
- **Tagline:** *"Think out loud. Watch it evolve."*
- **Competition:** Samsung PRISM GenAI Hackathon 2026
- **Theme:** Theme 05 — Voice & Multimodal Full-Duplex Agents
- **Official Submission Tag:** `PRISM_GENAI_HACKATHON_Y2026`
- **📺 Demo Video:** [Link to Demo Video (YouTube / Google Drive) — *Placeholder to be populated*](https://youtube.com)
- **📑 Presentation (PPT):** [presentation/MINDSPACE_PRISM_HACKATHON_2026.pptx](presentation/README.md)

---

## Overview

MindSpace is a full-duplex, interruptible AI system architect that converts evolving user requirements into a live architecture graph.

Unlike static diagram tools or unidirectional code generators, MindSpace enables users to speak or type natural language requirements and watch the architecture take shape in real time. When requirements inevitably shift, users can interrupt mid-sentence or mid-build. MindSpace immediately acknowledges the change, halts stale in-flight work via cancellation tokens, and replans dynamically without corrupting valid upstream dependencies.

---

## Key Features

- **Voice-Driven Architecture Creation**: Natural-language architectural synthesis across clients, gateways, microservices, caches, message queues, and databases.
- **Real-Time Graph Updates**: Progressive, asynchronous node and edge construction powered by React Flow with automated deterministic topological layout.
- **Interruptible Execution**: Running operations can be aborted mid-flight using `AbortController` without race conditions or partial commits.
- **Intent Detection**: Classifies inputs into `NEW_REQUIREMENT`, `MODIFICATION`, `CORRECTION`, and `CANCELLATION`.
- **Replanning After User Corrections**: Minimal diff calculation to supersede obsolete components while preserving valid state.
- **Operation Cancellation**: In-flight operations transition from `RUNNING → INTERRUPTED → SUPERSEDED` cleanly.
- **Intent Supersession**: Stale intents are superseded; their downstream operations are prevented from committing.
- **Idempotent State-Changing Operations**: Deterministic idempotency keys (`intent:version:type:target`) protect against duplicate side effects.
- **Graph Versioning**: Immutable snapshot history (`v1`, `v2`, `v3...`) enabling point-in-time state restoration.
- **Dependency-Aware Invalidation**: Rewires incoming and outgoing edges dynamically when middle-tier components change.
- **Self-Correction Handling**: Directly accommodates prompts like *"Actually, replace Kafka with RabbitMQ"* or *"Change PostgreSQL to MongoDB"*.
- **Live Activity/Event Stream**: Real-time activity log tracking intent recognition, planning stages, operation transitions, and errors.
- **Typed & Voice Input**: Seamlessly switch between voice microphone input and typed text prompts with Enter / Shift+Enter keybindings.
- **LiveKit Voice Integration**: Production WebRTC audio transport using LiveKit Agents with Silero Voice Activity Detection (VAD).
- **Truthful Browser & Mock Fallbacks**:
  - `LiveKitVoiceProvider` when WebRTC credentials are configured.
  - `BrowserSpeechProvider` utilizing the browser's native Web Speech API (`SpeechRecognition`) for local microphone capture.
  - `MockVoiceProvider` for headless CI/CD, unit tests, and offline demo environments.
- **Full-Duplex-Bench v3 (FDB-v3) Adapter**: Standardized benchmark harness interface supporting chained tools, argument updates, and session isolation.

---

## Architecture

MindSpace coordinates voice transport, intent classification, revision analysis, interruptible execution, and live graph rendering:

```
User (Voice or Text Input)
        ↓
   Voice / Text Ingress (LiveKit WebRTC / Web Speech / Keyboard)
        ↓
   EventBridge Pipeline Coordinator
        ├── Immediate Vocal Acknowledgement (<60ms)
        ├── Hardware Latency Telemetry (performance.now)
        ↓
   Intent Manager
        ↓
   Change Detector
        ↓
   Revision Engine
        ↓
   Planner / Architecture Interpreter
        ↓
   Operation Scheduler (Idempotency Keying)
        ↓
   Interruptible Executor (AbortController + 7 Safety Gates)
        ↓
   Graph State (Zustand Immutable Store)
        ↓
   React Flow Canvas (Dagre Topological Layout)
```

### Benchmark Integration Architecture
The Full-Duplex-Bench v3 subsystem (`src/fdb/`) connects directly to the same `InterruptibleToolExecutor`:

```
External FDB-v3 Harness
        ↓ WebRTC / RPC
   FDBAdapter (Scenario Lifecycle & Tool Dispatch)
        ↓
   ToolRegistry (Dynamic Tool Definitions & Schemas)
        ↓
   InterruptibleToolExecutor (Cancellation, In-Flight Argument Updates, Idempotency)
        ↓
   FDBLogger (Sanitized JSONL Export to logs/fdb-v3/)
```

---

## Interruption Model

MindSpace operations transition through a deterministic finite state machine:

```
           ┌───────────┐
           │  PENDING  │
           └─────┬─────┘
                 │
        ┌────────┴────────┐
        ↓                 ↓
  ┌───────────┐     ┌────────────┐
  │  RUNNING  │     │ SUPERSEDED │
  └─────┬─────┘     └────────────┘
        │
  ┌─────┴───────────────┐
  ↓                     ↓
┌───────────┐     ┌─────────────┐
│ COMPLETED │     │ INTERRUPTED │
└───────────┘     └──────┬──────┘
                         │
                         ↓
                  ┌────────────┐
                  │ SUPERSEDED │
                  └────────────┘
```

### Valid Transitions
- `PENDING → RUNNING → COMPLETED` (Normal lifecycle)
- `PENDING → SUPERSEDED` (Cancelled before dispatch)
- `RUNNING → INTERRUPTED → SUPERSEDED` (Interrupted mid-flight)
- `COMPLETED → SUPERSEDED` (Obsoleted by subsequent revision)

### Preventing Stale Mutations: The 7 Pre-Commit Safety Gates
Before any operation commits a mutation to the graph store, it must pass 7 invariant validation checks in [`operationEngine.ts`](src/engine/operationEngine.ts):
1. **Existence**: Operation is registered in active pool.
2. **Status**: Status is strictly `RUNNING`.
3. **Signal**: `AbortSignal.aborted === false`.
4. **Intent Currency**: Operation's `intentId` matches the currently active intent.
5. **Idempotency**: Idempotency key has not committed in this version.
6. **Supersession**: Operation has not been marked `SUPERSEDED`.
7. **Base Version**: Graph version matches the version when the operation was planned.

---

## Voice Flow & Truthful Providers

```
Microphone
    ↓
Voice Provider Layer (Truthful Hierarchy)
    ├── LiveKitVoiceProvider    (if VITE_LIVEKIT_URL configured)
    ├── BrowserSpeechProvider   (if Web Speech API supported in browser)
    └── MockVoiceProvider      (DEMO MODE offline fallback)
    ↓
Transcript Received
    ↓
Input Field Review (User can review & edit before sending)
    ↓
submitRequirement(text) [Canonical Entry Point]
    ├── Immediate Conversational Ack (<60ms)
    ├── Intent Detection
    ├── Planning / Revision
    ├── Interruptible Operation Execution
    └── Graph Update & Completion Confirmation
```

MindSpace strictly adheres to a **"No False Done"** policy: verbal completion confirmation is only uttered after all operations have passed safety gates and committed to the store.

---

## Tech Stack

All dependencies are verified from [`package.json`](package.json):

- **UI & Framework**: React 19 (`react`, `react-dom`)
- **Language**: TypeScript 6 (`typescript`, `tsx`)
- **Build Tool**: Vite 8 (`vite`, `@vitejs/plugin-react`)
- **Graph Canvas**: React Flow (`@xyflow/react`)
- **State Management**: Zustand 5 (`zustand`)
- **Graph Layout**: Dagre (`@dagrejs/dagre`, `@types/dagre`)
- **Styling**: Tailwind CSS (`tailwindcss`, `postcss`, `autoprefixer`, `tailwind-merge`, `clsx`)
- **Icons**: Lucide React (`lucide-react`)
- **Voice / WebRTC**: LiveKit Agents Python SDK (`livekit-agents`, `livekit-plugins-silero`)
- **Linter**: Oxlint (`oxlint`)

---

## Getting Started

### Prerequisites
- Node.js (v18+ recommended)
- npm (v9+)
- Python 3.10+ (optional, only needed for LiveKit agent worker)

### 1. Clone & Install
```bash
git clone <repository-url>
cd mindspace
npm install
```

### 2. Start Development Server
```bash
npm run dev
```
Open `http://localhost:5173` in your browser.

### 3. Build for Production
```bash
npm run build
```

### 4. Run Linter
```bash
npm run lint
```

---

## Environment Variables

MindSpace includes a template configuration in [`.env.example`](.env.example):

```bash
cp .env.example .env
```

| Variable | Description | Default / Fallback |
|---|---|---|
| `VITE_LIVEKIT_URL` | LiveKit Server WebRTC WebSocket URL | Unset (falls back to Browser Web Speech or Mock) |
| `LIVEKIT_URL` | Server-side LiveKit URL for Python agent | `wss://your-project.livekit.cloud` |
| `LIVEKIT_API_KEY` | LiveKit Cloud API Key | Unset |
| `LIVEKIT_API_SECRET` | LiveKit Cloud API Secret | Unset |
| `OPENAI_API_KEY` | Model API key for LiveKit agent LLM | Unset |
| `DEEPGRAM_API_KEY` | Deepgram STT key for LiveKit agent | Unset |
| `VITE_VOICE_MODE` | Force voice mode (`'livekit'`, `'mock'`) | Auto-detected |

*(Note: MindSpace runs completely offline in DEMO MODE without any external API keys).*

---

## Working Demonstration

### Demonstration: Social Media Platform & Mid-Flight Interruption

#### 1. Initial Architecture
Type or speak:
> *"Design a real-time social media platform with a mobile app, API gateway, authentication service, user service, post service, media storage, Redis cache, notification service, Kafka, and PostgreSQL."*

**Result**: MindSpace synthesizes a 10-node, 9-edge architecture across 6 tiers (User → Gateway → Services → Cache/Queue → Storage/DB).

#### 2. Mid-Flight Interruption & Replacement
While running or after completion, enter:
> *"Actually, replace Kafka with RabbitMQ and add a recommendation service that uses the post service data."*

**Result**:
- In-flight Kafka operations are aborted via `AbortController`.
- Stale Kafka work is marked `SUPERSEDED`.
- RabbitMQ becomes current and incident links are rewired.
- Recommendation Service is deployed and connected to Post Service and Redis.
- Unrelated valid architecture (Mobile App, Auth, User, Media Storage, PostgreSQL) is **fully preserved**.

#### 3. Targeted Dependency Correction
Enter:
> *"The recommendation service should use MongoDB instead of PostgreSQL."*

**Result**:
- Dedicated MongoDB node is added.
- The link from Recommendation Service is rewired from PostgreSQL to MongoDB.
- Global transactional PostgreSQL remains intact.
- Graph version increments cleanly.

---

## Testing

MindSpace features automated test suites covering all architectural layers:

```bash
# Run all test suites sequentially
npm run test:all

# Run specific test suites
npm run test:generic   # Arbitrary NL architectures & generic revisions
npm run test:food      # Food delivery build + visual interruption
npm run test:demo      # Official 3-stage extension demo
npm run test:voice     # Voice engine, conversational ack & telemetry
npm run test:fdb       # Full-Duplex-Bench v3 tool executor & adapter
```

### What is Tested
- **Operation Application**: Atomic node and edge creation with topological coordinates.
- **Idempotency**: Duplicate state-changing requests are rejected with zero side-effects.
- **Cancellation**: `AbortController` halts active operations immediately.
- **Stale Operation Rejection**: Pre-commit gates prevent superseded operations from writing to state.
- **Intent Supersession**: Stale intent operations cannot commit.
- **Version Validation**: Operations planned against outdated versions are blocked.
- **Self-Correction**: Replace, remove, add, and connect revisions execute dynamically.
- **Chained Operations**: Multi-step tool chains with mid-chain cancellation.
- **Session Isolation**: Complete state reset between scenario sessions.

---

## Full-Duplex-Bench v3 (FDB-v3)

MindSpace includes a native integration adapter for the **Full-Duplex-Bench v3** evaluation standard.

### Compliance Status
- **`IMPLEMENTED`**:
  - Generic tool interface (`ToolDefinition`, `ToolExecution`).
  - `InterruptibleToolExecutor` with in-flight cancellation via `AbortController`.
  - In-flight argument correction without ghost commits.
  - Chained tool execution with mid-chain interruption.
  - Per-scenario session isolation (`resetSession`).
  - Structured JSONL logging with automatic secrets redaction (`logs/fdb-v3/`).
  - Reproduction scripts: `scripts/run-fdb-v3.py`, `scripts/run-fdb-v3.sh`, `scripts/run-fdb-v3.ps1`.
- **`REQUIRES EXTERNAL BENCHMARK ENVIRONMENT`**:
  - Official Full-Duplex-Bench v3 test runner and evaluation dataset must be provided externally.
- **`NOT YET RUN`**:
  - **No benchmark score is claimed.** The adapter is fully verified via unit tests (`npm run test:fdb`) and ready for external harness evaluation.

---

## Limitations

- **Browser Speech Recognition**: Web Speech API is supported in modern Chromium/Safari browsers. In unsupported browsers, MindSpace falls back gracefully to `MockVoiceProvider` with simulation chips.
- **LiveKit Credentials**: WebRTC voice mode requires valid `LIVEKIT_URL`, `LIVEKIT_API_KEY`, and `LIVEKIT_API_SECRET`.
- **Microphone Permissions**: The browser will request microphone access when voice capture is activated.
- **External Benchmark**: Running official FDB-v3 scenarios requires the external benchmark harness environment.

---

## Documentation

Comprehensive technical documentation is available in the [`docs/`](docs/) directory:

- [`docs/architecture.md`](docs/architecture.md): Deep-dive system architecture and data flow.
- [`docs/interruption-model.md`](docs/interruption-model.md): Operation state machine and 7 pre-commit safety gates.
- [`docs/operation-lifecycle.md`](docs/operation-lifecycle.md): Atomic operations, idempotency keys, and layout sequence.
- [`docs/benchmark-integration.md`](docs/benchmark-integration.md): Full-Duplex-Bench v3 integration specification.
- [`docs/demo-script.md`](docs/demo-script.md): Interactive demo walkthroughs and expected behaviors.

---

## License

This project is licensed under the **MIT License** — see the [LICENSE](LICENSE) file for details.
