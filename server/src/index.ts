import "dotenv/config";
import express from "express";
import { createServer } from "http";
import cookieParser from "cookie-parser";
import cors from "cors";
import passport from "./config/passport.js";
import authRoutes from "./routes/auth.js";
import projectRoutes from "./routes/projects";
import { requireAuth, AuthedRequest } from "./middleware/requireAuth.js";
import { initSocket } from "./lib/socket.js";
import { initAgentSubscriber } from "./lib/agentSubscriber.js"; // <-- Add this import
import { prisma } from "./lib/prisma.js";
import suggestionOutcomesRoutes from "./routes/suggestionOutcomes.js";
const app = express();
const httpServer = createServer(app);

app.use(cors({ origin: "http://localhost:5173", credentials: true }));
app.use(cookieParser());
app.use(express.json());
app.use(passport.initialize());

app.use("/auth", authRoutes);
app.use("/api/projects", projectRoutes);
app.use("/api/suggestions", suggestionOutcomesRoutes);
// Changed: previously returned only { userId } — decoded straight from
// the JWT payload, no DB lookup. CurrentUserContext.tsx (frontend, added
// this session) needs the person's name/email too (for awareness cursor
// labels and the account avatar), so this now fetches the real User row.
// requireAuth already verified the token before this runs, so a missing
// row here would mean the user was deleted after the token was issued —
// treated as "not authenticated" rather than a 500.
app.get("/me", requireAuth, async (req: AuthedRequest, res) => {
  const user = await prisma.user.findUnique({ where: { id: req.userId } });
  if (!user) return res.status(401).json({ error: "User not found" });
  // schema.prisma has `name String?` (nullable) — falls back to email so
  // CurrentUserContext/AppNavbar's initialsFromName(user.name) never
  // receives null and throws.
  res.json({ id: user.id, email: user.email, name: user.name ?? user.email });
});
const io = initSocket(httpServer);
initAgentSubscriber(io);

const PORT = process.env.PORT || 4000;
httpServer.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});