import React from 'react';
import { MessageSquareCode, RotateCcw, Settings as SettingsIcon, BrainCircuit } from 'lucide-react';

interface HeaderProps {
  onReset: () => void;
  onToggleDebug: () => void;
  onOpenSettings: () => void;
  showDebug: boolean;
}

export const Header: React.FC<HeaderProps> = ({ onReset, onToggleDebug, onOpenSettings, showDebug }) => {
  return (
    <header className="navbar bg-base-100 border-b border-base-300 px-4 relative z-20">
      <div className="flex-1">
        <h1 className="text-xl font-bold text-primary flex items-center gap-2">
          <BrainCircuit size={24} />
          BrainTrustAI
        </h1>
      </div>
      <div className="flex-none gap-2">
        <button 
          onClick={onReset}
          className="btn btn-ghost btn-sm tooltip tooltip-bottom" 
          data-tip="Reset Conversation"
        >
          <RotateCcw size={20} />
        </button>
        <button 
          onClick={onToggleDebug}
          className={`btn btn-sm ${showDebug ? 'btn-primary' : 'btn-ghost'} tooltip tooltip-bottom`} 
          data-tip="Agent Console"
        >
          <MessageSquareCode size={20} />
        </button>
        <button 
          onClick={onOpenSettings}
          className="btn btn-ghost btn-sm tooltip tooltip-bottom" 
          data-tip="Settings"
        >
          <SettingsIcon size={20} />
        </button>
      </div>
    </header>
  );
};
