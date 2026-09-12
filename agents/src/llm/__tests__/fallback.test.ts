// agents/src/llm/__tests__/fallback.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import { callWithFallback } from "../fallback.js";
import type { LLMProviderAdapter } from "../types.js";

function mockAdapter(name: string, impl: () => Promise<{ content: string; provider: string; model: string; latencyMs: number }>): LLMProviderAdapter {
  return { name, model: "test-model", call: vi.fn(impl) };
}

describe("callWithFallback", () => {
  it("returns the first healthy provider's result without touching the rest", async () => {
    const groq = mockAdapter("groq", async () => ({ content: "hi", provider: "groq", model: "m", latencyMs: 1 }));
    const gemini = mockAdapter("gemini", async () => ({ content: "unused", provider: "gemini", model: "m", latencyMs: 1 }));

    const { result, providerName, attemptedProviders } = await callWithFallback([groq, gemini], {
      userPrompt: "hi",
    });

    expect(providerName).toBe("groq");
    expect(result.content).toBe("hi");
    expect(attemptedProviders).toEqual(["groq"]);
    expect(gemini.call).not.toHaveBeenCalled();
  });

  it("falls through to the next provider on a thrown error", async () => {
    const groq = mockAdapter("groq", async () => { throw new Error("Groq error 404: model_not_found"); });
    const gemini = mockAdapter("gemini", async () => ({ content: "fallback worked", provider: "gemini", model: "m", latencyMs: 1 }));

    const { result, providerName } = await callWithFallback([groq, gemini], { userPrompt: "hi" });

    expect(providerName).toBe("gemini");
    expect(result.content).toBe("fallback worked");
  });

  it("treats empty content as a failure and falls through (regression: silent-success guardrail)", async () => {
    const groq = mockAdapter("groq", async () => ({ content: "   ", provider: "groq", model: "m", latencyMs: 1 }));
    const gemini = mockAdapter("gemini", async () => ({ content: "real content", provider: "gemini", model: "m", latencyMs: 1 }));

    const { providerName } = await callWithFallback([groq, gemini], { userPrompt: "hi" });
    expect(providerName).toBe("gemini");
  });

  it("skips a provider marked unhealthy without re-attempting it", async () => {
    const flaky = mockAdapter("flaky", async () => { throw new Error("down"); });
    const backup = mockAdapter("backup", async () => ({ content: "ok", provider: "backup", model: "m", latencyMs: 1 }));

    await callWithFallback([flaky, backup], { userPrompt: "1st call marks flaky unhealthy" });
    vi.clearAllMocks();

    // Second call within the health TTL should skip `flaky` entirely.
    const { attemptedProviders } = await callWithFallback([flaky, backup], { userPrompt: "2nd call" });
    expect(attemptedProviders).not.toContain("flaky");
    expect(flaky.call).not.toHaveBeenCalled();
  });

  it("throws a clear error when every provider is exhausted", async () => {
    const a = mockAdapter("a", async () => { throw new Error("a down"); });
    const b = mockAdapter("b", async () => { throw new Error("b down"); });

    await expect(callWithFallback([a, b], { userPrompt: "hi" })).rejects.toThrow(/all providers exhausted/);
  });
});