import React from 'react';

interface PromptSuggestionsProps {
  suggestions: string[];
  onSelect: (prompt: string) => void;
  disabled?: boolean;
}

export const PromptSuggestions: React.FC<PromptSuggestionsProps> = ({ suggestions, onSelect, disabled }) => {
  return (
    <div className="flex flex-col gap-2 items-center w-full max-w-4xl px-4 py-4">
      {suggestions.map((suggestion, index) => (
        <button
          key={index}
          onClick={() => onSelect(suggestion)}
          disabled={disabled}
          className="w-fit max-w-full normal-case text-center h-auto py-3 px-6 rounded-full bg-base-300/50 hover:bg-base-300 transition-colors text-base-content/80 text-sm md:text-base border-none shadow-sm"
        >
          {suggestion}
        </button>
      ))}
    </div>
  );
};
