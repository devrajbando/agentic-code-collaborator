// packages/types/src/schemas/__tests__/agentJob.test.ts
import { describe, it, expect } from "vitest";
import { AgentJobDataSchema } from "../agentJob.js";

describe("AgentJobDataSchema", () => {
  it("accepts a well-formed job", () => {
    const result = AgentJobDataSchema.safeParse({
      sessionId: "proj-1",
      userEvent: "add docs",
      currentFileContent: "const x = 1;",
    });
    expect(result.success).toBe(true);
  });

  it("rejects missing sessionId", () => {
    const result = AgentJobDataSchema.safeParse({
      userEvent: "add docs",
      currentFileContent: "const x = 1;",
    });
    expect(result.success).toBe(false);
  });

  it("rejects non-string currentFileContent", () => {
    const result = AgentJobDataSchema.safeParse({
      sessionId: "proj-1",
      userEvent: "add docs",
      currentFileContent: 12345,
    });
    expect(result.success).toBe(false);
  });
});