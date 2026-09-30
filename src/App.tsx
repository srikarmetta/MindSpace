import { Header } from './components/Header/Header';
import { GraphCanvas } from './components/GraphCanvas/GraphCanvas';
import { ActivityPanel } from './components/ActivityPanel/ActivityPanel';
import { IntentPanel } from './components/IntentPanel/IntentPanel';
import { VoiceBar } from './components/VoiceBar/VoiceBar';
import { StatusBar } from './components/StatusBar/StatusBar';

export default function App() {
  return (
    <div className="flex flex-col h-screen w-screen bg-[#07080c] text-zinc-100 overflow-hidden font-sans">
      {/* Top Header */}
      <Header />

      {/* Main Workspace Area */}
      <div className="flex-1 flex flex-col md:flex-row min-h-0 relative overflow-hidden">
        {/* Left: Live Architecture Graph Canvas */}
        <main className="flex-1 relative h-full min-h-[400px]">
          <GraphCanvas />
        </main>

        {/* Right: Sidebar with Agent Activity & Current Intent */}
        <aside className="w-full md:w-80 lg:w-96 flex flex-col h-72 md:h-full shrink-0 border-t md:border-t-0 z-10">
          {/* Agent Activity Timeline (Flex-1) */}
          <div className="flex-1 min-h-0">
            <ActivityPanel />
          </div>

          {/* Current Intent Panel (Docked at bottom of sidebar) */}
          <div className="shrink-0">
            <IntentPanel />
          </div>
        </aside>
      </div>

      {/* Bottom Voice / Requirement Bar */}
      <VoiceBar />

      {/* Persistent Status Telemetry Bar */}
      <StatusBar />
    </div>
  );
}
