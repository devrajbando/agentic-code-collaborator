import "dotenv/config";
import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import passport from "./config/passport.js";
import authRoutes from "./routes/auth.js";
import { requireAuth, AuthedRequest } from "./middleware/requireAuth.js";

const app = express();

app.use(cors({ origin: "http://localhost:5173", credentials: true }));
app.use(cookieParser());
app.use(express.json());
app.use(passport.initialize());

app.use("/auth", authRoutes);

// Example protected route to confirm auth works end-to-end
app.get("/me", requireAuth, (req: AuthedRequest, res) => {
  res.json({ userId: req.userId });
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});