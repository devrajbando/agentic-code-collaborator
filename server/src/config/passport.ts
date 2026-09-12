import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { Strategy as GitHubStrategy, type Profile as GitHubProfile } from "passport-github2";
import { prisma } from "../lib/prisma.js";

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      callbackURL: "/auth/google/callback",
    },
    async (_accessToken, _refreshToken, profile, done) => {
      try {
        const email = profile.emails?.[0]?.value;
        if (!email) return done(new Error("No email from Google profile"));

        const user = await prisma.user.upsert({
          where: { googleId: profile.id },
          update: { email, name: profile.displayName },
          create: { googleId: profile.id, email, name: profile.displayName },
        });

        return done(null, user);
      } catch (err) {
        return done(err as Error);
      }
    }
  )
);

// GitHub — added alongside Google, deliberately NOT linked by email. A
// person signing in with GitHub using the same email as an existing
// Google account gets a separate User row, keyed on githubId rather than
// googleId. Auto-linking on a shared email is a real account-takeover
// surface (email isn't re-verified at login time), so this stays a pure
// addition with no assumption about how the two providers should
// reconcile — that's a future "connect an account" feature, not this.
//
// SCHEMA ASSUMPTION, STILL UNVERIFIED (schema.prisma not yet shared):
// requires `User.githubId String? @unique`. Also requires `googleId` to
// be nullable if it isn't already — a GitHub-only user has no Google id.
passport.use(
  new GitHubStrategy(
    {
      clientID: process.env.GITHUB_CLIENT_ID!,
      clientSecret: process.env.GITHUB_CLIENT_SECRET!,
      callbackURL: "/auth/github/callback",
      scope: ["user:email"],
    },
    async (_accessToken: string, _refreshToken: string, profile: GitHubProfile, done: (err: Error | null, user?: unknown) => void) => {
      try {
        // GitHub doesn't guarantee a public/verified email even with
        // user:email scope (depends on the user's own privacy settings) —
        // unlike Google above, which hard-rejects on a missing email,
        // this falls back to GitHub's noreply-email convention instead of
        // failing the login outright. Deliberate difference, not a bug.
        const email = profile.emails?.[0]?.value ?? `${profile.username}@users.noreply.github.com`;
        const name = profile.displayName || profile.username || "GitHub User";

        const user = await prisma.user.upsert({
          where: { githubId: profile.id },
          update: { email, name },
          create: { githubId: profile.id, email, name },
        });

        return done(null, user);
      } catch (err) {
        return done(err as Error);
      }
    }
  )
);

export default passport;