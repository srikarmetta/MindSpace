import type {
  ArchitectureIR,
  ArchitectureComponent,
  ArchitectureRelationship,
  ComponentType,
  RelationshipType,
  ArchitectureContext,
  IArchitectureInterpreter,
} from '../types/ir';

/**
 * Known technology dictionary with normalized canonical name and default architectural role.
 */
interface TechMeta {
  technology: string;
  defaultType: ComponentType;
}

const KNOWN_TECHNOLOGIES: Record<string, TechMeta> = {
  // Databases (Relational & NoSQL & Vector)
  postgresql: { technology: 'PostgreSQL', defaultType: 'database' },
  postgres: { technology: 'PostgreSQL', defaultType: 'database' },
  mysql: { technology: 'MySQL', defaultType: 'database' },
  mariadb: { technology: 'MariaDB', defaultType: 'database' },
  sqlite: { technology: 'SQLite', defaultType: 'database' },
  mongodb: { technology: 'MongoDB', defaultType: 'database' },
  mongo: { technology: 'MongoDB', defaultType: 'database' },
  dynamodb: { technology: 'DynamoDB', defaultType: 'database' },
  dynamo: { technology: 'DynamoDB', defaultType: 'database' },
  cassandra: { technology: 'Cassandra', defaultType: 'database' },
  neo4j: { technology: 'Neo4j', defaultType: 'database' },
  cockroachdb: { technology: 'CockroachDB', defaultType: 'database' },
  couchbase: { technology: 'Couchbase', defaultType: 'database' },
  qdrant: { technology: 'Qdrant', defaultType: 'database' },
  pinecone: { technology: 'Pinecone', defaultType: 'database' },
  chroma: { technology: 'Chroma', defaultType: 'database' },

  // Caching
  redis: { technology: 'Redis', defaultType: 'cache' },
  memcached: { technology: 'Memcached', defaultType: 'cache' },
  hazelcast: { technology: 'Hazelcast', defaultType: 'cache' },

  // Queues / Message Brokers / Event Streaming
  kafka: { technology: 'Kafka', defaultType: 'queue' },
  rabbitmq: { technology: 'RabbitMQ', defaultType: 'queue' },
  sqs: { technology: 'AWS SQS', defaultType: 'queue' },
  nats: { technology: 'NATS', defaultType: 'queue' },
  pulsar: { technology: 'Pulsar', defaultType: 'queue' },
  activemq: { technology: 'ActiveMQ', defaultType: 'queue' },

  // Storage & Object Stores
  s3: { technology: 'Amazon S3', defaultType: 'storage' },
  minio: { technology: 'MinIO', defaultType: 'storage' },
  gcs: { technology: 'Google Cloud Storage', defaultType: 'storage' },
  cloudfront: { technology: 'CloudFront', defaultType: 'storage' },

  // Gateways / Proxies / Protocols
  kong: { technology: 'Kong', defaultType: 'api' },
  envoy: { technology: 'Envoy', defaultType: 'api' },
  traefik: { technology: 'Traefik', defaultType: 'api' },
  graphql: { technology: 'GraphQL', defaultType: 'api' },
  grpc: { technology: 'gRPC', defaultType: 'api' },

  // External APIs & Services
  twilio: { technology: 'Twilio', defaultType: 'external_service' },
  sendgrid: { technology: 'SendGrid', defaultType: 'external_service' },
  stripe: { technology: 'Stripe', defaultType: 'external_service' },
  paypal: { technology: 'PayPal', defaultType: 'external_service' },
  auth0: { technology: 'Auth0', defaultType: 'external_service' },
  okta: { technology: 'Okta', defaultType: 'external_service' },
};

/**
 * DeterministicArchitectureInterpreter:
 * Translates arbitrary natural-language architecture requests into a generic,
 * typed, and connected ArchitectureIR representation.
 */
export class DeterministicArchitectureInterpreter implements IArchitectureInterpreter {
  /**
   * Main async entry point fulfilling IArchitectureInterpreter interface
   */
  public async interpret(text: string, context?: ArchitectureContext): Promise<ArchitectureIR> {
    return this.parseArchitectureIR(text, context);
  }

