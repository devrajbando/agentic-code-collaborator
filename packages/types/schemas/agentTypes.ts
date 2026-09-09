import { z } from "zod";

export const AgentTypeSchema = z.enum([
  "router",
  "spec_extractor",
  "doc_gen",
  "error_check",
  "snippet_gen",
  "critic",
  "executor",
  "failure_triage",
]);
export type AgentType = z.infer<typeof AgentTypeSchema>;

export const LLMProviderSchema = z.enum(["groq", "gemini", "cerebras", "openrouter", "ollama"]);
export type LLMProvider = z.infer<typeof LLMProviderSchema>;