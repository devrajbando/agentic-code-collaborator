
import type { LLMProviderAdapter, LLMCallOptions, LLMCallResult } from "../types.js";

export function createOpenRouterProvider(): LLMProviderAdapter {
  const model = "nvidia/nemotron-3-super:free"; // swap here if this model gets deprecated

  return {
    name: "openrouter",
    model,
    async call({ systemPrompt, userPrompt, timeoutMs = 5000 }: LLMCallOptions): Promise<LLMCallResult> {
      const start = Date.now();
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), timeoutMs);

      try {
        const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
          },
          body: JSON.stringify({
            model,
            messages: [
              ...(systemPrompt ? [{ role: "system", content: systemPrompt }] : []),
              { role: "user", content: userPrompt },
            ],
          }),
          signal: controller.signal,
        });

        // openrouter.ts — same fix, same shape
        if (!res.ok) throw new Error(`OpenRouter error ${res.status}: ${await res.text()}`);

        const data = await res.json();
        const content = data.choices?.[0]?.message?.content;
        if (!content || typeof content !== "string" || content.trim().length === 0) {
        throw new Error(`OpenRouter returned no usable content: ${JSON.stringify(data).slice(0, 500)}`);
        }

        return {
        content,
        provider: "openrouter",
        model,
        latencyMs: Date.now() - start,
        };
      } finally {
        clearTimeout(timeout);
      }
    },
  };
}