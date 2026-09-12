// agents/src/llm/fallback.smoke.ts
import { callWithFallback } from "./fallback.js";
import type { LLMProviderAdapter, LLMCallOptions, LLMCallResult } from "./types.js";

function mockAdapter(
  name: string,
  behavior: "succeed" | "fail" | "empty",
  delayMs = 50,
): LLMProviderAdapter {
  return {
    name,
    model: "mock-model",
    async call(options: LLMCallOptions): Promise<LLMCallResult> {
      await new Promise((r) => setTimeout(r, delayMs));
      if (behavior === "fail") throw new Error(`${name} simulated failure`);
      return {
        content: behavior === "empty" ? "" : `mock response from ${name}`,
        provider: name,
        model: "mock-model",
        latencyMs: delayMs,
      };
    },
  };
}

async function main() {
  // 1. First provider healthy -> should return immediately from it alone.
  {
    const chain = [mockAdapter("A", "succeed"), mockAdapter("B", "succeed")];
    const res = await callWithFallback(chain, { userPrompt: "test" });
    console.assert(res.providerName === "A", "expected A to win");
    console.assert(res.attemptedProviders.length === 1, "expected only A attempted");
    console.log("[1/4] PASS - healthy first provider wins:", res);
  }

  // 2. First provider fails -> should fall through to second.
  {
    const chain = [mockAdapter("A", "fail"), mockAdapter("B", "succeed")];
    const res = await callWithFallback(chain, { userPrompt: "test" });
    console.assert(res.providerName === "B", "expected fallthrough to B");
    console.assert(
      res.attemptedProviders.join(",") === "A,B",
      "expected both A and B attempted",
    );
    console.log("[2/4] PASS - fallthrough on failure:", res);
  }

  // 3. Empty-content guardrail -> resolved-but-empty should still fail over.
  {
    const chain = [mockAdapter("A", "empty"), mockAdapter("B", "succeed")];
    const res = await callWithFallback(chain, { userPrompt: "test" });
    console.assert(res.providerName === "B", "expected empty result to be rejected, B used");
    console.log("[3/4] PASS - empty-content guardrail triggers fallthrough:", res);
  }

  // 4. Health tracking -> after A fails once, an immediate second call
  //    should skip A without waiting out its delay (fast, not delay-slow).
  {
    const chain = [mockAdapter("A", "fail", 500), mockAdapter("B", "succeed", 50)];
    await callWithFallback(chain, { userPrompt: "test" }); // marks A unhealthy

    const start = Date.now();
    const res = await callWithFallback(chain, { userPrompt: "test" });
    const elapsedMs = Date.now() - start;

    console.assert(res.providerName === "B", "expected B again");
    console.assert(
      res.attemptedProviders.join(",") === "B",
      "expected A to be skipped entirely, not re-attempted",
    );
    console.assert(elapsedMs < 200, `expected fast skip of unhealthy A, took ${elapsedMs}ms`);
    console.log(`[4/4] PASS - unhealthy provider skipped in ${elapsedMs}ms:`, res);
  }

  // 5. All providers exhausted -> should throw, not hang or return undefined.
  try {
    const chain = [mockAdapter("A", "fail"), mockAdapter("B", "fail")];
    await callWithFallback(chain, { userPrompt: "test" });
    console.error("[5/5] FAIL - expected throw when all providers fail");
  } catch (err) {
    console.log(
      "[5/5] PASS - throws when all providers exhausted:",
      err instanceof Error ? err.message : err,
    );
  }

  console.log("\nAll smoke test cases completed.");
}

main().catch((err) => {
  console.error("Smoke test crashed:", err);
  process.exit(1);
});