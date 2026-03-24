import { create } from 'zustand';
import { applyNodeChanges, applyEdgeChanges, addEdge, MarkerType } from '@xyflow/react';
import { parseSchema } from '../utils/parsers/parseSchema';
import { getLayoutedElements } from '../utils/layoutEngine';
import { renameTableInSchema, renameColumnInSchema, addRelationToSchema, changeColumnTypeInSchema, togglePrimaryKeyInSchema } from '../utils/schemaUpdater';

const useStore = create((set, get) => ({
  layoutDirection: 'LR',
  toggleLayoutDirection: () => {
    const newDir = get().layoutDirection === 'LR' ? 'TB' : 'LR';
    set({ layoutDirection: newDir });
    // Immediately re-generate layout if schema exists
    if (get().rawSchema.trim()) {
      get().generateERD();
    }
  },

  showMinimap: true,
  toggleMinimap: () => set((state) => ({ showMinimap: !state.showMinimap })),

  // Raw input
  rawSchema: '',
  setRawSchema: (code) => set({ rawSchema: code }),

  // Parsing & UI State
  error: null,
  isGenerating: false,

  // React Flow State
  nodes: [],
  edges: [],

  // Handlers for React Flow interactivity
  onNodesChange: (changes) => {
    // Permanently block UI deletions
    const safeChanges = changes.filter(c => c.type !== 'remove');
    if (safeChanges.length > 0) {
      set({ nodes: applyNodeChanges(safeChanges, get().nodes) });
    }
  },
  onEdgesChange: (changes) => {
    // Permanently block UI deletions
    const safeChanges = changes.filter(c => c.type !== 'remove');
    if (safeChanges.length > 0) {
      set({ edges: applyEdgeChanges(safeChanges, get().edges) });
    }
  },

  // Bidirectional UI -> Code Synchronization
  updateSchemaEntity: (type, tableName, oldVal, newVal) => {
    if (oldVal === newVal || !newVal.trim()) return;

    set((state) => {
      if (!state.rawSchema) return state;
      let newSchema = state.rawSchema;
      
      if (type === 'table') {
        newSchema = renameTableInSchema(newSchema, oldVal, newVal);
      } else if (type === 'column') {
        newSchema = renameColumnInSchema(newSchema, tableName, oldVal, newVal);
      } else if (type === 'columnType') {
        newSchema = changeColumnTypeInSchema(newSchema, tableName, oldVal, newVal);
      } else if (type === 'togglePK') {
        newSchema = togglePrimaryKeyInSchema(newSchema, tableName, oldVal);
      }
      
      return { rawSchema: newSchema };
    });

    // Auto-regenerate ERD from the new schema text
    get().generateERD();
  },

  // Core Action: Parse logic to React Flow State
  generateERD: () => {
    const { rawSchema } = get();
    if (!rawSchema.trim()) {
      set({ error: 'Please enter a valid SQL schema.', nodes: [], edges: [] });
      return;
    }

    set({ isGenerating: true, error: null });

    try {
      // 1. Parse raw text to our normalized JSON format
      const parsedData = parseSchema(rawSchema);

      // 2. Map JSON Tables -> React Flow Nodes
      const initialNodes = parsedData.tables.map((table) => ({
        id: table.name,
        type: 'tableNode', // Maps to our custom node component
        position: { x: 0, y: 0 }, // Will be overwritten by layout engine immediately
        data: { table },
      }));

      // 3. Map JSON Relationships -> React Flow Edges
      // Dracula-inspired palette for relationship lines
      const edgeColors = [
        '#8be9fd', // Cyan
        '#50fa7b', // Green
        '#ffb86c', // Orange
        '#ff79c6', // Pink
        '#6366f1', // Purple
        '#ff5555', // Red
        '#f1fa8c', // Yellow
      ];

      // Simple hash to deterministically pick a color based on the target table string
      const getColorForTable = (tableName) => {
        let hash = 0;
        for (let i = 0; i < tableName.length; i++) {
          hash = tableName.charCodeAt(i) + ((hash << 5) - hash);
        }
        return edgeColors[Math.abs(hash) % edgeColors.length];
      };

      const initialEdges = parsedData.relationships.map((rel) => {
        // Draw the arrow from the Parent (PK table) to the Child (FK table)
        const edgeColor = getColorForTable(rel.sourceTable);

        return {
          id: rel.id,
          source: rel.targetTable, // Origin is the Referenced Table (Parent PK)
          sourceHandle: `${rel.targetTable}-${rel.targetColumn}-source`, // Right handle
          target: rel.sourceTable, // Arrow points towards the Table holding the Foreign Key (Child)
          targetHandle: `${rel.sourceTable}-${rel.sourceColumn}-target`, // Left handle
          type: 'bezier',
          style: { 
            stroke: edgeColor, 
            strokeWidth: 2,
            strokeDasharray: '8,4',
            strokeLinecap: 'round',
            strokeLinejoin: 'round',
          },
          markerEnd: {
            type: MarkerType.ArrowClosed,
            width: 15,
            height: 15,
            color: edgeColor,
          },
        };
      });

      // 4. Apply Auto-Layout
      const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(
        initialNodes,
        initialEdges,
        get().layoutDirection
      );

      // 5. Update state
      set({
        nodes: layoutedNodes,
        edges: layoutedEdges,
        isGenerating: false,
      });

    } catch (err) {
      console.error(err);
      set({
        error: err.message || 'Failed to parse schema. Check syntax.',
        isGenerating: false,
      });
    }
  },
}));

export default useStore;