  /**
   * Synchronous parser for direct and testing usage
   */
  public parseArchitectureIR(prompt: string, _context?: ArchitectureContext): ArchitectureIR {
    const raw = prompt.trim();
    if (!raw) {
      return { components: [], relationships: [], technologies: [] };
    }

    const detectedTechnologies = new Set<string>();

    // 1. Check if the prompt contains arrow pipelines: e.g. A -> B -> C
    const hasArrows = /(?:->|-->|→|=>)/.test(raw);

    let components: ArchitectureComponent[] = [];
    let relationships: ArchitectureRelationship[] = [];

    if (hasArrows) {
      const pipelineResult = this.parsePipelineSyntax(raw, detectedTechnologies);
      components = pipelineResult.components;
      relationships = pipelineResult.relationships;
    } else {
      // Check if text contains explicit verbal clauses (e.g. "X publishes to Y. Z consumes from W.")
      const verbalResult = this.parseVerbalSyntax(raw, detectedTechnologies);
      if (verbalResult.relationships.length > 0) {
        components = verbalResult.components;
        relationships = verbalResult.relationships;
      } else {
        const proseResult = this.parseProseSyntax(raw, detectedTechnologies);
        components = proseResult.components;
        relationships = proseResult.relationships;
      }
    }

    // 2. Extract any additional explicit verbal relationships across the whole text
    const explicitVerbalRels = this.extractExplicitVerbalRelationships(raw, components);
    relationships.push(...explicitVerbalRels);

    // 3. Deduplicate components & relationships
    const deduplicatedComponents = this.deduplicateComponents(components);
    const deduplicatedRelationships = this.deduplicateRelationships(
      relationships,
      deduplicatedComponents
    );

    // 4. Ensure graph connectivity (no isolated components)
    const connectedRelationships = this.ensureGraphConnectivity(
      deduplicatedComponents,
      deduplicatedRelationships
    );

    return {
      components: deduplicatedComponents,
      relationships: connectedRelationships,
      technologies: Array.from(detectedTechnologies),
      requirements: [raw],
    };
  }

  /**
   * Parses arrow pipeline syntax:
   * e.g. "User -> Web App -> API Gateway -> Order Service -> Payment Service, PostgreSQL, Redis"
   * or "Patient -> Mobile App -> Auth & Appointment Services -> PostgreSQL, Notification Service -> External SMS Provider"
   */
  private parsePipelineSyntax(
    text: string,
    detectedTechnologies: Set<string>
  ): { components: ArchitectureComponent[]; relationships: ArchitectureRelationship[] } {
    const components: ArchitectureComponent[] = [];
    const relationships: ArchitectureRelationship[] = [];

    // Split text into clauses by semicolon or comma that precedes a new arrow chain
    const clauses = text.split(/(?:;|\bmeanwhile\b|\bseparately\b|(?:,\s*(?=[A-Za-z0-9_\s-]+(?:->|-->|→|=>))))/i);

    for (const clause of clauses) {
      const trimmedClause = clause.trim();
      if (!trimmedClause) continue;

      if (/(?:->|-->|→|=>)/.test(trimmedClause)) {
        // Split on arrows
        const segments = trimmedClause.split(/(?:->|-->|→|=>)/).map((s) => s.trim()).filter(Boolean);

        const stageComponents: ArchitectureComponent[][] = [];

        for (let i = 0; i < segments.length; i++) {
          const seg = segments[i];
          const items = this.splitSegmentItems(seg);
          const segComps: ArchitectureComponent[] = [];

          for (const item of items) {
            const comps = this.extractAndClassifyComponents(item, detectedTechnologies);
            segComps.push(...comps);
            components.push(...comps);
          }

          stageComponents.push(segComps);
        }

        // Wire sequential stages: stage i -> stage i+1
        for (let i = 0; i < stageComponents.length - 1; i++) {
          const sources = stageComponents[i];
          const targets = stageComponents[i + 1];

          for (const src of sources) {
            for (const tgt of targets) {
              const relType = this.determineRelationshipType(src, tgt);
              relationships.push({
                source: src.id,
                target: tgt.id,
                relationship: relType,
                description: `${src.name} → ${tgt.name}`,
              });
            }
          }
        }
      } else {
        const items = this.splitSegmentItems(trimmedClause);
        for (const item of items) {
          const comps = this.extractAndClassifyComponents(item, detectedTechnologies);
          components.push(...comps);
        }
      }
    }

    return { components, relationships };
  }

