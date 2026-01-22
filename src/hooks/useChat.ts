import { useState, useEffect, useCallback, useRef } from 'react';
import { ChatState, Message, Panelist, Settings, DebugLog, ResponseMode, ModeratorDecision } from '@/types';
import { BASE_RESPONSE_PROMPT, BASE_MODERATOR_PROMPT, BASE_IMAGE_PROMPT, BASE_QUICK_PANELISTS_PROMPT, BASE_PANELIST_DETAILS_PROMPT, BASE_MODERATOR_SELECTION_PROMPT } from '@/lib/prompts';
import { SUGGESTION_PROMPTS, getRandomSuggestions } from '@/lib/suggestionPrompts';
import { cropImageFrame } from '@/lib/cropImageFrame';

const INITIAL_SETTINGS: Settings = {
  model: 'gpt-4o',
  imageModel: 'dall-e-3',
  agentCount: 3,
  responsePrompt: BASE_RESPONSE_PROMPT,
  moderatorPrompt: BASE_MODERATOR_PROMPT,
  moderatorSelectionPrompt: BASE_MODERATOR_SELECTION_PROMPT,
  imagePrompt: BASE_IMAGE_PROMPT,
  suggestionPrompts: SUGGESTION_PROMPTS.join('\n'),
  userName: '',
  quickPanelistsPrompt: BASE_QUICK_PANELISTS_PROMPT,
  panelistDetailsPrompt: BASE_PANELIST_DETAILS_PROMPT,
  responseMode: 'random',
  interferenceNumber: 5,
  interferencePrompt: "{{userName}}, has not chimed in to the conversation. ask them a question to get them involved and refer to them by name",
  enableSuggestedResponse: true,
  bannedSpeechEnabled: false,
  bannedSpeechList: '-\n;\nhate',
  bannedSpeechPrompt: 'Retype this message as close as possible but without dashes, semicolons, or the word hate. Here is the text to edit: {{response}}',
  bannedSpeechModel: 'gpt-4o',
  communicationStyles: [
    {
      id: 'punchy',
      name: 'Punchy and direct',
      description: 'Fast, decisive, opinionated, zero patience for fluff',
      wordMin: 5,
      wordMax: 12,
      intro: '{{firstName}}, here.'
    },
    {
      id: 'nuanced',
      name: 'Nuanced and philosophical',
      description: 'Reflective and curious, explores ambiguity, long timelines, and second-order effects rather than giving clean answers',
      wordMin: 25,
      wordMax: 45,
      intro: 'Hello all, I’m {{firstName}}.'
    },
    {
      id: 'academic',
      name: 'Academic and formal',
      description: 'Precise and structured, defines terms carefully, separates evidence from opinion, prefers cautious conclusions over bold claims',
      wordMin: 30,
      wordMax: 60,
      intro: 'I am {{firstName}}.'
    },
    {
      id: 'grumpy',
      name: 'Grumpy and skeptical',
      description: 'Distrusts trends, questions motives, assumes most ideas are overrated until proven otherwise',
      wordMin: 5,
      wordMax: 15,
      intro: 'Hey, {{firstName}}.'
    },
    {
      id: 'pragmatic',
      name: 'Pragmatic operator',
      description: 'Focused on execution and constraints, asks how things work in practice and who actually bears the cost',
      wordMin: 20,
      wordMax: 35,
      intro: '{{firstName}} here. I spent'
    },
    {
      id: 'optimistic',
      name: 'Optimistic futurist',
      description: 'Sees long-term upside, emphasizes progress curves and human adaptability, tolerates short-term messiness for transformative gains',
      wordMin: 25,
      wordMax: 40,
      intro: "I'm {{firstName}}, glad to be here."
    },
    {
      id: 'contrarian',
      name: 'Contrarian strategist',
      description: 'Challenges consensus, argues unpopular positions, hunts for hidden incentives and non-obvious failure modes',
      wordMin: 20,
      wordMax: 40,
      intro: 'I’m {{firstName}}, joining the conversation.'
    },
    {
      id: 'ethical',
      name: 'Ethical watchdog',
      description: 'Focuses on moral implications, unintended consequences, and power imbalances, asking who benefits, who loses, and who decides',
      wordMin: 15,
      wordMax: 40,
      intro: 'Nice to meet you, I’m {{firstName}}.'
    }
  ]
};

const STORAGE_KEY = 'braintrust_settings';

const AGENT_COLORS = [
  'bg-red-50',
  'bg-orange-50',
  'bg-amber-50',
  'bg-yellow-50',
  'bg-lime-50',
  'bg-green-50',
  'bg-emerald-50',
  'bg-teal-50',
  'bg-cyan-50',
  'bg-sky-50',
  'bg-blue-50',
  'bg-indigo-50',
  'bg-violet-50',
  'bg-purple-50',
  'bg-fuchsia-50',
  'bg-pink-50',
  'bg-rose-50',
];

