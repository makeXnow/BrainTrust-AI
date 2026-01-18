import React, { useState, useEffect } from 'react';
import { Message } from '@/types';
import { User, Bot } from 'lucide-react';
import { clsx } from 'clsx';

// Simple image component - cropping is now done at image generation time in useChat.ts
export const AutoCroppedImage: React.FC<{ 
  src: string; 
  alt?: string; 
  className?: string;
}> = ({ src, alt, className }) => {
  return (
    <img 
      src={src} 
      alt={alt} 
      className={className} 
      referrerPolicy="no-referrer" 
    />
  );
};

interface MessageBubbleProps {
  message: Message;
  namesToBold?: string[];
  onType?: () => void;
  onAvatarClick?: (panelistId: string) => void;
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({ message, namesToBold = [], onType, onAvatarClick }) => {
  const isUser = message.role === 'user';
  const isModerator = message.role === 'moderator';

  // Helper to bold names in the content
  const renderContent = (content: string) => {
    if (!namesToBold.length) return content;

    const selfName = isModerator ? 'Moderator' : message.senderName;

    // Filter out empty names, the sender's own name, and sort by length descending
    const names = namesToBold
      .filter(n => n && n.trim().length > 0 && n.toLowerCase() !== selfName?.toLowerCase())
      .sort((a, b) => b.length - a.length);
    
    if (names.length === 0) return content;

    try {
      // Escape special regex characters in names
      const escapedNames = names.map(n => n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
      const pattern = new RegExp(`\\b(${escapedNames.join('|')})\\b`, 'gi');
      
      const parts = content.split(pattern);
      
      return parts.map((part, i) => {
        const isName = names.some(n => n.toLowerCase() === part.toLowerCase());
        if (isName) {
          return <strong key={i} className="font-extrabold">{part}</strong>;
        }
        return part;
      });
    } catch (e) {
      return content;
    }
  };

  const isThinkingMessage = message.isThinking || (message.content || '').endsWith('is thinking...');

  // Calculate if this is a "new" message only once when the component mounts
  // or when the message ID changes. This prevents the typewriter from 
  // stopping mid-way if the 2000ms timer expires during typing.
  const [isNewAgentMessage] = useState<boolean>(() => {
    return !isUser && !isModerator && !isThinkingMessage && (Date.now() - message.timestamp < 3000);
  });

  const [displayedContent, setDisplayedContent] = useState<string>(() => {
    const content = message.content || '';
    if (!isUser && !isModerator && !isThinkingMessage && (Date.now() - message.timestamp < 3000)) {
      const tokens = content.match(/\S+\s*/g) || [];
      return (tokens[0] || '') as string;
    }
    return content;
  });
  const [isTyping, setIsTyping] = useState(isNewAgentMessage);

  // If the message content or ID changes, we need to handle it.
  // But we only restart the typewriter if the ID is actually different.
  useEffect(() => {
    if (!isNewAgentMessage) {
      setDisplayedContent(message.content);
      setIsTyping(false);
    }
  }, [message.id, message.content, isNewAgentMessage]);

  useEffect(() => {
    if (!isNewAgentMessage || displayedContent === message.content) {
      setIsTyping(false);
      return;
    }

    // Split into tokens (word + following whitespace) to preserve original formatting
    const tokens = (message.content || '').match(/\S+\s*/g) || [];
    
    // Find how many tokens are already displayed if we are resuming
    let tokenIndex = 0;
    if (displayedContent && displayedContent.length > 0) {
      let currentLen = 0;
      for (let j = 0; j < tokens.length; j++) {
        currentLen += tokens[j].length;
        if (currentLen >= displayedContent.length) {
          tokenIndex = j + 1;
          break;
        }
      }
    }

    const typingSpeed = 100; // 100ms per word (half the speed)
    
    const timer = setInterval(() => {
      if (tokenIndex >= tokens.length) {
        clearInterval(timer);
        setIsTyping(false);
        return;
      }

      const nextContent = tokens.slice(0, tokenIndex + 1).join('');
      setDisplayedContent(nextContent);
      tokenIndex++;
      
      if (onType) onType();
    }, typingSpeed);

    return () => clearInterval(timer);
  }, [message.content, isNewAgentMessage, message.id]); // Added message.id to dependencies

  // Extract base color from Tailwind bg class (e.g., "bg-emerald-50" -> "emerald")
  const getColorClasses = (bgClass: string, isThinking?: boolean) => {
    const match = bgClass.match(/bg-(.+)-50/);
    const base = match ? match[1] : 'emerald';
    
    const colors: Record<string, { bubble: string; text: string; border: string; avatar: string }> = {
      red: { 
        bubble: isThinking ? 'bg-red-50/50 dark:bg-red-950/20 opacity-60' : 'bg-red-50 dark:bg-red-950/30', 
        text: 'text-red-900 dark:text-red-200', 
        border: 'border-red-200 dark:border-red-900/50', 
        avatar: 'bg-red-500' 
      },
      orange: { 
        bubble: isThinking ? 'bg-orange-50/50 dark:bg-orange-950/20 opacity-60' : 'bg-orange-50 dark:bg-orange-950/30', 
        text: 'text-orange-900 dark:text-orange-200', 
        border: 'border-orange-200 dark:border-orange-900/50', 
        avatar: 'bg-orange-500' 
      },
      amber: { 
        bubble: isThinking ? 'bg-amber-50/50 dark:bg-amber-950/20 opacity-60' : 'bg-amber-50 dark:bg-amber-950/30', 
        text: 'text-amber-900 dark:text-amber-200', 
        border: 'border-amber-200 dark:border-amber-900/50', 
        avatar: 'bg-amber-500' 
      },
      yellow: { 
        bubble: isThinking ? 'bg-yellow-50/50 dark:bg-yellow-950/20 opacity-60' : 'bg-yellow-50 dark:bg-yellow-950/30', 
        text: 'text-yellow-900 dark:text-yellow-200', 
        border: 'border-yellow-200 dark:border-yellow-900/50', 
        avatar: 'bg-yellow-500' 
      },
      lime: { 
        bubble: isThinking ? 'bg-lime-50/50 dark:bg-lime-950/20 opacity-60' : 'bg-lime-50 dark:bg-lime-950/30', 
        text: 'text-lime-900 dark:text-lime-200', 
        border: 'border-lime-200 dark:border-lime-900/50', 
        avatar: 'bg-lime-500' 
      },
      green: { 
        bubble: isThinking ? 'bg-green-50/50 dark:bg-green-950/20 opacity-60' : 'bg-green-50 dark:bg-green-950/30', 
        text: 'text-green-900 dark:text-green-200', 
        border: 'border-green-200 dark:border-green-900/50', 
        avatar: 'bg-green-500' 
      },
      emerald: { 
        bubble: isThinking ? 'bg-emerald-50/50 dark:bg-emerald-950/20 opacity-60' : 'bg-emerald-50 dark:bg-emerald-950/30', 
        text: 'text-emerald-900 dark:text-emerald-200', 
        border: 'border-emerald-200 dark:border-emerald-900/50', 
        avatar: 'bg-emerald-500' 
      },
      teal: { 
        bubble: isThinking ? 'bg-teal-50/50 dark:bg-teal-950/20 opacity-60' : 'bg-teal-50 dark:bg-teal-950/30', 
        text: 'text-teal-900 dark:text-teal-200', 
        border: 'border-teal-200 dark:border-teal-900/50', 
        avatar: 'bg-teal-500' 
      },
      cyan: { 
        bubble: isThinking ? 'bg-cyan-50/50 dark:bg-cyan-950/20 opacity-60' : 'bg-cyan-50 dark:bg-cyan-950/30', 
        text: 'text-cyan-900 dark:text-cyan-200', 
        border: 'border-cyan-200 dark:border-cyan-900/50', 
        avatar: 'bg-cyan-500' 
      },
      sky: { 
        bubble: isThinking ? 'bg-sky-50/50 dark:bg-sky-950/20 opacity-60' : 'bg-sky-50 dark:bg-sky-950/30', 
        text: 'text-sky-900 dark:text-sky-200', 
        border: 'border-sky-200 dark:border-sky-900/50', 
        avatar: 'bg-sky-500' 
      },
      blue: { 
        bubble: isThinking ? 'bg-blue-50/50 dark:bg-blue-950/20 opacity-60' : 'bg-blue-50 dark:bg-blue-950/30', 
        text: 'text-blue-900 dark:text-blue-200', 
        border: 'border-blue-200 dark:border-blue-900/50', 
        avatar: 'bg-blue-500' 
      },
      indigo: { 
        bubble: isThinking ? 'bg-indigo-50/50 dark:bg-indigo-950/20 opacity-60' : 'bg-indigo-50 dark:bg-indigo-950/30', 
        text: 'text-indigo-900 dark:text-indigo-200', 
        border: 'border-indigo-200 dark:border-indigo-900/50', 
        avatar: 'bg-indigo-500' 
      },
      violet: { 
        bubble: isThinking ? 'bg-violet-50/50 dark:bg-violet-950/20 opacity-60' : 'bg-violet-50 dark:bg-violet-950/30', 
        text: 'text-violet-900 dark:text-violet-200', 
        border: 'border-violet-200 dark:border-violet-900/50', 
        avatar: 'bg-violet-500' 
      },
      purple: { 
        bubble: isThinking ? 'bg-purple-50/50 dark:bg-purple-950/20 opacity-60' : 'bg-purple-50 dark:bg-purple-950/30', 
        text: 'text-purple-900 dark:text-purple-200', 
        border: 'border-purple-200 dark:border-purple-900/50', 
        avatar: 'bg-purple-500' 
      },
      fuchsia: { 
        bubble: isThinking ? 'bg-fuchsia-50/50 dark:bg-fuchsia-950/20 opacity-60' : 'bg-fuchsia-50 dark:bg-fuchsia-950/30', 
        text: 'text-fuchsia-900 dark:text-fuchsia-200', 
        border: 'border-fuchsia-200 dark:border-fuchsia-900/50', 
        avatar: 'bg-fuchsia-500' 
      },
      pink: { 
        bubble: isThinking ? 'bg-pink-50/50 dark:bg-pink-950/20 opacity-60' : 'bg-pink-50 dark:bg-pink-950/30', 
        text: 'text-pink-900 dark:text-pink-200', 
        border: 'border-pink-200 dark:border-pink-900/50', 
        avatar: 'bg-pink-500' 
      },
      rose: { 
        bubble: isThinking ? 'bg-rose-50/50 dark:bg-rose-950/20 opacity-60' : 'bg-rose-50 dark:bg-rose-950/30', 
        text: 'text-rose-900 dark:text-rose-200', 
        border: 'border-rose-200 dark:border-rose-900/50', 
        avatar: 'bg-rose-500' 
      },
      slate: { 
        bubble: 'bg-white dark:bg-slate-900', 
        text: 'text-slate-800 dark:text-slate-100', 
        border: 'border-slate-200 dark:border-slate-800', 
        avatar: 'bg-white dark:bg-slate-800' 
      },
    };

    return colors[base] || colors.emerald;
  };

  const colorTheme = isUser ? getColorClasses('bg-slate-50') : getColorClasses(message.color || 'bg-emerald-50', isThinkingMessage);
  
  const bubbleStyles = clsx(
    'p-4 rounded-2xl text-[15px] leading-relaxed shadow-sm border transition-all duration-500',
    isUser 
      ? `${colorTheme.bubble} ${colorTheme.text} ${colorTheme.border} rounded-br-none` 
      : `${colorTheme.bubble} ${colorTheme.text} ${colorTheme.border} rounded-bl-none`,
    isThinkingMessage && 'italic text-slate-400 dark:text-slate-500 border-dashed'
  );

  return (
    <div className={clsx(
      'flex gap-3 max-w-[95%] mb-8 items-end',
      isUser ? 'flex-row-reverse ml-auto' : 'flex-row mr-auto'
    )}>
      {/* Avatar */}
      <div 
        className={clsx(
          'w-16 h-16 rounded-full flex items-center justify-center shadow-md flex-shrink-0 overflow-hidden border transition-all duration-300',
          isUser ? 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700' : 'bg-base-300 dark:bg-slate-800 border-transparent',
          !isUser && message.panelistId && 'cursor-pointer hover:border-primary/50',
          isThinkingMessage && 'opacity-50'
        )}
        onClick={() => !isUser && message.panelistId && onAvatarClick?.(message.panelistId)}
      >
        {isUser ? (
          <User size={32} className="text-slate-400 dark:text-slate-500" />
        ) : message.avatarUrl ? (
          <AutoCroppedImage 
            src={message.avatarUrl} 
            alt={message.senderName} 
            className="w-full h-full object-cover" 
          />
        ) : (
          <div className={clsx('w-full h-full flex items-center justify-center text-white font-bold text-xl', colorTheme.avatar)}>
            {message.senderName?.charAt(0) || <Bot size={32} />}
          </div>
        )}
      </div>

      {/* Message Content */}
      <div className={clsx('flex flex-col max-w-[80%]', isUser ? 'items-end' : 'items-start')}>
        <div className="flex items-center gap-2 mb-1.5 px-0.5 flex-wrap">
          {!isUser && (
            <>
              <span className="font-bold text-sm text-slate-700 dark:text-slate-300 whitespace-nowrap">
                {message.senderName || (isModerator ? 'Moderator' : 'Agent')}
              </span>
              {message.senderTitle && (
                <span className="text-[11px] text-slate-400 dark:text-slate-500 font-normal italic truncate">
                  {message.senderTitle}
                </span>
              )}
            </>
          )}
          {isUser && message.senderName && (
            <span className="font-bold text-sm text-slate-700 dark:text-slate-300 whitespace-nowrap">
              {message.senderName}
            </span>
          )}
        </div>
        
        <div className={bubbleStyles}>
          {renderContent(displayedContent)}
        </div>
      </div>
    </div>
  );
};
