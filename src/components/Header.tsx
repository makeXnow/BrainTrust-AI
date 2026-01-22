import React from 'react';
import { MessageSquareCode, RotateCcw, Settings as SettingsIcon, BrainCircuit } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { clsx } from 'clsx';

interface HeaderProps {
  onReset: () => void;
  onToggleDebug: () => void;
  onOpenSettings: (tab?: string) => void;
  showDebug: boolean;
  isAdmin: boolean;
}

export const Header: React.FC<HeaderProps> = ({ onReset, onToggleDebug, onOpenSettings, showDebug, isAdmin }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const isSettingsPage = location.pathname === '/settings';

  const handleSettingsClick = () => {
    if (isAdmin) {
      if (isSettingsPage) {
        navigate('/');
      } else {
        navigate('/settings');
      }
    } else {
      onOpenSettings('general');
    }
  };

  return (
    <header className="navbar bg-base-100 dark:bg-slate-900 border-b border-base-300 dark:border-slate-800 px-4 relative z-20 transition-colors duration-300">
      <div className="flex-1 flex items-center gap-8">
        <h1 
          className="text-xl font-bold text-primary flex items-center gap-2 cursor-pointer"
          onClick={() => navigate('/')}
        >
          {isSettingsPage ? (
            <>
              <SettingsIcon size={24} />
              Admin Settings
            </>
          ) : (
            <>
              <BrainCircuit size={24} />
              BrainTrustAI
            </>
          )}
        </h1>
      </div>
      <div className="flex-none gap-2">
        {!isSettingsPage && (
          <>
            <button 
              onClick={onReset}
              className="btn btn-ghost btn-sm tooltip tooltip-bottom dark:text-slate-300" 
              data-tip="Reset Conversation"
            >
              <RotateCcw size={20} />
            </button>
            <button 
              onClick={onToggleDebug}
              className={`btn btn-sm ${showDebug ? 'btn-primary' : 'btn-ghost dark:text-slate-300'} tooltip tooltip-bottom`} 
              data-tip="Agent Console"
            >
              <MessageSquareCode size={20} />
            </button>
          </>
        )}
        <button 
          onClick={handleSettingsClick}
          className={clsx(
            "btn btn-sm tooltip tooltip-bottom",
            isSettingsPage ? "btn-primary px-6 rounded-xl shadow-md shadow-primary/20" : "btn-ghost dark:text-slate-300"
          )}
          data-tip={isSettingsPage ? "Save & Exit" : "Settings"}
        >
          {isSettingsPage ? "Save & Exit" : <SettingsIcon size={20} />}
        </button>
      </div>
    </header>
  );
};
