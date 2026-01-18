export interface VariableInfo {
  name: string;
  type: 'variable' | 'json';
}

export interface PromptMetadata {
  variables: string[];
  jsonFields: string[];
}

export const PROMPT_METADATA: Record<string, PromptMetadata> = {
  moderatorSelectionPrompt: {
    variables: ['userName', 'participantList', 'history'],
    jsonFields: ['reasoning', 'chosen'],
  },
  interferencePrompt: {
    variables: ['userName', 'participantList', 'history'],
    jsonFields: [],
  },
  bannedSpeechPrompt: {
    variables: ['response'],
    jsonFields: [],
  },
  quickPanelistsPrompt: {
    variables: ['topic', 'count', 'communicationStyles'],
    jsonFields: ['firstName', 'shortDescription', 'communicationStyle'],
  },
  panelistDetailsPrompt: {
    variables: ['topic', 'firstName', 'description', 'color', 'communicationStyle', 'fullCommunicationStyle', 'communicationStyleDescription', 'wordMin', 'wordMax', 'styleIntro'],
    jsonFields: ['fullPersonality', 'physicalDescription', 'introMessage'],
  },
  responsePrompt: {
    variables: ['firstName', 'description', 'fullPersonality', 'communicationStyle', 'fullCommunicationStyle', 'wordMin', 'wordMax', 'userName', 'topic', 'history'],
    jsonFields: ['thoughts', 'publicComment'],
  },
  moderatorPrompt: {
    variables: ['topic', 'history'],
    jsonFields: ['userResponse'],
  },
  imagePrompt: {
    variables: ['firstName', 'description', 'fullPersonality', 'physicalDescription', 'color'],
    jsonFields: [],
  },
  communicationStyleIntro: {
    variables: ['firstName'],
    jsonFields: [],
  },
};
