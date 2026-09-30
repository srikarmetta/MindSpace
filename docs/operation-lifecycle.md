# MindSpace Operation Lifecycle & Graph Mutations

This document details how graph operations are generated, scheduled, executed, and rendered across the MindSpace pipeline.

---

## 1. Supported Operation Types

All graph modifications occur via atomic, typed operations:

| Operation Type | Purpose | Target Entity |
|---|---|---|
| `ADD_NODE` | Provisions a new node into the graph topology | `GraphNode` (`user`, `api`, `service`, `database`, `cache`, `queue`, `storage`, `agent`) |
| `ADD_EDGE` | Establishes a directional connection between nodes | `GraphEdge` (with semantic label e.g. `"gRPC Route"`, `"HTTPS / REST"`) |
| `SUPERSEDE_NODE` | Marks an existing node as deprecated/superseded | Target Node ID |
| `SUPERSEDE_EDGE` | Deprecates an edge incident to a superseded node | Target Edge ID |
| `UPDATE_NODE` | Modifies properties (label, metadata, status) of a node | Target Node ID + partial data |

---

## 2. Idempotency Key Structure

Every operation receives a deterministic idempotency key to prevent duplicate execution:

```typescript
idempotencyKey = `${intent.id}:${baseVersion}:${type}:${targetKey}`
```

- `intent.id`: Scopes the operation to the originating requirement.
- `baseVersion`: Ensures the operation was calculated against the correct snapshot version.
- `type`: Operation verb (`ADD_NODE`, `ADD_EDGE`, etc.).
- `targetKey`: Entity ID or unique target identifier.

If an operation with the same idempotency key attempts to execute twice within the same version, the executor discards the duplicate with zero side-effects.

---

## 3. End-to-End Execution Sequence

```
1. Intent Detected
   ↓
2. Architecture Planned (ArchitectureInterpreter / RevisionEngine)
   ↓ Operations generated with PENDING status
3. Progressive Dispatch (OperationExecutor)
   ├── Status transitioned to RUNNING
   ├── UI highlights active node/edge with pulsating border
   ├── Latency timer active
4. Pre-Commit Validation Gate
   ├── Validate signal, status, version, idempotency, intent currency
5. State Mutation Commit
   ├── Status transitioned to COMPLETED
   ├── Node added to Zustand nodes array
   ├── Graph version incremented (e.g. v1 → v2)
   ├── Activity logged to Event Stream
6. Canvas Layout Engine (Dagre)
   ├── Computes valid non-NaN coordinates (left-to-right hierarchy)
   ├── React Flow renders updated topology
```

---

## 4. Visual Node Statuses in UI

Nodes display distinct visual states on the React Flow canvas:

- **`pending`**: Rendered with subtle dashed border; awaiting executor dispatch.
- **`running`**: Glowing pulsating cyan/amber outline; actively provisioning.
- **`completed`**: Solid themed border matching node type color (emerald, cyan, violet, amber).
- **`superseded`**: Faded opacity (0.35), strike-through label, deprecation badge.
- **`interrupted`**: Warning badge indicating operation was halted mid-flight.
