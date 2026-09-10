import { Router } from "express";
import { requireAuth, type AuthedRequest } from "../middleware/requireAuth.js";
import { prisma } from "../lib/prisma.js";
import { enqueueSnippetAcceptance } from "../queue/snippetAcceptanceQueue.js";

const router = Router();

router.post("/", requireAuth, async (req: AuthedRequest, res) => {
  const { sessionId, agentType, content, accepted, description } = req.body as {
    sessionId: string;
    agentType: string;
    content: string;
    accepted: boolean;
    description?: string;
  };

  if (!sessionId || !agentType || typeof content !== "string" || typeof accepted !== "boolean") {
    return res.status(400).json({ error: "Missing or invalid required fields" });
  }

  await prisma.suggestionOutcome.create({
    data: { sessionId, agentType, content, accepted },
  });

  if (agentType === "snippet_gen" && accepted) {
    // TODO: no real source for `description` yet -- there's no frontend to
    // supply one (Roadmap item 13). Required and unfaked deliberately: a
    // caller must pass something real, or this branch fails loudly rather
    // than embedding a fallback derived from `content` that would degrade
    // retrieval quality silently once real callers exist.
    if (!description) {
      return res.status(400).json({ error: "description is required for snippet_gen acceptances" });
    }
    await enqueueSnippetAcceptance({ content, description });
  }

  res.status(201).json({ message: "logged" });
});

export default router;