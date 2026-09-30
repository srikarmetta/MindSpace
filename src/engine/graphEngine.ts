import dagre from '@dagrejs/dagre';
import type { GraphNode, GraphEdge } from '../types/graph';
import type { Node, Edge } from '@xyflow/react';

export const NODE_WIDTH = 230;
export const NODE_HEIGHT = 90;

/**
 * Deterministic fallback layout in case dagre encounters cyclic edges or fails.
 * Organizes nodes in columns based on topological rank or connection depth.
 */
function calculateDeterministicLayout(
  nodes: GraphNode[],
  edges: GraphEdge[],
  direction: 'LR' | 'TB' = 'LR'
): GraphNode[] {
  const nodeMap = new Map<string, GraphNode>();
  nodes.forEach((n) => nodeMap.set(n.id, n));

  const validEdges = edges.filter(
    (e) => nodeMap.has(e.source) && nodeMap.has(e.target) && e.status !== 'superseded'
  );

  // In-degree & adjacency
  const inDegree = new Map<string, number>();
  const adj = new Map<string, string[]>();
  nodes.forEach((n) => {
    inDegree.set(n.id, 0);
    adj.set(n.id, []);
  });

  validEdges.forEach((e) => {
    inDegree.set(e.target, (inDegree.get(e.target) || 0) + 1);
    adj.get(e.source)?.push(e.target);
  });

  // Calculate rank/column for each node
  const ranks = new Map<string, number>();
  const queue: string[] = [];

  // Roots (in-degree 0) get rank 0
  nodes.forEach((n) => {
    if ((inDegree.get(n.id) || 0) === 0) {
      ranks.set(n.id, 0);
      queue.push(n.id);
    }
  });

  // BFS to propagate ranks
  while (queue.length > 0) {
    const curr = queue.shift()!;
    const currRank = ranks.get(curr) || 0;
    const neighbors = adj.get(curr) || [];
    for (const neighbor of neighbors) {
      const existingRank = ranks.get(neighbor) || 0;
      if (currRank + 1 > existingRank) {
        ranks.set(neighbor, currRank + 1);
        queue.push(neighbor);
      }
    }
  }

  // Any unranked nodes get rank based on their logical category
  nodes.forEach((n, idx) => {
    if (!ranks.has(n.id)) {
      if (n.type === 'user') ranks.set(n.id, 0);
      else if (n.type === 'api') ranks.set(n.id, 1);
      else if (n.type === 'agent' || n.type === 'service') ranks.set(n.id, 2);
      else if (n.type === 'queue' || n.type === 'cache') ranks.set(n.id, 3);
      else if (n.type === 'database' || n.type === 'storage') ranks.set(n.id, 4);
      else ranks.set(n.id, idx);
    }
  });

  // Group nodes by rank
  const rankGroups = new Map<number, GraphNode[]>();
  nodes.forEach((n) => {
    const r = ranks.get(n.id) || 0;
    if (!rankGroups.has(r)) rankGroups.set(r, []);
    rankGroups.get(r)!.push(n);
  });

  const layouted: GraphNode[] = [];
  const colSpacing = 340;
  const rowSpacing = 140;

  rankGroups.forEach((groupNodes, rank) => {
    groupNodes.forEach((node, rowIdx) => {
      let x = 60 + rank * colSpacing;
      let y = 60 + rowIdx * rowSpacing;

      if (direction === 'TB') {
        x = 60 + rowIdx * colSpacing;
        y = 60 + rank * rowSpacing;
      }

      layouted.push({
        ...node,
        position: { x, y },
      });
    });
  });

  return layouted;
}

/**
 * Calculates graph node positions with Dagre and deterministic fallback.
 * Strictly guarantees valid, non-negative, finite coordinates for every node.
 */
