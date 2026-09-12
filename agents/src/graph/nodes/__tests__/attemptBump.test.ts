import { describe, it, expect } from "vitest";
import { attemptBumpNode } from "../attemptBump.js";

describe("attemptBumpNode", () => {
  it("increments the attempt number by exactly one", async () => {
    const result = await attemptBumpNode({
      attemptNumber: 1,
    } as any);

    expect(result.attemptNumber).toBe(2);
  });

  it("increments attempt 2 to attempt 3", async () => {
    const result = await attemptBumpNode({
      attemptNumber: 2,
    } as any);

    expect(result.attemptNumber).toBe(3);
  });
});