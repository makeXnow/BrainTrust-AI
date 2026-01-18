export interface Panelist {
  id: string;
  firstName: string;
  shortDescription: string; // The short title/job
  fullPersonality: string; // Detailed background
  physicalDescription: string; // What they look like for image gen
  communicationStyle: string; // e.g. "Blunt and short (Max 15 words)", "Verbose and academic (3-4 sentences)"
  introMessage: string; // 2-sentence intro
  avatarUrl?: string;
  color?: string; // Tailwind color class like "bg-emerald-50"
}

export type MessageRole = 'user' | 'agent' | 'moderator' | 'system';

export interface Message {
  id: string;
  role: MessageRole;
  content: string; // The summary/short response shown in chat
  thoughts?: string; // Long thoughts shown in debug panel
  senderName?: string;
  senderTitle?: string;
  communicationStyle?: string; // e.g. "Punchy and direct"
  panelistId?: string;
  color?: string; // Override color for this message
  avatarUrl?: string; // Avatar for this message
  timestamp: number;
  isThinking?: boolean;
}

export interface DebugLog {
  id: string;
  timestamp: number;
  type: 'request' | 'response' | 'error';
  endpoint: string;
  payload: any;
  response?: any;
  model?: string;
  duration?: number;
  cost?: number;
}

export type ResponseMode = 'random' | 'mentions' | 'moderator';

export interface CommunicationStyle {
  id: string;
  name: string;
  description: string;
  wordMin: number;
  wordMax: number;
  intro: string;
}

export interface Settings {
  openAiKey?: string;
  model: string;
  imageModel: string;
  agentCount: number;
  responsePrompt: string;
  moderatorPrompt: string;
  moderatorSelectionPrompt: string;
  imagePrompt: string;
  suggestionPrompts: string;
  userName?: string;
  quickPanelistsPrompt?: string;
  panelistDetailsPrompt?: string;
  responseMode: ResponseMode;
  responseModeEnabled?: boolean; // Keep for migration
  interferenceNumber: number;
  interferencePrompt: string;
  enableSuggestedResponse: boolean;
  bannedSpeechEnabled: boolean;
  bannedSpeechList: string;
  bannedSpeechPrompt: string;
  bannedSpeechModel: string;
  communicationStyles: CommunicationStyle[];
}

export interface ModeratorDecision {
  reasoning: Record<string, string>;
  chosen: string;
}

export interface ChatState {
  topic: string;
  messages: Message[];
  displayMessages: Message[];
  panelists: Panelist[];
  isGenerating: boolean;
  status: 'idle' | 'generating_panelists' | 'introductions' | 'discussion' | 'generating_auto_response' | 'waiting_for_user';
  debugLogs: DebugLog[];
  showDebug: boolean;
  settings: Settings;
  autoResponse: string | null; // User auto response ready to be loaded into input
  mentionStack: string[];
  roundOrder: string[];
  alreadySpoken: string[];
  consecutiveAgentCount: number;
  lastModeratorDecision?: ModeratorDecision;
}
