import { useState, useEffect, useCallback } from 'react';
import { ChatState, Message, Panelist, Settings, DebugLog } from '@/types';
import { BASE_STARTING_PROMPT, BASE_RESPONSE_PROMPT, BASE_MODERATOR_PROMPT, BASE_IMAGE_PROMPT } from '@/lib/prompts';
import { SUGGESTION_PROMPTS, getRandomSuggestions } from '@/lib/suggestionPrompts';

const INITIAL_SETTINGS: Settings = {
  model: 'gpt-5.2-instant',
  imageModel: 'dall-e-3',
  agentCount: 3,
  theme: 'light',
  startingPrompt: BASE_STARTING_PROMPT,
  responsePrompt: BASE_RESPONSE_PROMPT,
  moderatorPrompt: BASE_MODERATOR_PROMPT,
  imagePrompt: BASE_IMAGE_PROMPT,
  suggestionPrompts: SUGGESTION_PROMPTS.join('\n'),
  userName: '',
};

const STORAGE_KEY = 'braintrust_settings';

const AGENT_COLORS = [
  'bg-orange-50',
  'bg-yellow-50',
  'bg-emerald-50',
  'bg-sky-50',
  'bg-indigo-50',
  'bg-purple-50',
  'bg-pink-50',
  'bg-rose-50',
];

