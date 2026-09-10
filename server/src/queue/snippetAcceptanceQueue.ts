import { Queue } from "bullmq";
import { Redis } from "ioredis";
import { SNIPPET_ACCEPTANCE_QUEUE_NAME, SnippetAcceptanceJobDataSchema, type SnippetAcceptanceJobData } from "@rcc/types";

const REDIS_URL = process.env.REDIS_URL ?? "redis://localhost:6379";
const connection = new Redis(REDIS_URL, { maxRetriesPerRequest: null });

export const snippetAcceptanceQueue = new Queue(SNIPPET_ACCEPTANCE_QUEUE_NAME, { connection });

export async function enqueueSnippetAcceptance(data: SnippetAcceptanceJobData) {
  const validated = SnippetAcceptanceJobDataSchema.parse(data);
  return snippetAcceptanceQueue.add(SNIPPET_ACCEPTANCE_QUEUE_NAME, validated);
}