import React, { useState } from 'react';
import { useChat } from './hooks/useChat';
import { Header } from './components/Header';
import { ChatInterface } from './components/ChatInterface';
import { DebugPanel } from './components/DebugPanel';
import { SettingsPage } from './components/SettingsPage';
import { clsx } from 'clsx';

function App() {
  const {
    state,
    availableModels,
    availableImageModels,
    suggestions,
    sendMessage,
    resetChat,
    toggleDebug,
    updateSettings,
    clearAutoResponse,
  } = useChat();

  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [tempName, setTempName] = useState('');

  const handleNameSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (tempName.trim()) {
      updateSettings({ userName: tempName.trim() });
    }
  };

  const showNamePrompt = state.settings && !state.settings.userName && state.messages.length === 0;

  return (
    <div className="flex flex-col h-screen bg-slate-50 overflow-hidden">
      <Header 
        onReset={resetChat} 
        onToggleDebug={toggleDebug} 
        onOpenSettings={() => setIsSettingsOpen(true)}
        showDebug={state.showDebug}
      />

      <main className="flex-1 flex overflow-hidden relative">
        <div className={clsx(
          "transition-all duration-300 ease-in-out flex-1 flex flex-col min-w-0",
          state.showDebug ? "w-1/2" : "w-full"
        )}>
          <ChatInterface 
            messages={state.messages}
            panelists={state.panelists}
            isGenerating={state.isGenerating}
            status={state.status}
            topic={state.topic}
            suggestions={suggestions}
            autoResponse={state.autoResponse}
            onSendMessage={sendMessage}
            onSelectSuggestion={sendMessage}
            onClearAutoResponse={clearAutoResponse}
          />
        </div>

        {state.showDebug && (
          <div className="w-1/2 border-l border-base-300 shadow-2xl z-10 animate-in slide-in-from-right duration-300">
            <DebugPanel logs={state.debugLogs} />
          </div>
        )}
      </main>

      {/* Name Prompt Modal */}
      {showNamePrompt && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/80 backdrop-blur-sm p-4 animate-in fade-in duration-300">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-8 animate-in zoom-in-95 duration-300">
            <h2 className="text-3xl font-bold text-slate-800 mb-2">Welcome!</h2>
            <p className="text-slate-500 mb-8">Before we begin, what should the BrainTrust call you?</p>
            
            <form onSubmit={handleNameSubmit} className="space-y-6">
              <div className="form-control">
                <input 
                  autoFocus
                  type="text" 
                  value={tempName}
                  onChange={(e) => setTempName(e.target.value)}
                  placeholder="Your Name"
                  className="input input-bordered input-lg w-full bg-slate-50 border-slate-200 text-slate-800 focus:input-primary transition-all"
                />
              </div>
              <button 
                type="submit" 
                disabled={!tempName.trim()}
                className="btn btn-primary btn-lg w-full rounded-2xl shadow-lg shadow-primary/20"
              >
                Let's Start
              </button>
            </form>
          </div>
        </div>
      )}

      {isSettingsOpen && (
        <SettingsPage 
          settings={state.settings}
          onUpdate={updateSettings}
          onClose={() => setIsSettingsOpen(false)}
          availableModels={availableModels}
          availableImageModels={availableImageModels}
        />
      )}
    </div>
  );
}

export default App;
