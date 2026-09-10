-- CreateTable
CREATE TABLE "suggestion_outcomes" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "agentType" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "accepted" BOOLEAN NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "suggestion_outcomes_pkey" PRIMARY KEY ("id")
);
