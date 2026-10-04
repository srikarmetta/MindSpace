import type { GraphNode, GraphEdge, NodeType } from '../types/graph';
import type { GraphOperation } from '../types/operations';
import type { Intent } from '../types/intent';
import type {
  ArchitectureIR,
  ArchitectureComponent,
  ArchitectureRelationship,
  ComponentType,
} from '../types/ir';
import { DeterministicArchitectureInterpreter } from './deterministicInterpreter';
import { calculateLayout } from './graphEngine';

export interface ArchitectureDiff {
  nodesToAdd: ArchitectureComponent[];
  nodesToSupersede: { node: GraphNode; reason: string }[];
  nodesUnchanged: GraphNode[];

  edgesToAdd: ArchitectureRelationship[];
  edgesToSupersede: { edge: GraphEdge; reason: string }[];
  edgesUnchanged: GraphEdge[];
}

export interface ReplanResult {
  updatedIR: ArchitectureIR;
  operations: GraphOperation[];
  summary: string;
}

/**
 * Derives the canonical ArchitectureIR from current GraphState and any fallback/planned IR.
 * This guarantees MindSpace always has the full architectural context even if an interruption
 * occurred while an initial plan was only partially committed.
 */
export function deriveIRFromGraphState(
  nodes: GraphNode[],
  edges: GraphEdge[],
  fallbackIR?: ArchitectureIR | null
): ArchitectureIR {
  const activeNodes = nodes.filter(
    (n) => n.status !== 'superseded' && n.status !== 'failed'
  );
  const activeEdges = edges.filter((e) => e.status !== 'superseded');

  const components: ArchitectureComponent[] = activeNodes.map((n) => ({
    id: n.id,
    name: n.label,
    type: n.type as ComponentType,
    description: n.description,
    technology: (n.metadata?.technology as string) || undefined,
  }));

  const relationships: ArchitectureRelationship[] = activeEdges.map((e) => ({
    source: e.source,
    target: e.target,
    relationship: 'CALLS',
    description: e.label,
  }));

  // If fallbackIR has components that were planned but not yet deployed (and not superseded),
  // include them so the full architecture is known during mid-flight interruptions.
  if (fallbackIR && fallbackIR.components) {
    const activeIds = new Set(activeNodes.map((n) => n.id));
    const supersededNodes = nodes.filter((n) => n.status === 'superseded');

    for (const comp of fallbackIR.components) {
      const isAlreadyActive = activeNodes.some((n) => isMatchingNode(n, comp));
      const isAlreadySuperseded = supersededNodes.some((n) => isMatchingNode(n, comp));

      if (!isAlreadyActive && !isAlreadySuperseded && !activeIds.has(comp.id)) {
        if (!components.some((c) => isMatchingComponent(c, comp))) {
          components.push(comp);
        }
      }
    }

    for (const rel of fallbackIR.relationships) {
      const isEdgeActive = activeEdges.some(
        (e) => e.source === rel.source && e.target === rel.target
      );
      if (!isEdgeActive && !relationships.some((r) => r.source === rel.source && r.target === rel.target)) {
        relationships.push(rel);
      }
    }
  }

  const technologies = Array.from(
    new Set(components.map((c) => c.technology).filter(Boolean) as string[])
  );

  return {
    components,
    relationships,
    technologies,
  };
}

/**
 * Checks if a GraphNode matches an ArchitectureComponent
 */
function isMatchingNode(node: GraphNode, comp: ArchitectureComponent): boolean {
  if (node.id === comp.id) return true;
  const nLabel = node.label.toLowerCase().replace(/[^a-z0-9]/g, '');
  const cName = comp.name.toLowerCase().replace(/[^a-z0-9]/g, '');
  if (nLabel === cName) return true;
  if (nLabel.includes(cName) || cName.includes(nLabel)) return true;
  return false;
}

/**
 * Checks if two ArchitectureComponents match
 */
