# MindSpace Interactive Demo Scripts

This guide walks through the working demonstrations included with MindSpace.

---

## Demo 1: Full-Duplex Architecture Synthesis & Mid-Flight Interruption

### Step 1: Complex Initial Requirement
**Prompt:**
> *"Design a real-time social media platform with a mobile app, API gateway, authentication service, user service, post service, media storage, Redis cache, notification service, Kafka, and PostgreSQL."*

**Expected Behavior:**
1. MindSpace emits immediate verbal acknowledgement: *"Got it — synthesizing your architecture."*
2. Canvas renders progressive node deployment across 6 tiers:
   - Mobile App (`user`)
   - API Gateway (`api`)
   - Auth Service, User Service, Post Service, Notification Service (`service`)
   - Redis (`cache`)
   - Kafka (`queue`)
   - Media Storage (`storage`)
   - PostgreSQL (`database`)
3. Directed edges are synthesized reflecting REST ingress, cache reading, and event streaming.

---

### Step 2: Mid-Flight Interruption & Replacement
While operations are executing or completed, interrupt:
**Prompt:**
> *"Actually, replace Kafka with RabbitMQ and add a recommendation service that uses the post service data."*

**Expected Behavior:**
1. MindSpace immediately acknowledges: *"Understood, pivoting the architecture now."*
2. Interruption HUD transitions: `USER_INTERRUPTED` → `STALE_PLAN` → `REPLANNING`.
3. In-flight operations for Kafka are aborted via `AbortController`.
4. Kafka node is marked `SUPERSEDED` (faded opacity, strike-through badge).
5. Incident edges to Kafka are deprecated.
6. RabbitMQ node is deployed and incident links are rewired.
7. Recommendation Service is added and connected to Post Service and Redis.
8. Unrelated valid nodes (Mobile App, Auth, User, Storage, Postgres) are **preserved**.

---

### Step 3: Targeted Dependency Correction
**Prompt:**
> *"The recommendation service should use MongoDB instead of PostgreSQL."*

**Expected Behavior:**
1. MindSpace acknowledges: *"Understood, updating database configuration."*
2. MongoDB database node is provisioned.
3. The link from Recommendation Service to PostgreSQL is rewired to MongoDB.
4. Core transactional PostgreSQL database remains untouched for the rest of the system.
5. Graph version increments cleanly.

---

## Demo 2: Official 3-Stage Storyline (Samsung Theme 05)

In the top header bar, click **`▶ Run 60s Demo`** to watch the automated 60-90s vocal demonstration:

1. **Stage 1 (0–3s)**: *"I'm building an AI customer support system."*  
   → Builds `User → Support Agent → RAG → Knowledge Base`.
2. **Stage 2 (3–15s)**: Interrupted mid-flight with *"Actually, make it multi-agent."*  
   → Cancels `Support Agent`, preserves valid state, replans to `Agent Router → Sales, Billing, Technical Agents`.
3. **Stage 3 (16–25s)**: *"Billing should have its own database."*  
   → Attaches dedicated `Billing Database` to `Billing Agent`.

---

## Demo 3: Food Delivery Platform Build

1. Click **`Build Example`** in the top navigation or type:
   > *"Build a real-time food delivery platform"*
2. Live build progressively provisions:
   `Customer App → API Gateway → Order Service → Restaurant Service, Payment Service, Kafka → Delivery Service → PostgreSQL`.
3. Click **`Use RabbitMQ ⚡`** or speak *"Actually, use RabbitMQ instead of Kafka"* to witness live message broker replacement and downstream rewiring.
