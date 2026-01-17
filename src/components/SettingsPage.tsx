import React, { useRef, useEffect } from 'react';
import { Settings } from '@/types';
import { AgentCountSelector } from './AgentCountSelector';
import { X } from 'lucide-react';
import { BASE_STARTING_PROMPT, BASE_RESPONSE_PROMPT, BASE_MODERATOR_PROMPT, BASE_IMAGE_PROMPT } from '@/lib/prompts';

interface SettingsPageProps {
  settings: Settings;
  onUpdate: (settings: Partial<Settings>) => void;
  onClose: () => void;
  availableModels: string[];
  availableImageModels: string[];
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

export const SettingsPage: React.FC<SettingsPageProps> = ({ settings, onUpdate, onClose, availableModels, availableImageModels }) => {
  const getModelPrice = (id: string) => {
    const prices: Record<string, string> = {
      'dall-e-2': '$0.02',
      'dall-e-3': '$0.04',
      'gpt-image-1.5': '$0.05',
      'imagen-3-fast': '$0.02',
      'imagen-4-standard': '$0.04',
      'imagen-4-ultra': '$0.06',
    };
    return prices[id] || '';
  };

  const formatModelName = (id: string, isImageModel: boolean = false) => {
    const prefix = (id.startsWith('gemini-') || id.startsWith('imagen-')) ? 'Gemini' : 'OpenAI';
    const price = isImageModel ? getModelPrice(id) : '';
    
    if (price) {
      // We use a long dash and padding to simulate the "right side" look 
      // since standard HTML <option> doesn't support complex CSS layout.
      return `${prefix}: ${id.padEnd(25, '\u00A0')} — ${price}`;
    }
    return `${prefix}: ${id}`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-base-100 rounded-lg shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="p-4 border-b border-base-300 flex items-center justify-between bg-base-200">
          <h2 className="text-xl font-bold flex items-center gap-2">Settings</h2>
          <button onClick={onClose} className="btn btn-ghost btn-circle btn-sm">
            <X size={20} />
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-6 space-y-8">
          <section>
            <h3 className="text-lg font-bold mb-4 border-l-4 border-primary pl-3">General</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="form-control col-span-1 md:col-span-2">
                <label className="label">
                  <span className="label-text font-bold">Your Name</span>
                </label>
                <input 
                  type="text" 
                  className="input input-bordered w-full" 
                  value={settings.userName || ''}
                  placeholder="Enter your name..."
                  onChange={(e) => onUpdate({ userName: e.target.value })}
                />
              </div>
              <div className="form-control">
                <label className="label">
                  <span className="label-text">Theme</span>
                </label>
                <select 
                  className="select select-bordered w-full" 
                  value={settings.theme}
                  onChange={(e) => onUpdate({ theme: e.target.value })}
                >
                  {["aqua", "light", "dark", "cupcake", "bumblebee", "emerald", "corporate", "synthwave", "retro", "cyberpunk", "valentine", "halloween", "garden", "forest", "lofi", "pastel", "fantasy", "wireframe", "black", "luxury", "dracula", "cmyk", "autumn", "business", "acid", "lemonade", "night", "coffee", "winter", "dim", "nord", "sunset"].map(t => (
                    <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
                  ))}
                </select>
              </div>
              <div className="form-control">
                <label className="label">
                  <span className="label-text">Model</span>
                </label>
                <select 
                  className="select select-bordered w-full" 
                  value={settings.model}
                  onChange={(e) => onUpdate({ model: e.target.value })}
                >
                  {availableModels.map(m => (
                    <option key={m} value={m}>{formatModelName(m)}</option>
                  ))}
                  {availableModels.length === 0 && (
                    <>
                      <option value="gemini-3-pro-preview">{formatModelName('gemini-3-pro-preview')}</option>
                      <option value="gpt-5.2-instant">{formatModelName('gpt-5.2-instant')}</option>
                    </>
                  )}
                </select>
              </div>
              <div className="form-control">
                <label className="label">
                  <span className="label-text">Image Model</span>
                </label>
                <select 
                  className="select select-bordered w-full" 
                  value={settings.imageModel}
                  onChange={(e) => onUpdate({ imageModel: e.target.value })}
                >
                  {availableImageModels.map(m => (
                    <option key={m} value={m}>{formatModelName(m)}</option>
                  ))}
                  {availableImageModels.length === 0 && (
                    <>
                      <option value="imagen-4-standard">{formatModelName('imagen-4-standard')}</option>
                      <option value="imagen-3-fast">{formatModelName('imagen-3-fast')}</option>
                      <option value="dall-e-3">{formatModelName('dall-e-3')}</option>
                      <option value="dall-e-2">{formatModelName('dall-e-2')}</option>
                    </>
                  )}
                </select>
              </div>
              <AgentCountSelector 
                value={settings.agentCount} 
                onChange={(count) => onUpdate({ agentCount: count })} 
              />
            </div>
          </section>

          <section className="space-y-6">
            <h3 className="text-lg font-bold border-l-4 border-secondary pl-3">Prompt Templates</h3>
            
            <div className="form-control">
              <label className="label">
                <span className="label-text font-semibold">Starting Prompt (Panelist Generation)</span>
              </label>
              <AutoResizingTextarea 
                value={settings.startingPrompt}
                onChange={(e) => onUpdate({ startingPrompt: e.target.value })}
                placeholder="Template for generating panelists..."
              />
              <label className="label">
                <span className="label-text-alt opacity-50">Variables: {"{{topic}}"}, {"{{count}}"}</span>
              </label>
            </div>

            <div className="form-control">
              <label className="label">
                <span className="label-text font-semibold">Response Prompt (Agent Reply)</span>
              </label>
              <AutoResizingTextarea 
                value={settings.responsePrompt}
                onChange={(e) => onUpdate({ responsePrompt: e.target.value })}
                placeholder="Template for agent responses..."
              />
              <label className="label">
                <span className="label-text-alt opacity-50">Variables: {"{{firstName}}"}, {"{{description}}"}, {"{{fullPersonality}}"}, {"{{topic}}"}, {"{{history}}"}</span>
              </label>
            </div>

            <div className="form-control">
              <label className="label">
                <span className="label-text font-semibold">User Auto Response Prompt</span>
              </label>
              <AutoResizingTextarea 
                value={settings.moderatorPrompt}
                onChange={(e) => onUpdate({ moderatorPrompt: e.target.value })}
                placeholder="Template for suggested user response..."
              />
              <label className="label">
                <span className="label-text-alt opacity-50">Variables: {"{{topic}}"}, {"{{history}}"}</span>
              </label>
            </div>

            <div className="form-control">
              <label className="label">
                <span className="label-text font-semibold">Image Generation Prompt</span>
              </label>
              <AutoResizingTextarea 
                value={settings.imagePrompt}
                onChange={(e) => onUpdate({ imagePrompt: e.target.value })}
                placeholder="Template for generating panelist avatars..."
              />
              <label className="label">
                <span className="label-text-alt opacity-50">Variables: {"{{firstName}}"}, {"{{description}}"}, {"{{fullPersonality}}"}</span>
              </label>
            </div>
          </section>

          <section className="space-y-6">
            <h3 className="text-lg font-bold border-l-4 border-accent pl-3">Discussion Suggestions</h3>
            
            <div className="form-control">
              <label className="label">
                <span className="label-text font-semibold">Starter Suggestions</span>
              </label>
              <AutoResizingTextarea 
                value={settings.suggestionPrompts}
                onChange={(e) => onUpdate({ suggestionPrompts: e.target.value })}
                placeholder="Enter one suggestion per line..."
                className="h-32"
              />
              <label className="label">
                <span className="label-text-alt opacity-50">One suggestion per line. These will be randomly selected when the app starts.</span>
              </label>
            </div>
          </section>
        </div>
        
        <div className="p-4 border-t border-base-300 bg-base-200 flex justify-end">
          <button onClick={onClose} className="btn btn-primary px-8">Save & Close</button>
        </div>
      </div>
    </div>
  );
};
