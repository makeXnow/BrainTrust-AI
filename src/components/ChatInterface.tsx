import React, { useRef, useEffect } from 'react';
import { Message, Panelist } from '@/types';
import { MessageBubble } from './MessageBubble';
import { PromptSuggestions } from './PromptSuggestions';
import { Send, Bot } from 'lucide-react';
import { useAutoScroll } from '@/hooks/useAutoScroll';
import { clsx } from 'clsx';

interface ChatInterfaceProps {
  messages: Message[];
  panelists: Panelist[];
  isGenerating: boolean;
  status: string;
  topic: string;
  suggestions: string[];
  autoResponse: string | null;
  userName?: string;
  enableSuggestedResponse?: boolean;
  onSendMessage: (text: string) => void;
  onSelectSuggestion: (text: string) => void;
  onClearAutoResponse: () => void;
  onAvatarClick?: (id: string) => void;
}

export const ChatInterface: React.FC<ChatInterfaceProps> = ({
  messages,
  panelists,
  isGenerating,
  status,
  topic,
  suggestions,
  autoResponse,
  userName,
  enableSuggestedResponse = true,
  onSendMessage,
  onSelectSuggestion,
  onClearAutoResponse,
  onAvatarClick,
}) => {
  const [input, setInput] = React.useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { scrollRef, handleScroll, scrollToBottom } = useAutoScroll<HTMLDivElement>();

  const namesToBold = React.useMemo(() => {
    const names = panelists.map(p => p.firstName);
    if (userName) names.push(userName);
    names.push('Moderator');
    return names;
  }, [panelists, userName]);

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (input.trim() && (!isGenerating || status === 'generating_auto_response')) {
      onSendMessage(input.trim());
      setInput('');
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
      setTimeout(() => scrollToBottom(true), 50);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleLoadAutoResponse = () => {
    if (autoResponse) {
      setInput(autoResponse);
      onClearAutoResponse();
      // Reset height after content change will happen in useEffect
    }
  };

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [input]);

  useEffect(() => {
    const lastMessage = messages[messages.length - 1];
    const isUserMessage = lastMessage?.role === 'user';
    scrollToBottom(isUserMessage);
  }, [messages]);

  // Filter out moderator messages from display
  const displayMessages = messages.filter(m => m.role !== 'moderator');

  const showSuggestions = status === 'idle' && messages.length === 0;

  const isInputDisabled = isGenerating && status !== 'generating_auto_response';

  // Get the panelist who is currently "thinking"
  const thinkingPanelist = status === 'discussion' && isGenerating 
    ? messages.length > 0 
      ? panelists.find(p => !messages.some(m => m.panelistId === p.id))
      : panelists[0]
    : null;

  return (
    <div className="flex flex-col h-full relative bg-slate-50 dark:bg-slate-950 transition-colors duration-300">
      <div 
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto p-4 md:p-6 space-y-8 scroll-smooth"
      >
        <div className="max-w-5xl mx-auto w-full">
          {messages.length === 0 && status === 'idle' && (
            <div className="flex flex-col items-center justify-center h-full text-center space-y-6 pt-20">
              <div className="max-w-md">
                <h2 className="text-3xl font-bold mb-2 text-slate-800 dark:text-slate-100">What's on your mind?</h2>
                <p className="opacity-70 text-slate-600 dark:text-slate-400">
                  Start a discussion with a panel of AI experts.<br />
                  Choose a suggestion or type your own topic.
                </p>
              </div>
              <PromptSuggestions suggestions={suggestions} onSelect={onSelectSuggestion} disabled={isGenerating} />
            </div>
          )}

          {displayMessages.map((m) => (
            <MessageBubble 
              key={m.id} 
              message={m} 
              namesToBold={namesToBold}
              onType={scrollToBottom} 
              onAvatarClick={onAvatarClick}
            />
          ))}

          {(status === 'generating_panelists' || (status === 'introductions' && displayMessages.length <= 1)) && (
            <div className="flex items-center justify-center py-20 min-h-[400px]">
              {/* Removed AssemblingBrainTrust as per cleanup request */}
            </div>
          )}
        </div>
      </div>

      <div className="p-4 border-t border-base-300 dark:border-slate-800 bg-base-100/50 dark:bg-slate-900/50 backdrop-blur">
        <form onSubmit={handleSubmit} className="flex gap-2 max-w-5xl mx-auto w-full items-end">
          <textarea
            ref={textareaRef}
            rows={1}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isInputDisabled}
            placeholder={status === 'idle' ? "Enter a topic to discuss..." : "Respond to the panel..."}
            className="textarea textarea-bordered flex-1 focus:textarea-primary transition-all shadow-sm bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-200 resize-none min-h-[3rem] max-h-48 py-3 border-base-300 dark:border-slate-700"
          />
          {enableSuggestedResponse && (
            <button 
              type="button"
              onClick={handleLoadAutoResponse}
              disabled={!autoResponse || isInputDisabled}
              className="btn btn-square shadow-md btn-ghost border border-base-300 dark:border-slate-700 disabled:opacity-40 h-12"
              title={autoResponse ? "Load suggested response" : "Suggested response not ready"}
            >
              <Bot size={20} className={autoResponse ? "text-primary" : "text-slate-400 dark:text-slate-500"} />
            </button>
          )}
          <button 
            type="submit" 
            disabled={!input.trim() || isInputDisabled}
            className="btn btn-primary btn-square shadow-md h-12"
          >
            <Send size={20} />
          </button>
        </form>
      </div>
    </div>
  );
};
