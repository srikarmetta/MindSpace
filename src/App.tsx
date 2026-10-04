import { useState } from 'react';
import { Header } from './components/Header/Header';
import { ArchitectureSidebar } from './components/Sidebar/ArchitectureSidebar';
import { GraphCanvas } from './components/GraphCanvas/GraphCanvas';
import { ActivityPanel } from './components/ActivityPanel/ActivityPanel';
import { IntentPanel } from './components/IntentPanel/IntentPanel';
import { VoiceBar } from './components/VoiceBar/VoiceBar';
import { StatusBar } from './components/StatusBar/StatusBar';

export default function App() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  return (
    <div className="flex flex-col h-screen w-screen bg-[#09090b] text-zinc-100 overflow-hidden font-sans">
      {/* Top Professional Header */}
      <Header
        onToggleSidebar={() => setIsSidebarOpen((prev) => !prev)}
        isSidebarOpen={isSidebarOpen}
      />

      {/* Main Workspace Area (3-Column Layout) */}
      <div className="flex-1 flex flex-row min-h-0 relative overflow-hidden">
        {/* Left Column: Architecture Overview / Components / Dependencies */}
        <ArchitectureSidebar
          isOpen={isSidebarOpen}
          onToggle={() => setIsSidebarOpen((prev) => !prev)}
        />

        {/* Center Column: Live Architecture Canvas & Bottom Voice/Text Input */}
        <div className="flex-1 flex flex-col min-w-0 min-h-0 relative">
          <main className="flex-1 relative w-full h-full min-h-0 overflow-hidden">
            <GraphCanvas />
          </main>

          {/* Voice / Requirement Input Bar docked at bottom of canvas */}
          <VoiceBar />
        </div>

        {/* Right Column: Sidebar with Execution Activity & Current Intent */}
        <aside className="w-72 lg:w-80 flex flex-col h-full shrink-0 border-l border-zinc-800/80 z-10 bg-[#0c0d12]">
          {/* Execution Activity Timeline (Flex-1) */}
          <div className="flex-1 min-h-0">
            <ActivityPanel />
          </div>

          {/* Active Intent & Evolution Telemetry (Docked at bottom of right sidebar) */}
          <div className="shrink-0">
            <IntentPanel />
          </div>
        </aside>
      </div>

      {/* Bottom Telemetry Bar */}
      <StatusBar />
    </div>
  );
}
