# MindSpace System Architecture

> **"Think out loud. Watch it evolve."**

MindSpace is a full-duplex, interruptible AI system architect that converts evolving user requirements into a live architecture graph.

---

## High-Level Pipeline

```mermaid
flowchart TD
    User["User (Voice / Text)"] --> Ingress["Ingress Layer (LiveKit WebRTC / Web Speech / Input)"]
    Ingress --> EventBridge["EventBridge Pipeline Coordinator"]
    
    subgraph Conversational_Layer ["Conversational Decoupling (<60ms)"]
        EventBridge --> ImmediateAck["Immediate Conversational Ack"]
        EventBridge --> LatencyTracker["Hardware Latency Telemetry (performance.now)"]
    end

    subgraph Intent_and_Revision ["Intent & Revision Engine"]
        EventBridge --> IntentManager["IntentManager (Type & Role Classification)"]
        IntentManager --> ChangeDetector["Change Detector & Pre-Commit Validator"]
        ChangeDetector --> RevisionEngine["RevisionEngine (Differential Analysis)"]
        RevisionEngine --> ArchitectureInterpreter["ArchitectureInterpreter (6-Tier NLP Parser)"]
    end

    subgraph Operation_Engine ["Interruptible Operation Engine"]
        ArchitectureInterpreter --> OperationScheduler["Operation Scheduler (Idempotency Keying)"]
        OperationScheduler --> OperationExecutor["Interruptible Executor (AbortController)"]
        OperationExecutor --> PreCommitGate["7 Pre-Commit Safety Gates"]
    end

    subgraph Graph_and_UI ["Live Graph & Visualization"]
        PreCommitGate --> GraphState["Zustand Graph State (Versioned Store)"]
        GraphState --> LayoutEngine["Dagre Layout Engine (Finite Coordinates)"]
        LayoutEngine --> ReactFlowUI["React Flow Interactive Canvas"]
        PreCommitGate --> InterruptionHUD["Visual Interruption HUD"]
        PreCommitGate --> ActivityStream["Live Activity Stream"]
    end

    subgraph Benchmark_Subsystem ["Full-Duplex-Bench v3 Subsystem"]
        FDBAdapter["FDB Adapter (Session Isolated)"] --> InterruptibleToolExecutor["InterruptibleToolExecutor"]
        InterruptibleToolExecutor --> PreCommitGate
    end
```

---

## Core Components

### 1. Ingress & Voice Abstraction Layer
- **`LiveKitVoiceProvider`**: Production WebRTC audio transport using LiveKit Agents.
- **`BrowserSpeechProvider`**: Native browser Web Speech API (`webkitSpeechRecognition` / `SpeechRecognition`) enabling in-browser voice input without external cloud credentials.
- **`MockVoiceProvider`**: Offline fallback for testing, automated grading, and headless environments.
- **`EventBridge`**: Coordinates speech start, interim transcripts, intent detection, and completion confirmation utterances without false completion calls.

### 2. Conversational Decoupling
- Emits immediate vocal acknowledgements (e.g. *"Got it — mapping that now."*, *"Understood, pivoting the architecture now."*) within <60ms.
- Separates conversational naturalness from heavy layout calculations and asynchronous operation execution.

### 3. Intent Detection & Revision Engine
- Detects intent type: `NEW_REQUIREMENT`, `MODIFICATION`, `CORRECTION`, `CANCELLATION`.
- **`ArchitectureInterpreter`**: Classifies requirements into 6 architectural tiers (`user`, `api`, `service`, `database`, `cache`, `queue`, `storage`, `agent`, `generic`) and builds connected DAGs.
- **`RevisionEngine`**: Evaluates new requirements against current topology. Supersedes stale components, preserves valid dependencies, and rewires topological connections.

### 4. Interruptible Operation Executor
- Executes operations (`ADD_NODE`, `ADD_EDGE`, `SUPERSEDE_NODE`, `SUPERSEDE_EDGE`) with `AbortController` cancellation tokens.
- Validates 7 pre-commit safety invariants before mutating state.

### 5. Zustand Graph Store & React Flow Canvas
- Centralized reactive store managing versioning (`v1`, `v2`, `v3...`), snapshots, and active operations.
- Renders through `@xyflow/react` with custom styled `ArchitectureNode` components and dynamic theme palettes.

### 6. Full-Duplex-Bench v3 (FDB-v3) Integration
- Connects benchmark tool calls directly to the same interruptible executor.
- Guarantees idempotency, in-flight argument correction, chained execution, and complete cross-scenario session isolation.
