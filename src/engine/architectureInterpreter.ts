import type { GraphNode, GraphEdge, NodeType } from '../types/graph';
import type { GraphOperation } from '../types/operations';
import type { Intent } from '../types/intent';

export interface ExtractedComponent {
  id: string;
  label: string;
  type: NodeType;
  layer: number; // 0: client, 1: gateway, 2: core service, 3: middleware, 4: worker, 5: persistence
  isWorker?: boolean;
  description: string;
  roleHint?: string;
}

export interface InterpretedArchitecture {
  systemTitle: string;
  nodes: GraphNode[];
  edges: GraphEdge[];
  summary: string;
}

/**
 * ArchitectureInterpreter:
 * Interprets arbitrary natural language system descriptions into typed,
 * connected, layered architecture graphs.
 */
export class ArchitectureInterpreter {
  /**
   * Main entry point:
   * Parses arbitrary user prompt and generates progressive GraphOperations.
   */
  public static interpret(
    intent: Intent,
    _baseVersion: number,
    createOp: (
      type: GraphOperation['type'],
      desc: string,
      targetKey: string,
      data: { node?: GraphNode; edge?: GraphEdge }
    ) => GraphOperation
  ): { operations: GraphOperation[]; summary: string } {
    const rawText = intent.text.trim();
    const parsed = this.parseArchitecture(rawText);

    const operations: GraphOperation[] = [];

    // Progressive construction: Add nodes first by layer, then add connecting edges
    const sortedNodes = [...parsed.nodes].sort((a, b) => {
      const posA = a.position?.x ?? 0;
      const posB = b.position?.x ?? 0;
      return posA - posB;
    });

    // 1. Add Nodes
    sortedNodes.forEach((node) => {
      operations.push(
        createOp(
          'ADD_NODE',
          `Deploy ${node.label} (${node.type.toUpperCase()})`,
          node.id,
          { node }
        )
      );
    });

    // 2. Add Edges
    parsed.edges.forEach((edge) => {
      const srcNode = parsed.nodes.find((n) => n.id === edge.source);
      const tgtNode = parsed.nodes.find((n) => n.id === edge.target);
      const srcLabel = srcNode ? srcNode.label : edge.source;
      const tgtLabel = tgtNode ? tgtNode.label : edge.target;

      operations.push(
        createOp(
          'ADD_EDGE',
          `Connect ${srcLabel} → ${tgtLabel} (${edge.label || 'Link'})`,
          edge.id,
          { edge }
        )
      );
    });

    return {
      operations,
      summary: parsed.summary,
    };
  }

  /**
   * Parses arbitrary system description into nodes, edges, and summary.
   */
  public static parseArchitecture(prompt: string): InterpretedArchitecture {
    const lower = prompt.toLowerCase();

    // 1. Extract System Title (e.g. "Video Streaming Platform", "Ride Sharing System")
    const systemTitle = this.extractSystemTitle(prompt);

    // 2. Extract Candidate Component Strings
    const componentStrings = this.extractComponentStrings(prompt);

    // 3. Classify and Construct Nodes
    const extractedComponents: ExtractedComponent[] = [];
    componentStrings.forEach((str) => {
      const comp = this.classifyComponent(str);
      if (comp && !extractedComponents.some((c) => c.id === comp.id)) {
        extractedComponents.push(comp);
      }
    });

    // If no client (Layer 0) was provided, add a default client node
    const hasClient = extractedComponents.some((c) => c.layer === 0);
    if (!hasClient && extractedComponents.length > 0) {
      extractedComponents.unshift({
        id: 'node-client-user',
        label: 'User',
        type: 'user',
        layer: 0,
        description: 'End-user client touchpoint',
      });
    }

    // Convert ExtractedComponents to GraphNodes
    const nodes: GraphNode[] = extractedComponents.map((c) => ({
      id: c.id,
      type: c.type,
      label: c.label,
      description: c.description,
      status: 'pending',
    }));

    // 4. Synthesize Relationships & Edges
    const edges = this.deduceRelationships(extractedComponents, lower);

    const summary = `Synthesized ${systemTitle} architecture with ${nodes.length} nodes and ${edges.length} connections.`;

    return {
      systemTitle,
      nodes,
      edges,
      summary,
    };
  }