  /**
   * Parses text containing explicit grammatical sentences:
   * e.g. "Customer accesses system through Web Portal. Order Service publishes events to Kafka Queue. ..."
   */
  private parseVerbalSyntax(
    text: string,
    detectedTechnologies: Set<string>
  ): { components: ArchitectureComponent[]; relationships: ArchitectureRelationship[] } {
    const components: ArchitectureComponent[] = [];
    const relationships: ArchitectureRelationship[] = [];

    // Split text into sentences by period, semicolon, newline
    const sentences = text.split(/(?:\.|\n|;)+/).map((s) => s.trim()).filter((s) => s.length > 0);

    const patterns: Array<{ regex: RegExp; rel: RelationshipType }> = [
      { regex: /([a-z0-9\s-]+?)\s+(?:is\s+)?connected\s+to\s+([a-z0-9\s-]+)/i, rel: 'CONNECTS_TO' },
      { regex: /([a-z0-9\s-]+?)\s+calls\s+([a-z0-9\s-]+)/i, rel: 'CALLS' },
      { regex: /([a-z0-9\s-]+?)\s+stores\s+(?:data\s+in|in)\s+([a-z0-9\s-]+)/i, rel: 'STORES_IN' },
      { regex: /([a-z0-9\s-]+?)\s+writes\s+to\s+([a-z0-9\s-]+)/i, rel: 'STORES_IN' },
      { regex: /([a-z0-9\s-]+?)\s+publishes\s+(?:events\s+to|to)\s+([a-z0-9\s-]+)/i, rel: 'PUBLISHES_TO' },
      { regex: /([a-z0-9\s-]+?)\s+consumes\s+from\s+([a-z0-9\s-]+)/i, rel: 'CONSUMES_FROM' },
      { regex: /([a-z0-9\s-]+?)\s+authenticated\s+by\s+([a-z0-9\s-]+)/i, rel: 'AUTHENTICATES' },
      { regex: /([a-z0-9\s-]+?)\s+backed\s+by\s+([a-z0-9\s-]+)/i, rel: 'DEPENDS_ON' },
      { regex: /([a-z0-9\s-]+?)\s+uses\s+([a-z0-9\s-]+)/i, rel: 'USES' },
      { regex: /([a-z0-9\s-]+?)\s+access(?:es)?\s+system\s+through\s+([a-z0-9\s-]+)/i, rel: 'CONNECTS_TO' },
    ];

    for (const sentence of sentences) {
      let matched = false;
      for (const { regex, rel } of patterns) {
        const match = sentence.match(regex);
        if (match) {
          matched = true;
          const srcName = match[1].trim();
          const tgtName = match[2].trim();

          const srcComps = this.extractAndClassifyComponents(srcName, detectedTechnologies);
          const tgtComps = this.extractAndClassifyComponents(tgtName, detectedTechnologies);

          components.push(...srcComps, ...tgtComps);

          for (const s of srcComps) {
            for (const t of tgtComps) {
              if (s.id !== t.id) {
                relationships.push({
                  source: s.id,
                  target: t.id,
                  relationship: rel,
                  description: `${s.name} ${rel.toLowerCase().replace('_', ' ')} ${t.name}`,
                });
              }
            }
          }
          break;
        }
      }

      if (!matched && sentence.length > 2) {
        const tokens = this.extractComponentTokens(sentence);
        for (const token of tokens) {
          const comps = this.extractAndClassifyComponents(token, detectedTechnologies);
          components.push(...comps);
        }
      }
    }

    return { components, relationships };
  }

  /**
   * Parses natural language prose descriptions:
   * e.g. "Build a video streaming platform with users, an API gateway, video service, recommendation service, Redis cache, PostgreSQL and object storage."
   */
  private parseProseSyntax(
    text: string,
    detectedTechnologies: Set<string>
  ): { components: ArchitectureComponent[]; relationships: ArchitectureRelationship[] } {
    const rawTokens = this.extractComponentTokens(text);
    const components: ArchitectureComponent[] = [];

    for (const token of rawTokens) {
      const comps = this.extractAndClassifyComponents(token, detectedTechnologies);
      components.push(...comps);
    }

    // Synthesize architectural relationships based on component roles and topology
    const relationships = this.synthesizeTopologicalRelationships(components);

    return { components, relationships };
  }

  /**
   * Splits a segment into items, recognizing compound patterns like "Auth & Appointment Services"
   */
  private splitSegmentItems(segment: string): string[] {
    return segment
      .split(/(?:,|\band\b(?!\s+(?:appointment|payment|billing|order|auth|matching|inventory|delivery|driver)\s+services?)|;|\balong with\b)/i)
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
  }

