import React from 'react';

export default function LandingPage({ onStart }) {
  return (
    <div className="min-h-screen bg-[#282a36] text-[#f8f8f2] font-sans flex flex-col items-center justify-center p-8 selection:bg-[#6366f1]/30">
      
      {/* Hero Section */}
      <div className="max-w-4xl w-full flex flex-col items-center text-center gap-8 z-10 animate-in fade-in slide-in-from-bottom-8 duration-700">
        
        {/* Logo/Icon */}
        <div className="w-20 h-20 bg-gradient-to-br from-[#6366f1] to-[#4c48c3] rounded-3xl flex items-center justify-center shadow-lg shadow-[#6366f1]/20 mb-4 ring-1 ring-white/10">
          <svg className="w-10 h-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
          </svg>
        </div>

        <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-white via-[#f8f8f2] to-[#a5a3fb]">
          Design databases at the speed of thought.
        </h1>
        
        <p className="text-lg md:text-xl text-[#f8f8f2]/70 mt-6 max-w-2xl mx-auto drop-shadow-sm font-light">
          SchemaFlow is an intelligent, code-first diagramming tool. Type SQL on the left, and instantly visualize pristine, interactive architectures on the right.
        </p>

        <button
          onClick={onStart}
          className="group relative px-8 py-4 bg-[#6366f1] hover:bg-[#5a56c9] text-white font-bold text-lg rounded-2xl transition-all duration-300 hover:scale-105 hover:shadow-[0_0_40px_-10px_rgba(105,101,219,0.5)] flex items-center gap-3 overflow-hidden"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/10 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
          Start Architecting
          <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
          </svg>
        </button>

      </div>

      {/* Mock Editor Preview UI */}
      <div className="max-w-6xl w-full mt-24 rounded-2xl border border-[#6272a4] bg-[#1E1F29] shadow-2xl flex overflow-hidden h-[400px] animate-in fade-in slide-in-from-bottom-12 duration-1000 delay-300 fill-mode-both ring-1 ring-black/50">
        
        {/* Fake Sidebar */}
        <div className="w-1/3 border-r border-[#6272a4] bg-[#282a36]/50 p-6 flex flex-col gap-4">
          <div className="flex gap-2 mb-2">
            <div className="w-3 h-3 rounded-full bg-red-500/80" />
            <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
            <div className="w-3 h-3 rounded-full bg-green-500/80" />
          </div>
          <div className="w-3/4 h-3 rounded bg-[#6272a4]/50" />
          <div className="w-1/2 h-3 rounded bg-[#6272a4]/50" />
          <div className="w-full h-3 rounded bg-[#6272a4]/30 mt-4" />
          <div className="w-5/6 h-3 rounded bg-[#6272a4]/30" />
          <div className="w-4/6 h-3 rounded bg-[#6272a4]/30" />
          <div className="w-full h-3 rounded bg-[#6272a4]/30 mt-4" />
          <div className="w-3/4 h-3 rounded bg-[#6272a4]/30" />
        </div>

        {/* Fake Canvas */}
        <div className="flex-1 bg-[#282a36] relative overflow-hidden backdrop-blur-3xl">
          {/* Background dots pattern mock */}
          <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(circle, #f8f8f2 1px, transparent 1px)', backgroundSize: '24px 24px' }} />
          
          {/* Mock Node 1 */}
          <div className="absolute top-16 left-16 w-48 rounded-xl border border-[#6272a4] bg-[#1E1F29] shadow-xl overflow-hidden">
             <div className="bg-[#6366f1]/10 px-4 py-3 border-b border-[#6272a4]">
               <div className="w-24 h-4 rounded bg-[#6366f1]/80" />
             </div>
             <div className="p-4 flex flex-col gap-3">
               <div className="flex justify-between items-center"><div className="w-16 h-3 rounded bg-white/20"/><div className="w-8 h-3 rounded bg-white/10"/></div>
               <div className="flex justify-between items-center"><div className="w-20 h-3 rounded bg-white/20"/><div className="w-10 h-3 rounded bg-white/10"/></div>
             </div>
          </div>

          {/* Mock Node 2 */}
          <div className="absolute top-32 left-80 w-48 rounded-xl border border-[#6272a4] bg-[#1E1F29] shadow-xl overflow-hidden">
             <div className="bg-[#6366f1]/10 px-4 py-3 border-b border-[#6272a4]">
               <div className="w-20 h-4 rounded bg-[#6366f1]/80" />
             </div>
             <div className="p-4 flex flex-col gap-3">
               <div className="flex justify-between items-center"><div className="w-12 h-3 rounded bg-white/20"/><div className="w-8 h-3 rounded bg-white/10"/></div>
               <div className="flex justify-between items-center"><div className="w-24 h-3 rounded bg-[#6366f1]/50"/><div className="w-12 h-3 rounded bg-[#6366f1]/30"/></div>
             </div>
          </div>

          {/* Mock Connection Edge */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none">
            <path d="M 256 128 C 300 128, 280 180, 320 180" fill="none" stroke="#6366f1" strokeWidth="2" strokeDasharray="6,4" strokeLinecap="round" />
            <circle cx="320" cy="180" r="4" fill="#6366f1" />
          </svg>

        </div>
      </div>
    </div>
  );
}