  /**
   * Extracts clean system title from prompt.
   */
  private static extractSystemTitle(prompt: string): string {
    const match = prompt.match(
      /(?:build|design|create|architect|implement|setup|draw)?\s*(?:a|an)?\s*([a-z0-9\s-]+?)(?:\s+with|\s+consisting|\s+featuring|\s+using|:|,|$)/i
    );
    if (match && match[1]?.trim() && match[1].trim().length > 3) {
      const raw = match[1].trim();
      return this.toTitleCase(raw);
    }
    return 'Custom Distributed System';
  }

  /**
   * Splits arbitrary prompt into discrete component phrases.
   */
  private static extractComponentStrings(prompt: string): string[] {
    // Clean leading system prefix
    let clean = prompt.replace(
      /^(?:build|design|create|architect|implement|setup|draw|generate)?\s*(?:a|an|the)?\s*([a-z0-9\s-]+?)(?:\s+with|\s+consisting of|\s+featuring|\s+using|:)\s*/i,
      ''
    );

    // If string still has leading "a " or "an "
    clean = clean.replace(/^(?:a|an|the)\s+/i, '');

    // Split on delimiters: commas, semicolons, " and ", " with ", " plus ", " along with "
    const tokens = clean
      .split(/(?:,|\band\b|;|\bwith\b|\bplus\b|\balong with\b|\bincluding\b)/i)
      .map((t) => t.trim())
      .filter((t) => t.length > 1);

    // Clean leading articles & noise words from individual tokens
    return tokens
      .map((t) => t.replace(/^(?:a|an|the|its|own)\s+/i, '').trim())
      .filter((t) => {
        const l = t.toLowerCase();
        return (
          l !== 'system' &&
          l !== 'platform' &&
          l !== 'backend' &&
          l !== 'architecture' &&
          l !== 'app' &&
          l !== 'application' &&
          l.length > 1
        );
      });
  }

