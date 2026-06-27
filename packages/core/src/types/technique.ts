export interface TechniqueLogEntry {
  generatedAt: string;
  agent: string;
  elapsedMs: number;
  model: string;
  usage?: {
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
    reasoningTokens?: number;
  };
}

export interface Technique {
  id: string;
  title: string;
  summary: string;
  fishIds: string[];
  regionIds: string[];
  log?: TechniqueLogEntry[];
  version: string;
}
