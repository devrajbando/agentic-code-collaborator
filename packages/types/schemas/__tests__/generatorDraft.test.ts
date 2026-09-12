import { describe, it, expect } from "vitest";
import { GeneratorDraftSchema } from "../generator.js";

describe("GeneratorDraftSchema", () => {
  it("accepts a well-formed generator draft", () => {
    const result = GeneratorDraftSchema.safeParse({
      agentType: "doc_gen",
      content: "This function returns the sum of two numbers.",
      toolsUsed: ["ts-compiler-api"],
      attemptNumber: 1,
    });
    expect(result.success).toBe(true);
  });

  it("rejects missing attemptNumber", () => {
    const result = GeneratorDraftSchema.safeParse({
      agentType: "doc_gen",
      content: "Generated documentation",
      toolsUsed: [],
    });
    expect(result.success).toBe(false);
  });

  it("rejects an attemptNumber outside the 1 to 3 range", () => {
    const result = GeneratorDraftSchema.safeParse({
      agentType: "doc_gen",
      content: "Generated documentation",
      toolsUsed: [],
      attemptNumber: 4,
    });
    expect(result.success).toBe(false);
  });
});