function isMatchingComponent(a: ArchitectureComponent, b: ArchitectureComponent): boolean {
  if (a.id === b.id) return true;
  const aNorm = a.name.toLowerCase().replace(/[^a-z0-9]/g, '');
  const bNorm = b.name.toLowerCase().replace(/[^a-z0-9]/g, '');
  return aNorm === bNorm || aNorm.includes(bNorm) || bNorm.includes(aNorm);
}

/**
 * Merges a user interruption requirement into the current architecture.
 * Interprets the requirement as an evolving modification rather than an isolated action.
 */
export function mergeRequirementWithIR(
  currentIR: ArchitectureIR,
  requirementText: string,
  interpreter: DeterministicArchitectureInterpreter
): {
  updatedIR: ArchitectureIR;
  summary: string;
} {
  let components: ArchitectureComponent[] = [...currentIR.components];
  let relationships: ArchitectureRelationship[] = [...currentIR.relationships];
  const detectedTechnologies = new Set<string>(currentIR.technologies || []);
  const actionsTaken: string[] = [];

  const text = requirementText.trim();

  // Helper to find a component in the working set
  const findCompIndex = (query: string): number => {
    const qNorm = query.toLowerCase().replace(/[^a-z0-9]/g, '');
    return components.findIndex((c) => {
      const cNorm = c.name.toLowerCase().replace(/[^a-z0-9]/g, '');
      return cNorm === qNorm || cNorm.includes(qNorm) || qNorm.includes(cNorm);
    });
  };

  // 1. ACTION: REPLACEMENTS
  // Patterns:
  // "replace X with Y" / "change X to Y" / "switch X to Y"
  // "use Y instead of X"
  const replaceMatches: Array<{ oldTarget: string; newTarget: string }> = [];

  const replaceRegex =
    /(?:replace|change|switch)\s+([a-z0-9\s_-]+?)\s+(?:with|to)\s+([a-z0-9\s_-]+?)(?=[.,;!?]|\s+(?:and\s+add|also\s+add|and|also|plus|\.|$)|$)/gi;
  let rm: RegExpExecArray | null;
  while ((rm = replaceRegex.exec(text)) !== null) {
    replaceMatches.push({ oldTarget: rm[1].trim(), newTarget: rm[2].trim() });
  }

  const useInsteadRegex =
    /(?:use|switch\s+to)\s+([a-z0-9\s_-]+?)\s+instead\s+of\s+([a-z0-9\s_-]+?)(?=[.,;!?]|\s+(?:and\s+add|also\s+add|and|also|plus|\.|$)|$)/gi;
  while ((rm = useInsteadRegex.exec(text)) !== null) {
    replaceMatches.push({ oldTarget: rm[2].trim(), newTarget: rm[1].trim() });
  }

  // Fallback direct self-correction: e.g. "Actually, use RabbitMQ" or "Switch to MongoDB"
  if (replaceMatches.length === 0) {
    const directUseRegex =
      /^(?:actually,?\s*|wait,?\s*|no,?\s*)?(?:use|switch\s+to)\s+([a-z0-9_-]+)(?:\s+(?:queue|database|cache|storage|broker|service))?(?:\s*$|[.,;!?]|\s*for\s+.*)/i;
    const directMatch = text.match(directUseRegex);
    if (directMatch) {
      const candidateTech = directMatch[1].trim();
      const classified = interpreter.classifySingleComponent(candidateTech, detectedTechnologies);
      if (classified) {
        const matchIdx = components.findIndex((c) => c.type === classified.type);
        if (matchIdx !== -1) {
          replaceMatches.push({ oldTarget: components[matchIdx].name, newTarget: candidateTech });
        }
      }
    }
  }

  for (const { oldTarget, newTarget } of replaceMatches) {
    const oldIdx = findCompIndex(oldTarget);
    if (oldIdx !== -1) {
      const oldComp = components[oldIdx];
      const newComps = interpreter.extractAndClassifyComponents(newTarget, detectedTechnologies);
      const newComp = newComps[0] || interpreter.classifySingleComponent(newTarget, detectedTechnologies);

      if (newComp) {
        components[oldIdx] = newComp;
        actionsTaken.push(`Replaced ${oldComp.name} with ${newComp.name}`);

        // Rewire relationships incident to oldComp
        relationships = relationships.map((r) => {
          if (r.source === oldComp.id) return { ...r, source: newComp.id };
          if (r.target === oldComp.id) return { ...r, target: newComp.id };
          return r;
        });
      }
    }
  }

  // 2. ACTION: TECHNOLOGY UPGRADE / COMPONENT USES TECHNOLOGY
  // e.g. "notification service should use MongoDB" / "X uses Y"
  const techUsageRegex =
    /([a-z0-9\s_-]+?)\s+(?:should\s+use|uses?|backed\s+by)\s+([a-z0-9\s_-]+?)(?=[.,;!?]|\s+(?:and|also|plus|\.|$)|$)/gi;
  let tum: RegExpExecArray | null;
  while ((tum = techUsageRegex.exec(text)) !== null) {
    const compQuery = tum[1].trim();
    const techQuery = tum[2].trim();

    const compIdx = findCompIndex(compQuery);
    if (compIdx !== -1) {
      const comp = components[compIdx];
      const techComps = interpreter.extractAndClassifyComponents(techQuery, detectedTechnologies);
      const techComp = techComps[0] || interpreter.classifySingleComponent(techQuery, detectedTechnologies);

      if (techComp) {
        // If the tech component (e.g. MongoDB) is not in components, add it
        if (!components.some((c) => isMatchingComponent(c, techComp))) {
          components.push(techComp);
        }

        // Add relationship: comp -> techComp
        const relType =
          techComp.type === 'database' || techComp.type === 'storage'
            ? 'STORES_IN'
            : techComp.type === 'cache'
            ? 'USES'
            : 'CALLS';

        // Disconnect previous database if comp now has a dedicated database
        if (relType === 'STORES_IN') {
          relationships = relationships.filter(
            (r) => !(r.source === comp.id && r.relationship === 'STORES_IN' && r.target !== techComp.id)
          );
        }

        if (!relationships.some((r) => r.source === comp.id && r.target === techComp.id)) {
          relationships.push({
            source: comp.id,
            target: techComp.id,
            relationship: relType,
            description: `${comp.name} → ${techComp.name}`,
          });
        }
        actionsTaken.push(`Connected ${comp.name} to ${techComp.name}`);
      }
    }
  }

  // 3. ACTION: ADDITIONS
  // e.g. "add a recommendation service" / "also add a notification service" / "Add asynchronous video processing using RabbitMQ and a video processing service"
  const addRegex =
    /(?:(?:and|also)\s+)?(?:add|attach|introduce|provision)\s+(?:a|an|the)?\s*([a-z0-9\s_-]+?)(?=[.,;!?]|\s+(?:and\s+add|also\s+add|meanwhile|\.|$)|$)/gi;
  let am: RegExpExecArray | null;
  while ((am = addRegex.exec(text)) !== null) {
    const rawAddition = am[1].trim();

    // Check if the addition phrase contains compound components or prepositions:
    // e.g. "asynchronous video processing using RabbitMQ and a video processing service"
    // or "recommendation service connected to product catalog and redis"
    const extractedAdditions = interpreter.extractAndClassifyComponents(rawAddition, detectedTechnologies);

    // If extractAndClassifyComponents didn't split tokens like "using RabbitMQ and ...", extract tokens
    let additionTokens: ArchitectureComponent[] = extractedAdditions;
    if (additionTokens.length === 0 || rawAddition.includes('using') || rawAddition.includes('with')) {
      const tokens = interpreter.extractComponentTokens(rawAddition);
      additionTokens = [];
      for (const t of tokens) {
        additionTokens.push(...interpreter.extractAndClassifyComponents(t, detectedTechnologies));
      }
    }

    if (additionTokens.length === 0) {
      const single = interpreter.classifySingleComponent(rawAddition, detectedTechnologies);
      if (single) additionTokens.push(single);
    }

    for (const newComp of additionTokens) {
      if (!components.some((c) => isMatchingComponent(c, newComp))) {
        components.push(newComp);
        actionsTaken.push(`Added ${newComp.name}`);

        // Wire newly added component to appropriate neighbors:
        // A. If new component is a service/agent:
        if (newComp.type === 'service' || newComp.type === 'agent') {
          // Ingress: connect from API Gateway or client
          const gateway = components.find((c) => c.type === 'api');
          const client = components.find((c) => c.type === 'client' || c.type === 'user');
          if (gateway) {
            relationships.push({
              source: gateway.id,
              target: newComp.id,
              relationship: 'CALLS',
              description: `${gateway.name} → ${newComp.name}`,
            });
          } else if (client) {
            relationships.push({
              source: client.id,
              target: newComp.id,
              relationship: 'CALLS',
              description: `${client.name} → ${newComp.name}`,
            });
          }

          // Persistence: connect to existing databases/caches
          const databases = components.filter((c) => c.type === 'database');
          const caches = components.filter((c) => c.type === 'cache');

          // If addition mentions cache/redis or recommendation service
          if (caches.length > 0 && (newComp.name.toLowerCase().includes('recommendation') || rawAddition.includes('redis') || rawAddition.includes('cache'))) {
            caches.forEach((cache) => {
              relationships.push({
                source: newComp.id,
                target: cache.id,
                relationship: 'USES',
                description: `${newComp.name} → ${cache.name}`,
              });
            });
          }

          // Connect to database if general service
          if (databases.length > 0 && !newComp.name.toLowerCase().includes('router')) {
            const primaryDb = databases[0];
            relationships.push({
              source: newComp.id,
              target: primaryDb.id,
              relationship: 'STORES_IN',
              description: `${newComp.name} → ${primaryDb.name}`,
            });
          }

          // If this is a processing service / worker, connect any existing queue as input
          if (newComp.name.toLowerCase().includes('processing') || newComp.name.toLowerCase().includes('worker')) {
            const queue = components.find((c) => c.type === 'queue');
            if (queue && !relationships.some((r) => r.source === queue.id && r.target === newComp.id)) {
              relationships.push({
                source: queue.id,
                target: newComp.id,
                relationship: 'CONSUMES_FROM',
                description: `${queue.name} → ${newComp.name}`,
              });
            }
          }
        }

        // B. If new component is a queue (e.g. RabbitMQ):
        if (newComp.type === 'queue') {
          // Connect upstream services to queue
          const upstreamServices = components.filter(
            (c) => c.type === 'service' && c.id !== newComp.id && !c.name.toLowerCase().includes('processing') && !c.name.toLowerCase().includes('worker')
          );
          if (upstreamServices.length > 0) {
            const producer = upstreamServices[0];
            relationships.push({
              source: producer.id,
              target: newComp.id,
              relationship: 'PUBLISHES_TO',
              description: `${producer.name} → ${newComp.name}`,
            });
          }

          // Connect queue to downstream worker / processing service
          const downstreamWorker = components.find(
            (c) => c.id !== newComp.id && (c.name.toLowerCase().includes('processing') || c.name.toLowerCase().includes('worker'))
          );
          if (downstreamWorker) {
            relationships.push({
              source: newComp.id,
              target: downstreamWorker.id,
              relationship: 'CONSUMES_FROM',
              description: `${newComp.name} → ${downstreamWorker.name}`,
            });
          }
        }
      }
    }
  }

  // 4. ACTION: REMOVALS
  // e.g. "remove X" / "delete X" / "drop X"
  const removeRegex = /(?:remove|delete|drop|disconnect)\s+([a-z0-9\s_-]+?)(?=\s+(?:and|also|\.|$)|$)/gi;
  let remMatch: RegExpExecArray | null;
  while ((remMatch = removeRegex.exec(text)) !== null) {
    const targetName = remMatch[1].trim();
    const idx = findCompIndex(targetName);
    if (idx !== -1) {
      const compToRemove = components[idx];
      components.splice(idx, 1);
      relationships = relationships.filter(
        (r) => r.source !== compToRemove.id && r.target !== compToRemove.id
      );
      actionsTaken.push(`Removed ${compToRemove.name}`);
    }
  }

  // Clean and deduplicate relationships
  const validComponentIds = new Set(components.map((c) => c.id));
  relationships = relationships.filter(
    (r) => r.source !== r.target && validComponentIds.has(r.source) && validComponentIds.has(r.target)
  );

  const seenRels = new Set<string>();
  const deduplicatedRels: ArchitectureRelationship[] = [];
  for (const r of relationships) {
    const key = `${r.source}__${r.target}`;
    if (!seenRels.has(key)) {
      seenRels.add(key);
      deduplicatedRels.push(r);
    }
  }

  // Ensure graph connectivity for newly added components
  for (const comp of components) {
    if (comp.type !== 'user' && comp.type !== 'client') {
      const hasIncoming = deduplicatedRels.some((r) => r.target === comp.id);
      if (!hasIncoming) {
        const potentialSources = components.filter(
          (c) => c.id !== comp.id && (c.type === 'api' || c.type === 'service' || c.type === 'queue')
        );
        if (potentialSources.length > 0) {
          const src = potentialSources[0];
          deduplicatedRels.push({
            source: src.id,
            target: comp.id,
            relationship: 'CALLS',
            description: `${src.name} → ${comp.name}`,
          });
        }
      }
    }
  }

  const technologies = Array.from(
    new Set(
      components
        .map((c) => c.technology)
        .filter(Boolean) as string[]
    )
  );

  const updatedIR: ArchitectureIR = {
    components,
    relationships: deduplicatedRels,
    technologies,
    requirements: [...(currentIR.requirements || []), text],
  };

  const summary =
    actionsTaken.length > 0
      ? `Replanned architecture: ${actionsTaken.join(', ')}.`
      : `Replanned architecture based on "${text}".`;

  return { updatedIR, summary };
}