  /**
   * Extracts candidate component tokens from natural prose text.
   */
  public extractComponentTokens(prompt: string): string[] {
    // Strip conversational lead-ins: "Build a ... with", "Create a ... featuring", etc.
    let clean = prompt.replace(
      /^(?:please\s+)?(?:build|design|create|architect|implement|setup|draw|generate)?\s*(?:a|an|the)?\s*([a-z0-9\s-]+?)(?:\s+with|\s+consisting of|\s+featuring|\s+using|:)\s*/i,
      ''
    );

    clean = clean.replace(/^(?:a|an|the)\s+/i, '');

    // Split on periods, newlines, commas, "and", "plus", "with", "along with", "including"
    const tokens = clean
      .split(/(?:[.\n;]|,|\band\b|;|\bwith\b|\bplus\b|\balong with\b|\bincluding\b)/i)
      .map((t) => t.trim())
      .filter((t) => t.length > 1);

    return tokens
      .map((t) => t.replace(/^(?:a|an|the|its|own)\s+/i, '').trim())
      .filter((t) => {
        const l = t.toLowerCase();
        return (
          l !== 'system' &&
          l !== 'platform' &&
          l !== 'backend' &&
          l !== 'architecture' &&
          l !== 'application' &&
          l.length > 1
        );
      });
  }

  /**
   * Extracts one or more ArchitectureComponents from a raw token.
   * Handles compound tokens like "Auth & Appointment Services" -> [Auth Service, Appointment Service]
   */
  public extractAndClassifyComponents(
    rawToken: string,
    detectedTechnologies?: Set<string>
  ): ArchitectureComponent[] {
    const trimmed = rawToken.trim();
    if (!trimmed) return [];

    // Check for compound services: e.g. "Auth & Appointment Services", "Trip & Matching Services"
    const compoundMatch = trimmed.match(/^([a-z0-9\s-]+?)\s+(?:&|and)\s+([a-z0-9\s-]+?)\s+(services?|microservices?|workers?)$/i);
    if (compoundMatch) {
      const svcSuffix = compoundMatch[3].replace(/s$/i, ''); // "Service" or "Worker"
      const part1 = `${compoundMatch[1].trim()} ${svcSuffix}`;
      const part2 = `${compoundMatch[2].trim()} ${svcSuffix}`;

      const c1 = this.classifySingleComponent(part1, detectedTechnologies);
      const c2 = this.classifySingleComponent(part2, detectedTechnologies);
      return [c1, c2].filter(Boolean) as ArchitectureComponent[];
    }

    const single = this.classifySingleComponent(trimmed, detectedTechnologies);
    return single ? [single] : [];
  }

  /**
   * Classifies a single raw component string into an ArchitectureComponent.
   */
  public classifySingleComponent(
    raw: string,
    detectedTechnologies?: Set<string>
  ): ArchitectureComponent | null {
    const trimmed = raw.trim();
    if (!trimmed) return null;

    // 1. Separate technology qualification: e.g. "geolocation cache in redis", "shopping cart in redis", "order queue in kafka"
    let techName: string | undefined;
    let baseName = trimmed;

    // Pattern: "... in/using/via/on [tech]"
    const techPrepMatch = trimmed.match(/^(.+?)\s+(?:in|using|via|on)\s+([a-z0-9\-_]+)$/i);
    if (techPrepMatch) {
      baseName = techPrepMatch[1].trim();
      const rawTech = techPrepMatch[2].trim().toLowerCase();
      if (KNOWN_TECHNOLOGIES[rawTech]) {
        techName = KNOWN_TECHNOLOGIES[rawTech].technology;
      } else {
        techName = this.toTitleCase(rawTech);
      }
    } else {
      techName = this.extractTechnology(trimmed);
    }

    if (techName && detectedTechnologies) {
      detectedTechnologies.add(techName);
    }

    // 2. Infer ComponentType
    const type = this.inferNodeType(trimmed, techName);

    // 3. Format clean canonical display name
    const name = this.formatComponentName(baseName, type, techName);
    const id = this.slugify(name);

    const description = this.generateComponentDescription(type, name, techName);

    return {
      id,
      name,
      type,
      description,
      technology: techName,
    };
  }

  /**
   * Extracts known technology string from a raw name.
   */
  public extractTechnology(raw: string): string | undefined {
    const lower = raw.toLowerCase();
    for (const [key, meta] of Object.entries(KNOWN_TECHNOLOGIES)) {
      const regex = new RegExp(`\\b${key}\\b`, 'i');
      if (regex.test(lower)) {
        return meta.technology;
      }
    }
    return undefined;
  }

