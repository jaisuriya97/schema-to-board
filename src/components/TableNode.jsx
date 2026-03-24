import React, { memo, useState, useRef, useEffect } from 'react';
import { Handle, Position } from '@xyflow/react';
import useStore from '../store/useStore';

// Sleek Custom SVGs
const KeySVG = () => (
  <svg title="Primary Key" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5 text-yellow-500 drop-shadow-sm">
    <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4" />
  </svg>
);

const LinkSVG = () => (
  <svg title="Foreign Key Relationship" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5 text-[#6366f1] drop-shadow-sm">
    <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
    <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
  </svg>
);

// Synchronous Inline Editor Component
const InlineEditor = ({ value, onSave, className }) => {
  const [text, setText] = useState(value);
  const inputRef = useRef(null);

  useEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
  }, []);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') inputRef.current?.blur();
    if (e.key === 'Escape') {
      setText(value);
      setTimeout(() => onSave(value), 0);
    }
  };

  return (
    <input
      ref={inputRef}
      value={text}
      onChange={(e) => setText(e.target.value)}
      onBlur={() => onSave(text)}
      onKeyDown={handleKeyDown}
      className={`bg-black/10 dark:bg-white/10 border border-[#6366f1]/50 rounded px-1 outline-none ring-2 ring-[#6366f1]/50 text-current ${className}`}
      onMouseDownCapture={(e) => e.stopPropagation()}
    />
  );
};


/**
 * Custom React Flow Node to render a beautiful Database Table.
 * Wrapped in React.memo to prevent unnecessary re-renders when dragging other nodes.
 */
const TableNode = ({ data, selected }) => {
  const { table } = data;
  const updateSchemaEntity = useStore((state) => state.updateSchemaEntity);
  const [editingField, setEditingField] = useState(null);

  const handleSaveTableName = (newName) => {
    setEditingField(null);
    if (newName && newName !== table.name) {
      updateSchemaEntity('table', table.name, null, newName);
    }
  };

  const handleSaveColumnName = (oldName, newName) => {
    setEditingField(null);
    if (newName && newName !== oldName) {
      updateSchemaEntity('columnName', table.name, oldName, newName);
    }
  };

  return (
    <div
      className={`bg-white dark:bg-[#1E1F29] rounded-xl shadow-sm border-2 ${
        selected ? 'border-[#6366f1] ring-1 ring-[#6366f1]/50 shadow-lg shadow-[#6366f1]/10' : 'border-[#1e1e1e] dark:border-[#6272a4]'
      } font-sans text-[#1e1e1e] dark:text-[#f8f8f2] transition-all duration-200 z-10`}
      style={{ width: 280 }}
    >
      {/* Table Header */}
      <div 
        className="bg-[#f5f6f8] dark:bg-[#1E1F29] rounded-t-[10px] px-4 py-3 flex items-center justify-between border-b-2 border-[#1e1e1e] dark:border-[#6272a4] cursor-text"
        onDoubleClick={() => setEditingField('table')}
        title="Double-click to rename table"
      >
        {editingField === 'table' ? (
          <InlineEditor value={table.name} onSave={handleSaveTableName} className="font-bold text-xl tracking-wide w-full max-w-[200px]" />
        ) : (
          <h3 className="font-bold text-xl tracking-wide truncate">{table.name}</h3>
        )}
      </div>

      {/* Table Columns */}
      <div className="flex flex-col py-1">
        {table.columns.map((col, index) => {
          const isPK = col.isPrimaryKey;
          const isFK = col.isForeignKey;
          const isPrimary = isPK; // Using isPrimary for styling consistency

          return (
            <div
              key={col.name}
              className={`relative flex items-center justify-between px-4 py-2 group hover:bg-[#f5f6f8] dark:hover:bg-[#6272a4]/50 transition-colors ${
                isPrimary ? 'bg-amber-50 dark:bg-amber-900/20' : ''
              }`}
            >
              {/* Left Handle (Target) - for incoming FK references */}
              <Handle
                type="target"
                position={Position.Left}
                id={`${table.name}-${col.name}-target`}
                className="w-2 h-2 !bg-accent-400 border-none opacity-0 absolute -left-1"
                isConnectable={false} 
              />

              {/* Left side: handles & Name */}
              <div 
                className="flex items-center gap-2 flex-col-1 overflow-hidden cursor-text"
                onDoubleClick={() => setEditingField(col.name)}
                title="Double-click to rename column"
              >
                {/* Icons for PK / FK */}
                <div 
                  className="w-4 h-4 flex-shrink-0 flex items-center justify-center cursor-default"
                  title="Field Type / Constraint"
                >
                  {isPK && <KeySVG />}
                  {isFK && !isPK && <div className="absolute"><LinkSVG /></div>}
                </div>

                <div className="flex flex-col">
                  {editingField === col.name ? (
                    <InlineEditor value={col.name} onSave={(newVal) => handleSaveColumn(col.name, newVal)} className={`text-sm w-32 ${isPrimary ? 'font-bold' : 'font-medium'}`} />
                  ) : (
                    <span className={`text-sm truncate ${isPrimary ? 'font-bold text-amber-600 dark:text-amber-400' : 'font-medium text-[#1e1e1e] dark:text-[#f8f8f2]'}`}>
                      {col.name}
                    </span>
                  )}
                </div>
              </div>

              {/* Right side: Type & Constraints */}
              <div 
                className="flex items-center gap-2 flex-shrink-0"
              >
                <div className="flex gap-1">
                  {!col.isNullable && <span className="text-xs text-red-500 dark:text-red-400 font-bold" title="NOT NULL">*</span>}
                  {col.isUnique && !isPK && <span className="text-xs text-blue-500 dark:text-[#6366f1] font-bold" title="UNIQUE">U</span>}
                </div>
                <div className="w-20 text-right text-surface-500 dark:text-surface-400 font-mono text-[10px] uppercase tracking-wider truncate ml-1 cursor-default">
                  {col.type}
                </div>
              </div>

              {/* Right Handle (Source) - for outgoing FK references */}
              <Handle
                type="source"
                position={Position.Right}
                id={`${table.name}-${col.name}-source`}
                className="w-2 h-2 !bg-accent-400 border-none opacity-0 absolute -right-1"
                isConnectable={false}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
};

// Export heavily memoized version for React Flow performance
export default memo(TableNode);