export const useChat = () => {
  const [state, setState] = useState<ChatState>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    let settings = INITIAL_SETTINGS;
    
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === 'object') {
          settings = { ...INITIAL_SETTINGS, ...parsed };
        }
      } catch (e) {
        console.error('Failed to parse settings from localStorage', e);
      }
    }
    
    if (!settings.imagePrompt || settings.imagePrompt.trim() === '') {
      settings.imagePrompt = BASE_IMAGE_PROMPT;
    }
    
    return {
      topic: '',
      messages: [],
      panelists: [],
      isGenerating: false,
      status: 'idle',
      debugLogs: [],
      showDebug: false,
      settings,
      autoResponse: null,
    };
  });

  const [availableModels, setAvailableModels] = useState<string[]>([]);
  const [availableImageModels, setAvailableImageModels] = useState<string[]>([]);
  
  const getCustomSuggestions = useCallback((count: number = 3) => {
    const prompts = state.settings.suggestionPrompts
      ? state.settings.suggestionPrompts.split('\n').map(s => s.trim()).filter(s => s !== '')
      : SUGGESTION_PROMPTS;
    const shuffled = [...prompts].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, count);
  }, [state.settings.suggestionPrompts]);

  const [suggestions, setSuggestions] = useState<string[]>([]);

  useEffect(() => {
    if (state.status === 'idle' && state.messages.length === 0) {
      setSuggestions(getCustomSuggestions());
    }
  }, [state.status, state.messages.length, getCustomSuggestions]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state.settings));
    document.documentElement.setAttribute('data-theme', state.settings.theme);
  }, [state.settings]);

  useEffect(() => {
    fetch('/api/models')
      .then(res => res.json())
      .then((data: any) => {
        if (data.models) setAvailableModels(data.models);
        if (data.imageModels) setAvailableImageModels(data.imageModels);
      })
      .catch(console.error);
  }, []);

  const addDebugLog = (log: Omit<DebugLog, 'id' | 'timestamp'>, existingId?: string) => {
    const id = existingId || Math.random().toString(36).substring(7);
    setState(prev => {
      const existingLogIndex = prev.debugLogs.findIndex(l => l.id === id);
      
      if (existingLogIndex >= 0) {
        const newLogs = [...prev.debugLogs];
        newLogs[existingLogIndex] = { 
          ...newLogs[existingLogIndex], 
          ...log
        };
        return { ...prev, debugLogs: newLogs };
      }

      return {
        ...prev,
        debugLogs: [
          ...prev.debugLogs,
          { ...log, id, timestamp: Date.now() }
        ],
      };
    });
    return id;
  };

  const resetChat = useCallback(() => {
    setState(prev => ({
      ...prev,
      topic: '',
      messages: [],
      panelists: [],
      isGenerating: false,
      status: 'idle',
      debugLogs: [],
      autoResponse: null,
    }));
    setSuggestions(getCustomSuggestions());
  }, [getCustomSuggestions]);

  const toggleDebug = useCallback(() => {
    setState(prev => ({ ...prev, showDebug: !prev.showDebug }));
  }, []);

  const updateSettings = useCallback((newSettings: Partial<Settings>) => {
    setState(prev => ({
      ...prev,
      settings: { ...prev.settings, ...newSettings },
    }));
  }, []);

  const formatHistory = (messages: Message[]) => {
    return messages
      .map(m => `${m.senderName || (m.role === 'user' ? 'User' : m.role === 'moderator' ? 'Moderator' : 'Agent')}: ${m.content}`)
      .join('\n');
  };

  const getColorName = (tailwindClass?: string) => {
    if (!tailwindClass) return 'professional';
    const colorMap: Record<string, string> = {
      'bg-orange-50': 'orange',
      'bg-yellow-50': 'yellow',
      'bg-emerald-50': 'emerald green',
      'bg-sky-50': 'sky blue',
      'bg-indigo-50': 'indigo',
      'bg-purple-50': 'purple',
      'bg-pink-50': 'pink',
      'bg-rose-50': 'rose',
    };
    return colorMap[tailwindClass] || 'professional';
  };

  const replaceImageVariables = (template: string, panelist: Panelist) => {
    const promptTemplate = template || BASE_IMAGE_PROMPT;
    const personalitySlug = panelist.fullPersonality.slice(0, 400);
    const safetyRegex = /trauma|emergency|mass-casualty|ER|blood|violence|death|kill|dead|gun|weapon|hospital|injury|accident|victim|murder|attack/gi;
    const safeDescription = panelist.description.replace(safetyRegex, 'professional');
    const safeContext = personalitySlug.replace(safetyRegex, 'medical or professional');
    const colorName = getColorName(panelist.color);
    
    return promptTemplate
      .replace(/\{\{firstName\}\}/g, panelist.firstName)
      .replace(/\{\{description\}\}/g, safeDescription)
      .replace(/\{\{fullPersonality\}\}/g, safeContext)
      .replace(/\{\{color\}\}/g, colorName);
  };

  const startDiscussion = async (topic: string, userMessage: Message) => {
    setState(prev => ({ ...prev, topic, isGenerating: true, status: 'generating_panelists' }));

    try {
      const payload = { 
        topic, 
        count: state.settings.agentCount, 
        prompt: state.settings.startingPrompt,
        model: state.settings.model
      };
      
      const logId = addDebugLog({ 
        type: 'request', 
        endpoint: `Assembling ${state.settings.agentCount} panelists`, 
        payload: payload, 
        model: state.settings.model 
      });
      
      const res = await fetch('/api/generate-panelists', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data: any = await res.json();
      addDebugLog({ 
        type: 'response', 
        endpoint: `Assembling ${state.settings.agentCount} panelists`, 
        payload: { topic, count: state.settings.agentCount },
        response: data, 
        model: state.settings.model 
      }, logId);

      if (data?.error) throw new Error(data.error);
      if (!data?.panelists || !Array.isArray(data.panelists) || data.panelists.length === 0) {
        throw new Error(data?.error || 'No panelists generated by AI. The model may be struggling with the request. Please try again.');
      }

      const shuffledColors = [...AGENT_COLORS].sort(() => Math.random() - 0.5);

      const initialPanelists: Panelist[] = (data.panelists as any[]).map((p: any, index: number) => ({
        firstName: p.firstName || 'Expert',
        description: p.description || 'Consultant',
        shorthandName: p.shorthandName || `${p.firstName || 'Expert'} the BrainTrust Member`,
        fullPersonality: p.fullPersonality || 'A seasoned professional with deep expertise.',
        communicationStyle: p.communicationStyle || 'Professional and balanced',
        introMessage: p.introMessage || 'Ready to join the discussion.',
        id: Math.random().toString(36).substring(7),
        color: shuffledColors[index % shuffledColors.length],
      }));

      setState(prev => ({ ...prev, panelists: initialPanelists }));

      // --- PARALLEL INITIALIZATION ---
      // Kick off image generation for all and the FIRST response generation in parallel
      const firstPanelist = initialPanelists[0];

      const fetchJsonWithTimeout = async (input: RequestInfo | URL, init: RequestInit, timeoutMs: number) => {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), timeoutMs);
        try {
          const res = await fetch(input, { ...init, signal: controller.signal });
          return await res.json();
        } finally {
          clearTimeout(timer);
        }
      };

      const [updatedPanelists, firstResponseData] = await Promise.all([
        // 1. Generate all images (in parallel) with timeouts so we never hang forever
        Promise.all(initialPanelists.map(async (p) => {
          const imagePrompt = replaceImageVariables(state.settings.imagePrompt, p);
          const imgLogId = addDebugLog({
            type: 'request',
            endpoint: `Generating image for ${p.shorthandName || p.firstName}`,
            payload: { prompt: imagePrompt, model: state.settings.imageModel, firstName: p.firstName },
            model: state.settings.imageModel
          });

          try {
            const imgData: any = await fetchJsonWithTimeout('/api/generate-image', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ prompt: imagePrompt, model: state.settings.imageModel }),
            }, 90_000);

            addDebugLog({
              type: 'response',
              endpoint: `Generating image for ${p.shorthandName || p.firstName}`,
              payload: { prompt: imagePrompt, model: state.settings.imageModel },
              response: imgData,
              model: state.settings.imageModel
            }, imgLogId);

            return { ...p, avatarUrl: imgData?.url || p.avatarUrl };
          } catch (err: any) {
            addDebugLog({
              type: 'error',
              endpoint: `Generating image for ${p.shorthandName || p.firstName}`,
              payload: err?.message || String(err),
            }, imgLogId);
            console.error('Image gen failed for', p.firstName, err);
            return p;
          }
        })),

        // 2. Generate first response (in parallel) with timeout
        (async () => {
          const firstHistory = formatHistory([userMessage]);
          const respLogId = addDebugLog({
            type: 'request',
            endpoint: `Generating ${firstPanelist.shorthandName || firstPanelist.firstName}'s first response`,
            payload: { topic },
            model: state.settings.model
          });

          try {
            const responseData: any = await fetchJsonWithTimeout('/api/generate-response', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                panelist: firstPanelist,
                topic,
                history: firstHistory,
                userName: state.settings.userName || 'You',
                prompt: state.settings.responsePrompt,
                model: state.settings.model
              }),
            }, 120_000);

            addDebugLog({
              type: 'response',
              endpoint: `Generating ${firstPanelist.shorthandName || firstPanelist.firstName}'s first response`,
              payload: { topic },
              response: responseData,
              model: state.settings.model
            }, respLogId);

            return responseData;
          } catch (err: any) {
            addDebugLog({
              type: 'error',
              endpoint: `Generating ${firstPanelist.shorthandName || firstPanelist.firstName}'s first response`,
              payload: err?.message || String(err),
            }, respLogId);
            console.error('First response generation failed', err);
            return { summary: 'Sorry — I got stuck generating a response. Try again?', thoughts: '' };
          }
        })()
      ]);

      // Now we are ready to show introductions
      setState(prev => ({ ...prev, status: 'introductions' }));

      // --- STAGGERED DISPLAY ---
      // Now that images and 1st response are ready, display intros one by one
      const introMessages: Message[] = [];
      for (let i = 0; i < updatedPanelists.length; i++) {
        const p = updatedPanelists[i];
        const introMessage: Message = {
          id: Math.random().toString(36).substring(7),
          role: 'agent',
          content: p.introMessage,
          senderName: p.firstName,
          senderTitle: p.description,
          panelistId: p.id,
          color: p.color,
          avatarUrl: p.avatarUrl,
          timestamp: Date.now(),
        };
        introMessages.push(introMessage);
        
        setState(prev => ({ 
          ...prev, 
          panelists: updatedPanelists,
          messages: [userMessage, ...introMessages] 
        }));
        
        // Brief pause between intros
        await new Promise(resolve => setTimeout(resolve, 1200));
      }

      // Display the first response
      const firstResponseMessage: Message = {
        id: Math.random().toString(36).substring(7),
        role: 'agent',
        content: (firstResponseData as any).summary,
        thoughts: (firstResponseData as any).thoughts,
        senderName: firstPanelist.firstName,
        senderTitle: firstPanelist.description,
        panelistId: firstPanelist.id,
        color: firstPanelist.color,
        avatarUrl: updatedPanelists[0].avatarUrl,
        timestamp: Date.now(),
      };

      const finalInitialHistory = [userMessage, ...introMessages, firstResponseMessage];
      setState(prev => ({ 
        ...prev, 
        messages: finalInitialHistory 
      }));

      // Continue with the rest of the round (second person onwards)
      const remainingPanelists = updatedPanelists.slice(1);
      await runDiscussionRound(topic, updatedPanelists, finalInitialHistory, remainingPanelists);

    } catch (error: any) {
      addDebugLog({ type: 'error', endpoint: 'startDiscussion', payload: error.message });
      setState(prev => ({ ...prev, isGenerating: false, status: 'idle' }));
    }
  };

  const runDiscussionRound = async (topic: string, allPanelists: Panelist[], currentMessages: Message[], subsetToRun?: Panelist[]) => {
    setState(prev => ({ ...prev, isGenerating: true, status: 'discussion' }));
    
    // Use either the provided subset (for the first round continuation) or shuffle all
    const sequence = subsetToRun || [...allPanelists].sort(() => Math.random() - 0.5);
    let messages = [...currentMessages];

    const msPerWord = 100; // must match MessageBubble typingSpeed
    const estimateTypingMs = (text: string) => {
      const tokens = text.match(/\S+\s*/g) || [];
      // Add a small buffer so we don't overlap too early
      return Math.min(30_000, tokens.length * msPerWord + 300);
    };

    const fetchJsonWithTimeout = async (input: RequestInfo | URL, init: RequestInit, timeoutMs: number) => {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);
      try {
        const res = await fetch(input, { ...init, signal: controller.signal });
        return await res.json();
      } finally {
        clearTimeout(timer);
      }
    };

    const startResponseRequest = (panelist: Panelist) => {
      const logId = addDebugLog({ 
        type: 'request', 
        endpoint: `Generating ${panelist.shorthandName || panelist.firstName}'s response`, 
        payload: { topic, firstName: panelist.firstName }, 
        model: state.settings.model 
      });

      const promise = fetchJsonWithTimeout('/api/generate-response', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          panelist,
          topic,
          history: formatHistory(messages),
          userName: state.settings.userName || 'You',
          prompt: state.settings.responsePrompt,
          model: state.settings.model
        }),
      }, 120_000)
        .then((data: any) => {
          addDebugLog({ 
            type: 'response', 
            endpoint: `Generating ${panelist.shorthandName || panelist.firstName}'s response`, 
            payload: { topic }, 
            response: data,
            model: state.settings.model 
          }, logId);
          return data;
        })
        .catch((err: any) => {
          addDebugLog({ type: 'error', endpoint: 'runDiscussionRound', payload: err?.message || String(err) }, logId);
          return { summary: 'Sorry — I had trouble generating that response.', thoughts: '' };
        });

      return promise;
    };

    // Start the first agent call immediately (so it can run while we’re waiting/animating)
    let currentPromise: Promise<any> | null = null;
    if (sequence.length > 0) {
      currentPromise = startResponseRequest(sequence[0]);
    }

    for (let i = 0; i < sequence.length; i++) {
      const panelist = sequence[i];

      // Gate: wait until previous agent finishes typing, then pause 1s
      const prev = messages[messages.length - 1];
      if (prev?.role === 'agent' && typeof prev.content === 'string' && !prev.content.endsWith('is thinking...')) {
        await new Promise(resolve => setTimeout(resolve, estimateTypingMs(prev.content)));
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      try {
        // Ensure we have a promise for this panelist (should exist for i=0, started above)
        if (!currentPromise) currentPromise = startResponseRequest(panelist);

        // If not ready after the 1s pause, show thinking bubble
        const thinkingId = Math.random().toString(36).substring(7);
        let thinkingShown = false;

        const showThinkingTimer = setTimeout(() => {
          thinkingShown = true;
          const thinkingMessage: Message = {
            id: thinkingId,
            role: 'agent',
            content: `${panelist.firstName} is thinking...`,
            senderName: panelist.firstName,
            senderTitle: panelist.description,
            panelistId: panelist.id,
            color: panelist.color,
            avatarUrl: panelist.avatarUrl,
            timestamp: Date.now(),
          };
          setState(prevState => ({ ...prevState, messages: [...prevState.messages, thinkingMessage] }));
        }, 0);

        // Wait for the response (might already be resolved)
        const data: any = await currentPromise;
        clearTimeout(showThinkingTimer);

        const realMessage: Message = {
          id: Math.random().toString(36).substring(7),
          role: 'agent',
          content: data?.summary || 'No response generated.',
          thoughts: data?.thoughts,
          senderName: panelist.firstName,
          senderTitle: panelist.description,
          panelistId: panelist.id,
          color: panelist.color,
          avatarUrl: panelist.avatarUrl,
          timestamp: Date.now(),
        };

        setState(prevState => {
          const filtered = thinkingShown ? prevState.messages.filter(m => m.id !== thinkingId) : prevState.messages;
          return { ...prevState, messages: [...filtered, realMessage] };
        });

        messages = [...messages, realMessage];

        // Start the NEXT agent request immediately (so it runs during this message’s typing)
        currentPromise = (i + 1 < sequence.length) ? startResponseRequest(sequence[i + 1]) : null;

      } catch (error: any) {
        addDebugLog({ type: 'error', endpoint: 'runDiscussionRound', payload: error.message });
      }
    }

    // User Auto Response generation (Moderator)
    setState(prev => ({ ...prev, status: 'generating_auto_response' }));
    try {
      const res = await fetch('/api/moderator-response', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic,
          history: formatHistory(messages),
          userName: state.settings.userName || 'You',
          prompt: state.settings.moderatorPrompt,
          model: state.settings.model
        }),
      });
      const data: any = await res.json();
      setState(prev => ({ ...prev, autoResponse: data.summary, isGenerating: false, status: 'waiting_for_user' }));
    } catch (error: any) {
      setState(prev => ({ ...prev, isGenerating: false, status: 'waiting_for_user' }));
    }
  };

  const sendMessage = async (content: string) => {
    const userMessage: Message = {
      id: Math.random().toString(36).substring(7),
      role: 'user',
      content,
      senderName: state.settings.userName || 'You',
      timestamp: Date.now(),
    };

    if (state.status === 'idle') {
      setState(prev => ({ ...prev, messages: [userMessage] }));
      await startDiscussion(content, userMessage);
    } else {
      // Clear auto response when user sends a message
      const updatedMessages = [...state.messages, userMessage];
      setState(prev => ({ ...prev, messages: updatedMessages, autoResponse: null }));
      await runDiscussionRound(state.topic, state.panelists, updatedMessages);
    }
  };

  const clearAutoResponse = useCallback(() => {
    setState(prev => ({ ...prev, autoResponse: null }));
  }, []);

  return {
    state,
    availableModels,
    availableImageModels,
    suggestions,
    sendMessage,
    resetChat,
    toggleDebug,
    updateSettings,
    clearAutoResponse,
  };
};