  /**
   * Infers the architectural component type (user, client, api, service, database, cache, queue, storage, external_service).
   */
  public inferNodeType(raw: string, detectedTech?: string): ComponentType {
    const lower = raw.toLowerCase();

    // 1. External Service
    if (
      /\b(external sms provider|sms provider|sms gateway|external api|third-party|third party|external service|sendgrid|twilio|stripe|paypal|auth0|okta)\b/i.test(
        lower
      )
    ) {
      return 'external_service';
    }

    // 2. Client / User
    if (
      /\b(mobile app|web app|web client|rider app|driver app|patient app|client app|customer app|ios app|android app|frontend|portal|customer portal|dashboard)\b/i.test(
        lower
      )
    ) {
      return 'client';
    }

    if (
      /\b(user|users|customer|customers|passenger|passengers|rider|riders|buyer|buyers|patient|patients|end-user|visitor|admin|operator)\b/i.test(
        lower
      )
    ) {
      return 'user';
    }

    if (/\b(touchpoint|client)\b/i.test(lower)) {
      return 'client';
    }

    // 3. API Gateway / Ingress
    if (
      /\b(api gateway|gateway|graphql gateway|reverse proxy|load balancer|ingress|kong|envoy|traefik)\b/i.test(
        lower
      )
    ) {
      return 'api';
    }

    // 4. Cache
    if (
      /\b(redis|memcached|hazelcast|cache|caching|in-memory|geolocation cache|key-value)\b/i.test(
        lower
      ) ||
      (detectedTech && /redis|memcached/i.test(detectedTech))
    ) {
      return 'cache';
    }

    // 5. Queue / Message Broker
    if (
      /\b(kafka|rabbitmq|sqs|event bus|message queue|pubsub|queue|event stream|nats|pulsar|activemq)\b/i.test(
        lower
      ) ||
      (detectedTech && /kafka|rabbitmq|sqs/i.test(detectedTech))
    ) {
      return 'queue';
    }

    // 6. Storage / Object Store
    if (
      /\b(s3|storage|blob storage|object storage|minio|gcs|bucket|blob|file storage|cdn|cloudfront)\b/i.test(
        lower
      ) ||
      (detectedTech && /s3|gcs|minio/i.test(detectedTech))
    ) {
      return 'storage';
    }

    // 7. Database
    if (
      /\b(postgresql|postgres|mysql|mongodb|dynamodb|dynamo|sqlite|cassandra|neo4j|couchbase|mariadb|cockroachdb|database|relational db|sql db|db|datastore|ledger|knowledge base|vector db|qdrant|chroma|pinecone)\b/i.test(
        lower
      ) ||
      (detectedTech && /postgres|mysql|mongo|dynamo|cassandra|neo4j|sqlite/i.test(detectedTech))
    ) {
      return 'database';
    }

    // 8. Agent
    if (/\b(agent|agent router|sales agent|billing agent|technical agent|support agent|ai agent|llm)\b/i.test(lower)) {
      return 'agent';
    }

    // 9. Service / Microservice
    return 'service';
  }

  /**
   * Formats a clean, readable component name.
   */
  private formatComponentName(base: string, type: ComponentType, technology?: string): string {
    let name = this.toTitleCase(base);

    // Normalizations
    name = name
      .replace(/\bApi\b/g, 'API')
      .replace(/\bS3\b/g, 'S3')
      .replace(/\bDb\b/g, 'DB')
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
      .replace(/\bNeo4j\b/g, 'Neo4j')
      .replace(/\bSms\b/g, 'SMS');

    const lower = name.toLowerCase();
    if (type === 'database') {
      if (lower === 'database' || lower === 'db') return 'Database';
      if (lower === 'postgresql' || lower === 'postgres') return 'PostgreSQL Database';
      if (lower === 'mysql') return 'MySQL Database';
      if (lower === 'mongodb' || lower === 'mongo') return 'MongoDB';
      if (lower === 'cassandra') return 'Cassandra DB';
      if (lower === 'neo4j') return 'Neo4j Graph DB';
    }

    if (type === 'cache') {
      if (lower === 'redis') return 'Redis Cache';
      if (lower === 'memcached') return 'Memcached';
    }

    if (type === 'queue') {
      if (lower === 'kafka') return 'Kafka';
      if (lower === 'rabbitmq') return 'RabbitMQ';
    }

    if (type === 'storage') {
      if (lower === 's3' || lower === 's3 storage') return 'S3 Storage';
      if (lower === 'object storage' || lower === 'storage') return 'Object Storage';
    }

    if (type === 'api') {
      if (lower === 'api' || lower === 'gateway') return 'API Gateway';
    }

    if (type === 'service') {
      if (
        !lower.includes('service') &&
        !lower.includes('worker') &&
        !lower.includes('transcoder') &&
        !lower.includes('processor') &&
        !lower.includes('rag')
      ) {
        name += ' Service';
      }
    }

    if (technology && !name.toLowerCase().includes(technology.toLowerCase())) {
      name += ` (${technology})`;
    }

    return name;
  }

