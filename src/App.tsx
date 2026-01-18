import React, { useState, useEffect } from 'react';
import { useChat } from './hooks/useChat';
import { Header } from './components/Header';
import { ChatInterface } from './components/ChatInterface';
import { DebugPanel } from './components/DebugPanel';
import { ErrorBoundary } from './components/ErrorBoundary';
import { SettingsPage } from './components/SettingsPage';
import { ImageTestPage } from './components/ImageTestPage';
import { AutoCroppedImage } from './components/MessageBubble';
import { Panelist } from './types';
import { clsx } from 'clsx';
import { X } from 'lucide-react';

function App() {
  // Simple hash-based routing for test page
  if (window.location.hash === '#imagetest') {
    return <ImageTestPage />;
  }
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
    clearError,
  } = useChat();

  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'general' | 'behavior' | 'panelists' | 'prompts'>('general');
  const [isAdmin, setIsAdmin] = useState(() => {
    return document.cookie.split('; ').some(row => row.startsWith('isAdmin=true'));
  });
  const [selectedPanelistId, setSelectedPanelistId] = useState<string | null>(null);
  const [tempName, setTempName] = useState('');
  const [isWide, setIsWide] = useState(window.innerWidth >= 900);

  const selectedPanelist = selectedPanelistId 
    ? state.panelists.find(p => p.id === selectedPanelistId) 
    : null;

  useEffect(() => {
    const handleResize = () => setIsWide(window.innerWidth >= 900);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Sync DaisyUI theme with system preference
  useEffect(() => {
    const darkModeMediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const updateTheme = (e: MediaQueryListEvent | MediaQueryList) => {
      const isDark = e.matches;
      document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
      if (isDark) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    };
    
    updateTheme(darkModeMediaQuery);
    darkModeMediaQuery.addEventListener('change', updateTheme);
    return () => darkModeMediaQuery.removeEventListener('change', updateTheme);
  }, []);

  const handleNameSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (tempName.trim()) {
      updateSettings({ userName: tempName.trim() });
    }
  };

  const showNamePrompt = state.settings && !state.settings.userName && state.messages.length === 0;

  return (
    <div className="flex flex-col h-screen bg-slate-50 dark:bg-slate-950 overflow-hidden transition-colors duration-300">
      <Header 
        onReset={resetChat} 
        onToggleDebug={toggleDebug} 
        onOpenSettings={(tab) => {
          if (tab) setActiveTab(tab as any);
          setIsSettingsOpen(true);
        }}
        showDebug={state.showDebug}
      />

      <main className="flex-1 flex overflow-hidden relative">
        <div className={clsx(
          "transition-all duration-300 ease-in-out flex-1 flex flex-col min-w-0",
          state.showDebug ? (isWide ? "w-1/2" : "hidden") : "w-full"
        )}>
          <ChatInterface 
            messages={state.displayMessages}
            panelists={state.panelists}
            isGenerating={state.isGenerating}
            status={state.status}
            topic={state.topic}
            suggestions={suggestions}
            autoResponse={state.autoResponse}
            userName={state.settings.userName}
            enableSuggestedResponse={state.settings.enableSuggestedResponse}
            onSendMessage={sendMessage}
            onSelectSuggestion={sendMessage}
            onClearAutoResponse={clearAutoResponse}
            onAvatarClick={(id) => setSelectedPanelistId(id)}
          />

          {state.error && (
            <div className="absolute bottom-24 left-1/2 -translate-x-1/2 z-[60] animate-in slide-in-from-bottom-4 duration-300">
              <div className="alert alert-error shadow-lg rounded-2xl py-3 px-6 flex items-center gap-3">
                <div className="p-1 bg-red-100 dark:bg-red-900/30 rounded-full text-red-600 dark:text-red-400">
                  <X size={16} />
                </div>
                <span className="text-sm font-medium">{state.error}</span>
                <button 
                  onClick={clearError}
                  className="btn btn-ghost btn-xs btn-circle"
                >
                  <X size={14} />
                </button>
              </div>
            </div>
          )}
        </div>

        {state.showDebug && (
          <div className={clsx(
            "border-l border-base-300 shadow-2xl z-10 animate-in slide-in-from-right duration-300",
            isWide ? "w-1/2" : "w-full"
          )}>
            <ErrorBoundary name="Agent Console">
              <DebugPanel 
                logs={state.debugLogs} 
                panelists={state.panelists}
                onPanelistClick={(p) => setSelectedPanelistId(p.id)}
              />
            </ErrorBoundary>
          </div>
        )}
      </main>

      {/* Name Prompt Modal */}
      {showNamePrompt && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/80 backdrop-blur-sm p-4 animate-in fade-in duration-300">
          <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl w-full max-w-md p-8 animate-in zoom-in-95 duration-300">
            <h2 className="text-3xl font-bold text-slate-800 dark:text-slate-100 mb-2">Welcome!</h2>
            <p className="text-slate-500 dark:text-slate-400 mb-8">Before we begin, what should the BrainTrust call you?</p>
            
            <form onSubmit={handleNameSubmit} className="space-y-6">
              <div className="form-control">
                <input 
                  autoFocus
                  type="text" 
                  value={tempName}
                  onChange={(e) => setTempName(e.target.value)}
                  placeholder="Your Name"
                  className="input input-bordered input-lg w-full bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 focus:input-primary transition-all"
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
          isAdmin={isAdmin}
          setIsAdmin={setIsAdmin}
          initialTab={activeTab}
        />
      )}

      {/* Panelist Detail Modal */}
      {selectedPanelist && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-300" onClick={() => setSelectedPanelistId(null)}>
          <div 
            className="bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl w-full max-w-2xl overflow-hidden animate-in zoom-in-95 duration-300 flex flex-col max-h-[90vh]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="relative p-8 md:p-12 overflow-y-auto">
              <button 
                onClick={() => setSelectedPanelistId(null)}
                className="absolute top-6 right-6 btn btn-ghost btn-circle btn-sm"
              >
                <X size={20} className="dark:text-slate-400" />
              </button>

              <div className="flex flex-col items-center text-center space-y-6">
                {/* Large Avatar */}
                <div className="w-48 h-48 md:w-64 md:h-64 rounded-full overflow-hidden border-4 border-slate-50 dark:border-slate-800 shadow-xl bg-slate-50 dark:bg-slate-800 flex items-center justify-center">
                  {selectedPanelist.avatarUrl ? (
                    <AutoCroppedImage 
                      src={selectedPanelist.avatarUrl} 
                      alt={selectedPanelist.firstName} 
                      className="w-full h-full object-cover" 
                    />
                  ) : (
                    <div className={clsx('w-full h-full flex items-center justify-center text-white font-bold text-6xl', 
                      selectedPanelist.color?.replace('bg-', 'bg-').replace('-50', '-500') || 'bg-emerald-500'
                    )}>
                      {selectedPanelist.firstName?.charAt(0)}
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <h2 className="text-4xl font-black text-slate-900 dark:text-slate-100 tracking-tight">
                    {selectedPanelist.firstName}
                  </h2>
                  <div className="text-primary font-bold text-sm uppercase tracking-widest">
                    {selectedPanelist.shortDescription}
                  </div>
                </div>

                <div className="w-full text-left space-y-6 pt-4 border-t border-slate-100 dark:border-slate-800">
                  <p className="text-slate-600 dark:text-slate-300 text-lg leading-relaxed whitespace-pre-wrap">
                    {selectedPanelist.fullPersonality}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
