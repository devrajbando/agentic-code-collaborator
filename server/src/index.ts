import "dotenv/config";
import express from "express";
import { createServer } from "http";
import cookieParser from "cookie-parser";
import cors from "cors";
import passport from "./config/passport.js";
import authRoutes from "./routes/auth.js";
import { requireAuth, AuthedRequest } from "./middleware/requireAuth.js";
import { initSocket } from "./lib/socket.js";

const app = express();
const httpServer = createServer(app);

app.use(cors({ origin: "http://localhost:5173", credentials: true }));
app.use(cookieParser());
app.use(express.json());
app.use(passport.initialize());

app.use("/auth", authRoutes);

app.get("/me", requireAuth, (req: AuthedRequest, res) => {
  res.json({ userId: req.userId });
});

initSocket(httpServer);

const PORT = process.env.PORT || 4000;
httpServer.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});