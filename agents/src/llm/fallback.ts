// agents/src/llm/fallback.ts
import type { LLMProviderAdapter, LLMCallOptions, LLMCallResult } from "./types";

const HEALTH_TTL_MS = 30_000;
const DEFAULT_TIMEOUT_MS = 4_000;

interface ProviderHealth {
  healthy: boolean;
  unhealthyUntil: number;
}

const healthState = new Map<string, ProviderHealth>();

function getHealth(providerName: string): ProviderHealth {
  const existing = healthState.get(providerName);
  if (!existing) {
    const fresh = { healthy: true, unhealthyUntil: 0 };
    healthState.set(providerName, fresh);
    return fresh;
  }
  if (!existing.healthy && Date.now() >= existing.unhealthyUntil) {
    existing.healthy = true;
    existing.unhealthyUntil = 0;
  }
  return existing;
}

function markUnhealthy(providerName: string, cooldownMs = HEALTH_TTL_MS) {
  healthState.set(providerName, {
    healthy: false,
    unhealthyUntil: Date.now() + cooldownMs,
  });
}

function markHealthy(providerName: string) {
  const h = healthState.get(providerName);
  if (h) {
    h.healthy = true;
    h.unhealthyUntil = 0;
  }
}

function raceTimeout<T>(promise: Promise<T>, timeoutMs: number, label: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error(`${label} exceeded backstop timeout of ${timeoutMs}ms`)),
      timeoutMs + 250,
    );
    promise.then(
      (value) => { clearTimeout(timer); resolve(value); },
      (err) => { clearTimeout(timer); reject(err); },
    );
  });
}

export interface FallbackCallOptions extends Omit<LLMCallOptions, "timeoutMs"> {
  timeoutMs?: number;
}

export interface FallbackResult {
  result: LLMCallResult;
  providerName: string;
  attemptedProviders: string[];
}

export async function callWithFallback(
  chain: LLMProviderAdapter[],
  options: FallbackCallOptions,
): Promise<FallbackResult> {
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const attempted: string[] = [];
  let lastError: unknown;

  for (const provider of chain) {
    const health = getHealth(provider.name);
    if (!health.healthy) continue;

    attempted.push(provider.name);
    try {
      const result = await raceTimeout(
        provider.call({ ...options, timeoutMs }),
        timeoutMs,
        provider.name,
      );

      // Guardrail: a resolved promise with empty content is treated as a
      // failure too, in case an adapter's own throw-discipline ever slips.
      if (!result.content || result.content.trim().length === 0) {
        throw new Error(`${provider.name} resolved with empty content`);
      }

      markHealthy(provider.name);
      return { result, providerName: provider.name, attemptedProviders: attempted };
    } catch (err) {
      lastError = err;
      markUnhealthy(provider.name);
    }
  }

  throw new Error(
    `callWithFallback: all providers exhausted (${attempted.join(", ") || "none healthy"}). ` +
      `Last error: ${lastError instanceof Error ? lastError.message : String(lastError)}`,
  );
}

export function buildFastChain(
  groq: LLMProviderAdapter,
  gemini: LLMProviderAdapter,
  openrouter: LLMProviderAdapter,
): LLMProviderAdapter[] {
  return [groq, gemini, openrouter];
}

export function buildQualityChain(
  groq: LLMProviderAdapter,
  gemini: LLMProviderAdapter,
  openrouter: LLMProviderAdapter,
): LLMProviderAdapter[] {
  return [gemini, openrouter, groq];
}