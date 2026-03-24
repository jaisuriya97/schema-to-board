import React, { useState, useCallback, useRef, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import DiagramCanvas from './components/DiagramCanvas';
import LandingPage from './components/LandingPage';

function App() {
  const [sidebarWidth, setSidebarWidth] = useState(450);
  const isResizing = useRef(false);
  const [hasStarted, setHasStarted] = useState(false);

  const startResizing = useCallback((e) => {
    isResizing.current = true;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none'; // Prevent text highlighting
  }, []);

  const stopResizing = useCallback(() => {
    isResizing.current = false;
    document.body.style.cursor = 'default';
    document.body.style.userSelect = ''; // Restore text selection
  }, []);

  const resize = useCallback((e) => {
    if (isResizing.current) {
      setSidebarWidth((prevWidth) => {
        // Enforce minimum and maximum widths
        const newWidth = Math.min(Math.max(e.clientX, 450), 800);
        return newWidth;
      });
    }
  }, []);

  useEffect(() => {
    window.addEventListener('mousemove', resize);
    window.addEventListener('mouseup', stopResizing);
    return () => {
      window.removeEventListener('mousemove', resize);
      window.removeEventListener('mouseup', stopResizing);
    };
  }, [resize, stopResizing]);

  if (!hasStarted) {
    return <LandingPage onStart={() => setHasStarted(true)} />;
  }

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#ffffff] dark:bg-[#282a36] text-[#1e1e1e] dark:text-[#f8f8f2] antialiased selection:bg-[#6366f1]/30 font-hand">
      <Sidebar width={sidebarWidth} />
      
      {/* Resizer Handle */}
      <div 
        className="w-1.5 hover:w-2 -ml-1 flex-shrink-0 cursor-col-resize z-20 group relative"
        onMouseDown={startResizing}
      >
        <div className="absolute inset-y-0 left-1/2 -ml-px w-px bg-surface-200 dark:bg-surface-800 group-hover:bg-accent-500 transition-colors" />
      </div>

      <DiagramCanvas />
    </div>
  );
}

export default App;
