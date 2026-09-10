import { traceable } from "langsmith/traceable";
import type { LLMProviderAdapter, LLMCallOptions, LLMCallResult } from "./types";

const HEALTH_TTL_MS = 30_000;
const DEFAULT_TIMEOUT_MS = 20_000;
interface ProviderHealth {
  healthy: boolean;
  unhealthyUntil: number;
}

const healthState = new Map<string, ProviderHealth>();

// Traced as its own span so LangSmith shows exactly when/why a provider
// flipped state, nested under whichever callWithFallback run triggered it.
const logHealthFlip = traceable(
  async (providerName: string, event: "unhealthy" | "recovered", cooldownMs?: number) => {
    return { providerName, event, cooldownMs: cooldownMs ?? null };
  },
  { name: "provider_health_flip", run_type: "tool" },
);

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
    void logHealthFlip(providerName, "recovered");
  }
  return existing;
}

function markUnhealthy(providerName: string, cooldownMs = HEALTH_TTL_MS) {
  healthState.set(providerName, { healthy: false, unhealthyUntil: Date.now() + cooldownMs });
  void logHealthFlip(providerName, "unhealthy", cooldownMs);
}

function markHealthy(providerName: string) {
  const h = healthState.get(providerName);
  if (h && !h.healthy) {
    void logHealthFlip(providerName, "recovered");
  }
  if (h) {
    h.healthy = true;
    h.unhealthyUntil = 0;
  }
}

function raceTimeout<T>(promise: Promise<T>, timeoutMs: number, label: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`${label} exceeded backstop timeout of ${timeoutMs}ms`)), timeoutMs + 250);
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

// Wrapped in traceable: its return value (which already includes
// providerName + attemptedProviders) becomes visible in the LangSmith trace
// automatically -- no extra metadata plumbing needed for that part.
export const callWithFallback = traceable(
  async function callWithFallback(
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
        const result = await raceTimeout(provider.call({ ...options, timeoutMs }), timeoutMs, provider.name);

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
  },
  { name: "callWithFallback", run_type: "chain" },
);

export function buildFastChain(groq: LLMProviderAdapter, gemini: LLMProviderAdapter, openrouter: LLMProviderAdapter): LLMProviderAdapter[] {
  return [groq, gemini, openrouter];
}

export function buildQualityChain(groq: LLMProviderAdapter, gemini: LLMProviderAdapter, openrouter: LLMProviderAdapter): LLMProviderAdapter[] {
  return [gemini, openrouter, groq];
}