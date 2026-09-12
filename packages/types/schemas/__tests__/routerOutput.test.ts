import { describe, it, expect } from "vitest";
import { RouterOutputSchema } from "../router.js";

describe("RouterOutputSchema", () => {
  it("accepts a well-formed router output", () => {
    const result = RouterOutputSchema.safeParse({
      needsDocs: true,
      needsErrorCheck: false,
      needsSnippet: true,
      confidence: 0.8,
      reasoning: "The user requested documentation and a code snippet.",
    });
    expect(result.success).toBe(true);
  });

  it("rejects missing confidence", () => {
    const result = RouterOutputSchema.safeParse({
      needsDocs: true,
      needsErrorCheck: false,
      needsSnippet: true,
      reasoning: "test",
    });
    expect(result.success).toBe(false);
  });

  it("rejects confidence outside the 0 to 1 range", () => {
    const result = RouterOutputSchema.safeParse({
      needsDocs: true,
      needsErrorCheck: false,
      needsSnippet: true,
      confidence: 1.5,
      reasoning: "test",
    });
    expect(result.success).toBe(false);
  });
});