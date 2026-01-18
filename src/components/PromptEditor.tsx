import React, { useRef, useEffect, useState, useMemo } from 'react';

interface PromptEditorProps {
  value: string;
  onChange: (value: string) => void;
  variables: string[];
  jsonFields: string[];
  placeholder?: string;
  onFocus?: () => void;
  fieldName?: string; // Add this to identify which field it is
}

export const PromptEditor: React.FC<PromptEditorProps> = ({ 
  value, 
  onChange, 
  variables, 
  jsonFields,
  placeholder,
  onFocus,
  fieldName
}) => {
  const editorRef = useRef<HTMLDivElement>(null);
  const [isFocused, setIsFocused] = useState(false);
  const isUserInputRef = useRef(false); // Track if change came from user typing
  const lastValueRef = useRef(value); // Track the last value we synced

  const isPresent = (name: string) => value.includes(`{{${name}}}`);

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

  const formatName = (name: string, type: 'variable' | 'json') => {
    return type === 'json' ? toTitleCase(name) : toLowerCase(name);
  };

  // Parse value into segments of text and chips
  const segments = useMemo(() => {
    const parts: { type: 'text' | 'variable' | 'json'; content: string }[] = [];
    let lastIndex = 0;
    const regex = /\{\{([^}]+)\}\}/g;
    let match;

    while ((match = regex.exec(value)) !== null) {
      if (match.index > lastIndex) {
        parts.push({ type: 'text', content: value.slice(lastIndex, match.index) });
      }
      const varName = match[1];
      const type = jsonFields.includes(varName) ? 'json' : 'variable';
      parts.push({ type, content: varName });
      lastIndex = regex.lastIndex;
    }

    if (lastIndex < value.length) {
      parts.push({ type: 'text', content: value.slice(lastIndex) });
    }

    return parts;
  }, [value, jsonFields]);

  // When clicking on a chip, we want to place the cursor after it or select it
  // For now, let's keep it simple and just use contentEditable with manual sync
  
  const handleInput = () => {
    if (!editorRef.current) return;
    
    // Mark that this change came from user input
    isUserInputRef.current = true;
    
    // Convert the DOM back to the {{variable}} format
    const getTextFromNodes = (nodes: NodeList): string => {
      let text = '';
      for (let i = 0; i < nodes.length; i++) {
        const node = nodes[i];
        if (node.nodeType === Node.TEXT_NODE) {
          text += node.textContent;
        } else if (node instanceof HTMLElement) {
          if (node.dataset.variable) {
            text += `{{${node.dataset.variable}}}`;
          } else if (node.dataset.json) {
            text += `{{${node.dataset.json}}}`;
          } else if (node.tagName === 'BR') {
            text += '\n';
          } else if (node.tagName === 'DIV' || node.tagName === 'P') {
            const innerText = getTextFromNodes(node.childNodes);
            text += (text ? '\n' : '') + innerText;
          } else {
            text += getTextFromNodes(node.childNodes);
          }
        }
      }
      return text;
    };
    
    const newValue = getTextFromNodes(editorRef.current.childNodes);
    lastValueRef.current = newValue;
    onChange(newValue);
  };

  const insertVariable = (name: string, type: 'variable' | 'json') => {
    const editor = editorRef.current;
    if (!editor) return;

    editor.focus();
    const selection = window.getSelection();
    if (!selection || !selection.rangeCount) return;

    const range = selection.getRangeAt(0);
    range.deleteContents();

    const chip = document.createElement('span');
    chip.contentEditable = 'false';
    chip.className = `inline-flex items-center px-2 py-0.5 rounded-md text-sm font-medium mx-0.5 select-all ${
      type === 'variable' 
        ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-200 border border-blue-200 dark:border-blue-800' 
        : 'bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-200 border border-green-200 dark:border-green-800'
    }`;
    chip.dataset[type] = name;
    chip.innerText = formatName(name, type);
    
    // Add a space after the chip for easier typing
    const textNode = document.createTextNode(' ');

    range.insertNode(textNode);
    range.insertNode(chip);
    
    // Move cursor after the space
    range.setStartAfter(textNode);
    range.setEndAfter(textNode);
    selection.removeAllRanges();
    selection.addRange(range);

    handleInput();
  };

  // Expose insertion method to parent/global via custom event or ref
  useEffect(() => {
    const handleInsert = (e: any) => {
      if (isFocused && e.detail.name) {
        insertVariable(e.detail.name, e.detail.type);
      }
    };
    window.addEventListener('insert-prompt-variable', handleInsert);
    return () => window.removeEventListener('insert-prompt-variable', handleInsert);
  }, [isFocused]);

  useEffect(() => {
    // Force a re-render when the editor mounts or value changes from outside
    if (!editorRef.current) return;
    
    // If the value matches what we last synced AND the editor already has content, skip
    if (value === lastValueRef.current && editorRef.current.childNodes.length > 0) {
      isUserInputRef.current = false;
      return;
    }
    
    // If this was a user input change and we aren't unmounted/remounted, skip
    if (isUserInputRef.current && !isFocused) {
      isUserInputRef.current = false;
      lastValueRef.current = value;
      return;
    }

    lastValueRef.current = value;
    const editor = editorRef.current;
    editor.innerHTML = '';
    
    if (!value) {
      return;
    }
    
    segments.forEach(segment => {
      if (segment.type === 'text') {
        editor.appendChild(document.createTextNode(segment.content));
      } else {
        const chip = document.createElement('span');
        chip.contentEditable = 'false';
        chip.className = `inline-flex items-center px-2 py-0.5 rounded-md text-sm font-medium mx-0.5 select-all ${
          segment.type === 'variable' 
            ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-200 border border-blue-200 dark:border-blue-800' 
            : 'bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-200 border border-green-200 dark:border-green-800'
        }`;
        chip.dataset[segment.type] = segment.content;
        chip.innerText = formatName(segment.content, segment.type === 'variable' ? 'variable' : 'json');
        editor.appendChild(chip);
      }
    });
  }, [segments, isFocused, value]);

  return (
    <div className="relative group prompt-editor-container">
      <div
        ref={editorRef}
        contentEditable
        onInput={handleInput}
        onFocus={() => {
          setIsFocused(true);
          onFocus?.();
        }}
        onBlur={() => {
          // Delay blurring so we can click sidebar chips
          setTimeout(() => setIsFocused(false), 200);
        }}
        className="min-h-[80px] w-full rounded-lg border border-base-300 dark:border-slate-700 bg-base-100 dark:bg-slate-800 p-3 font-mono text-sm leading-relaxed focus:border-primary dark:focus:border-primary focus:outline-none transition-all whitespace-pre-wrap text-slate-900 dark:text-slate-100"
        style={{ height: 'auto' }}
      />
      {!value && !isFocused && (
        <div className="absolute top-3 left-3 text-slate-400 dark:text-slate-500 pointer-events-none text-sm font-mono">
          {placeholder}
        </div>
      )}
      
      {jsonFields.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-2">
          {jsonFields.map(field => (
            <span 
              key={field}
              className={`text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded transition-colors ${
                isPresent(field) 
                  ? 'text-slate-400 dark:text-slate-500 bg-slate-100 dark:bg-slate-800' 
                  : 'text-red-500 dark:text-red-400 bg-red-50 dark:bg-red-950/20'
              }`}
            >
              {toTitleCase(field)}
            </span>
          ))}
        </div>
      )}
    </div>
  );
};
