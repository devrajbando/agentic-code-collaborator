import type { LLMProviderAdapter, LLMCallOptions, LLMCallResult } from "../types.js";

export function createGroqProvider(): LLMProviderAdapter {
  const model = "llama-3.3-70b-versatile";

  return {
    name: "groq",
    model,
    async call({ systemPrompt, userPrompt, timeoutMs = 5000 }: LLMCallOptions): Promise<LLMCallResult> {
      const start = Date.now();
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), timeoutMs);

      try {
        const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
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

       if (!res.ok) throw new Error(`Groq error ${res.status}: ${await res.text()}`);

        const data = await res.json();
        const content = data.choices?.[0]?.message?.content;
        if (!content || typeof content !== "string" || content.trim().length === 0) {
        throw new Error(`Groq returned no usable content: ${JSON.stringify(data).slice(0, 500)}`);
        }

        return {
        content,
        provider: "groq",
        model,
        latencyMs: Date.now() - start,
        };
      } finally {
        clearTimeout(timeout);
      }
    },
  };
}