  /**
   * Generates informative description for component based on role.
   */
  private generateComponentDescription(type: ComponentType, name: string, tech?: string): string {
    const techPrefix = tech ? `[${tech}] ` : '';
    switch (type) {
      case 'user':
        return `${techPrefix}End-user customer actor`;
      case 'client':
        return `${techPrefix}Client application and user touchpoint`;
      case 'api':
        return `${techPrefix}API ingress, rate limiting & request routing proxy`;
      case 'service':
        return `${techPrefix}Microservice business logic and transaction processing`;
      case 'cache':
        return `${techPrefix}Low-latency in-memory cache and ephemeral key-value store`;
      case 'queue':
        return `${techPrefix}Distributed event streaming and asynchronous message broker`;
      case 'database':
        return `${techPrefix}Persistent ACID transactional datastore`;
      case 'storage':
        return `${techPrefix}Scalable cloud object storage and blob storage`;
      case 'external_service':
        return `${techPrefix}Third-party external provider API`;
      case 'agent':
        return `${techPrefix}Autonomous intelligent agent orchestrator`;
      default:
        return `${techPrefix}${name} component`;
    }
  }

  /**
   * Determines relationship type between two components based on their roles.
   */
  private determineRelationshipType(
    source: ArchitectureComponent,
    target: ArchitectureComponent
  ): RelationshipType {
    if (source.type === 'user' && target.type === 'client') return 'CONNECTS_TO';
    if (target.type === 'database' || target.type === 'storage') return 'STORES_IN';
    if (target.type === 'cache') return 'USES';
    if (target.type === 'queue') return 'PUBLISHES_TO';
    if (source.type === 'queue' && target.type === 'service') return 'CONSUMES_FROM';
    if (target.type === 'external_service') return 'CALLS';
    if (source.type === 'client' && (target.type === 'api' || target.type === 'service')) return 'CALLS';
    if (source.type === 'api' && target.type === 'service') return 'CALLS';
    return 'CALLS';
  }

  /**
   * Extracts explicit grammatical relationship phrases:
   * "X connected to Y", "X calls Y", "X stores data in Y", "X publishes to Y", "X consumes from Y", "X authenticated by Y", etc.
   */
  private extractExplicitVerbalRelationships(
    text: string,
    components: ArchitectureComponent[]
  ): ArchitectureRelationship[] {
    const relationships: ArchitectureRelationship[] = [];
    if (components.length < 2) return relationships;

    const findComponent = (phrase: string): ArchitectureComponent | undefined => {
      const clean = phrase.trim().toLowerCase();
      return components.find(
        (c) =>
          c.name.toLowerCase() === clean ||
          c.id.toLowerCase() === clean ||
          clean.includes(c.name.toLowerCase()) ||
          c.name.toLowerCase().includes(clean)
      );
    };

    const patterns: Array<{ regex: RegExp; rel: RelationshipType }> = [
      { regex: /([a-z0-9\s-]+?)\s+(?:is\s+)?connected\s+to\s+([a-z0-9\s-]+)/gi, rel: 'CONNECTS_TO' },
      { regex: /([a-z0-9\s-]+?)\s+calls\s+([a-z0-9\s-]+)/gi, rel: 'CALLS' },
      { regex: /([a-z0-9\s-]+?)\s+stores\s+(?:data\s+in|in)\s+([a-z0-9\s-]+)/gi, rel: 'STORES_IN' },
      { regex: /([a-z0-9\s-]+?)\s+writes\s+to\s+([a-z0-9\s-]+)/gi, rel: 'STORES_IN' },
      { regex: /([a-z0-9\s-]+?)\s+publishes\s+(?:events\s+to|to)\s+([a-z0-9\s-]+)/gi, rel: 'PUBLISHES_TO' },
      { regex: /([a-z0-9\s-]+?)\s+consumes\s+from\s+([a-z0-9\s-]+)/gi, rel: 'CONSUMES_FROM' },
      { regex: /([a-z0-9\s-]+?)\s+authenticated\s+by\s+([a-z0-9\s-]+)/gi, rel: 'AUTHENTICATES' },
      { regex: /([a-z0-9\s-]+?)\s+backed\s+by\s+([a-z0-9\s-]+)/gi, rel: 'DEPENDS_ON' },
      { regex: /([a-z0-9\s-]+?)\s+uses\s+([a-z0-9\s-]+)/gi, rel: 'USES' },
      { regex: /([a-z0-9\s-]+?)\s+access(?:es)?\s+system\s+through\s+([a-z0-9\s-]+)/gi, rel: 'CONNECTS_TO' },
    ];

    for (const { regex, rel } of patterns) {
      let match: RegExpExecArray | null;
      while ((match = regex.exec(text)) !== null) {
        const srcRaw = match[1];
        const tgtRaw = match[2];
        const src = findComponent(srcRaw);
        const tgt = findComponent(tgtRaw);

        if (src && tgt && src.id !== tgt.id) {
          relationships.push({
            source: src.id,
            target: tgt.id,
            relationship: rel,
            description: `${src.name} ${rel.toLowerCase().replace('_', ' ')} ${tgt.name}`,
          });
        }
      }
    }

    return relationships;
  }

