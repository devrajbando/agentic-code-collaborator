CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE "accepted_snippets" (
    "id" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "language" TEXT NOT NULL DEFAULT 'typescript',
    "embedding" vector(768),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "accepted_snippets_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "accepted_snippets_embedding_idx" ON "accepted_snippets" USING hnsw ("embedding" vector_cosine_ops);