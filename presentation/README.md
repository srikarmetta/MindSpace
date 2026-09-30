# Presentation Slide Deck

This directory is designated for the Samsung PRISM GenAI Hackathon presentation file:
`MINDSPACE_PRISM_HACKATHON_2026.pptx`

### Presentation Outline
1. **Title & Tagline**: MindSpace — "Think out loud. Watch it evolve."
2. **Problem Statement**: Static diagram generators fail when requirements evolve; full-duplex conversational reasoning is needed.
3. **Core Innovation**: Decoupled immediate conversational responsiveness (<60ms) + progressive interruptible operation graph engine.
4. **Architecture**:
   - Ingress & Clients (Web Speech, LiveKit WebRTC, React UI)
   - Real-Time Full-Duplex Agent (Silero VAD, Intent Classification)
   - Dynamic Planning & Revision Engine (7 Pre-Commit Safety Gates, AbortController)
   - React Flow Live Graph (Dagre topological hierarchy)
5. **Extension Use Case**: 3-Stage Voice Storyline (Customer Support → Multi-Agent Pivot → Billing Database).
6. **Full-Duplex-Bench v3 Verification**: Idempotency, in-flight abort, argument updates, session isolation, zero hardcoded scenarios.
7. **Measured Hardware Telemetry**: Hardware timings via `performance.now()`.
8. **Summary & Impact**.
