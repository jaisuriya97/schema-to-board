import React from 'react';
import { ReactFlow, MiniMap, Controls, Background, BackgroundVariant, MarkerType } from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import useStore from '../store/useStore';
import TableNode from './TableNode';

// Map custom node types
const nodeTypes = {
  tableNode: TableNode,
};

export default function DiagramCanvas() {
  const nodes = useStore((state) => state.nodes);
  const edges = useStore((state) => state.edges);
  const showMinimap = useStore((state) => state.showMinimap);
  const onNodesChange = useStore((state) => state.onNodesChange);
  const onEdgesChange = useStore((state) => state.onEdgesChange);

  return (
    <div className="flex-1 h-full w-full bg-[#ffffff] dark:bg-[#282a36] relative transition-colors duration-200">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        nodeTypes={nodeTypes}
        defaultEdgeOptions={{
          type: 'bezier',
          style: { strokeWidth: 2, stroke: '#6366f1', strokeDasharray: '8,4' },
          markerEnd: { type: MarkerType.ArrowClosed, color: '#6366f1' },
        }}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        minZoom={0.1}
        maxZoom={2}
        className="touch-none"
        colorMode="dark"
        deleteKeyCode={null}
        nodesConnectable={false}
        elementsSelectable={false}
      >
        <Background 
          color="#6272a4"
          variant={BackgroundVariant.Dots} 
          gap={24} 
          size={2} 
        />
        <Controls className="!bg-[#1E1F29] !border-[#6272a4] !fill-[#f8f8f2]" />
        {showMinimap && (
          <MiniMap
            className="!bg-[#1E1F29] !border-[#6272a4]"
            maskColor="rgba(30, 31, 41, 0.7)"
            nodeColor="#6366f1"
          />
        )}
      </ReactFlow>

      {/* Empty State Overlay */}
      {nodes.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="text-surface-400 flex flex-col items-center gap-4 animate-pulse">
            <svg className="w-16 h-16 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
            </svg>
            <p className="text-lg font-medium">Paste a schema and hit Generate ERD</p>
          </div>
        </div>
      )}
    </div>
  );
}
