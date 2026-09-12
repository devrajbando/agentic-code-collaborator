import { prisma } from "../db/client.js"
import { embedText } from "../llm/embeddings.js";

export interface RetrievedSnippet {
  id: string;
  description: string;
  code: string;
  language: string;
  distance: number; // cosine distance — lower is more similar
}

const TOP_K = 3;
const MAX_DISTANCE = 0.4; // empirical cutoff — beyond this, matches are noise, not genuinely relevant

export async function retrieveSimilarSnippets(query: string): Promise<RetrievedSnippet[]> {
  let queryEmbedding: number[];
  try {
    queryEmbedding = await embedText(query);
  } catch {
    return []; // graceful: treat embedding failure as "no relevant history," not a branch crash
  }

  const vectorLiteral = `[${queryEmbedding.join(",")}]`;

  const rows = await prisma.$queryRaw<RetrievedSnippet[]>`
    SELECT id, description, code, language, embedding <=> ${vectorLiteral}::vector AS distance
    FROM accepted_snippets
    ORDER BY embedding <=> ${vectorLiteral}::vector
    LIMIT ${TOP_K}
  `;

  return rows.filter((r) => r.distance <= MAX_DISTANCE);
}