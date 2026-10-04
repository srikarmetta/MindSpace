export type ComponentType =
  | 'user'
  | 'client'
  | 'api'
  | 'service'
  | 'database'
  | 'cache'
  | 'queue'
  | 'storage'
  | 'external_service'
  | 'generic'
  | 'agent';

export interface ArchitectureComponent {
  id: string;
  name: string;
  type: ComponentType;
  description?: string;
  technology?: string;
  metadata?: Record<string, unknown>;
}

export type RelationshipType =
  | 'CALLS'
  | 'CONNECTS_TO'
  | 'STORES_IN'
  | 'PUBLISHES_TO'
  | 'CONSUMES_FROM'
  | 'DEPENDS_ON'
  | 'AUTHENTICATES'
  | 'USES';

export interface ArchitectureRelationship {
  source: string;
  target: string;
  relationship: RelationshipType;
  description?: string;
}

export interface ArchitectureIR {
  components: ArchitectureComponent[];
  relationships: ArchitectureRelationship[];
  technologies?: string[];
  constraints?: string[];
  requirements?: string[];
}

export interface ArchitectureContext {
  existingIR?: ArchitectureIR;
  intentType?: string;
  domainHint?: string;
}

export interface IArchitectureInterpreter {
  interpret(text: string, context?: ArchitectureContext): Promise<ArchitectureIR> | ArchitectureIR;
}