  /**
   * Synthesizes architectural relationships based on component topology when explicit verbs are omitted.
   */
  private synthesizeTopologicalRelationships(
    components: ArchitectureComponent[]
  ): ArchitectureRelationship[] {
    const relationships: ArchitectureRelationship[] = [];

    const users = components.filter((c) => c.type === 'user');
    const clients = components.filter((c) => c.type === 'client');
    const gateways = components.filter((c) => c.type === 'api');
    const agents = components.filter((c) => c.type === 'agent');
    const services = components.filter((c) => c.type === 'service');
    const caches = components.filter((c) => c.type === 'cache');
    const queues = components.filter((c) => c.type === 'queue');
    const databases = components.filter((c) => c.type === 'database');
    const storages = components.filter((c) => c.type === 'storage');
    const externals = components.filter((c) => c.type === 'external_service');

    const addRel = (src: ArchitectureComponent, tgt: ArchitectureComponent, rel: RelationshipType) => {
      if (src.id === tgt.id) return;
      relationships.push({
        source: src.id,
        target: tgt.id,
        relationship: rel,
        description: `${src.name} → ${tgt.name}`,
      });
    };

    // 1. Users -> Clients
    users.forEach((u) => {
      clients.forEach((cl) => addRel(u, cl, 'CONNECTS_TO'));
    });

    // 2. Clients / Users -> API Gateway (or directly to Services/Agents if no Gateway)
    const entrypoints = clients.length > 0 ? clients : users;

    if (gateways.length > 0) {
      const gw = gateways[0];
      entrypoints.forEach((e) => addRel(e, gw, 'CALLS'));

      // Gateway -> Core Services & Agents
      const backendServices = [...agents, ...services];
      backendServices.forEach((svc) => addRel(gw, svc, 'CALLS'));
    } else if (services.length > 0 || agents.length > 0) {
      entrypoints.forEach((e) => {
        services.slice(0, 2).forEach((svc) => addRel(e, svc, 'CALLS'));
        agents.forEach((ag) => addRel(e, ag, 'CALLS'));
      });
    }

    // 3. Core Services -> Caches
    services.forEach((svc) => {
      caches.forEach((cache) => addRel(svc, cache, 'USES'));
    });

    // 4. Core Services -> Queues
    services.forEach((svc) => {
      queues.forEach((q) => addRel(svc, q, 'PUBLISHES_TO'));
    });

    // 5. Queues -> Worker Services
    const workers = services.filter(
      (s) =>
        s.name.toLowerCase().includes('worker') ||
        s.name.toLowerCase().includes('transcoder') ||
        s.name.toLowerCase().includes('processor')
    );
    queues.forEach((q) => {
      workers.forEach((w) => addRel(q, w, 'CONSUMES_FROM'));
    });

    if (queues.length === 0) {
      const nonWorkers = services.filter((s) => !workers.includes(s));
      nonWorkers.forEach((nw) => {
        workers.forEach((w) => addRel(nw, w, 'CALLS'));
      });
    }

    // 6. Services & Workers -> Databases
    const dataWriters = workers.length > 0 ? workers : services;
    databases.forEach((db) => {
      if (dataWriters.length > 0) {
        dataWriters.forEach((w) => addRel(w, db, 'STORES_IN'));
      } else {
        services.forEach((s) => addRel(s, db, 'STORES_IN'));
      }
    });

    // 7. Services & Workers -> Storage
    storages.forEach((st) => {
      const storageWriters = services.filter(
        (s) =>
          s.name.toLowerCase().includes('upload') ||
          s.name.toLowerCase().includes('video') ||
          s.name.toLowerCase().includes('media') ||
          s.name.toLowerCase().includes('transcoder') ||
          s.name.toLowerCase().includes('worker')
      );
      if (storageWriters.length > 0) {
        storageWriters.forEach((w) => addRel(w, st, 'STORES_IN'));
      } else if (services.length > 0) {
        services.forEach((s) => addRel(s, st, 'STORES_IN'));
      }
    });

    // 8. Services -> External Services
    externals.forEach((ext) => {
      const matched = services.find((s) => {
        const sl = s.name.toLowerCase();
        const el = ext.name.toLowerCase();
        if (el.includes('sms') && sl.includes('notification')) return true;
        if ((el.includes('stripe') || el.includes('paypal') || el.includes('payment')) && sl.includes('payment')) return true;
        return false;
      });

      if (matched) {
        addRel(matched, ext, 'CALLS');
      } else if (services.length > 0) {
        addRel(services[services.length - 1], ext, 'CALLS');
      }
    });

    return relationships;
  }

