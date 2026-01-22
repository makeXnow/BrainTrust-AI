import React, { useState } from 'react';
import { Settings } from '@/types';
import { AgentCountSelector } from './AgentCountSelector';
import { X, Lock, Settings as SettingsIcon } from 'lucide-react';
import { clsx } from 'clsx';

interface SettingsModalProps {
  settings: Settings;
  onUpdate: (settings: Partial<Settings>) => void;
  onClose: () => void;
  onAdminLogin: (password: string) => boolean;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ 
  settings, 
  onUpdate, 
  onClose,
  onAdminLogin
}) => {
  const [showPasswordPrompt, setShowPasswordPrompt] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [passwordError, setPasswordError] = useState(false);

  const handleAdminSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const success = onAdminLogin(passwordInput);
    if (!success) {
      setPasswordError(true);
    } else {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-300" onClick={onClose}>
      <div 
        className="bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-300 flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-8 space-y-8">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <SettingsIcon className="text-primary" />
              Settings
            </h2>
            <button 
              onClick={onClose}
              className="btn btn-ghost btn-circle btn-sm text-slate-500"
            >
              <X size={20} />
            </button>
          </div>

          <div className="space-y-6">
            <div className="form-control">
              <label className="label">
                <span className="label-text font-bold text-slate-700 dark:text-slate-300">Your Name</span>
              </label>
              <input 
                type="text" 
                className="input input-bordered w-full bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:input-primary transition-all rounded-xl" 
                value={settings.userName || ''}
                placeholder="Enter your name..."
                onChange={(e) => onUpdate({ userName: e.target.value })}
              />
            </div>

            <div className="form-control">
              <label className="label">
                <span className="label-text font-bold text-slate-700 dark:text-slate-300">Number of Panelists</span>
              </label>
              <div className="flex justify-center p-2 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700">
                <AgentCountSelector 
                  value={settings.agentCount} 
                  onChange={(count) => onUpdate({ agentCount: count })} 
                />
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
            {!showPasswordPrompt ? (
              <button 
                onClick={() => setShowPasswordPrompt(true)}
                className="flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-primary transition-colors uppercase tracking-widest"
              >
                <Lock size={14} />
                Admin Settings
              </button>
            ) : (
              <form onSubmit={handleAdminSubmit} className="space-y-3 animate-in slide-in-from-top-2 duration-200">
                <div className="flex gap-2">
                  <input 
                    type="password"
                    autoFocus
                    placeholder="Admin Password"
                    className={clsx(
                      "input input-bordered input-sm flex-1 bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-lg",
                      passwordError && "border-error text-error"
                    )}
                    value={passwordInput}
                    onChange={(e) => {
                      setPasswordInput(e.target.value);
                      setPasswordError(false);
                    }}
                  />
                  <button type="submit" className="btn btn-primary btn-sm rounded-lg px-4">Unlock</button>
                  <button 
                    type="button" 
                    onClick={() => setShowPasswordPrompt(false)} 
                    className="btn btn-ghost btn-sm btn-square rounded-lg"
                  >
                    <X size={16} />
                  </button>
                </div>
                {passwordError && (
                  <p className="text-[10px] text-error font-medium px-1">Incorrect password. Please try again.</p>
                )}
              </form>
            )}
          </div>
          
          <button 
            onClick={onClose}
            className="btn btn-primary w-full rounded-2xl shadow-lg shadow-primary/20"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