  /**
   * Classifies an individual component token into typed architectural entity.
   */
  public static classifyComponent(raw: string): ExtractedComponent | null {
    const trimmed = raw.trim();
    if (!trimmed) return null;
    const lower = trimmed.toLowerCase();

    // Check for technological qualification: e.g. "shopping cart in redis", "geolocation cache in redis", "order queue in kafka"
    let techQual = '';
    let baseName = trimmed;
    const inMatch = trimmed.match(/^(.+?)\s+(?:in|using|via|on)\s+([a-z0-9\-_]+)$/i);
    if (inMatch) {
      baseName = inMatch[1].trim();
      techQual = inMatch[2].trim();
    }

    // 1. CLIENT / USER (Layer 0)
    if (
      /\b(user|customer|passenger|passenger app|driver|driver app|client|customer app|mobile client|mobile app|web app|web client|portal|customer portal|buyer|seller|touchpoint|frontend|ios app|android app)\b/i.test(
        lower
      )
    ) {
      const label = this.formatLabel(baseName, techQual);
      return {
        id: this.slugify(label),
        label,
        type: 'user',
        layer: 0,
        description: 'Client touchpoint and user interaction interface',
      };
    }

    // 2. API GATEWAY / INGRESS (Layer 1)
    if (
      /\b(api gateway|graphql gateway|gateway|ingress|reverse proxy|load balancer|kong|envoy|traefik|api service)\b/i.test(
        lower
      )
    ) {
      const label = this.formatLabel(baseName, techQual);
      return {
        id: this.slugify(label),
        label,
        type: 'api',
        layer: 1,
        description: 'API ingress, rate limiting & request routing',
      };
    }

    // 3. CACHE (Layer 3)
    if (
      /\b(redis|memcached|cache|in-memory|caching|geolocation cache|key-value)\b/i.test(
        lower
      ) ||
      techQual.toLowerCase().includes('redis') ||
      techQual.toLowerCase().includes('memcached')
    ) {
      let label = this.formatLabel(baseName, techQual);
      if (!label.toLowerCase().includes('redis') && !label.toLowerCase().includes('cache')) {
        label += ' (Cache)';
      }
      return {
        id: this.slugify(label),
        label,
        type: 'cache',
        layer: 3,
        description: 'Low-latency in-memory cache & ephemeral store',
      };
    }

    // 4. QUEUE / EVENT STREAM (Layer 3)
    if (
      /\b(kafka|rabbitmq|sqs|event bus|message queue|pubsub|queue|event stream|order queue|notification queue|event log|nats|pulsar)\b/i.test(
        lower
      ) ||
      techQual.toLowerCase().includes('kafka') ||
      techQual.toLowerCase().includes('rabbitmq')
    ) {
      let label = this.formatLabel(baseName, techQual);
      if (!label.toLowerCase().includes('queue') && !label.toLowerCase().includes('kafka') && !label.toLowerCase().includes('rabbitmq') && !label.toLowerCase().includes('bus')) {
        label += ' Queue';
      }
      return {
        id: this.slugify(label),
        label,
        type: 'queue',
        layer: 3,
        description: 'Decoupled asynchronous message broker & event queue',
      };
    }

    // 5. STORAGE / OBJECT STORE (Layer 5)
    if (
      /\b(s3|storage|blob storage|object storage|minio|gcs|bucket|blob|file storage|cdn|cloudfront)\b/i.test(
        lower
      ) ||
      techQual.toLowerCase().includes('s3')
    ) {
      let label = this.formatLabel(baseName, techQual);
      if (lower === 's3') label = 'S3 Storage';
      return {
        id: this.slugify(label),
        label,
        type: 'storage',
        layer: 5,
        description: 'Scalable cloud object storage & media bucket',
      };
    }

    // 6. DATABASE (Layer 5)
    if (
      /\b(postgresql|postgres|mysql|mongodb|dynamodb|dynamo|sqlite|cassandra|neo4j|couchbase|mariadb|cockroachdb|database|relational db|sql db|db|datastore|ledger|vector db|qdrant|chroma|pinecone)\b/i.test(
        lower
      ) ||
      techQual.toLowerCase().includes('postgres') ||
      techQual.toLowerCase().includes('sql') ||
      techQual.toLowerCase().includes('mongo')
    ) {
      let label = this.formatLabel(baseName, techQual);
      if (lower === 'cassandra') label = 'Cassandra DB';
      if (lower === 'neo4j') label = 'Neo4j Graph DB';
      if (lower === 'postgres' || lower === 'postgresql') label = 'PostgreSQL Database';
      if (lower === 'database' || lower === 'db') label = 'Primary Database';
      return {
        id: this.slugify(label),
        label,
        type: 'database',
        layer: 5,
        description: 'Persistent ACID data store & query engine',
      };
    }

    // 7. AGENT (Layer 2 or Layer 1)
    if (/\b(agent|agent router|sales agent|billing agent|technical agent|support agent|ai agent|llm)\b/i.test(lower)) {
      const label = this.formatLabel(baseName, techQual);
      return {
        id: this.slugify(label),
        label,
        type: 'agent',
        layer: lower.includes('router') ? 1 : 2,
        description: 'Autonomous LLM agent orchestrator',
      };
    }

    // 8. BACKGROUND WORKER / PROCESSOR (Layer 4)
    if (
      /\b(worker|transcoder|processor|consumer|audit worker|notification worker|compliance audit worker|cron worker|transcoder worker)\b/i.test(
        lower
      )
    ) {
      let label = this.formatLabel(baseName, techQual);
      if (!label.toLowerCase().includes('worker') && !label.toLowerCase().includes('processor')) {
        label += ' Worker';
      }
      return {
        id: this.slugify(label),
        label,
        type: 'service',
        layer: 4,
        isWorker: true,
        description: 'Asynchronous background compute & task processor',
      };
    }

    // 9. CORE SERVICE (Layer 2)
    const isService =
      /\b(service|microservice|backend|engine|upload|feed|auth|ledger|payment|payments|matching|trip|catalog|checkout|order|delivery|restaurant|billing|notification)\b/i.test(
        lower
      );

    let label = this.formatLabel(baseName, techQual);
    if (!isService && !label.toLowerCase().includes('service')) {
      label += ' Service';
    }

    return {
      id: this.slugify(label),
      label,
      type: 'service',
      layer: 2,
      description: 'Core microservice business logic & API handler',
    };
  }

