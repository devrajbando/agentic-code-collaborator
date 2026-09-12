// agents/src/llm/providers/__tests__/groq.test.ts
import { describe, it, expect, vi } from "vitest";
import { createGroqProvider } from "../providers/groq";

describe("groq adapter", () => {
  it("throws with the response body on a non-ok status (e.g. dead/gated model)", async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: false,
      status: 404,
      text: async () => JSON.stringify({ error: { message: "model_not_found" } }),
    });

    const groq = createGroqProvider();
    await expect(groq.call({ userPrompt: "hi", timeoutMs: 1000 })).rejects.toThrow(/Groq error 404/);
  });

  it("throws on empty content instead of resolving 'successfully'", async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ choices: [{ message: { content: "" } }] }),
    });

    const groq = createGroqProvider();
    await expect(groq.call({ userPrompt: "hi", timeoutMs: 1000 })).rejects.toThrow(/no usable content/);
  });

  it("resolves cleanly on a well-formed response", async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ choices: [{ message: { content: "hello" } }] }),
    });

    const groq = createGroqProvider();
    const result = await groq.call({ userPrompt: "hi", timeoutMs: 1000 });
    expect(result.content).toBe("hello");
    expect(result.provider).toBe("groq");
  });
});