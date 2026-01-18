import React, { useRef, useEffect, useState } from 'react';
import { Settings } from '@/types';
import { AgentCountSelector } from './AgentCountSelector';
import { 
  X, Lock, LogOut, Settings as SettingsIcon, Plus, Trash2, 
  User, ShieldCheck, Sparkles, MessagesSquare, MessageCircleDashed, Speech, BookOpenText,
  NotebookText, ChevronDown, ChevronRight
} from 'lucide-react';
import { BASE_RESPONSE_PROMPT, BASE_MODERATOR_PROMPT, BASE_IMAGE_PROMPT, BASE_QUICK_PANELISTS_PROMPT, BASE_PANELIST_DETAILS_PROMPT } from '@/lib/prompts';
import { PromptEditor } from './PromptEditor';
import { VariablesSidebar } from './VariablesSidebar';
import { PROMPT_METADATA } from '@/lib/variableMetadata';

interface SettingsPageProps {
  settings: Settings;
  onUpdate: (settings: Partial<Settings>) => void;
  onClose: () => void;
  availableModels: string[];
  availableImageModels: string[];
  isAdmin: boolean;
  setIsAdmin: (isAdmin: boolean) => void;
  initialTab?: string;
}

const AutoResizingTextarea: React.FC<React.TextareaHTMLAttributes<HTMLTextAreaElement>> = (props) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const adjustHeight = () => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = `${textarea.scrollHeight}px`;
    }
  };

  useEffect(() => {
    adjustHeight();
    // Add a small delay to handle initial render or font loading
    const timer = setTimeout(adjustHeight, 0);
    return () => clearTimeout(timer);
  }, [props.value]);

  return (
    <textarea
      {...props}
      ref={textareaRef}
      onChange={(e) => {
        props.onChange?.(e);
        adjustHeight();
      }}
      className={`textarea textarea-bordered font-mono text-sm overflow-hidden resize-none ${props.className || ''}`}
      style={{ ...props.style, height: 'auto' }}
    />
  );
};