  /**
   * Generates directional architectural relationships (Edges).
   */
  private static deduceRelationships(
    components: ExtractedComponent[],
    _fullPromptLower: string
  ): GraphEdge[] {
    const edges: GraphEdge[] = [];
    const edgeKeySet = new Set<string>();

    const addEdge = (sourceId: string, targetId: string, label: string) => {
      if (sourceId === targetId) return;
      const key = `${sourceId}__${targetId}`;
      if (edgeKeySet.has(key)) return;
      edgeKeySet.add(key);

      edges.push({
        id: `edge-${sourceId.replace('node-', '')}-${targetId.replace('node-', '')}`,
        source: sourceId,
        target: targetId,
        label,
        status: 'pending',
      });
    };

    // Partition components by layer
    const layer0Clients = components.filter((c) => c.layer === 0);
    const layer1Gateways = components.filter((c) => c.layer === 1);
    const layer2CoreServices = components.filter((c) => c.layer === 2);
    const layer3Middleware = components.filter((c) => c.layer === 3);
    const layer4Workers = components.filter((c) => c.layer === 4);
    const layer5Persistence = components.filter((c) => c.layer === 5);

    // Rule 1: Layer 0 (Clients) connect to Layer 1 (Gateways)
    if (layer1Gateways.length > 0) {
      const primaryGateway = layer1Gateways[0];
      layer0Clients.forEach((client) => {
        const isGraphQL = primaryGateway.label.toLowerCase().includes('graphql');
        addEdge(client.id, primaryGateway.id, isGraphQL ? 'GraphQL Query' : 'HTTPS / REST');
      });

      // Layer 1 connects to Layer 2 Core Services
      layer2CoreServices.forEach((svc) => {
        addEdge(primaryGateway.id, svc.id, 'gRPC Route');
      });
    } else {
      // If no gateway, clients connect directly to primary core services
      if (layer2CoreServices.length > 0) {
        layer0Clients.forEach((client) => {
          // If specific match exists (e.g. Passenger App -> Trip Matching)
          const matchedService = layer2CoreServices.find((s) => {
            if (client.label.toLowerCase().includes('passenger') && s.label.toLowerCase().includes('trip')) return true;
            if (client.label.toLowerCase().includes('driver') && s.label.toLowerCase().includes('trip')) return true;
            if (client.label.toLowerCase().includes('portal') && s.label.toLowerCase().includes('auth')) return true;
            if (client.label.toLowerCase().includes('web') && s.label.toLowerCase().includes('catalog')) return true;
            return false;
          });

          if (matchedService) {
            addEdge(client.id, matchedService.id, 'Client Request');
          } else {
            // Default to first service
            addEdge(client.id, layer2CoreServices[0].id, 'API Request');
          }
        });
      }
    }

    // Rule 2: Core Services connect to Middleware (Cache & Queues)
    layer2CoreServices.forEach((svc) => {
      // Connect to relevant Caches (Redis, Geolocation)
      layer3Middleware
        .filter((m) => m.type === 'cache')
        .forEach((cache) => {
          addEdge(svc.id, cache.id, 'Cache Read/Write');
        });

      // Connect to relevant Queues (Kafka, RabbitMQ, Order Queue)
      layer3Middleware
        .filter((m) => m.type === 'queue')
        .forEach((queue) => {
          addEdge(svc.id, queue.id, 'Publish Event');
        });

      // Direct to Workers if NO queue exists between them
      if (layer3Middleware.filter((m) => m.type === 'queue').length === 0) {
        layer4Workers.forEach((worker) => {
          addEdge(svc.id, worker.id, 'Trigger Job');
        });
      }

      // Direct to Persistence (Database / Storage) if service manages data directly
      layer5Persistence.forEach((store) => {
        const svcLower = svc.label.toLowerCase();
        const storeLower = store.label.toLowerCase();

        // Specific affinity rules
        const isS3Upload = svcLower.includes('upload') && store.type === 'storage';
        const isFeedData = svcLower.includes('feed') && store.type === 'database';
        const isLedgerDb = (svcLower.includes('ledger') || svcLower.includes('payment') || svcLower.includes('checkout')) && store.type === 'database';
        const isCatalogDb = svcLower.includes('catalog') && store.type === 'database';

        if (isS3Upload) {
          addEdge(svc.id, store.id, 'Raw Blob Upload');
        } else if (isFeedData) {
          addEdge(svc.id, store.id, storeLower.includes('graph') || storeLower.includes('neo4j') ? 'Social Graph Query' : 'Timeline Storage');
        } else if (isLedgerDb) {
          addEdge(svc.id, store.id, 'ACID Ledger Write');
        } else if (isCatalogDb) {
          addEdge(svc.id, store.id, 'Catalog Query');
        } else if (layer4Workers.length === 0 && layer2CoreServices.length <= 2) {
          // Default connection if no worker pipeline
          addEdge(svc.id, store.id, store.type === 'storage' ? 'Store Files' : 'Read/Write');
        }
      });
    });

    // Rule 3: Queues connect to Workers
    layer3Middleware
      .filter((m) => m.type === 'queue')
      .forEach((queue) => {
        layer4Workers.forEach((worker) => {
          addEdge(queue.id, worker.id, 'Consume Task');
        });
      });

    // Rule 4: Workers connect to Persistence (Databases & Storage)
    layer4Workers.forEach((worker) => {
      layer5Persistence.forEach((store) => {
        const isStorage = store.type === 'storage';
        addEdge(worker.id, store.id, isStorage ? 'Store Output' : 'Index State');
      });
    });

    // Rule 5: Internal Service-to-Service Chains (e.g. Auth -> Ledger, Trip Matching -> Payments, Catalog -> Checkout)
    for (let i = 0; i < layer2CoreServices.length - 1; i++) {
      const curr = layer2CoreServices[i];
      const next = layer2CoreServices[i + 1];
      const cLower = curr.label.toLowerCase();
      const nLower = next.label.toLowerCase();

      if (cLower.includes('auth') && nLower.includes('ledger')) {
        addEdge(curr.id, next.id, 'Authorized Transfer');
      } else if (cLower.includes('matching') && nLower.includes('payment')) {
        addEdge(curr.id, next.id, 'Authorize Fare');
      } else if (cLower.includes('catalog') && nLower.includes('checkout')) {
        addEdge(curr.id, next.id, 'Cart Items');
      }
    }

    // Rule 6: Worker connected directly to preceding service if Worker has no incoming edge
    layer4Workers.forEach((worker) => {
      const hasIncoming = edges.some((e) => e.target === worker.id);
      if (!hasIncoming && layer2CoreServices.length > 0) {
        const lastSvc = layer2CoreServices[layer2CoreServices.length - 1];
        addEdge(lastSvc.id, worker.id, 'Async Job Dispatch');
      }
    });

    // Rule 7: Ensure Graph Connectivity (no orphaned nodes)
    components.forEach((comp) => {
      const hasIncoming = edges.some((e) => e.target === comp.id);
      const hasOutgoing = edges.some((e) => e.source === comp.id);

      // Non-clients should have an incoming edge
      if (comp.layer > 0 && !hasIncoming) {
        // Find best predecessor in lower layer
        const candidatePred = [...components]
          .filter((c) => c.layer < comp.layer)
          .sort((a, b) => b.layer - a.layer)[0];
        if (candidatePred) {
          addEdge(candidatePred.id, comp.id, 'Connect');
        }
      }

      // Non-terminal components (Layer < 5) should have an outgoing edge
      if (comp.layer < 5 && comp.layer > 0 && !hasOutgoing) {
        // Find best successor in higher layer
        const candidateSucc = [...components]
          .filter((c) => c.layer > comp.layer)
          .sort((a, b) => a.layer - b.layer)[0];
        if (candidateSucc) {
          addEdge(comp.id, candidateSucc.id, 'Forward');
        }
      }
    });

    return edges;
  }

