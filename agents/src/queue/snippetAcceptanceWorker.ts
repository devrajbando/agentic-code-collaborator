import { Worker, Job } from "bullmq";
import { getRedisConnection } from "./connection.js";
import { SNIPPET_ACCEPTANCE_QUEUE_NAME, type SnippetAcceptanceJobData } from "@rcc/types";
import { embedText } from "../llm/embeddings.js";
import { prisma } from "../db/client.js";

export function startSnippetAcceptanceWorker() {
  return new Worker<SnippetAcceptanceJobData>(
    SNIPPET_ACCEPTANCE_QUEUE_NAME,
    async (job: Job<SnippetAcceptanceJobData>) => {
      const { content, description } = job.data;
      const embedding = await embedText(description);
      const vectorLiteral = `[${embedding.join(",")}]`;

      await prisma.$executeRaw`
        INSERT INTO accepted_snippets (id, description, code, language, embedding, "createdAt")
        VALUES (gen_random_uuid()::text, ${description}, ${content}, 'typescript', ${vectorLiteral}::vector, now())
      `;
    },
    { connection: getRedisConnection() },
  );
}