/**
 * Diffs the current graph state against the desired ArchitectureIR.
 * Categorizes nodes and edges into additions, removals/supersessions, and unchanged.
 */
export function diffArchitecture(
  currentGraphState: { nodes: GraphNode[]; edges: GraphEdge[] },
  desiredIR: ArchitectureIR
): ArchitectureDiff {
  const activeNodes = currentGraphState.nodes.filter(
    (n) => n.status !== 'superseded' && n.status !== 'failed'
  );
  const activeEdges = currentGraphState.edges.filter((e) => e.status !== 'superseded');

  const nodesToAdd: ArchitectureComponent[] = [];
  const nodesToSupersede: { node: GraphNode; reason: string }[] = [];
  const nodesUnchanged: GraphNode[] = [];

  // Match desired components against active nodes in the graph
  for (const desiredComp of desiredIR.components) {
    const existingNode = activeNodes.find((n) => isMatchingNode(n, desiredComp));
    if (existingNode) {
      nodesUnchanged.push(existingNode);
    } else {
      nodesToAdd.push(desiredComp);
    }
  }

  // Find active nodes that are no longer part of the desired architecture
  for (const activeNode of activeNodes) {
    const isRetained = desiredIR.components.some((c) => isMatchingNode(activeNode, c));
    if (!isRetained) {
      nodesToSupersede.push({
        node: activeNode,
        reason: `Superseded by updated architecture requirement`,
      });
    }
  }

  const supersededNodeIds = new Set(nodesToSupersede.map((item) => item.node.id));

  // Edges diff
  const edgesToSupersede: { edge: GraphEdge; reason: string }[] = [];
  const edgesToAdd: ArchitectureRelationship[] = [];
  const edgesUnchanged: GraphEdge[] = [];

  // Any edge incident to a superseded node must be superseded
  for (const activeEdge of activeEdges) {
    if (supersededNodeIds.has(activeEdge.source) || supersededNodeIds.has(activeEdge.target)) {
      edgesToSupersede.push({
        edge: activeEdge,
        reason: `Incident to superseded node`,
      });
    } else {
      // Check if this edge exists in desired relationships
      const isRetainedRel = desiredIR.relationships.some((rel) => {
        // Map rel sources/targets to node IDs
        const srcNode = activeNodes.find((n) => n.id === rel.source || isMatchingNode(n, { id: rel.source, name: rel.source, type: 'service' }));
        const tgtNode = activeNodes.find((n) => n.id === rel.target || isMatchingNode(n, { id: rel.target, name: rel.target, type: 'service' }));
        return (
          (activeEdge.source === rel.source || (srcNode && activeEdge.source === srcNode.id)) &&
          (activeEdge.target === rel.target || (tgtNode && activeEdge.target === tgtNode.id))
        );
      });

      if (isRetainedRel) {
        edgesUnchanged.push(activeEdge);
      }
    }
  }

  // Desired relationships that do not exist yet in activeEdges
  for (const rel of desiredIR.relationships) {
    // Resolve source & target IDs in the graph
    const resolvedSrc = resolveComponentId(rel.source, currentGraphState.nodes, desiredIR.components);
    const resolvedTgt = resolveComponentId(rel.target, currentGraphState.nodes, desiredIR.components);

    const alreadyExists = activeEdges.some(
      (e) =>
        e.status !== 'superseded' &&
        (e.source === resolvedSrc || e.source === rel.source) &&
        (e.target === resolvedTgt || e.target === rel.target)
    );

    if (!alreadyExists) {
      edgesToAdd.push({
        ...rel,
        source: resolvedSrc,
        target: resolvedTgt,
      });
    }
  }

  return {
    nodesToAdd,
    nodesToSupersede,
    nodesUnchanged,
    edgesToAdd,
    edgesToSupersede,
    edgesUnchanged,
  };
}

