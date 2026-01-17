export interface Panelist {
  id: string;
  firstName: string;
  description: string; // The short title/job
  shorthandName: string; // Friendly name like "Hank the Disney CEO"
  fullPersonality: string; // Detailed background
  communicationStyle: string; // e.g. "Blunt and short", "Verbose and academic"
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
  panelistId?: string;
  color?: string; // Override color for this message
  avatarUrl?: string; // Avatar for this message
  timestamp: number;
}

export interface DebugLog {
  id: string;
  timestamp: number;
  type: 'request' | 'response' | 'error';
  endpoint: string;
  payload: any;
  response?: any;
  model?: string;
}

export interface Settings {
  openAiKey?: string;
  model: string;
  imageModel: string;
  agentCount: number;
  theme: string;
  startingPrompt: string;
  responsePrompt: string;
  moderatorPrompt: string;
  imagePrompt: string;
  suggestionPrompts: string;
  userName?: string;
}

export interface ChatState {
  topic: string;
  messages: Message[];
  panelists: Panelist[];
  isGenerating: boolean;
  status: 'idle' | 'generating_panelists' | 'introductions' | 'discussion' | 'generating_auto_response' | 'waiting_for_user';
  debugLogs: DebugLog[];
  showDebug: boolean;
  settings: Settings;
  autoResponse: string | null; // User auto response ready to be loaded into input
}