  /**
   * Helper to format clean display label with proper technological qualifier.
   */
  private static formatLabel(base: string, tech: string): string {
    let formatted = this.toTitleCase(base);

    // Common acronym formatting
    formatted = formatted
      .replace(/\bApi\b/g, 'API')
      .replace(/\bS3\b/g, 'S3')
      .replace(/\bGraphql\b/g, 'GraphQL')
      .replace(/\bPostgresql\b/g, 'PostgreSQL')
      .replace(/\bPostgres\b/g, 'PostgreSQL')
      .replace(/\bMysql\b/g, 'MySQL')
      .replace(/\bMongodb\b/g, 'MongoDB')
      .replace(/\bDynamodb\b/g, 'DynamoDB')
      .replace(/\bSqlite\b/g, 'SQLite')
      .replace(/\bKafka\b/g, 'Kafka')
      .replace(/\bRabbitmq\b/g, 'RabbitMQ')
      .replace(/\bRedis\b/g, 'Redis')
      .replace(/\bSqs\b/g, 'SQS')
      .replace(/\bDb\b/g, 'DB')
      .replace(/\bNeo4j\b/g, 'Neo4j');

    if (tech) {
      const techFormatted = this.toTitleCase(tech)
        .replace(/\bRedis\b/i, 'Redis')
        .replace(/\bKafka\b/i, 'Kafka')
        .replace(/\bRabbitmq\b/i, 'RabbitMQ')
        .replace(/\bPostgres\b/i, 'PostgreSQL');

      if (!formatted.toLowerCase().includes(techFormatted.toLowerCase())) {
        formatted += ` (${techFormatted})`;
      }
    }

    return formatted;
  }

  private static toTitleCase(str: string): string {
    return str
      .toLowerCase()
      .split(/[\s-_]+/)
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ')
      .trim();
  }

  private static slugify(str: string): string {
    return (
      'node-' +
      str
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '')
    );
  }
}
