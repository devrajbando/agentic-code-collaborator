import type { LLMProviderAdapter, LLMCallOptions, LLMCallResult } from "../types.js";

export function createGeminiProvider(): LLMProviderAdapter {
  const model = "gemini-3.5-flash-lite";

  return {
    name: "gemini",
    model,
    async call({ systemPrompt, userPrompt, timeoutMs = 5000 }: LLMCallOptions): Promise<LLMCallResult> {
      const start = Date.now();
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), timeoutMs);

      try {
        const res = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${process.env.GEMINI_API_KEY}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [{ parts: [{ text: userPrompt }] }],
              ...(systemPrompt
                ? { systemInstruction: { parts: [{ text: systemPrompt }] } }
                : {}),
            }),
            signal: controller.signal,
          }
        );

        // gemini.ts — replace the response-handling block
        if (!res.ok) throw new Error(`Gemini error ${res.status}: ${await res.text()}`);

        const data = await res.json();
        const candidate = data.candidates?.[0];

        if (!candidate) {
        throw new Error(`Gemini returned no candidates: ${JSON.stringify(data).slice(0, 500)}`);
        }
        if (candidate.finishReason === "SAFETY" || candidate.finishReason === "RECITATION") {
        throw new Error(`Gemini blocked response, finishReason=${candidate.finishReason}`);
        }

        const content = candidate.content?.parts?.[0]?.text;
        if (!content || typeof content !== "string" || content.trim().length === 0) {
        throw new Error(
            `Gemini returned no usable text (finishReason=${candidate.finishReason}): ${JSON.stringify(data).slice(0, 500)}`,
        );
        }

        return {
        content,
        provider: "gemini",
        model,
        latencyMs: Date.now() - start,
        };
      } finally {
        clearTimeout(timeout);
      }
    },
  };
}