export function calculateLayout(
  nodes: GraphNode[],
  edges: GraphEdge[],
  direction: 'LR' | 'TB' = 'LR'
): { nodes: GraphNode[]; edges: GraphEdge[] } {
  if (nodes.length === 0) {
    return { nodes: [], edges: [] };
  }

  const nodeMap = new Map<string, GraphNode>();
  nodes.forEach((n) => nodeMap.set(n.id, n));

  // Only consider edges where BOTH source and target exist
  const validEdges = edges.filter(
    (e) => nodeMap.has(e.source) && nodeMap.has(e.target)
  );

  try {
    const dagreGraph = new dagre.graphlib.Graph();
    dagreGraph.setDefaultEdgeLabel(() => ({}));

    dagreGraph.setGraph({
      rankdir: direction,
      nodesep: 60,
      ranksep: 110,
      marginx: 60,
      marginy: 60,
    });

    nodes.forEach((node) => {
      dagreGraph.setNode(node.id, { width: NODE_WIDTH, height: NODE_HEIGHT });
    });

    validEdges.forEach((edge) => {
      dagreGraph.setEdge(edge.source, edge.target);
    });

    dagre.layout(dagreGraph);

    let hasInvalidPos = false;
    let minX = Infinity;
    let minY = Infinity;

    const layoutedNodes: GraphNode[] = nodes.map((node) => {
      const nodeWithPos = dagreGraph.node(node.id);
      if (!nodeWithPos || isNaN(nodeWithPos.x) || isNaN(nodeWithPos.y)) {
        hasInvalidPos = true;
        return {
          ...node,
          position: node.position || { x: 60, y: 60 },
        };
      }

      const x = nodeWithPos.x - NODE_WIDTH / 2;
      const y = nodeWithPos.y - NODE_HEIGHT / 2;

      if (x < minX) minX = x;
      if (y < minY) minY = y;

      return {
        ...node,
        position: { x, y },
      };
    });

    // If dagre failed or gave invalid coordinates, use deterministic fallback
    if (hasInvalidPos) {
      return {
        nodes: calculateDeterministicLayout(nodes, validEdges, direction),
        edges,
      };
    }

    // Offset if anything is shifted negative
    const offsetX = minX < 40 ? 40 - minX : 0;
    const offsetY = minY < 40 ? 40 - minY : 0;

    if (offsetX > 0 || offsetY > 0) {
      return {
        nodes: layoutedNodes.map((n) => ({
          ...n,
          position: {
            x: Math.round((n.position?.x ?? 0) + offsetX),
            y: Math.round((n.position?.y ?? 0) + offsetY),
          },
        })),
        edges,
      };
    }

    return {
      nodes: layoutedNodes.map((n) => ({
        ...n,
        position: {
          x: Math.round(n.position?.x ?? 0),
          y: Math.round(n.position?.y ?? 0),
        },
      })),
      edges,
    };
  } catch (err) {
    console.warn('[Layout Engine] Dagre layout encountered issue, using deterministic layout fallback:', err);
    return {
      nodes: calculateDeterministicLayout(nodes, validEdges, direction),
      edges,
    };
  }
}

/**
 * Converts internal GraphNode to React Flow Node
 */
export function toReactFlowNodes(nodes: GraphNode[]): Node[] {
  return nodes.map((node, index) => {
    const validPos =
      node.position &&
      typeof node.position.x === 'number' &&
      typeof node.position.y === 'number' &&
      !isNaN(node.position.x) &&
      !isNaN(node.position.y);

    const position = validPos ? node.position! : { x: 60 + index * 320, y: 100 };

    return {
      id: node.id,
      type: 'architecture',
      position,
      data: {
        id: node.id,
        label: node.label,
        nodeType: node.type,
        type: node.type,
        status: node.status,
        description: node.description,
        metadata: node.metadata,
      },
    };
  });
}

/**
 * Converts internal GraphEdge to React Flow Edge
 */
export function toReactFlowEdges(edges: GraphEdge[], nodes?: GraphNode[]): Edge[] {
  const nodeIds = nodes ? new Set(nodes.map((n) => n.id)) : null;

  return edges
    .filter((edge) => (nodeIds ? nodeIds.has(edge.source) && nodeIds.has(edge.target) : true))
    .map((edge) => {
      const isSuperseded = edge.status === 'superseded';
      const isPending = edge.status === 'pending';

      return {
        id: edge.id,
        source: edge.source,
        target: edge.target,
        label: edge.label,
        type: 'default',
        animated: edge.status === 'active' || edge.status === 'pending',
        style: {
          stroke: isSuperseded ? '#52525b' : isPending ? '#818cf8' : '#6366f1',
          strokeWidth: isSuperseded ? 1.5 : 2.5,
          strokeDasharray: isSuperseded ? '5 5' : isPending ? '4 4' : undefined,
          opacity: isSuperseded ? 0.35 : 1,
        },
        labelStyle: {
          fill: isSuperseded ? '#71717a' : '#cbd5e1',
          fontSize: 11,
          fontFamily: 'monospace',
          fontWeight: 600,
        },
        labelBgStyle: {
          fill: '#090b10',
          fillOpacity: 0.9,
        },
        labelBgPadding: [6, 4] as [number, number],
        labelBgBorderRadius: 4,
      };
    });
}
