export interface LLMCallOptions {
  systemPrompt?: string;
  userPrompt: string;
  timeoutMs?: number;
}

export interface LLMCallResult {
  content: string;
  provider: string;
  model: string;
  latencyMs: number;
}

export interface LLMProviderAdapter {
  name: string;
  model: string;
  call(options: LLMCallOptions): Promise<LLMCallResult>;
}