/**
 * Resolves a component identifier to an active node ID in the graph if available.
 */
function resolveComponentId(
  idOrName: string,
  existingNodes: GraphNode[],
  desiredComponents: ArchitectureComponent[]
): string {
  const directNode = existingNodes.find((n) => n.id === idOrName);
  if (directNode) return directNode.id;

  const comp = desiredComponents.find((c) => c.id === idOrName || c.name.toLowerCase() === idOrName.toLowerCase());
  if (comp) {
    const matchedNode = existingNodes.find((n) => n.status !== 'superseded' && isMatchingNode(n, comp));
    if (matchedNode) return matchedNode.id;
    return comp.id;
  }

  return idOrName;
}

/**
 * Generates progressive GraphOperations from an ArchitectureDiff.
 * Guarantees that:
 * 1. Stale nodes and edges are superseded.
 * 2. Unchanged nodes stay untouched without re-adding.
 * 3. All newly added components and edges receive valid operations and layout coordinates.
 * 4. The entire updated architecture completes building.
 */
export function generateOperationsFromDiff(
  diff: ArchitectureDiff,
  currentGraphState: { nodes: GraphNode[]; edges: GraphEdge[] },
  newIntentId: string,
  baseVersion: number,
  createOp: (
    type: GraphOperation['type'],
    desc: string,
    targetKey: string,
    data: { node?: GraphNode; edge?: GraphEdge; targetId?: string }
  ) => GraphOperation
): GraphOperation[] {
  const operations: GraphOperation[] = [];

  // 1. Supersede removed edges first
  for (const { edge } of diff.edgesToSupersede) {
    operations.push(
      createOp('SUPERSEDE_EDGE', `Deprecate link ${edge.source} → ${edge.target}`, edge.id, {
        targetId: edge.id,
      })
    );
  }

  // 2. Supersede removed nodes
  for (const { node } of diff.nodesToSupersede) {
    operations.push(
      createOp('SUPERSEDE_NODE', `Supersede ${node.label}`, node.id, {
        targetId: node.id,
      })
    );
  }

  // 3. Layout calculation for all nodes in the desired architecture (unchanged + added)
  const fullDesiredNodes: GraphNode[] = [
    ...diff.nodesUnchanged,
    ...diff.nodesToAdd.map((comp) => ({
      id: comp.id,
      type: comp.type as NodeType,
      label: comp.name,
      description: comp.description,
      status: 'pending' as const,
      metadata: {
        technology: comp.technology,
      },
    })),
  ];

  const fullDesiredEdges: GraphEdge[] = [
    ...diff.edgesUnchanged,
    ...diff.edgesToAdd.map((rel) => ({
      id: `edge-${rel.source.replace(/^node-/, '')}-${rel.target.replace(/^node-/, '')}-${Date.now().toString(36).slice(-4)}`,
      source: rel.source,
      target: rel.target,
      label: rel.description || rel.relationship,
      status: 'pending' as const,
    })),
  ];

  const layout = calculateLayout(fullDesiredNodes, fullDesiredEdges, 'LR');
  const layoutedNodeMap = new Map(layout.nodes.map((n) => [n.id, n]));

  // 4. Add new nodes, sorted horizontally by layout X coordinate
  const sortedNewNodes = diff.nodesToAdd
    .map((comp) => layoutedNodeMap.get(comp.id) || {
      id: comp.id,
      type: comp.type as NodeType,
      label: comp.name,
      description: comp.description,
      status: 'pending' as const,
      metadata: { technology: comp.technology },
      position: { x: 100, y: 100 },
    })
    .sort((a, b) => (a.position?.x ?? 0) - (b.position?.x ?? 0));

  for (const node of sortedNewNodes) {
    operations.push(
      createOp(
        'ADD_NODE',
        `Deploy ${node.label} (${node.type.toUpperCase()})`,
        node.id,
        { node }
      )
    );
  }

  // 5. Add new edges
  for (const rel of diff.edgesToAdd) {
    const srcNode = layoutedNodeMap.get(rel.source) || currentGraphState.nodes.find((n) => n.id === rel.source);
    const tgtNode = layoutedNodeMap.get(rel.target) || currentGraphState.nodes.find((n) => n.id === rel.target);
    const srcLabel = srcNode ? srcNode.label : rel.source;
    const tgtLabel = tgtNode ? tgtNode.label : rel.target;

    const edge: GraphEdge = {
      id: `edge-${rel.source.replace(/^node-/, '')}-${rel.target.replace(/^node-/, '')}-${Date.now().toString(36).slice(-4)}`,
      source: rel.source,
      target: rel.target,
      label: rel.description || rel.relationship,
      status: 'pending',
    };

    operations.push(
      createOp(
        'ADD_EDGE',
        `Connect ${srcLabel} → ${tgtLabel}`,
        edge.id,
        { edge }
      )
    );
  }

  return operations;
}

