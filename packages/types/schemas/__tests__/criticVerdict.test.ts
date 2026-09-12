import { describe, it, expect } from "vitest";
import { CriticVerdictSchema } from "../critic.js";

describe("CriticVerdictSchema", () => {
  it("accepts a well-formed critic verdict", () => {
    const result = CriticVerdictSchema.safeParse({
      agentType: "doc_gen",
      accepted: true,
      reason: "The generated documentation satisfies the requirements.",
      unmetRequirements: [],
    });
    expect(result.success).toBe(true);
  });

  it("rejects missing accepted", () => {
    const result = CriticVerdictSchema.safeParse({
      agentType: "doc_gen",
      reason: "test",
      unmetRequirements: [],
    });
    expect(result.success).toBe(false);
  });

  it("rejects a non-string reason", () => {
    const result = CriticVerdictSchema.safeParse({
      agentType: "doc_gen",
      accepted: true,
      reason: 12345,
      unmetRequirements: [],
    });
    expect(result.success).toBe(false);
  });
});