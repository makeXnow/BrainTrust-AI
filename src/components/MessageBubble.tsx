import React, { useState, useEffect, useRef } from 'react';
import { Message } from '@/types';
import { User, Bot } from 'lucide-react';
import { clsx } from 'clsx';

const AutoCroppedImage: React.FC<{ src: string; alt?: string; className?: string; showHoverPreview?: boolean }> = ({ src, alt, className, showHoverPreview = false }) => {
  const [croppedSrc, setCroppedSrc] = useState<string>(src);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [isHovering, setIsHovering] = useState(false);

  useEffect(() => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = src;
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (!ctx) return;

      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0);

      try {
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;
        
        let minX = canvas.width, minY = canvas.height, maxX = 0, maxY = 0;
        const threshold = 240;

        for (let y = 0; y < canvas.height; y++) {
          for (let x = 0; x < canvas.width; x++) {
            const i = (y * canvas.width + x) * 4;
            const r = data[i], g = data[i + 1], b = data[i + 2];
            
            if (r < threshold || g < threshold || b < threshold) {
              if (x < minX) minX = x;
              if (x > maxX) maxX = x;
              if (y < minY) minY = y;
              if (y > maxY) maxY = y;
            }
          }
        }

        if (maxX > minX && maxY > minY) {
          const width = maxX - minX;
          const height = maxY - minY;
          if (minX > 5 || minY > 5 || (canvas.width - maxX) > 5 || (canvas.height - maxY) > 5) {
            const cropCanvas = document.createElement('canvas');
            cropCanvas.width = width;
            cropCanvas.height = height;
            const cropCtx = cropCanvas.getContext('2d');
            if (cropCtx) {
              cropCtx.drawImage(img, minX, minY, width, height, 0, 0, width, height);
              try {
                setCroppedSrc(cropCanvas.toDataURL());
              } catch (err) {
                console.warn("Could not export cropped canvas (tainted?):", err);
              }
            }
          }
        }
      } catch (e) {
        console.warn("Could not autocrop image:", e);
      }
    };
  }, [src]);

  const handleMouseMove = (e: React.MouseEvent) => {
    if (showHoverPreview) {
      setMousePos({ x: e.clientX, y: e.y });
    }
  };

  return (
    <>
      <img 
        src={croppedSrc} 
        alt={alt} 
        className={clsx(className, showHoverPreview && "cursor-zoom-in")} 
        referrerPolicy="no-referrer" 
        onMouseEnter={() => showHoverPreview && setIsHovering(true)}
        onMouseLeave={() => setIsHovering(false)}
        onMouseMove={handleMouseMove}
      />
      {showHoverPreview && isHovering && (
        <div 
          className="fixed z-[9999] pointer-events-none animate-in fade-in zoom-in-95 duration-200"
          style={{ 
            left: mousePos.x - 280, 
            top: mousePos.y - 280,
          }}
        >
          <div className="w-64 h-64 rounded-2xl overflow-hidden border-4 border-white shadow-2xl bg-white">
            <img src={croppedSrc} alt={alt} className="w-full h-full object-cover" />
          </div>
        </div>
      )}
    </>
  );
};

interface MessageBubbleProps {
  message: Message;
  namesToBold?: string[];
  onType?: () => void;
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({ message, namesToBold = [], onType }) => {
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
  };

  const isThinkingMessage = message.content.endsWith('is thinking...');

  // Calculate if this is a "new" message only once when the component mounts
  // or when the message ID changes. This prevents the typewriter from 
  // stopping mid-way if the 2000ms timer expires during typing.
  const [isNewAgentMessage] = useState(() => {
    return !isUser && !isModerator && !isThinkingMessage && (Date.now() - message.timestamp < 2000);
  });

  const [displayedContent, setDisplayedContent] = useState(isNewAgentMessage ? '' : message.content);
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
    const tokens = message.content.match(/\S+\s*/g) || [];
    