/**
 * Universal architecture replanning engine.
 * Orchestrates complete replan on interruption:
 * Current Architecture IR + New Requirement -> Updated IR -> Diff -> Operations -> Complete Execution.
 */
export function replanArchitecture(
  newIntent: Intent,
  graphState: { nodes: GraphNode[]; edges: GraphEdge[]; version: number },
  activeOperations: GraphOperation[],
  fallbackIR: ArchitectureIR | null,
  createOp: (
    type: GraphOperation['type'],
    desc: string,
    targetKey: string,
    data: { node?: GraphNode; edge?: GraphEdge; targetId?: string }
  ) => GraphOperation
): ReplanResult {
  const interpreter = new DeterministicArchitectureInterpreter();

  // 1. Derive current canonical architecture
  const currentIR = deriveIRFromGraphState(graphState.nodes, graphState.edges, fallbackIR);

  // 2. Merge user requirement into current architecture to create UPDATED Architecture IR
  const { updatedIR, summary } = mergeRequirementWithIR(currentIR, newIntent.text, interpreter);

  // 3. Diff updated Architecture IR against current graph state
  const diff = diffArchitecture(graphState, updatedIR);

  // 4. Generate operations to execute the diff
  const operations = generateOperationsFromDiff(
    diff,
    graphState,
    newIntent.id,
    graphState.version,
    createOp
  );

  return {
    updatedIR,
    operations,
    summary,
  };
}
