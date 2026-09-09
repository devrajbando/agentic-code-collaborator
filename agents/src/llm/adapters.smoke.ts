// agents/src/llm/adapters.smoke.ts
import { createGroqProvider } from "./providers/groq.js";
import { createGeminiProvider } from "./providers/gemini.js";
import { createOpenRouterProvider } from "./providers/openrouter.js";

type FetchArgs = Parameters<typeof fetch>;
let mockResponse: { ok: boolean; status?: number; json: () => Promise<any>; text: () => Promise<string> };

// Replace global fetch for the duration of this script; restored at the end.
const originalFetch = global.fetch;
global.fetch = (async (..._args: FetchArgs) => mockResponse as unknown as Response) as typeof fetch;

async function expectThrows(label: string, fn: () => Promise<unknown>) {
  try {
    const result = await fn();
    console.error(`[FAIL] ${label} — expected throw, got resolved value:`, result);
  } catch (err) {
    console.log(`[PASS] ${label} — threw as expected:`, err instanceof Error ? err.message : err);
  }
}

async function expectResolves(label: string, fn: () => Promise<unknown>) {
  try {
    const result = await fn();
    console.log(`[PASS] ${label} — resolved as expected:`, result);
  } catch (err) {
    console.error(`[FAIL] ${label} — expected resolve, threw instead:`, err instanceof Error ? err.message : err);
  }
}

async function main() {
  const groq = createGroqProvider();
  const gemini = createGeminiProvider();
  const openrouter = createOpenRouterProvider();
  const callOpts = { userPrompt: "test", timeoutMs: 2000 };

  // --- Groq ---
  mockResponse = { ok: false, status: 429, json: async () => ({}), text: async () => "rate limited" };
  await expectThrows("groq: 429 rate limit", () => groq.call(callOpts));

  mockResponse = { ok: true, json: async () => ({ choices: [{ message: { content: "" } }] }), text: async () => "" };
  await expectThrows("groq: 200 but empty content", () => groq.call(callOpts));

  mockResponse = { ok: true, json: async () => ({ choices: [] }), text: async () => "" };
  await expectThrows("groq: 200 but no choices array", () => groq.call(callOpts));

  mockResponse = { ok: true, json: async () => ({ choices: [{ message: { content: "real answer" } }] }), text: async () => "" };
  await expectResolves("groq: normal success", () => groq.call(callOpts));

  // --- OpenRouter (same response shape as Groq) ---
  mockResponse = { ok: true, json: async () => ({ choices: [{ message: { content: "" } }] }), text: async () => "" };
  await expectThrows("openrouter: 200 but empty content", () => openrouter.call(callOpts));

  mockResponse = { ok: true, json: async () => ({ choices: [{ message: { content: "real answer" } }] }), text: async () => "" };
  await expectResolves("openrouter: normal success", () => openrouter.call(callOpts));

  // --- Gemini (different response shape) ---
  mockResponse = { ok: true, json: async () => ({ candidates: [] }), text: async () => "" };
  await expectThrows("gemini: 200 but no candidates", () => gemini.call(callOpts));

  mockResponse = {
    ok: true,
    json: async () => ({ candidates: [{ finishReason: "SAFETY" }] }),
    text: async () => "",
  };
  await expectThrows("gemini: safety-blocked candidate", () => gemini.call(callOpts));

  mockResponse = {
    ok: true,
    json: async () => ({ candidates: [{ finishReason: "STOP", content: { parts: [{ text: "" }] } }] }),
    text: async () => "",
  };
  await expectThrows("gemini: STOP but empty text part", () => gemini.call(callOpts));

  mockResponse = {
    ok: true,
    json: async () => ({
      candidates: [{ finishReason: "STOP", content: { parts: [{ text: "real answer" }] } }],
    }),
    text: async () => "",
  };
  await expectResolves("gemini: normal success", () => gemini.call(callOpts));

  global.fetch = originalFetch;
  console.log("\nAll adapter smoke test cases completed.");
}

main().catch((err) => {
  global.fetch = originalFetch;
  console.error("Adapter smoke test crashed:", err);
  process.exit(1);
});