// packages/types/src/schemas/__tests__/spec.test.ts
import { describe, it, expect } from "vitest";
import { SpecObjectSchema } from "../spec.js";

describe("SpecObjectSchema", () => {
  it("accepts every real AgentType value, not just the three content agents", () => {
    // Regression guard for the exact bug logged in this project's decisions log:
    // an earlier draft used a wrong 3-value inline enum instead of the real
    // 8-value AgentTypeSchema.
    const types = [
      "router", "spec_extractor", "doc_gen", "error_check",
      "snippet_gen", "critic", "executor", "failure_triage",
    ];
    for (const agentType of types) {
      const result = SpecObjectSchema.safeParse({
        agentType,
        requirements: ["must handle null input"],
        derivedFrom: "userEvent",
        confidence: 0.8,
        reasoning: "test",
      });
      expect(result.success, `${agentType} should be valid`).toBe(true);
    }
  });

  it("rejects an empty requirements array", () => {
    const result = SpecObjectSchema.safeParse({
      agentType: "doc_gen",
      requirements: [],
      derivedFrom: "userEvent",
      confidence: 0.8,
      reasoning: "test",
    });
    expect(result.success).toBe(false);
  });
});