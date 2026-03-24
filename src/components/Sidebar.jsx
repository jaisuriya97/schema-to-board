import React, { useState, useEffect, useRef } from 'react';
import Editor from 'react-simple-code-editor';
import { highlight, languages } from 'prismjs';
import 'prismjs/components/prism-clike';
import 'prismjs/components/prism-javascript';
import 'prismjs/components/prism-sql';
import 'prismjs/themes/prism-tomorrow.css';
import useStore from '../store/useStore';

const DEFAULT_SCHEMA = `-- Paste your SQL dump here!

CREATE TABLE Users (
  id INT PRIMARY KEY,
  name VARCHAR(255),
  email VARCHAR(255) UNIQUE,
  role VARCHAR(50)
);

CREATE TABLE Posts (
  id INT PRIMARY KEY,
  title VARCHAR(255),
  content TEXT,
  authorId INT,
  FOREIGN KEY (authorId) REFERENCES Users(id)
);`;

export default function Sidebar({ width }) {
  const rawSchema = useStore((state) => state.rawSchema);
  const setRawSchema = useStore((state) => state.setRawSchema);
  const generateERD = useStore((state) => state.generateERD);
  const error = useStore((state) => state.error);
  const isGenerating = useStore((state) => state.isGenerating);
  const layoutDirection = useStore((state) => state.layoutDirection);
  const toggleLayoutDirection = useStore((state) => state.toggleLayoutDirection);
  const showMinimap = useStore((state) => state.showMinimap);
  const toggleMinimap = useStore((state) => state.toggleMinimap);

  const [errorLines, setErrorLines] = useState(new Set());

  // Set default code on mount if empty
  useEffect(() => {
    if (!rawSchema) {
      setRawSchema(DEFAULT_SCHEMA);
      setTimeout(() => generateERD(), 100);
    }
  }, []);

  const validateSQL = (code) => {
    const lines = code.split('\n');
    let insideTable = false;
    let openParenCount = 0;
    const localErrLines = new Set();
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmed = line.trim();
      
      // Ignore empty lines or pure comments
      if (!trimmed || trimmed.startsWith('--') || trimmed.startsWith('/*')) continue;
      
      // Count parens to track blocks
      const opens = (line.match(/\(/g) || []).length;
      const closes = (line.match(/\)/g) || []).length;
      openParenCount += (opens - closes);
      
      if (/CREATE\s+TABLE/i.test(trimmed)) {
        if (insideTable) localErrLines.add(i + 1);
        insideTable = true;
      }
      
      if (insideTable && openParenCount <= 0 && trimmed.includes(';')) {
         insideTable = false;
      }

      // If a line inside a table definition has no spaces and no parens, it's missing a type
      if (insideTable && !/CREATE\s+TABLE/i.test(trimmed) && trimmed.length > 0) {
        const justCode = trimmed.replace(/--.*$/g, '').trim();
        if (justCode.length > 0 && !justCode.includes(' ') && !justCode.includes(')')) {
          localErrLines.add(i + 1);
        }
      }
    }

    if (insideTable && openParenCount > 0) {
      localErrLines.add(lines.length);
    }
    
    // Inject parser-level crash if any
    if (error) {
       localErrLines.add(1);
    }

    setErrorLines(localErrLines);
  };

  useEffect(() => {
    if (rawSchema) {
       const to = setTimeout(() => validateSQL(rawSchema), 400);
       return () => clearTimeout(to);
    }
  }, [rawSchema, error]);

  const customHighlight = (code) => {
     const standardHtml = highlight(code, languages.sql, 'sql');
     return standardHtml.split('\n').map((lineHtml, i) => {
        if (errorLines.has(i + 1)) {
           return `<span style="text-decoration: underline wavy red; text-decoration-thickness: 1px;">${lineHtml || ' '}</span>`;
        }
        return lineHtml;
     }).join('\n');
  };

  return (
    <div 
      className="flex-shrink-0 bg-white dark:bg-[#1E1F29] border-r-2 border-[#1e1e1e] dark:border-[#6272a4] flex flex-col h-full z-10 transition-colors duration-200 font-sans text-[#1e1e1e] dark:text-[#f8f8f2]"
      style={{ width }}
    >
      {/* Header */}
      <div className="p-4 border-b-2 border-[#1e1e1e] dark:border-[#6272a4] bg-[#f5f6f8] dark:bg-[#1E1F29] flex justify-between items-center transition-colors overflow-hidden">
        <div className="flex-1 min-w-0 pr-4 flex items-center">
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2 whitespace-nowrap">
            <svg className="w-6 h-6 flex-shrink-0 text-[#6366f1]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
            <span className="truncate">SchemaFlow</span>
          </h1>
        </div>
        {/* Controls */}
        <div className="flex gap-2 flex-shrink-0">
          {/* Minimap Toggle */}
          <button
            onClick={toggleMinimap}
            className="px-3 py-2 rounded-lg bg-[#282a36] border-2 border-[#6272a4] hover:border-[#6366f1] text-[#f8f8f2] flex items-center gap-2 transition-none"
            aria-label="Toggle Minimap"
            title={`Minimap: ${showMinimap ? 'Visible' : 'Hidden'}`}
          >
            {showMinimap ? (
              <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
            ) : (
              <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
              </svg>
            )}
            <span className="text-xs font-bold uppercase tracking-wider">Map</span>
          </button>
          {/* Layout Orientation Toggle */}
          <button
            onClick={toggleLayoutDirection}
            className="px-3 py-2 rounded-lg bg-[#282a36] border-2 border-[#6272a4] hover:border-[#6366f1] text-[#f8f8f2] flex items-center gap-2 transition-none"
            aria-label="Toggle Layout Direction"
            title={`Orientation: ${layoutDirection === 'LR' ? 'Horizontal (Left-to-Right)' : 'Vertical (Top-to-Bottom)'}`}
          >
            {layoutDirection === 'LR' ? (
              <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
              </svg>
            ) : (
              <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
            )}
            <span className="text-xs font-bold uppercase tracking-wider">Layout</span>
          </button>
        </div>
      </div>

      {/* Editor Area */}
      <div className="flex-1 flex flex-col p-4 gap-4 overflow-hidden relative bg-[#282a36] text-[#f8f8f2]">

        <div className="flex-1 w-full bg-[#1E1F29] rounded-xl border-2 border-[#6272a4] focus-within:border-[#6366f1] focus-within:ring-4 focus-within:ring-[#6366f1]/20 transition-all shadow-sm overflow-custom flex flex-col min-h-0 relative">
          <div className="absolute inset-0 overflow-auto custom-scrollbar">
            <Editor
              value={rawSchema}
              onValueChange={code => setRawSchema(code)}
              highlight={code => customHighlight(code)}
              padding={16}
              className="text-sm leading-relaxed"
              style={{
                fontFamily: '"JetBrains Mono", monospace',
                minHeight: '100%',
                outline: 'none',
              }}
              textareaClassName="focus:outline-none"
            />
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="bg-red-50/50 dark:bg-red-900/10 border border-red-200 dark:border-red-500/20 rounded-lg p-3 text-xs text-red-600 dark:text-red-400 font-medium animate-in fade-in flex items-start gap-2 backdrop-blur-sm">
            <svg className="w-4 h-4 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <span className="break-words mt-0.5">{error}</span>
          </div>
        )}

        <button
          onClick={generateERD}
          disabled={isGenerating || !rawSchema.trim()}
          className="w-full bg-[#6366f1] hover:bg-[#4f46e5] text-white text-base font-bold py-3 px-4 rounded-xl border-2 border-[#1e1e1e] dark:border-[#6272a4] shadow-[2px_2px_0px_0px_rgba(30,30,30,1)] dark:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:translate-y-0.5 hover:shadow-[1px_1px_0px_0px_rgba(30,30,30,1)] dark:hover:shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] active:translate-y-1 active:shadow-none transition-all disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {isGenerating ? (
            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          )}
          Generate ERD
        </button>
      </div>
    </div>
  );
}
