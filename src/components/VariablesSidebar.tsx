import React from 'react';
import { PromptMetadata } from '../lib/variableMetadata';

interface VariablesSidebarProps {
  metadata: PromptMetadata | null;
  currentValue: string;
  onInsert: (name: string, type: 'variable' | 'json') => void;
}

export const VariablesSidebar: React.FC<VariablesSidebarProps> = ({ metadata, currentValue, onInsert }) => {
  if (!metadata) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-8 text-center text-slate-400">
        <div className="mb-4 opacity-20">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" />
            <polyline points="13 2 13 9 20 9" />
          </svg>
        </div>
        <p className="text-sm">Click into a prompt to see available variables</p>
      </div>
    );
  }

  const isPresent = (name: string) => currentValue.includes(`{{${name}}}`);

  const toTitleCase = (str: string) => {
    return str
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, (match) => match.toUpperCase())
      .trim();
  };

  const toLowerCase = (str: string) => {
    return str
      .replace(/([A-Z])/g, ' $1')
      .toLowerCase()
      .trim();
  };

  return (
    <div className="h-full flex flex-col p-6 animate-in fade-in slide-in-from-right-4 duration-300">
      <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-6">Variables & Fields</h3>
      
      <div className="space-y-8">
        <div>
          <h4 className="text-xs font-semibold text-slate-400 dark:text-slate-500 mb-3 uppercase">General Variables</h4>
          <div className="flex flex-wrap gap-2">
            {metadata.variables.map(v => (
              <button
                key={v}
                onClick={() => onInsert(v, 'variable')}
                className="chip-blue bg-blue-100 dark:bg-blue-900/40 hover:bg-blue-200 dark:hover:bg-blue-900/60 text-blue-800 dark:text-blue-200 text-xs font-medium px-2.5 py-1 rounded-full border border-blue-200 dark:border-blue-800 transition-colors flex items-center gap-1.5"
              >
                <span className="opacity-60">+</span>
                {toLowerCase(v)}
              </button>
            ))}
          </div>
        </div>

        {metadata.jsonFields.length > 0 && (
          <div>
            <h4 className="text-xs font-semibold text-slate-400 dark:text-slate-500 mb-3 uppercase">Expected JSON Fields</h4>
            <div className="flex flex-wrap gap-2">
              {metadata.jsonFields.map(f => (
                <button
                  key={f}
                  onClick={() => onInsert(f, 'json')}
                  className={`text-xs font-medium px-2.5 py-1 rounded-full border transition-colors flex items-center gap-1.5 ${
                    isPresent(f)
                      ? 'bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-200 border-green-200 dark:border-green-800 hover:bg-green-200 dark:hover:bg-green-900/60'
                      : 'bg-red-50 dark:bg-red-950/20 text-red-700 dark:text-red-300 border-red-100 dark:border-red-900/50 hover:bg-red-100 dark:hover:bg-red-900/40'
                  }`}
                >
                  <span className="opacity-60">{isPresent(f) ? '✓' : '+'}</span>
                  {toTitleCase(f)}
                </button>
              ))}
            </div>
            <p className="mt-3 text-[10px] text-slate-400 dark:text-slate-500 leading-tight">
              Fields in red must be included in the prompt for the AI to know what to output.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
