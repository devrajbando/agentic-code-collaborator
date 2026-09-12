import { Router } from "express";
import passport from "passport";
import jwt from "jsonwebtoken";

const router = Router();

router.get(
  "/google",
  passport.authenticate("google", { scope: ["profile", "email"], session: false })
);

router.get(
  "/google/callback",
  passport.authenticate("google", { session: false, failureRedirect: "/login-failed" }),
  (req, res) => {
    const user = req.user as { id: string; email: string };

    const token = jwt.sign(
      { userId: user.id, email: user.email },
      process.env.JWT_SECRET!,
      { expiresIn: "7d" }
    );

    res.cookie("token", token, { // or whatever your cookie name is (e.g. "auth_token", "jwt")
  httpOnly: true,
  secure: true,              // Mandatory: cross-site cookies require HTTPS
  sameSite: "none",          // Mandatory: allows .vercel.app to send cookies to .onrender.com
  maxAge: 7 * 24 * 60 * 60 * 1000, // or your desired duration
});

    res.redirect(`${process.env.FRONTEND_URL}`); // your Vite dev server
  }
);

// GitHub — mirrors the Google block above exactly, same session:false +
// cookie + redirect pattern, so a person ends up in the same signed-in
// state regardless of which provider they used.
router.get(
  "/github",
  passport.authenticate("github", { scope: ["user:email"], session: false })
);

router.get(
  "/github/callback",
  passport.authenticate("github", { session: false, failureRedirect: "/login-failed" }),
  (req, res) => {
    const user = req.user as { id: string; email: string };

    const token = jwt.sign(
      { userId: user.id, email: user.email },
      process.env.JWT_SECRET!,
      { expiresIn: "7d" }
    );

   res.cookie("token", token, { // or whatever your cookie name is (e.g. "auth_token", "jwt")
  httpOnly: true,
  secure: true,              // Mandatory: cross-site cookies require HTTPS
  sameSite: "none",          // Mandatory: allows .vercel.app to send cookies to .onrender.com
  maxAge: 7 * 24 * 60 * 60 * 1000, // or your desired duration
});

    res.redirect(`${process.env.FRONTEND_URL}`); // your Vite dev server
  }
);

router.post("/logout", (_req, res) => {
  res.clearCookie("token", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
  });
  res.status(200).json({ message: "logged out" });
});

export default router;