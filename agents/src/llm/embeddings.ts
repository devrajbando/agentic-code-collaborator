import { GoogleGenAI } from "@google/genai";

const EMBEDDING_MODEL = "gemini-embedding-001"; // text-embedding-004 was fully deprecated Jan 2026
const EMBEDDING_DIMENSIONS = 768; // must match accepted_snippets.embedding vector(768)

let client: GoogleGenAI | null = null;
function getClient() {
  if (!client) client = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  return client;
}

export async function embedText(text: string): Promise<number[]> {
  const res = await getClient().models.embedContent({
    model: EMBEDDING_MODEL,
    contents: text,
    config: { outputDimensionality: EMBEDDING_DIMENSIONS },
  });
  const values = res.embeddings?.[0]?.values;
  if (!values || values.length !== EMBEDDING_DIMENSIONS) {
    throw new Error(`embedText: unexpected embedding shape from ${EMBEDDING_MODEL}`);
  }
  return values;
}