    // Find how many tokens are already displayed if we are resuming
    let tokenIndex = 0;
    if (displayedContent.length > 0) {
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
      red: { bubble: isThinking ? 'bg-red-50/50 opacity-60' : 'bg-red-50', text: 'text-red-900', border: 'border-red-200', avatar: 'bg-red-500' },
      orange: { bubble: isThinking ? 'bg-orange-50/50 opacity-60' : 'bg-orange-50', text: 'text-orange-900', border: 'border-orange-200', avatar: 'bg-orange-500' },
      amber: { bubble: isThinking ? 'bg-amber-50/50 opacity-60' : 'bg-amber-50', text: 'text-amber-900', border: 'border-amber-200', avatar: 'bg-amber-500' },
      yellow: { bubble: isThinking ? 'bg-yellow-50/50 opacity-60' : 'bg-yellow-50', text: 'text-yellow-900', border: 'border-yellow-200', avatar: 'bg-yellow-500' },
      lime: { bubble: isThinking ? 'bg-lime-50/50 opacity-60' : 'bg-lime-50', text: 'text-lime-900', border: 'border-lime-200', avatar: 'bg-lime-500' },
      green: { bubble: isThinking ? 'bg-green-50/50 opacity-60' : 'bg-green-50', text: 'text-green-900', border: 'border-green-200', avatar: 'bg-green-500' },
      emerald: { bubble: isThinking ? 'bg-emerald-50/50 opacity-60' : 'bg-emerald-50', text: 'text-emerald-900', border: 'border-emerald-200', avatar: 'bg-emerald-500' },
      teal: { bubble: isThinking ? 'bg-teal-50/50 opacity-60' : 'bg-teal-50', text: 'text-teal-900', border: 'border-teal-200', avatar: 'bg-teal-500' },
      cyan: { bubble: isThinking ? 'bg-cyan-50/50 opacity-60' : 'bg-cyan-50', text: 'text-cyan-900', border: 'border-cyan-200', avatar: 'bg-cyan-500' },
      sky: { bubble: isThinking ? 'bg-sky-50/50 opacity-60' : 'bg-sky-50', text: 'text-sky-900', border: 'border-sky-200', avatar: 'bg-sky-500' },
      blue: { bubble: isThinking ? 'bg-blue-50/50 opacity-60' : 'bg-blue-50', text: 'text-blue-900', border: 'border-blue-200', avatar: 'bg-blue-500' },
      indigo: { bubble: isThinking ? 'bg-indigo-50/50 opacity-60' : 'bg-indigo-50', text: 'text-indigo-900', border: 'border-indigo-200', avatar: 'bg-indigo-500' },
      violet: { bubble: isThinking ? 'bg-violet-50/50 opacity-60' : 'bg-violet-50', text: 'text-violet-900', border: 'border-violet-200', avatar: 'bg-violet-500' },
      purple: { bubble: isThinking ? 'bg-purple-50/50 opacity-60' : 'bg-purple-50', text: 'text-purple-900', border: 'border-purple-200', avatar: 'bg-purple-500' },
      fuchsia: { bubble: isThinking ? 'bg-fuchsia-50/50 opacity-60' : 'bg-fuchsia-50', text: 'text-fuchsia-900', border: 'border-fuchsia-200', avatar: 'bg-fuchsia-500' },
      pink: { bubble: isThinking ? 'bg-pink-50/50 opacity-60' : 'bg-pink-50', text: 'text-pink-900', border: 'border-pink-200', avatar: 'bg-pink-500' },
      rose: { bubble: isThinking ? 'bg-rose-50/50 opacity-60' : 'bg-rose-50', text: 'text-rose-900', border: 'border-rose-200', avatar: 'bg-rose-500' },
      slate: { bubble: 'bg-white', text: 'text-slate-800', border: 'border-slate-200', avatar: 'bg-white' },
    };

    return colors[base] || colors.emerald;
  };

  const colorTheme = isUser ? getColorClasses('bg-slate-50') : getColorClasses(message.color || 'bg-emerald-50', isThinkingMessage);
  
  const bubbleStyles = clsx(
    'p-4 rounded-2xl text-[15px] leading-relaxed shadow-sm border transition-all duration-500',
    isUser 
      ? `${colorTheme.bubble} ${colorTheme.text} ${colorTheme.border} rounded-br-none` 
      : `${colorTheme.bubble} ${colorTheme.text} ${colorTheme.border} rounded-bl-none`,
    isThinkingMessage && 'italic text-slate-400 border-dashed'
  );

  return (
    <div className={clsx(
      'flex gap-3 max-w-[95%] mb-8 items-end',
      isUser ? 'flex-row-reverse ml-auto' : 'flex-row mr-auto'
    )}>
      {/* Avatar */}
      <div className={clsx(
        'w-16 h-16 rounded-full flex items-center justify-center shadow-md flex-shrink-0 overflow-hidden border transition-all duration-300',
        isUser ? 'bg-white border-slate-200' : 'bg-base-300 border-transparent'
      )}>
        {isUser ? (
          <User size={32} className="text-slate-400" />
        ) : message.avatarUrl ? (
          <AutoCroppedImage 
            src={message.avatarUrl} 
            alt={message.senderName} 
            className="w-full h-full object-cover" 
            showHoverPreview={true}
          />
        ) : (
          <div className={clsx('w-full h-full flex items-center justify-center text-white font-bold text-xl', colorTheme.avatar)}>
            {message.senderName?.charAt(0) || <Bot size={32} />}
          </div>
        )}
      </div>

      {/* Message Content */}
      <div className={clsx('flex flex-col max-w-[80%]', isUser ? 'items-end' : 'items-start')}>
        <div className="flex items-center gap-2 mb-1.5 px-0.5">
          {!isUser && (
            <>
              <span className="font-bold text-sm text-slate-700 whitespace-nowrap">
                {message.senderName || (isModerator ? 'Moderator' : 'Agent')}
              </span>
              {message.senderTitle && (
                <span className="text-[11px] text-slate-400 font-normal italic truncate">
                  {message.senderTitle}
                </span>
              )}
            </>
          )}
          {isUser && message.senderName && (
            <span className="font-bold text-sm text-slate-700 whitespace-nowrap">
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
