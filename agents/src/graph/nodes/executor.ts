import type { GraphStateType } from "../state.js";
import type { ExecutorResult } from "@rcc/types";

export async function executorNode(state: GraphStateType): Promise<Partial<GraphStateType>> {
  console.log("[executor] running snippet in sandbox (placeholder — no real Piston call yet)");

  const result: ExecutorResult = {
    stdout: "",
    stderr: "",
    exitCode: 0,
    durationMs: 0,
  };

  return { executorResult: result };
}