  /**
   * Deduplicates components by canonical ID.
   */
  private deduplicateComponents(components: ArchitectureComponent[]): ArchitectureComponent[] {
    const seen = new Set<string>();
    const result: ArchitectureComponent[] = [];

    for (const c of components) {
      if (!seen.has(c.id)) {
        seen.add(c.id);
        result.push(c);
      }
    }

    return result;
  }

  /**
   * Deduplicates relationships and filters out invalid or self-loop edges.
   */
  private deduplicateRelationships(
    relationships: ArchitectureRelationship[],
    components: ArchitectureComponent[]
  ): ArchitectureRelationship[] {
    const componentIds = new Set(components.map((c) => c.id));
    const seen = new Set<string>();
    const result: ArchitectureRelationship[] = [];

    for (const r of relationships) {
      if (r.source === r.target) continue;
      if (!componentIds.has(r.source) || !componentIds.has(r.target)) continue;

      const key = `${r.source}__${r.target}__${r.relationship}`;
      if (!seen.has(key)) {
        seen.add(key);
        result.push(r);
      }
    }

    return result;
  }

  /**
   * Ensures that no nodes are left completely orphaned/disconnected.
   */
  private ensureGraphConnectivity(
    components: ArchitectureComponent[],
    relationships: ArchitectureRelationship[]
  ): ArchitectureRelationship[] {
    if (components.length <= 1) return relationships;

    const result = [...relationships];
    const edgeKeySet = new Set(result.map((r) => `${r.source}__${r.target}`));

    const hasIncoming = (id: string) => result.some((r) => r.target === id);
    const hasOutgoing = (id: string) => result.some((r) => r.source === id);

    // Non-client nodes should have at least one incoming edge
    const nonRoots = components.filter((c) => c.type !== 'user' && c.type !== 'client');
    for (const comp of nonRoots) {
      if (!hasIncoming(comp.id)) {
        const candidates = components.filter(
          (c) => c.id !== comp.id && (c.type === 'api' || c.type === 'service' || c.type === 'client')
        );
        if (candidates.length > 0) {
          const src = candidates[0];
          const key = `${src.id}__${comp.id}`;
          if (!edgeKeySet.has(key)) {
            edgeKeySet.add(key);
            result.push({
              source: src.id,
              target: comp.id,
              relationship: this.determineRelationshipType(src, comp),
              description: `${src.name} → ${comp.name}`,
            });
          }
        }
      }
    }

    // Non-terminal components (gateways, clients) should have at least one outgoing edge
    const nonTerminals = components.filter(
      (c) => c.type === 'client' || c.type === 'user' || c.type === 'api'
    );
    for (const comp of nonTerminals) {
      if (!hasOutgoing(comp.id)) {
        const candidates = components.filter(
          (c) => c.id !== comp.id && c.type !== 'user' && c.type !== 'client'
        );
        if (candidates.length > 0) {
          const tgt = candidates[0];
          const key = `${comp.id}__${tgt.id}`;
          if (!edgeKeySet.has(key)) {
            edgeKeySet.add(key);
            result.push({
              source: comp.id,
              target: tgt.id,
              relationship: this.determineRelationshipType(comp, tgt),
              description: `${comp.name} → ${tgt.name}`,
            });
          }
        }
      }
    }

    return result;
  }

  private toTitleCase(str: string): string {
    return str
      .toLowerCase()
      .split(/[\s-_]+/)
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ')
      .trim();
  }

  private slugify(str: string): string {
    return (
      'node-' +
      str
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '')
    );
  }
}
