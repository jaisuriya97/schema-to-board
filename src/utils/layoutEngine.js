import dagre from '@dagrejs/dagre';

const nodeWidth = 300; // Safe bounding width for our 280px nodes

/**
 * Apply Dagre auto-layout to a set of React Flow nodes and edges.
 * Arranges tables in a hierarchical flow so they don't overlap.
 *
 * @param {Array} nodes - React Flow nodes
 * @param {Array} edges - React Flow edges
 * @param {String} direction - Layout direction: 'LR' (Left-to-Right) or 'TB' (Top-to-Bottom)
 * @returns {{ nodes: Array, edges: Array }} - Layouted nodes and edges
 */
export function getLayoutedElements(nodes, edges, direction = 'LR') {
  const dagreGraph = new dagre.graphlib.Graph();
  dagreGraph.setDefaultEdgeLabel(() => ({}));

  // Set reasonable margins and exact separation so it's compact but doesn't overlap
  dagreGraph.setGraph({ 
    rankdir: direction, 
    marginx: 50, 
    marginy: 50, 
    ranksep: 100, // Distance between ranks of tables
    nodesep: 80   // Distance between tables in the same rank
  });

  // Calculate actual node dimensions based on number of columns
  const getNodeHeight = (node) => {
    const columns = node.data?.table?.columns?.length || 1;
    // 60px header/footer offset + 34px per column row
    return 60 + (columns * 34);
  };

  // Add nodes to dagre
  nodes.forEach((node) => {
    const exactHeight = getNodeHeight(node);
    dagreGraph.setNode(node.id, { width: nodeWidth, height: exactHeight });
  });

  // Add edges to dagre
  edges.forEach((edge) => {
    dagreGraph.setEdge(edge.source, edge.target);
  });

  // Calculate layout
  dagre.layout(dagreGraph);

  // Apply calculated positions back to React Flow nodes
  const layoutedNodes = nodes.map((node) => {
    const nodeWithPosition = dagreGraph.node(node.id);
    const exactHeight = getNodeHeight(node);
    
    // Dagre returns the center point; React Flow needs the top-left coordinate.
    const newX = nodeWithPosition.x - nodeWidth / 2;
    const newY = nodeWithPosition.y - exactHeight / 2;

    return {
      ...node,
      position: { x: newX, y: newY },
      targetPosition: direction === 'LR' ? 'left' : 'top',
      sourcePosition: direction === 'LR' ? 'right' : 'bottom',
    };
  });

  return { nodes: layoutedNodes, edges };
}