export const SettingsPage: React.FC<SettingsPageProps> = ({ 
  settings, 
  onUpdate, 
  onClose, 
  availableModels, 
  availableImageModels,
  isAdmin,
  setIsAdmin,
  initialTab = 'profile'
}) => {
  const [activeTab, setActiveTab] = useState<string>(initialTab);
  const [showPasswordPrompt, setShowPasswordPrompt] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [passwordError, setPasswordError] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);

  // Map incoming tab names from header to our internal sidebar names
  const tabMap: Record<string, string> = {
    'general': 'profile',
    'behavior': 'response',
    'panelists': 'styles',
    'prompts': 'prompts'
  };

  useEffect(() => {
    if (initialTab) {
      setActiveTab(tabMap[initialTab] || initialTab);
    }
  }, [initialTab]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      // If we click something that is NOT a prompt editor and NOT the sidebar, hide the sidebar
      if (!target.closest('.prompt-editor-container') && !target.closest('.variables-sidebar-container')) {
        setFocusedField(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleAdminLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordInput === 'okok') {
      setIsAdmin(true);
      document.cookie = "isAdmin=true; path=/; max-age=31536000; SameSite=Strict";
      setShowPasswordPrompt(false);
      setPasswordError(false);
      setPasswordInput('');
    } else {
      setPasswordError(true);
    }
  };

  const handleLogout = () => {
    setIsAdmin(false);
    document.cookie = "isAdmin=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
  };

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const promptSubItems = [
    { id: 'prompt-assembly', label: 'Panelist Assembly' },
    { id: 'prompt-personalities', label: 'Panelist Personalities' },
    { id: 'prompt-response', label: 'Agent Response' },
    { id: 'prompt-auto-user', label: 'User Auto Response' },
    { id: 'prompt-avatar', label: 'Avatar Generation' },
  ];

  const getModelPrice = (id: string) => {
    const prices: Record<string, string> = {
      'dall-e-2': '$0.02',
      'dall-e-3': '$0.04',
      'gpt-image-1.5': '$0.05',
      'imagen-3.0-fast-generate-001': '$0.02',
      'imagen-3.0-generate-001': '$0.04',
      'imagen-3.0-generate-002': '$0.04',
      'imagen-2.0-generate-001': '$0.01',
      'imagen-3-fast': '$0.02',
      'imagen-4-standard': '$0.04',
      'imagen-4-ultra': '$0.06',
      'imagen-4.0-generate-001': '$0.04',
      'imagen-4.0-ultra-generate-001': '$0.06',
      'imagen-4.0-fast-generate-001': '$0.02',
    };
    return prices[id] || '';
  };

  const formatModelName = (id: string, isImageModel: boolean = false) => {
    const prefix = (id.startsWith('gemini-') || id.startsWith('imagen-')) ? 'Gemini' : 'OpenAI';
    return `${prefix}: ${id}`;
  };

  const ImageModelOption: React.FC<{ id: string; current: string; onSelect: (id: string) => void }> = ({ id, current, onSelect }) => {
    const price = getModelPrice(id);
    const isSelected = id === current;
    return (
      <div 
        onClick={() => onSelect(id)}
        className={`flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-base-300 dark:hover:bg-slate-700 transition-colors ${isSelected ? 'bg-primary/10 text-primary font-bold' : 'text-slate-600 dark:text-slate-300'}`}
      >
        <span>{formatModelName(id, true)}</span>
        <span className="text-slate-400 dark:text-slate-500 text-xs font-mono">{price}</span>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-[60] flex flex-col bg-slate-50 dark:bg-slate-950 animate-in fade-in slide-in-from-right duration-300 transition-colors">
      <header className="navbar bg-base-100 dark:bg-slate-900 border-b border-base-300 dark:border-slate-800 px-6 shrink-0 h-16">
        <div className="flex-1 flex items-center gap-4">
          <h1 className="text-xl font-bold flex items-center gap-2 text-primary">
            <SettingsIcon size={24} />
            Settings
          </h1>
        </div>
        <div className="flex-none">
          <button 
            onClick={onClose}
            className="btn btn-primary btn-sm px-6 rounded-xl shadow-md shadow-primary/20"
          >
            Save & Exit
          </button>
        </div>
      </header>
      
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <div className="w-64 shrink-0 bg-base-100 dark:bg-slate-900 border-r border-base-300 dark:border-slate-800 flex flex-col">
          <nav className="flex-1 p-4 space-y-1">
            {[
              { id: 'profile', label: 'User Profile', icon: User },
              { id: 'models', label: 'AI Models', icon: Sparkles, adminOnly: true },
              { id: 'response', label: 'Response Mode', icon: MessagesSquare, adminOnly: true },
              { id: 'advanced', label: 'Advanced Settings', icon: ShieldCheck, adminOnly: false },
              { id: 'suggestions', label: 'Starter Suggestions', icon: MessageCircleDashed, adminOnly: true },
              { id: 'styles', label: 'Communication Styles', icon: Speech, adminOnly: true },
              { id: 'prompts', label: 'Prompts', icon: BookOpenText, adminOnly: true },
            ].map((item) => {
              if (item.adminOnly && !isAdmin) return null;
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              
              return (
                <div key={item.id} className="space-y-1">
                  <button
                    onClick={() => setActiveTab(item.id)}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                      isActive 
                        ? 'bg-primary text-primary-content shadow-md shadow-primary/20' 
                        : 'text-slate-500 dark:text-slate-400 hover:bg-base-200 dark:hover:bg-slate-800 hover:text-slate-700 dark:hover:text-slate-200'
                    }`}
                  >
                    <Icon size={18} />
                    <span className="flex-1 text-left">{item.label}</span>
                    {item.id === 'prompts' && (
                      isActive ? <ChevronDown size={14} /> : <ChevronRight size={14} />
                    )}
                  </button>

                  {item.id === 'prompts' && isActive && (
                    <div className="ml-6 border-l border-slate-200 dark:border-slate-800 pl-2 space-y-1 animate-in slide-in-from-top-2 duration-200">
                      {promptSubItems.map((sub) => (
                        <button
                          key={sub.id}
                          onClick={() => scrollToSection(sub.id)}
                          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium text-slate-500 dark:text-slate-400 hover:bg-base-200 dark:hover:bg-slate-800 hover:text-slate-700 dark:hover:text-slate-200 transition-all"
                        >
                          <NotebookText size={14} className="opacity-70" />
                          {sub.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </nav>

          <div className="p-4 border-t border-base-300 dark:border-slate-800">
            {!isAdmin ? (
              showPasswordPrompt ? (
                <form onSubmit={handleAdminLogin} className="flex flex-col gap-2">
                  <input 
                    type="password"
                    autoFocus
                    placeholder="Password..."
                    className={`input input-bordered input-sm w-full bg-white dark:bg-slate-800 border-base-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 ${passwordError ? 'input-error' : ''}`}
                    value={passwordInput}
                    onChange={(e) => {
                      setPasswordInput(e.target.value);
                      setPasswordError(false);
                    }}
                  />
                  <div className="flex gap-1">
                    <button type="submit" className="btn btn-primary btn-xs flex-1">Unlock</button>
                    <button type="button" onClick={() => setShowPasswordPrompt(false)} className="btn btn-ghost btn-xs dark:text-slate-400">Cancel</button>
                  </div>
                </form>
              ) : (
                <button 
                  onClick={() => setShowPasswordPrompt(true)}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-slate-400 dark:text-slate-500 hover:bg-base-200 dark:hover:bg-slate-800 hover:text-slate-600 dark:hover:text-slate-300 transition-all"
                >
                  <Lock size={18} />
                  Admin Settings
                </button>
              )
            ) : (
              <button 
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-error hover:bg-error/10 transition-all"
              >
                <LogOut size={18} />
                Logout Admin
              </button>
            )}
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 overflow-y-auto bg-slate-50 dark:bg-slate-950">
          <div className="max-w-4xl mx-auto w-full p-6 md:p-10">
            
            {activeTab === 'profile' && (
              <div className="space-y-12 animate-in fade-in duration-300">
                <section>
                  <div className="flex flex-col md:flex-row gap-6 items-end">
                    <div className="form-control flex-1">
                      <label className="label">
                        <span className="label-text font-bold dark:text-slate-200">Your Name</span>
                      </label>
                      <input 
                        type="text" 
                        className="input input-bordered w-full bg-white dark:bg-slate-800 border-base-300 dark:border-slate-700 text-slate-900 dark:text-slate-100" 
                        value={settings.userName || ''}
                        placeholder="Enter your name..."
                        onChange={(e) => onUpdate({ userName: e.target.value })}
                      />
                    </div>
                    <AgentCountSelector 
                      value={settings.agentCount} 
                      onChange={(count) => onUpdate({ agentCount: count })} 
                    />
                  </div>
                </section>
              </div>
            )}

            {isAdmin && activeTab === 'models' && (
              <div className="space-y-12 animate-in fade-in duration-300">
                <section>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="form-control">
                      <label className="label">
                        <span className="label-text dark:text-slate-200">Model</span>
                      </label>
                      <select 
                        className="select select-bordered w-full bg-white dark:bg-slate-800 border-base-300 dark:border-slate-700 text-slate-900 dark:text-slate-100" 
                        value={settings.model}
                        onChange={(e) => onUpdate({ model: e.target.value })}
                      >
                        {availableModels.map(m => (
                          <option key={m} value={m}>{formatModelName(m)}</option>
                        ))}
                      </select>
                    </div>
                    <div className="form-control">
                      <label className="label">
                        <span className="label-text dark:text-slate-200">Image Model</span>
                      </label>
                      <div className="dropdown w-full">
                        <div tabIndex={0} role="button" className="select select-bordered w-full flex items-center justify-between px-4 font-normal h-[3rem] bg-white dark:bg-slate-800 border-base-300 dark:border-slate-700 text-slate-900 dark:text-slate-100">
                          <span>{formatModelName(settings.imageModel, true)}</span>
                          <span className="text-slate-400 dark:text-slate-500 text-xs font-mono ml-auto mr-4">{getModelPrice(settings.imageModel)}</span>
                        </div>
                        <ul tabIndex={0} className="dropdown-content z-[100] menu p-0 shadow bg-base-100 dark:bg-slate-800 rounded-box w-full mt-1 max-h-60 overflow-y-auto block border border-base-300 dark:border-slate-700">
                          {(availableImageModels.length > 0 ? availableImageModels : ['imagen-4.0-generate-001', 'imagen-3.0-generate-001', 'dall-e-3', 'dall-e-2']).map(m => (
                            <li key={m}>
                              <ImageModelOption id={m} current={settings.imageModel} onSelect={(id) => {
                                onUpdate({ imageModel: id });
                                (document.activeElement as HTMLElement)?.blur();
                              }} />
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                </section>
              </div>
            )}

            {isAdmin && activeTab === 'response' && (
              <div className="space-y-12 animate-in fade-in duration-300">
                <section className="space-y-6">
                  <div className="flex flex-col gap-6">
                    <div className="form-control">
                      <label className="label">
                        <span className="label-text font-semibold dark:text-slate-200">Response Mode Selection</span>
                      </label>
                      <div className="flex bg-base-300 dark:bg-slate-800 p-1 rounded-lg w-fit">
                        {[
                          { id: 'moderator', label: 'Moderator' },
                          { id: 'mentions', label: 'Mentions' },
                          { id: 'random', label: 'Random' }
                        ].map((mode) => (
                          <button
                            key={mode.id}
                            onClick={() => onUpdate({ responseMode: mode.id as any })}
                            className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                              settings.responseMode === mode.id 
                                ? 'bg-primary text-primary-content shadow-sm' 
                                : 'hover:bg-base-100/50 dark:hover:bg-slate-700/50 dark:text-slate-400'
                            }`}
                          >
                            {mode.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {(settings.responseMode === 'moderator' || settings.responseMode === 'mentions') && (
                      <div className="space-y-6 animate-in fade-in slide-in-from-top-2 duration-300">
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                          <div className="form-control col-span-1">
                            <label className="label">
                              <span className="label-text font-semibold dark:text-slate-200">Interference Number</span>
                            </label>
                            <input 
                              type="number" 
                              min="1"
                              max="20"
                              className="input input-bordered bg-white dark:bg-slate-800 border-base-300 dark:border-slate-700 text-slate-900 dark:text-slate-100" 
                              value={settings.interferenceNumber}
                              onChange={(e) => onUpdate({ interferenceNumber: parseInt(e.target.value) || 5 })}
                            />
                          </div>
                          <div className="form-control col-span-3">
                            <label className="label">
                              <span className="label-text font-semibold dark:text-slate-200">Interference Prompt</span>
                            </label>
                            <PromptEditor 
                              value={settings.interferencePrompt}
                              onChange={(val) => onUpdate({ interferencePrompt: val })}
                              variables={PROMPT_METADATA.interferencePrompt.variables}
                              jsonFields={PROMPT_METADATA.interferencePrompt.jsonFields}
                              placeholder="Prompt to nudge AI to include the user..."
                              onFocus={() => setFocusedField('interferencePrompt')}
                            />
                          </div>
                        </div>

                        {settings.responseMode === 'moderator' && (
                          <div id="prompt-moderator" className="form-control pt-6 border-t border-base-300 dark:border-slate-800">
                            <label className="label">
                              <span className="label-text font-semibold dark:text-slate-200">Moderator Selection (Auto-Speaker)</span>
                            </label>
                            <PromptEditor 
                              value={settings.moderatorSelectionPrompt}
                              onChange={(val) => onUpdate({ moderatorSelectionPrompt: val })}
                              variables={PROMPT_METADATA.moderatorSelectionPrompt.variables}
                              jsonFields={PROMPT_METADATA.moderatorSelectionPrompt.jsonFields}
                              placeholder="Prompt for the AI to choose the next speaker..."
                              onFocus={() => setFocusedField('moderatorSelectionPrompt')}
                            />
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </section>
              </div>
            )}

            {activeTab === 'advanced' && (
              <div className="space-y-12 animate-in fade-in duration-300">
                <section className="space-y-6">
                  <div className="flex flex-col gap-6">
                    {isAdmin && (
                      <>
                        <div className="form-control w-fit">
                          <label className="label cursor-pointer gap-4">
                            <span className="label-text font-semibold dark:text-slate-200">Banned Speech</span>
                            <input 
                              type="checkbox" 
                              className="toggle toggle-accent" 
                              checked={settings.bannedSpeechEnabled}
                              onChange={(e) => onUpdate({ bannedSpeechEnabled: e.target.checked })}
                            />
                          </label>
                        </div>

                        {settings.bannedSpeechEnabled && (
                          <div className="space-y-4 animate-in fade-in duration-300 bg-base-200 dark:bg-slate-900 p-4 rounded-xl border border-base-300 dark:border-slate-800">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                              <div className="form-control">
                                <label className="label">
                                  <span className="label-text font-semibold dark:text-slate-200">Banned Speech List</span>
                                </label>
                                <AutoResizingTextarea 
                                  value={settings.bannedSpeechList}
                                  onChange={(e) => onUpdate({ bannedSpeechList: e.target.value })}
                                  placeholder="Enter banned words/characters, one per line..."
                                  className="min-h-[100px] bg-white dark:bg-slate-800 border-base-300 dark:border-slate-700 text-slate-900 dark:text-slate-100"
                                />
                              </div>
                              <div className="form-control">
                                <label className="label">
                                  <span className="label-text font-semibold dark:text-slate-200">Banned Speech Prompt</span>
                                </label>
                                <PromptEditor 
                                  value={settings.bannedSpeechPrompt}
                                  onChange={(val) => onUpdate({ bannedSpeechPrompt: val })}
                                  variables={PROMPT_METADATA.bannedSpeechPrompt.variables}
                                  jsonFields={PROMPT_METADATA.bannedSpeechPrompt.jsonFields}
                                  placeholder="Prompt to rephrase the message..."
                                  onFocus={() => setFocusedField('bannedSpeechPrompt')}
                                />
                              </div>
                            </div>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </section>
              </div>
            )}

            {isAdmin && activeTab === 'suggestions' && (
              <div className="space-y-12 animate-in fade-in duration-300">
                <section className="space-y-6">
                  <div className="form-control">
                    <label className="label">
                      <span className="label-text font-semibold dark:text-slate-200">Starter Suggestions</span>
                    </label>
                    <AutoResizingTextarea 
                      value={settings.suggestionPrompts}
                      onChange={(e) => onUpdate({ suggestionPrompts: e.target.value })}
                      placeholder="Enter one suggestion per line..."
                      className="h-64 bg-white dark:bg-slate-800 border-base-300 dark:border-slate-700 text-slate-900 dark:text-slate-100"
                    />
                  </div>
                </section>
              </div>
            )}

            {isAdmin && activeTab === 'styles' && (
              <div className="space-y-12 animate-in fade-in duration-300">
                <section className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div />
                    <button 
                      onClick={() => {
                        const newStyle = {
                          id: Math.random().toString(36).substring(7),
                          name: 'New Style',
                          description: '',
                          wordMin: 10,
                          wordMax: 30,
                          intro: '{{firstName}} here.'
                        };
                        onUpdate({ communicationStyles: [...(settings.communicationStyles || []), newStyle] });
                      }}
                      className="btn btn-secondary btn-sm gap-2"
                    >
                      <Plus size={16} /> Add Style
                    </button>
                  </div>
                  
                  <div className="grid grid-cols-1 gap-6">
                    {(settings.communicationStyles || []).map((style, index) => (
                      <div key={style.id} className="bg-base-200 dark:bg-slate-900 p-6 rounded-xl space-y-4 relative group border border-base-300 dark:border-slate-800">
                        <button 
                          onClick={() => {
                            const newStyles = settings.communicationStyles.filter((_, i) => i !== index);
                            onUpdate({ communicationStyles: newStyles });
                          }}
                          className="btn btn-ghost btn-xs text-error absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <Trash2 size={14} />
                        </button>

                        <div className="grid grid-cols-1 md:grid-cols-8 gap-4 items-start">
                          <div className="form-control col-span-1 md:col-span-2">
                            <label className="label">
                              <span className="label-text font-semibold dark:text-slate-200">Name</span>
                            </label>
                            <input 
                              type="text" 
                              className="input input-bordered input-sm bg-white dark:bg-slate-800 border-base-300 dark:border-slate-700 text-slate-900 dark:text-slate-100" 
                              value={style.name}
                              onChange={(e) => {
                                const newStyles = [...settings.communicationStyles];
                                newStyles[index] = { ...style, name: e.target.value };
                                onUpdate({ communicationStyles: newStyles });
                              }}
                            />
                          </div>
                          <div className="form-control col-span-1 md:col-span-4">
                            <label className="label">
                              <span className="label-text font-semibold dark:text-slate-200">Intro</span>
                            </label>
                            <PromptEditor 
                              value={style.intro}
                              onChange={(val) => {
                                const newStyles = [...settings.communicationStyles];
                                newStyles[index] = { ...style, intro: val };
                                onUpdate({ communicationStyles: newStyles });
                              }}
                              variables={PROMPT_METADATA.communicationStyleIntro.variables}
                              jsonFields={PROMPT_METADATA.communicationStyleIntro.jsonFields}
                              placeholder="Intro template..."
                              onFocus={() => setFocusedField('communicationStyleIntro')}
                            />
                          </div>
                          <div className="form-control col-span-1 md:col-span-1">
                            <label className="label">
                              <span className="label-text font-semibold dark:text-slate-200">Min</span>
                            </label>
                            <input 
                              type="number" 
                              className="input input-bordered input-sm bg-white dark:bg-slate-800 border-base-300 dark:border-slate-700 text-slate-900 dark:text-slate-100" 
                              value={style.wordMin}
                              onChange={(e) => {
                                const newStyles = [...settings.communicationStyles];
                                newStyles[index] = { ...style, wordMin: parseInt(e.target.value) || 0 };
                                onUpdate({ communicationStyles: newStyles });
                              }}
                            />
                          </div>
                          <div className="form-control col-span-1 md:col-span-1">
                            <label className="label">
                              <span className="label-text font-semibold dark:text-slate-200">Max</span>
                            </label>
                            <input 
                              type="number" 
                              className="input input-bordered input-sm bg-white dark:bg-slate-800 border-base-300 dark:border-slate-700 text-slate-900 dark:text-slate-100" 
                              value={style.wordMax}
                              onChange={(e) => {
                                const newStyles = [...settings.communicationStyles];
                                newStyles[index] = { ...style, wordMax: parseInt(e.target.value) || 0 };
                                onUpdate({ communicationStyles: newStyles });
                              }}
                            />
                          </div>
                        </div>

                        <div className="form-control">
                          <label className="label">
                            <span className="label-text font-semibold dark:text-slate-200">Description</span>
                          </label>
                          <input 
                            type="text"
                            className="input input-bordered input-sm bg-white dark:bg-slate-800 border-base-300 dark:border-slate-700 text-slate-900 dark:text-slate-100" 
                            value={style.description}
                            onChange={(e) => {
                              const newStyles = [...settings.communicationStyles];
                              newStyles[index] = { ...style, description: e.target.value };
                              onUpdate({ communicationStyles: newStyles });
                            }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              </div>
            )}

            {isAdmin && activeTab === 'prompts' && (
              <div className="space-y-12 animate-in fade-in duration-300">
                <section className="space-y-6">
                  <div id="prompt-assembly" className="form-control scroll-mt-10">
                    <label className="label">
                      <span className="label-text font-semibold dark:text-slate-200">Panelist Assembly</span>
                    </label>
                    <PromptEditor 
                      value={settings.quickPanelistsPrompt || BASE_QUICK_PANELISTS_PROMPT}
                      onChange={(val) => onUpdate({ quickPanelistsPrompt: val })}
                      variables={PROMPT_METADATA.quickPanelistsPrompt.variables}
                      jsonFields={PROMPT_METADATA.quickPanelistsPrompt.jsonFields}
                      placeholder="Template for quickly generating panelist names and descriptions..."
                      onFocus={() => setFocusedField('quickPanelistsPrompt')}
                    />
                  </div>

                  <div id="prompt-personalities" className="form-control scroll-mt-10">
                    <label className="label">
                      <span className="label-text font-semibold dark:text-slate-200">Panelist Personalities</span>
                    </label>
                    <PromptEditor 
                      value={settings.panelistDetailsPrompt || BASE_PANELIST_DETAILS_PROMPT}
                      onChange={(val) => onUpdate({ panelistDetailsPrompt: val })}
                      variables={PROMPT_METADATA.panelistDetailsPrompt.variables}
                      jsonFields={PROMPT_METADATA.panelistDetailsPrompt.jsonFields}
                      placeholder="Template for generating individual panelist details..."
                      onFocus={() => setFocusedField('panelistDetailsPrompt')}
                    />
                  </div>

                  <div id="prompt-response" className="form-control scroll-mt-10">
                    <label className="label">
                      <span className="label-text font-semibold dark:text-slate-200">Agent Response</span>
                    </label>
                    <PromptEditor 
                      value={settings.responsePrompt}
                      onChange={(val) => onUpdate({ responsePrompt: val })}
                      variables={PROMPT_METADATA.responsePrompt.variables}
                      jsonFields={PROMPT_METADATA.responsePrompt.jsonFields}
                      placeholder="Template for agent responses..."
                      onFocus={() => setFocusedField('responsePrompt')}
                    />
                  </div>

                  <div id="prompt-auto-user" className="form-control scroll-mt-10">
                    <label className="label">
                      <span className="label-text font-semibold dark:text-slate-200">User Auto Response</span>
                    </label>
                    <PromptEditor 
                      value={settings.moderatorPrompt}
                      onChange={(val) => onUpdate({ moderatorPrompt: val })}
                      variables={PROMPT_METADATA.moderatorPrompt.variables}
                      jsonFields={PROMPT_METADATA.moderatorPrompt.jsonFields}
                      placeholder="Template for suggested user response..."
                      onFocus={() => setFocusedField('moderatorPrompt')}
                    />
                  </div>

                  <div id="prompt-avatar" className="form-control scroll-mt-10">
                    <label className="label">
                      <span className="label-text font-semibold dark:text-slate-200">Avatar Generation</span>
                    </label>
                    <PromptEditor 
                      value={settings.imagePrompt}
                      onChange={(val) => onUpdate({ imagePrompt: val })}
                      variables={PROMPT_METADATA.imagePrompt.variables}
                      jsonFields={PROMPT_METADATA.imagePrompt.jsonFields}
                      placeholder="Template for generating panelist avatars..."
                      onFocus={() => setFocusedField('imagePrompt')}
                    />
                  </div>
                </section>
              </div>
            )}
          </div>
        </div>

        {focusedField && PROMPT_METADATA[focusedField] && (PROMPT_METADATA[focusedField].variables.length > 0 || PROMPT_METADATA[focusedField].jsonFields.length > 0) && (
          <div className="w-80 shrink-0 border-l border-base-300 dark:border-slate-800 bg-white dark:bg-slate-900 hidden lg:block overflow-y-auto variables-sidebar-container">
            <VariablesSidebar 
              metadata={PROMPT_METADATA[focusedField]}
              currentValue={(settings as any)[focusedField] || ''}
              onInsert={(name, type) => {
                const event = new CustomEvent('insert-prompt-variable', { detail: { name, type } });
                window.dispatchEvent(event);
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
};