export const useChat = () => {
  const abortControllerRef = useRef<AbortController | null>(null);
  const roundInProgressRef = useRef(false);

  const getNewAbortSignal = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;
    return controller.signal;
  }, []);

  const extractFirstJsonObject = (str: string) => {
    const firstBrace = str.indexOf('{');
    if (firstBrace === -1) return str;
    
    let depth = 0;
    for (let i = firstBrace; i < str.length; i++) {
      if (str[i] === '{') depth++;
      else if (str[i] === '}') {
        depth--;
        if (depth === 0) {
          return str.substring(firstBrace, i + 1);
        }
      }
    }
    return str.substring(firstBrace);
  };

  const safeJsonParse = (str: string, fallback: any = {}) => {
    if (!str) return fallback;
    try {
      return JSON.parse(str);
    } catch (e) {
      try {
        const extracted = extractFirstJsonObject(str);
        return JSON.parse(extracted);
      } catch (e2) {
        console.error('Failed to parse JSON even after extraction', { original: str, error: e2 });
        return fallback;
      }
    }
  };

  const [state, setState] = useState<ChatState>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    let settings = INITIAL_SETTINGS;
    
    if (saved) {
      const parsed = safeJsonParse(saved, null);
      if (parsed && typeof parsed === 'object') {
        settings = { ...INITIAL_SETTINGS, ...parsed };
        
        // Migration: responseModeEnabled (boolean) -> responseMode (string)
        if (settings.responseMode === undefined && (settings as any).responseModeEnabled !== undefined) {
          settings.responseMode = (settings as any).responseModeEnabled ? 'mentions' : 'random';
        }
        if (!settings.responseMode) {
          settings.responseMode = 'random';
        }
        if (!settings.moderatorSelectionPrompt) {
          settings.moderatorSelectionPrompt = BASE_MODERATOR_SELECTION_PROMPT;
        }
      }
    }
    
    if (!settings.imagePrompt || settings.imagePrompt.trim() === '') {
      settings.imagePrompt = BASE_IMAGE_PROMPT;
    }

    if (!settings.quickPanelistsPrompt || settings.quickPanelistsPrompt.trim() === '') {
      settings.quickPanelistsPrompt = BASE_QUICK_PANELISTS_PROMPT;
    }

    if (!settings.panelistDetailsPrompt || settings.panelistDetailsPrompt.trim() === '') {
      settings.panelistDetailsPrompt = BASE_PANELIST_DETAILS_PROMPT;
    }

    if (settings.bannedSpeechEnabled === undefined) {
      settings.bannedSpeechEnabled = INITIAL_SETTINGS.bannedSpeechEnabled;
    }
    if (!settings.bannedSpeechList) {
      settings.bannedSpeechList = INITIAL_SETTINGS.bannedSpeechList;
    }
    if (!settings.bannedSpeechPrompt) {
      settings.bannedSpeechPrompt = INITIAL_SETTINGS.bannedSpeechPrompt;
    }
          if (!settings.bannedSpeechModel) {
            settings.bannedSpeechModel = INITIAL_SETTINGS.bannedSpeechModel;
          }
          if (!settings.communicationStyles || !Array.isArray(settings.communicationStyles)) {
            settings.communicationStyles = INITIAL_SETTINGS.communicationStyles;
          }

    return {
      topic: '',
      messages: [],
      displayMessages: [],
      panelists: [],
      isGenerating: false,
      status: 'idle',
      debugLogs: [],
      showDebug: false,
      settings,
      autoResponse: null,
      error: null,
      mentionStack: [],
      roundOrder: [],
      alreadySpoken: [],
      consecutiveAgentCount: 0,
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
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  useEffect(() => {
    if (state.status === 'idle' && state.messages.length === 0) {
      setSuggestions(getCustomSuggestions());
    }
  }, [state.status, state.messages.length, getCustomSuggestions]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state.settings));
    document.documentElement.setAttribute('data-theme', 'light');
  }, [state.settings]);

  useEffect(() => {
    fetch(`${import.meta.env.BASE_URL}api/models`)
      .then(async res => {
        if (res.ok) {
          const data = await res.json() as any;
          if (data.models) setAvailableModels(data.models);
          if (data.imageModels) setAvailableImageModels(data.imageModels);
        } else {
          const text = await res.text();
          console.error('Failed to fetch models:', res.status, text);
          if (res.status === 500) {
            setState(prev => ({ 
              ...prev, 
              error: 'Backend API error. Please check your Cloudflare environment variables (OPENAI_API_KEY, GOOGLE_GENERATIVE_AI_API_KEY).' 
            }));
          }
        }
      })
      .catch(err => {
        console.error('Fetch models error:', err);
      });
  }, []);

  const addDebugLog = (log: Omit<DebugLog, 'id' | 'timestamp'>, existingId?: string) => {
    const id = existingId || Math.random().toString(36).substring(7);
    setState(prev => {
      const existingLogIndex = prev.debugLogs.findIndex(l => l.id === id);
      
      const calculateCost = (model?: string, payload?: any, response?: any, endpoint?: string) => {
        if (!model) return 0;
        
        const modelLower = model.toLowerCase();
        const endpointLower = (endpoint || '').toLowerCase();
        
        // Image model identification
        const isImage = 
          modelLower.includes('dall-e') || 
          modelLower.includes('flux') || 
          modelLower.includes('imagen') || 
          endpointLower.includes('avatar') || 
          endpointLower.includes('generate-image');

        if (isImage) {
          if (modelLower.includes('dall-e-3')) return 0.04;
          if (modelLower.includes('dall-e-2')) return 0.02;
          return 0.04; // Default image cost
        }

        // Text estimation: 1 token ≈ 4 chars
        const inputChars = JSON.stringify(payload || {}).length;
        const outputChars = JSON.stringify(response || {}).length;
        const inputTokens = inputChars / 4;
        const outputTokens = outputChars / 4;

        let inputRate = 0.000005; // $5 per 1M tokens (GPT-4o)
        let outputRate = 0.000015; // $15 per 1M tokens (GPT-4o)

        if (modelLower.includes('gpt-4o-mini')) {
          inputRate = 0.00000015; // $0.15 per 1M
          outputRate = 0.0000006; // $0.60 per 1M
        } else if (modelLower.includes('gemini-1.5-flash')) {
          inputRate = 0.0000001; // $0.10 per 1M
          outputRate = 0.0000003; // $0.30 per 1M
        } else if (modelLower.includes('claude-3-haiku')) {
          inputRate = 0.00000025;
          outputRate = 0.00000125;
        }

        return (inputTokens * inputRate) + (outputTokens * outputRate);
      };

      if (existingLogIndex >= 0) {
        const newLogs = [...prev.debugLogs];
        const existingLog = newLogs[existingLogIndex];
        
        const updatedPayload = (log.payload && typeof log.payload === 'object' && existingLog.payload && typeof existingLog.payload === 'object') 
          ? { ...existingLog.payload, ...log.payload } 
          : (log.payload || existingLog.payload);
        
        const updatedResponse = (log.response && typeof log.response === 'object' && existingLog.response && typeof existingLog.response === 'object') 
          ? { ...existingLog.response, ...log.response } 
          : (log.response || existingLog.response);

        const duration = Date.now() - existingLog.timestamp;
        const cost = calculateCost(log.model || existingLog.model, updatedPayload, updatedResponse, log.endpoint || existingLog.endpoint);

        newLogs[existingLogIndex] = { 
          ...existingLog, 
          ...log,
          payload: updatedPayload,
          response: updatedResponse,
          duration,
          cost
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

  const fetchJsonWithTimeout = async (input: RequestInfo | URL, init: RequestInit, timeoutMs: number, externalSignal?: AbortSignal) => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    // If external signal is already aborted, return immediately
    if (externalSignal?.aborted) {
      throw new Error('Aborted');
    }

    // Helper to abort if external signal aborts
    const onExternalAbort = () => {
      controller.abort();
    };
    
    if (externalSignal) {
      externalSignal.addEventListener('abort', onExternalAbort);
    }

    try {
      const res = await fetch(input, { ...init, signal: controller.signal });
      return await res.json();
    } finally {
      clearTimeout(timer);
      if (externalSignal) {
        externalSignal.removeEventListener('abort', onExternalAbort);
      }
    }
  };

  const startResponseRequest = async (panelist: Panelist, topic: string, history: string, currentConsecutiveCount: number, settings: Settings, signal: AbortSignal) => {
    if (signal.aborted) return { publicComment: 'Aborted', thoughts: '' };

    // Look up word limits from the communication style
    const matchingStyle = (settings.communicationStyles || []).find(
      s => s.name.toLowerCase() === (panelist.communicationStyle || '').toLowerCase()
    );
    const wordMin = matchingStyle?.wordMin ?? 10;
    const wordMax = matchingStyle?.wordMax ?? 50;

    // Replace all variables in the prompt before logging or sending
    const systemPrompt = replacePromptVariables(
      settings.responsePrompt,
      panelist,
      settings.userName,
      topic,
      history,
      undefined, // communicationStyles list not needed here
      wordMin,
      wordMax,
      matchingStyle?.description,
      matchingStyle?.intro
    ) + (settings.responseMode !== 'random' && currentConsecutiveCount >= settings.interferenceNumber 
      ? `\n\nIMPORTANT: ${settings.interferencePrompt.replace(/\{\{userName\}\}/g, settings.userName || 'the user')}` 
      : '');

    const logId = addDebugLog({ 
      type: 'request', 
      endpoint: `Generating ${panelist.firstName}'s response`, 
      payload: { topic, firstName: panelist.firstName, communicationStyle: panelist.communicationStyle, wordMin, wordMax, prompt: systemPrompt }, 
      model: settings.model 
    });

    try {
      const data: any = await fetchJsonWithTimeout(`${import.meta.env.BASE_URL}api/generate-response`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          panelist,
          topic,
          history: history,
          userName: settings.userName || 'You',
          prompt: systemPrompt,
          model: settings.model
        }),
      }, 120_000, signal);

      if (signal.aborted) return { publicComment: 'Aborted', thoughts: '' };

      const parsedData = safeJsonParse(data.raw);
      const cleanedData = {
        thoughts: getField(parsedData, 'thoughts', ['thinking', 'reasoning']),
        publicComment: getField(parsedData, 'publicComment', ['response', 'message']),
        chosen: getField(parsedData, 'chosen', ['selected', 'next']),
      };

      addDebugLog({ 
        type: 'response', 
        endpoint: `Generating ${panelist.firstName}'s response`, 
        payload: { topic }, 
        response: { ...data, ...cleanedData },
        model: settings.model 
      }, logId);

      // --- Banned Speech Check ---
      if (settings.bannedSpeechEnabled && cleanedData.publicComment) {
        const bannedList = settings.bannedSpeechList.split('\n').map(s => s.trim()).filter(s => s !== '');
        const foundBanned = bannedList.some(banned => cleanedData.publicComment.includes(banned));

        if (foundBanned) {
          const rephraseLogId = addDebugLog({
            type: 'request',
            endpoint: `Banned Speech Rephrase: ${panelist.firstName}`,
            payload: { originalResponse: cleanedData.publicComment, bannedList },
            model: settings.bannedSpeechModel
          });

          const rephrasePrompt = settings.bannedSpeechPrompt.replace(/\{\{response\}\}/g, cleanedData.publicComment);
          
          const rephraseData: any = await fetchJsonWithTimeout(`${import.meta.env.BASE_URL}api/generate-response`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              panelist: { ...panelist, firstName: 'Banned Speech Filter' },
              topic: 'Banned Speech Rephrasing',
              history: '',
              userName: settings.userName || 'You',
              prompt: `You are a professional editor. ${rephrasePrompt}\n\nReturn your response in JSON format with "thoughts" and "publicComment" fields.`,
              model: settings.bannedSpeechModel
            }),
          }, 60_000, signal);

          if (signal.aborted) return { publicComment: 'Aborted', thoughts: '' };

          const parsedRephrase = safeJsonParse(rephraseData.raw);
          const cleanedRephrase = {
            thoughts: getField(parsedRephrase, 'thoughts', ['thinking', 'reasoning']),
            publicComment: getField(parsedRephrase, 'publicComment', ['response', 'message']),
          };

          addDebugLog({
            type: 'response',
            endpoint: `Banned Speech Rephrase: ${panelist.firstName}`,
            payload: { rephrasePrompt },
            response: { ...rephraseData, ...cleanedRephrase },
            model: settings.bannedSpeechModel
          }, rephraseLogId);

            if (cleanedRephrase.publicComment) {
              return {
                ...cleanedData,
                publicComment: cleanedRephrase.publicComment,
                thoughts: cleanedRephrase.thoughts || cleanedData.thoughts
              };
            }
        }
      }

      return cleanedData;
    } catch (err: any) {
      if (signal.aborted || err.name === 'AbortError' || err.message === 'Aborted') {
        return { publicComment: 'Aborted', thoughts: '' };
      }
      addDebugLog({ type: 'error', endpoint: 'generateResponse', payload: err?.message || String(err) }, logId);
      return { publicComment: 'Sorry — I had trouble generating that response.', thoughts: '' };
    }
  };

  const resetChat = useCallback(() => {
    getNewAbortSignal();
    setState(prev => ({
      ...prev,
      topic: '',
      messages: [],
      displayMessages: [],
      panelists: [],
      isGenerating: false,
      status: 'idle',
      debugLogs: [],
      autoResponse: null,
      mentionStack: [],
      roundOrder: [],
      alreadySpoken: [],
      consecutiveAgentCount: 0,
    }));
    setSuggestions(getCustomSuggestions());
  }, [getCustomSuggestions, getNewAbortSignal]);

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
      'bg-red-50': 'red',
      'bg-orange-50': 'orange',
      'bg-amber-50': 'amber',
      'bg-yellow-50': 'yellow',
      'bg-lime-50': 'lime',
      'bg-green-50': 'green',
      'bg-emerald-50': 'emerald green',
      'bg-teal-50': 'teal',
      'bg-cyan-50': 'cyan',
      'bg-sky-50': 'sky blue',
      'bg-blue-50': 'blue',
      'bg-indigo-50': 'indigo',
      'bg-violet-50': 'violet',
      'bg-purple-50': 'purple',
      'bg-fuchsia-50': 'fuchsia',
      'bg-pink-50': 'pink',
      'bg-rose-50': 'rose',
    };
    return colorMap[tailwindClass] || 'professional';
  };

  const findMentions = (text: string, panelists: Panelist[], userName?: string) => {
    // Regex to match name or name's (possessive) with word boundaries
    const getRegex = (name: string) => new RegExp(`\\b${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?:'s)?\\b`, 'gi');

    const allNames = [
      ...panelists.map(p => ({ name: p.firstName, type: 'agent' })),
      ...(userName ? [{ name: userName, type: 'user' }] : [])
    ];

    // Find all occurrences of any name
    const occurrences: { name: string, index: number, type: string }[] = [];
    
    allNames.forEach(({ name, type }) => {
      const regex = getRegex(name);
      let match;
      while ((match = regex.exec(text)) !== null) {
        occurrences.push({ name, index: match.index, type });
      }
    });

    // Sort occurrences by their position in the text
    occurrences.sort((a, b) => a.index - b.index);

    const userMentioned = occurrences.some(o => o.type === 'user');
    const agentMentions = occurrences.filter(o => o.type === 'agent').map(o => o.name);
    // Unique agent mentions in order
    const mentions = Array.from(new Set(agentMentions));

    return { mentions, userMentioned };
  };

  const replacePromptVariables = (template: string, panelist: Panelist, userName?: string, topic?: string, history?: string, communicationStyles?: string, wordMin?: number, wordMax?: number, communicationStyleDescription?: string, styleIntro?: string) => {
    const safetyRegex = /\b(trauma|emergency|mass-casualty|ER|blood|violence|death|kill|dead|gun|weapon|hospital|injury|accident|victim|murder|attack)\b/gi;
    const safeDescription = (panelist.shortDescription || 'expert').replace(safetyRegex, 'professional');
    const safePersonality = panelist.fullPersonality ? panelist.fullPersonality.replace(safetyRegex, 'professional') : '';
    const safeAppearance = panelist.physicalDescription ? panelist.physicalDescription.replace(safetyRegex, 'professional') : '';
    const colorName = getColorName(panelist.color);
    
    // Create the full communication style string requested by the user
    // Format: "Name: Description. Must be min-max words."
    const styleName = panelist.communicationStyle || 'Professional';
    const styleDesc = communicationStyleDescription || '';
    const fullStyle = `${styleName}: ${styleDesc}${styleDesc ? '. ' : ''}Must be ${wordMin ?? 10}-${wordMax ?? 50} words.`;

    let result = template
      .replace(/\{\{firstName\}\}/g, panelist.firstName || 'Expert')
      .replace(/\{\{description\}\}/g, safeDescription)
      .replace(/\{\{shortDescription\}\}/g, safeDescription)
      .replace(/\{\{communicationStyle\}\}/g, styleName)
      .replace(/\{\{fullCommunicationStyle\}\}/g, fullStyle)
      .replace(/\{\{communicationStyleDescription\}\}/g, styleDesc)
      .replace(/\{\{communicationStyles\}\}/g, communicationStyles || 'Any professional style')
      .replace(/\{\{color\}\}/g, colorName)
      .replace(/\{\{userName\}\}/g, userName || 'User')
      .replace(/\{\{topic\}\}/g, topic || '')
      .replace(/\{\{history\}\}/g, history || '')
      .replace(/\{\{wordMin\}\}/g, String(wordMin ?? 10))
      .replace(/\{\{wordMax\}\}/g, String(wordMax ?? 50))
      .replace(/\{\{styleIntro\}\}/g, styleIntro || (panelist.firstName ? `${panelist.firstName} here.` : 'Expert here.'))
      .replace(/\{\{thoughts\}\}/g, 'thoughts')
      .replace(/\{\{publicComment\}\}/g, 'publicComment');

    // Only replace these if they have content, otherwise keep the placeholders
    // This allows the personality generation prompt to keep its JSON keys
    if (safePersonality) {
      result = result.replace(/\{\{fullPersonality\}\}/g, safePersonality);
    }
    if (safeAppearance) {
      result = result.replace(/\{\{physicalDescription\}\}/g, safeAppearance);
    }

    return result;
  };

  const replaceImageVariables = (template: string, panelist: Panelist) => {
    return replacePromptVariables(template || BASE_IMAGE_PROMPT, panelist);
  };

  const getField = (obj: any, baseKey: string, fallbacks: string[] = []) => {
    if (!obj || typeof obj !== 'object') return '';
    const keys = [
      baseKey, 
      `{{${baseKey}}}`, 
      `${baseKey} `, 
      ` {{${baseKey}}} `,
      ...fallbacks, 
      ...fallbacks.map(f => `{{${f}}}`)
    ];
    for (const k of keys) {
      if (obj[k] !== undefined) return obj[k];
    }
    return '';
  };

  const msPerWord = 100; // must match MessageBubble typingSpeed
  const estimateTypingMs = (text: string | null | undefined) => {
    if (!text) return 300;
    const tokens = String(text).match(/\S+\s*/g) || [];
    return Math.min(30_000, tokens.length * msPerWord + 300);
  };

  const startDiscussion = async (topic: string, userMessage: Message, signal: AbortSignal) => {
    setState(prev => ({ ...prev, topic, isGenerating: true, status: 'generating_panelists' }));

    try {
      if (signal.aborted) return;
      // Pre-assign colors and generic IDs for the assembly phase
      const agentCount = state.settings.agentCount;
      
      // Generate a spread-out sequence of colors using a distance-based scoring algorithm
      const getSortedColors = () => {
        const currentPicked = new Set<number>();
        let currentScores = new Array(AGENT_COLORS.length).fill(0);
        const sequence: string[] = [];

        while (currentPicked.size < AGENT_COLORS.length) {
          const availableIndices = AGENT_COLORS.map((_, i) => i).filter(idx => !currentPicked.has(idx));
          
          let currentMax = -1;
          availableIndices.forEach(idx => {
            if (currentScores[idx] > currentMax) currentMax = currentScores[idx];
          });

          const candidates = availableIndices.filter(idx => currentScores[idx] === currentMax);
          const chosenIdx = candidates[Math.floor(Math.random() * candidates.length)];
          
          currentPicked.add(chosenIdx);
          sequence.push(AGENT_COLORS[chosenIdx]);

          currentScores = AGENT_COLORS.map((_, i) => {
            if (currentPicked.has(i)) return 0;
            let minDistance = Infinity;
            currentPicked.forEach(pIdx => {
              const directDist = Math.abs(i - pIdx);
              const wrapDist = AGENT_COLORS.length - directDist;
              const dist = Math.min(directDist, wrapDist);
              if (dist < minDistance) minDistance = dist;
            });
            // Cap score at 4 as per reference logic
            return Math.min(minDistance, 4);
          });
        }
        return sequence;
      };

      const colorSequence = getSortedColors();
      
      const preAssignedAgents = Array.from({ length: agentCount }).map((_, i) => ({
        id: `pre-${i}`,
        color: colorSequence[i % colorSequence.length],
        placeholderName: `Agent ${i + 1}`
      }));

      // --- STEP 1: Quick fetch of names, descriptions, and communication styles for all panelists ---
      const quickPrompt = state.settings.quickPanelistsPrompt || BASE_QUICK_PANELISTS_PROMPT;
      const formattedStyles = (state.settings.communicationStyles || []).map(s => 
        `${s.name}: ${s.description}`
      ).join('; ');
      
      const quickPayload = { 
        topic, 
        count: state.settings.agentCount, 
        prompt: quickPrompt,
        model: state.settings.model,
        communicationStyles: formattedStyles
      };
      
      const quickLogId = addDebugLog({ 
        type: 'request', 
        endpoint: 'Panelist Assembly', 
        payload: { 
          ...quickPayload, 
          agents: preAssignedAgents,
          prompt: quickPrompt
            .replace(/\{\{topic\}\}/g, topic)
            .replace(/\{\{count\}\}/g, String(state.settings.agentCount))
            .replace(/\{\{communicationStyles\}\}/g, formattedStyles)
        }, 
        model: state.settings.model 
      });
      
      const quickRes = await fetch(`${import.meta.env.BASE_URL}api/generate-panelists`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(quickPayload),
        signal
      });
      
      const quickData: any = await quickRes.json();
      
      if (!quickRes.ok) {
        throw new Error(quickData.error || `Failed to generate panelists: ${quickRes.statusText}`);
      }
      
      if (signal.aborted) return;

      // Extract raw and parse it
      const parsedRaw = safeJsonParse(quickData.raw);
      let aiPanelists = [];
      if (parsedRaw.panelists && Array.isArray(parsedRaw.panelists)) {
        aiPanelists = parsedRaw.panelists;
      } else if (Array.isArray(parsedRaw)) {
        aiPanelists = parsedRaw;
      } else {
        // Find any array in the object
        const possibleArray = Object.values(parsedRaw).find(v => Array.isArray(v));
        if (possibleArray) {
          aiPanelists = possibleArray as any[];
        }
      }

      const sanitizedPanelists = aiPanelists.map((p: any) => ({
        firstName: getField(p, 'firstName', ['name']) || 'Expert',
        shortDescription: getField(p, 'shortDescription', ['description', 'role']) || 'Consultant',
        communicationStyle: getField(p, 'communicationStyle', ['style']) || ''
      }));

      addDebugLog({ 
        type: 'response', 
        endpoint: 'Panelist Assembly', 
        payload: { topic, count: state.settings.agentCount },
        response: { ...quickData, panelists: sanitizedPanelists }, // Keep parsed version for Info cards
        model: state.settings.model 
      }, quickLogId);

      if (!sanitizedPanelists || sanitizedPanelists.length === 0) {
        throw new Error('No panelists generated by AI. Please check your settings or try again.');
      }

      // Create skeleton panelists with names, descriptions, and communication styles from assembly
      const skeletonPanelists: Panelist[] = sanitizedPanelists.map((p: any, index: number) => {
        // Fuzzy match the communication style name to our internal list
        const styles = state.settings.communicationStyles || [];
        const aiStyleName = (p.communicationStyle || '').toLowerCase();
        
        const matchedStyle = styles.find(s => 
          s.name.toLowerCase() === aiStyleName || 
          aiStyleName.includes(s.name.toLowerCase()) || 
          s.name.toLowerCase().includes(aiStyleName)
        ) || styles[0];

        return {
          firstName: p.firstName || 'Expert',
          shortDescription: p.shortDescription || p.description || 'Consultant',
          fullPersonality: '',
          physicalDescription: '',
          communicationStyle: matchedStyle?.name || p.communicationStyle || '',
          introMessage: '',
          id: Math.random().toString(36).substring(7),
          color: preAssignedAgents[index].color,
        };
      });

      // Show skeleton panelists immediately so user sees progress
      setState(prev => ({ ...prev, panelists: skeletonPanelists, status: 'introductions' }));

      // --- STEP 2: Launch parallel processes for each agent ---
      const detailsPrompt = state.settings.panelistDetailsPrompt || BASE_PANELIST_DETAILS_PROMPT;
      let introsCompleted = 0;
      const totalAgents = skeletonPanelists.length;
      const finalizedPanelists: Panelist[] = [];
      const allIntros: Message[] = [userMessage];

      // A simple promise chain to act as a lock for intro animations
      let introLock = Promise.resolve();

      skeletonPanelists.forEach(async (skeleton, index) => {
        try {
          if (signal.aborted) return;

          // 1. Get metadata
          const matchingStyle = (state.settings.communicationStyles || []).find(
            s => s.name.toLowerCase() === (skeleton.communicationStyle || '').toLowerCase()
          );
          const styleIntro = matchingStyle?.intro || '{{firstName}} here.';
          const styleDescription = matchingStyle?.description || '';
          const wordMin = matchingStyle?.wordMin || 10;
          const wordMax = matchingStyle?.wordMax || 50;

          const systemPrompt = replacePromptVariables(
            detailsPrompt,
            skeleton,
            state.settings.userName,
            topic,
            undefined,
            undefined,
            wordMin,
            wordMax,
            styleDescription,
            styleIntro
          );

          const detailsLogId = addDebugLog({
            type: 'request',
            endpoint: `Panelist Personality: ${skeleton.firstName}`,
            payload: { 
              topic, 
              firstName: skeleton.firstName, 
              shortDescription: skeleton.shortDescription, 
              communicationStyle: skeleton.communicationStyle,
              communicationStyleDescription: styleDescription,
              wordMin,
              wordMax,
              agentIndex: index,
              prompt: systemPrompt
            },
            model: state.settings.model
          });

          // 2. Generate Personality
          const detailsData: any = await fetchJsonWithTimeout(`${import.meta.env.BASE_URL}api/generate-panelist-details`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              topic,
              firstName: skeleton.firstName,
              shortDescription: skeleton.shortDescription,
              color: getColorName(skeleton.color),
              communicationStyle: skeleton.communicationStyle,
              communicationStyleDescription: styleDescription,
              wordMin,
              wordMax,
              styleIntro: styleIntro,
              prompt: systemPrompt,
              model: state.settings.model
            }),
          }, 60_000, signal);

          if (signal.aborted) return;

          const parsedDetails = safeJsonParse(detailsData.raw);
          const cleanedDetails = {
            shortDescription: getField(parsedDetails, 'shortDescription', ['description', 'role']),
            fullPersonality: getField(parsedDetails, 'fullPersonality', ['personality', 'background', 'bio']),
            physicalDescription: getField(parsedDetails, 'physicalDescription', ['appearance', 'physical']),
            introMessage: getField(parsedDetails, 'introMessage', ['intro']),
          };

          addDebugLog({
            type: 'response',
            endpoint: `Panelist Personality: ${skeleton.firstName}`,
            payload: { firstName: skeleton.firstName, communicationStyle: skeleton.communicationStyle, agentIndex: index },
            response: { ...detailsData, ...cleanedDetails },
            model: state.settings.model
          }, detailsLogId);

          const fullPanelist: Panelist = {
            ...skeleton,
            shortDescription: cleanedDetails.shortDescription || skeleton.shortDescription,
            fullPersonality: cleanedDetails.fullPersonality || 'A seasoned professional with deep expertise.',
            physicalDescription: cleanedDetails.physicalDescription || 'A professional individual.',
            introMessage: cleanedDetails.introMessage || 'Ready to join the discussion.',
          };

          // Update state immediately for Agent Console
          setState(prev => ({
            ...prev,
            panelists: prev.panelists.map(p => p.id === skeleton.id ? fullPanelist : p)
          }));

          // 3. Generate Image
          const imagePrompt = replaceImageVariables(state.settings.imagePrompt, fullPanelist);
          const imgLogId = addDebugLog({
            type: 'request',
            endpoint: `Panelist Avatar: ${fullPanelist.firstName}`,
            payload: { prompt: imagePrompt, model: state.settings.imageModel, firstName: fullPanelist.firstName, agentIndex: index },
            model: state.settings.imageModel
          });

          let finalAvatarUrl: string | undefined = undefined;
          try {
            const imgData: any = await fetchJsonWithTimeout(`${import.meta.env.BASE_URL}api/generate-image`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ prompt: imagePrompt, model: state.settings.imageModel }),
            }, 90_000, signal);

            if (!signal.aborted) {
              addDebugLog({
                type: 'response',
                endpoint: `Panelist Avatar: ${fullPanelist.firstName}`,
                payload: { prompt: imagePrompt, model: state.settings.imageModel, agentIndex: index },
                response: imgData,
                model: state.settings.imageModel
              }, imgLogId);

              if (imgData?.url) {
                finalAvatarUrl = await cropImageFrame(imgData.url);
                if (!signal.aborted) {
                  setState(prev => ({
                    ...prev,
                    panelists: prev.panelists.map(p => p.id === skeleton.id ? { ...p, avatarUrl: finalAvatarUrl } : p)
                  }));
                }
              }
            }
          } catch (err: any) {
            if (!signal.aborted) {
              addDebugLog({ type: 'error', endpoint: `Panelist Avatar: ${fullPanelist.firstName}`, payload: err?.message || String(err) }, imgLogId);
            }
          }

          if (signal.aborted) return;

          // 4. Trigger Intro (Wait for lock to ensure they don't overlap)
          introLock = introLock.then(async () => {
            if (signal.aborted) return;

            const pWithAvatar = { ...fullPanelist, avatarUrl: finalAvatarUrl };
            finalizedPanelists.push(pWithAvatar);

            const intro: Message = {
              id: Math.random().toString(36).substring(7),
              role: 'agent',
              content: pWithAvatar.introMessage || 'Hello!',
              senderName: pWithAvatar.firstName,
              senderTitle: pWithAvatar.shortDescription,
              communicationStyle: pWithAvatar.communicationStyle,
              panelistId: pWithAvatar.id,
              color: pWithAvatar.color,
              avatarUrl: pWithAvatar.avatarUrl,
              timestamp: Date.now(),
            };

            // Blank delay for 1s before thinking
            await new Promise(resolve => setTimeout(resolve, 1000));
            if (signal.aborted) return;

            const thinkingId = `intro-thinking-${pWithAvatar.id}`;
            const thinkingMessage: Message = {
              ...intro,
              id: thinkingId,
              content: `${pWithAvatar.firstName} is joining...`,
              isThinking: true,
              timestamp: Date.now(),
            };
            
            setState(prev => ({ 
              ...prev, 
              displayMessages: [...prev.displayMessages, thinkingMessage] 
            }));
            
            // Show thinking for 2s
            await new Promise(resolve => setTimeout(resolve, 2000));
            if (signal.aborted) return;

            const introWithNewTimestamp = { ...intro, timestamp: Date.now() };
            allIntros.push(introWithNewTimestamp);
            setState(prev => ({ 
              ...prev, 
              displayMessages: [...prev.displayMessages.filter(m => m.id !== thinkingId), introWithNewTimestamp],
              messages: [...prev.messages, introWithNewTimestamp]
            }));

            // Wait for animation to finish + 1s delay as requested
            await new Promise(resolve => setTimeout(resolve, estimateTypingMs(introWithNewTimestamp.content) + 1000));

            introsCompleted++;
            
            // Check if all intros are done to start the discussion
            if (introsCompleted === totalAgents) {
              setState(prev => ({ 
                ...prev, 
                status: 'discussion',
                roundOrder: finalizedPanelists.map(fp => fp.id),
                alreadySpoken: [],
                consecutiveAgentCount: 0
              }));

              // Fire side effect OUTSIDE of setState to avoid double-triggers from React re-renders
              // Pass allIntros so the moderator knows about the introductions
              // Also pass allIntros as initialDisplayMessages to avoid stale state in runDiscussionRound
              runDiscussionRound(topic, finalizedPanelists, allIntros, undefined, allIntros, signal);
            }
          });

        } catch (error: any) {
          if (!signal.aborted) {
            addDebugLog({ type: 'error', endpoint: `Agent Processing: ${skeleton.firstName}`, payload: error.message });
            
            // Critical fix: still increment introsCompleted and check for completion inside the lock
            // to ensure runDiscussionRound is called even if an agent fails.
            introLock = introLock.then(async () => {
              introsCompleted++;
              if (introsCompleted === totalAgents) {
                setState(prev => ({ 
                  ...prev, 
                  status: 'discussion',
                  roundOrder: finalizedPanelists.map(fp => fp.id),
                  alreadySpoken: [],
                  consecutiveAgentCount: 0
                }));
                runDiscussionRound(topic, finalizedPanelists, allIntros, undefined, allIntros, signal);
              }
            });
          }
        }
      });

    } catch (error: any) {
      if (signal.aborted || error.message === 'Aborted') return;
      console.error('Error in startDiscussion:', error);
      addDebugLog({ type: 'error', endpoint: 'startDiscussion', payload: error.message });
      setState(prev => ({ ...prev, isGenerating: false, status: 'idle', error: error.message }));
    }
  };

  const runDiscussionRound = async (topic: string, allPanelists: Panelist[], currentMessages: Message[], subsetToRun?: Panelist[], initialDisplayMessages?: Message[], signal?: AbortSignal, excludeUserOnFirstTurn: boolean = false) => {
    if (roundInProgressRef.current) return;
    roundInProgressRef.current = true;

    let isFirstIteration = true;

    // If subsetToRun is provided, we're likely continuing a round (like after intros)
    // or starting a fresh one. We should sync the state trackers first.
    try {
      if (subsetToRun) {
      const alreadySpokenIds = allPanelists
        .filter(p => !subsetToRun.some(s => s.id === p.id))
        .map(p => p.id);
      
      await new Promise<void>(resolve => {
        setState(prev => {
          resolve();
          return {
            ...prev,
            alreadySpoken: alreadySpokenIds,
            consecutiveAgentCount: alreadySpokenIds.length
          };
        });
      });
    }

    if (signal?.aborted) return;
    setState(prev => ({ ...prev, isGenerating: true, status: 'discussion' }));
    
    let messages = [...currentMessages];
    let displayMessages = initialDisplayMessages || [...state.displayMessages];

    const getNextPanelist = async (currentState: ChatState, currentLocalMessages: Message[]): Promise<{ panelist: Panelist | null, decision?: ModeratorDecision }> => {
      if (signal?.aborted) return { panelist: null };
      const { settings, mentionStack, roundOrder, alreadySpoken, panelists } = currentState;
      const userName = settings.userName || 'You';

      // Find last speaker to exclude them (Rule 2)
      const lastMessage = currentLocalMessages.length > 0 ? currentLocalMessages[currentLocalMessages.length - 1] : null;
      const lastSpeakerName = lastMessage ? (lastMessage.senderName || (lastMessage.role === 'user' ? userName : '')) : '';

      if (settings.responseMode === 'moderator') {
        // AI Moderator logic
        // Rule 1: Right after intros, don't include user (history is just user prompt + intros)
        const isFirstTurnAfterIntros = currentLocalMessages.length === panelists.length + 1;

        const availableParticipants = panelists.map(p => ({
          firstName: p.firstName,
          fullName: `${p.firstName} (${p.shortDescription})`
        }));

        let filteredParticipantList = availableParticipants
          .filter(p => p.firstName.toLowerCase() !== lastSpeakerName.toLowerCase())
          .map(p => p.firstName);

        // Include user if:
        // 1. It's not the first turn after intros
        // 2. They didn't just speak
        // 3. They didn't just skip their turn (excludeUserOnFirstTurn)
        const shouldExcludeUser = isFirstTurnAfterIntros || 
                                lastSpeakerName.toLowerCase() === userName.toLowerCase() || 
                                (isFirstIteration && excludeUserOnFirstTurn);

        if (!shouldExcludeUser) {
          filteredParticipantList.push(userName);
        }
        
        const participantList = filteredParticipantList.join(', ');
        const prompt = settings.moderatorSelectionPrompt
          .replace(/\{\{userName\}\}/g, userName)
          .replace(/\{\{participantList\}\}/g, participantList)
          .replace(/\{\{history\}\}/g, formatHistory(currentLocalMessages));

        const moderatorPrompt = `You are a conversation moderator. ${prompt}\n\nIMPORTANT: Use ONLY the names provided in the participant list as keys in your reasoning object. Return ONLY valid JSON.`;

        let attempts = 0;
        while (attempts < 3) {
          attempts++;
          const logId = addDebugLog({ 
            type: 'request', 
            endpoint: `Moderator Speaker Selection (Attempt ${attempts})`, 
            payload: { prompt: moderatorPrompt }, 
            model: settings.model 
          });

          try {
            const res = await fetch(`${import.meta.env.BASE_URL}api/generate-response`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                panelist: { 
                  firstName: 'Moderator', 
                  shortDescription: 'Speaker Selector',
                  fullPersonality: 'Neutral moderator picking the next speaker.',
                  id: 'moderator',
                  communicationStyle: 'neutral',
                  introMessage: '',
                  color: ''
                },
                topic: 'Speaker Selection',
                history: '',
                userName: userName,
                prompt: moderatorPrompt,
                model: settings.model
              }),
              signal
            });
            const data: any = await res.json();
            
            if (signal?.aborted) return { panelist: null };

            const parsedModerator = safeJsonParse(data.raw);
            const cleanedModerator = {
              reasoning: getField(parsedModerator, 'reasoning', ['thoughts', 'thinking']),
              chosen: getField(parsedModerator, 'chosen', ['selected', 'next']),
            };

            addDebugLog({ 
              type: 'response', 
              endpoint: `Moderator Speaker Selection (Attempt ${attempts})`, 
              payload: { prompt: moderatorPrompt }, 
              response: { ...data, ...cleanedModerator, allowedNames: filteredParticipantList },
              model: settings.model 
            }, logId);

            if (cleanedModerator && cleanedModerator.chosen) {
              const chosenName = String(cleanedModerator.chosen).trim();
              const found = panelists.find(p => p.firstName.toLowerCase() === chosenName.toLowerCase());
              
              // Rule 2 & 1 Enforcement: Ensure moderator didn't pick someone excluded
              const isUserSelected = chosenName.toLowerCase() === userName.toLowerCase();
              const isLastSpeakerSelected = chosenName.toLowerCase() === lastSpeakerName.toLowerCase();

              // Check if the choice is allowed based on filteredParticipantList
              const isAllowed = filteredParticipantList.some(name => name.toLowerCase() === chosenName.toLowerCase());

              if (isAllowed) {
                if (found && !isLastSpeakerSelected) {
                  return { 
                    panelist: found, 
                    decision: { reasoning: cleanedModerator.reasoning || {}, chosen: found.firstName } 
                  };
                }

                // If the moderator chose the user, we return null panelist to stop the loop
                if (isUserSelected && !isFirstTurnAfterIntros && !isLastSpeakerSelected) {
                  return {
                    panelist: null,
                    decision: { reasoning: cleanedModerator.reasoning || {}, chosen: userName }
                  };
                }
              } else {
                console.warn(`Moderator attempt ${attempts} picked invalid speaker: ${chosenName}. Retrying...`);
              }
            }
          } catch (err) {
            if (signal?.aborted) return { panelist: null };
            console.error(`Moderator selection attempt ${attempts} failed`, err);
          }
        }
        
        // Fallback to mentions if moderator fails or makes an invalid choice after 3 attempts
      }

      if (settings.responseMode === 'mentions' || settings.responseMode === 'moderator') {
        // 1. Check Mention Stack
        if (mentionStack.length > 0) {
          const nextName = mentionStack[0];
          const found = panelists.find(p => p.firstName === nextName);
          // Rule 2 Enforcement in Mentions: Never include the last person who spoke
          if (found && found.firstName.toLowerCase() !== lastSpeakerName.toLowerCase()) {
            return { panelist: found };
          }
        }

        // 2. Check Round Order
        let nextId = roundOrder.find(id => {
          if (alreadySpoken.includes(id)) return false;
          // Rule 2 Enforcement in Round Order
          const p = panelists.find(panelist => panelist.id === id);
          return p && p.firstName.toLowerCase() !== lastSpeakerName.toLowerCase();
        });
        
        // In moderator mode, if everyone has spoken, we don't necessarily stop.
        // We can start a new round if the moderator mode is on and we reached here (fallback).
        if (!nextId && settings.responseMode === 'moderator') {
          // Pick someone from round order who isn't the last speaker to start new round
          nextId = roundOrder.find(id => {
            const p = panelists.find(panelist => panelist.id === id);
            return p && p.firstName.toLowerCase() !== lastSpeakerName.toLowerCase();
          }) || roundOrder[0];
          setState(prev => ({ ...prev, alreadySpoken: [] }));
        }

        if (nextId) {
          const found = panelists.find(p => p.id === nextId) || null;
          return { panelist: found };
        }

        return { panelist: null };
      } else {
        // random mode
        const nextId = roundOrder.find(id => !alreadySpoken.includes(id));
        const found = panelists.find(p => p.id === nextId) || null;
        return { panelist: found };
      }
    };

    // Main loop
    while (true) {
      if (signal?.aborted) break;

      // UI GATE: Wait if we are still doing introductions
      while (true) {
        let isIntro = false;
        await new Promise<void>(resolve => {
          setState(prev => {
            isIntro = prev.status === 'introductions';
            resolve();
            return prev;
          });
        });
        if (!isIntro || signal?.aborted) {
          if (!isIntro) {
            // Refresh display messages once intros are done so the UI gate 
            // knows about the last intro message's typing time
            await new Promise<void>(resolve => {
              setState(prev => {
                displayMessages = [...prev.displayMessages];
                resolve();
                return prev;
              });
            });
          }
          break;
        }
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      if (signal?.aborted) break;

      // Get latest state for decision making
      let nextResult: { panelist: Panelist | null, decision?: ModeratorDecision } = { panelist: null };
      let currentState: any = null;
      
      // We need to get the current state first
      await new Promise<void>(resolve => {
        setState(prev => {
          currentState = prev;
          resolve();
          return prev;
        });
      });

      if (signal?.aborted) break;

      // Now determine next panelist (possibly async)
      nextResult = await getNextPanelist(currentState, messages);

      if (signal?.aborted || !nextResult.panelist) break;

      const panelist: Panelist = nextResult.panelist;

      // Update state if we have a moderator decision
      if (nextResult.decision) {
        setState(prev => ({ ...prev, lastModeratorDecision: nextResult.decision }));
      }

      // UI GATE: wait until previous agent finishes typing
      const lastMsg = displayMessages[displayMessages.length - 1];
      if (lastMsg?.role === 'agent' && !lastMsg.isThinking) {
        await new Promise(resolve => setTimeout(resolve, estimateTypingMs(lastMsg.content)));
        if (signal?.aborted) break;
        await new Promise(resolve => setTimeout(resolve, 1000));
        if (signal?.aborted) break;
      }

      // Blank delay for 2s before thinking shows up
      await new Promise(resolve => setTimeout(resolve, 2000));
      if (signal?.aborted) break;

      try {
        // Show thinking bubble
        const thinkingId = `thinking-${Math.random().toString(36).substring(7)}`;
        const thinkingStartTime = Date.now();
        const thinkingMessage: Message = {
          id: thinkingId,
          role: 'agent',
          content: `${panelist.firstName} is thinking...`,
          isThinking: true,
          senderName: panelist.firstName,
          senderTitle: panelist.shortDescription,
          communicationStyle: panelist.communicationStyle,
          panelistId: panelist.id,
          color: panelist.color,
          avatarUrl: panelist.avatarUrl,
          timestamp: Date.now(),
        };
        
        setState(prevState => ({ ...prevState, displayMessages: [...prevState.displayMessages, thinkingMessage] }));

        if (!signal) throw new Error('AbortSignal required');

        // Request response
        const data: any = await startResponseRequest(panelist, topic, formatHistory(messages), currentState.consecutiveAgentCount, currentState.settings, signal);
        
        if (signal?.aborted) break;

        const realMessageId = Math.random().toString(36).substring(7);
        const realMessage: Message = {
          id: realMessageId,
          role: 'agent',
          content: data?.publicComment || 'No response generated.',
          thoughts: data?.thoughts,
          senderName: panelist.firstName,
          senderTitle: panelist.shortDescription,
          communicationStyle: panelist.communicationStyle,
          panelistId: panelist.id,
          color: panelist.color,
          avatarUrl: panelist.avatarUrl,
          timestamp: Date.now(),
        };

        // Analyze for mentions
        const { mentions, userMentioned } = findMentions(realMessage.content, allPanelists, currentState.settings.userName);

        // Update state with new message and trackers
        await new Promise<void>(resolve => {
          setState(prev => {
            const newAlreadySpoken = prev.alreadySpoken.includes(panelist.id) 
              ? prev.alreadySpoken 
              : [...prev.alreadySpoken, panelist.id];
            
            let newMentionStack = [...prev.mentionStack];
            
            if (prev.settings.responseMode !== 'random') {
              // If this person was at the top of the stack, remove them
              if (newMentionStack[0] === panelist.firstName) {
                newMentionStack.shift();
              }

              // If they mentioned others, update stack (overriding old stack as per requirements)
              if (mentions.length > 0) {
                newMentionStack = mentions.filter(name => name !== panelist.firstName);
              }

              // If we've reached the interference number, clear the stack to break any current mention-chains
              if (prev.consecutiveAgentCount + 1 >= prev.settings.interferenceNumber) {
                newMentionStack = [];
              }
            }

            const newState = {
              ...prev,
              messages: [...prev.messages, realMessage],
              alreadySpoken: newAlreadySpoken,
              mentionStack: newMentionStack,
              consecutiveAgentCount: prev.consecutiveAgentCount + 1,
            };
            
            messages = newState.messages; // update local ref
            resolve();
            return newState;
          });
        });

        if (signal?.aborted) break;

        // Ensure minimum 3s "thinking" time
        const elapsed = Date.now() - thinkingStartTime;
        if (elapsed < 3000) {
          await new Promise(resolve => setTimeout(resolve, 3000 - elapsed));
        }

        if (signal?.aborted) break;

        // Replace thinking with real message
        const realMessageWithNewTimestamp = { ...realMessage, timestamp: Date.now() };
        displayMessages = [...displayMessages, realMessageWithNewTimestamp];
        setState(prevState => ({
          ...prevState,
          displayMessages: prevState.displayMessages.map(m => m.id === thinkingId ? realMessageWithNewTimestamp : m)
        }));

        // STOP if user was mentioned
        if (currentState.settings.responseMode !== 'random' && userMentioned) {
          break;
        }

        isFirstIteration = false;
      } catch (error: any) {
        if (signal?.aborted || error.message === 'Aborted') break;
        addDebugLog({ type: 'error', endpoint: 'runDiscussionRound', payload: error.message });
        break;
      }
    }

    if (signal?.aborted) return;

    // Suggested User Response (formerly Moderator)
    let finalSettings: Settings | null = null;
    await new Promise<void>(resolve => {
      setState(prev => {
        finalSettings = prev.settings;
        resolve();
        return prev;
      });
    });

    if (finalSettings && (finalSettings as Settings).enableSuggestedResponse) {
      if (signal?.aborted) return;

      const settings = finalSettings as Settings;
      setState(prev => ({ ...prev, status: 'generating_auto_response' }));
      
      const modLogId = addDebugLog({
        type: 'request',
        endpoint: 'Suggested User Response',
        payload: { 
          topic, 
          firstName: 'Assistant',
          prompt: settings.moderatorPrompt
            .replace(/\{\{topic\}\}/g, topic)
            .replace(/\{\{userName\}\}/g, settings.userName || 'You')
            .replace(/\{\{history\}\}/g, formatHistory(messages))
        },
        model: settings.model
      });

      try {
        const res = await fetch(`${import.meta.env.BASE_URL}api/moderator-response`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            topic,
            history: formatHistory(messages),
            userName: settings.userName || 'You',
            prompt: settings.moderatorPrompt,
            model: settings.model
          }),
          signal
        });
        const data: any = await res.json();
        
        if (signal?.aborted) return;

        const parsedSuggested = safeJsonParse(data.raw);
        const cleanedSuggested = {
          userResponse: getField(parsedSuggested, 'userResponse', ['response', 'message', 'publicComment']),
        };

        addDebugLog({
          type: 'response',
          endpoint: 'Suggested User Response',
          payload: { 
            topic, 
            firstName: 'Assistant',
            prompt: settings.moderatorPrompt
              .replace(/\{\{topic\}\}/g, topic)
              .replace(/\{\{userName\}\}/g, settings.userName || 'You')
              .replace(/\{\{history\}\}/g, formatHistory(messages))
          },
          response: { ...data, ...cleanedSuggested },
          model: settings.model
        }, modLogId);

        setState(prev => ({ ...prev, autoResponse: cleanedSuggested.userResponse, isGenerating: false, status: 'waiting_for_user' }));
      } catch (error: any) {
        if (signal?.aborted) return;
        addDebugLog({
          type: 'error',
          endpoint: 'Suggested User Response',
          payload: error.message,
        }, modLogId);
        setState(prev => ({ ...prev, isGenerating: false, status: 'waiting_for_user' }));
      }
    } else {
      if (signal?.aborted) return;
      setState(prev => ({ ...prev, isGenerating: false, status: 'waiting_for_user' }));
    }
    } finally {
      roundInProgressRef.current = false;
    }
  };

  const sendMessage = async (content: string) => {
    const signal = getNewAbortSignal();
    const userMessage: Message = {
      id: Math.random().toString(36).substring(7),
      role: 'user',
      content,
      senderName: state.settings.userName || 'You',
      timestamp: Date.now(),
    };

    if (state.status === 'idle') {
      const order = [...state.panelists].sort(() => Math.random() - 0.5).map(p => p.id);
      
      const { mentions } = findMentions(content, state.panelists, state.settings.userName);
      let newMentionStack: string[] = [];
      if (state.settings.responseMode !== 'random' && mentions.length > 0) {
        newMentionStack = mentions;
      }

      await new Promise<void>(resolve => {
        setState(prev => {
          resolve();
          return { 
            ...prev, 
            messages: [userMessage], 
            displayMessages: [userMessage],
            error: null,
            roundOrder: order,
            alreadySpoken: [],
            mentionStack: newMentionStack,
            consecutiveAgentCount: 0
          };
        });
      });
      if (signal.aborted) return;
      await startDiscussion(content, userMessage, signal);
    } else {
      // Clear auto response when user sends a message
      const isSkip = !content.trim();
      const updatedMessages = isSkip ? state.messages : [...state.messages, userMessage];
      const updatedDisplay = isSkip ? state.displayMessages : [...state.displayMessages, userMessage];
      const order = [...state.panelists].sort(() => Math.random() - 0.5).map(p => p.id);
      
      const { mentions } = findMentions(content, state.panelists, state.settings.userName);
      let newMentionStack: string[] = [];
      if (state.settings.responseMode !== 'random' && mentions.length > 0) {
        newMentionStack = mentions;
      }

      await new Promise<void>(resolve => {
        setState(prev => {
          resolve();
          return { 
            ...prev, 
            messages: updatedMessages, 
            displayMessages: updatedDisplay, 
            autoResponse: null,
            error: null,
            roundOrder: order,
            alreadySpoken: [],
            mentionStack: newMentionStack,
            consecutiveAgentCount: 0
          };
        });
      });
      if (signal.aborted) return;
      await runDiscussionRound(state.topic, state.panelists, updatedMessages, undefined, updatedDisplay, signal, isSkip);
    }
  };

  const clearAutoResponse = useCallback(() => {
    setState(prev => ({ ...prev, autoResponse: null }));
  }, []);

  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }));
  }, []);

  const saveSettingsToCloud = useCallback(async (settingsToSave: Settings) => {
    try {
      const res = await fetch(`${import.meta.env.BASE_URL}api/settings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settingsToSave)
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(`Failed to save settings: ${res.status} ${text}`);
      }
      return true;
    } catch (err: any) {
      console.error('Error saving settings:', err);
      setState(prev => ({ ...prev, error: `Cloudflare Save Error: ${err.message}` }));
      return false;
    }
  }, []);

  const fetchSettingsFromCloud = useCallback(async () => {
    try {
      const res = await fetch(`${import.meta.env.BASE_URL}api/settings`);
      if (res.ok) {
        const cloudSettings = await res.json();
        if (cloudSettings && typeof cloudSettings === 'object' && Object.keys(cloudSettings).length > 0) {
          setState(prev => ({
            ...prev,
            settings: { ...prev.settings, ...cloudSettings }
          }));
          return cloudSettings;
        }
      } else {
        const text = await res.text();
        console.warn('Cloudflare fetch settings non-ok:', res.status, text);
      }
    } catch (err) {
      console.error('Error fetching settings from Cloudflare:', err);
    }
    return null;
  }, []);

  // Fetch settings from Cloudflare on mount
  useEffect(() => {
    fetchSettingsFromCloud();
  }, [fetchSettingsFromCloud]);

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
    clearError,
    saveSettingsToCloud,
    fetchSettingsFromCloud
  };
};
