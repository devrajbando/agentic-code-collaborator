import { z } from "zod";

export const AGENT_QUEUE_NAME = "agent-pipeline";

export const AgentJobDataSchema = z.object({
  sessionId: z.string(),
  userEvent: z.string(),
  currentFileContent: z.string(),
});
export type AgentJobData = z.infer<typeof AgentJobDataSchema>;