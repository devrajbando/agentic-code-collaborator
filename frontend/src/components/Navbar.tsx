import { useState } from "react";
import { Link } from "react-router-dom";
import { useCurrentUser } from "../context/CurrentUserContext";
import { API_BASE_URL } from '../lib/apiConfig';
const navLinks = ["Product", "Docs", "Pricing", "Changelog"];

export default function Navbar() {
  const { user, isLoading } = useCurrentUser();
  const [showSignIn, setShowSignIn] = useState(false);

  const signIn = (provider: "google" | "github") => {
    window.location.href = `${API_BASE_URL}/auth/${provider}`;
  };

  return (
    <>
      <nav className="sticky top-0 z-10 flex items-center justify-between border-b border-hairline bg-canvas px-6 py-2.5">
        <div className="flex items-center gap-8">
          <Link
            to="/"
            className="flex items-center gap-2 text-sm font-semibold tracking-tight text-ink"
          >
            <span
              className="h-5 w-5 rounded-sm bg-primary"
              aria-hidden="true"
            />
            synqCode
          </Link>

          <div className="hidden items-center gap-1 md:flex">
            {navLinks.map((link) => (
              <a
                key={link}
                href="#"
                className="rounded-sm px-2.5 py-1.5 text-sm font-medium text-body-strong transition-colors hover:bg-canvas-soft hover:text-ink"
              >
                {link}
              </a>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isLoading ? (
            <div className="h-9 w-24 animate-pulse rounded-sm bg-canvas-soft" />
          ) : user ? (
            <>
              <Link
                to="/dashboard"
                className="rounded-sm px-4 py-2 text-sm font-medium text-ink transition-colors hover:bg-canvas-soft"
              >
                Dashboard
              </Link>

              <Link
                to="/dashboard"
                className="flex items-center gap-2 rounded-sm border border-hairline px-3 py-1.5 transition-colors hover:bg-canvas-soft"
              >
                <span
                  className="flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold text-on-primary"
                  style={{ backgroundColor: user.color }}
                >
                  {user.name?.charAt(0).toUpperCase() ||
                    user.email.charAt(0).toUpperCase()}
                </span>

                <span className="hidden text-sm font-medium text-ink sm:block">
                  {user.name || user.email}
                </span>
              </Link>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={() => setShowSignIn(true)}
                className="rounded-sm px-4 py-2 text-sm font-medium text-ink transition-colors hover:bg-canvas-soft"
              >
                Sign in
              </button>

              <button
                type="button"
                onClick={() => setShowSignIn(true)}
                className="rounded-sm bg-primary px-4 py-2 text-sm font-medium text-on-primary transition-opacity hover:opacity-90 active:scale-[0.98]"
              >
                Get started
              </button>
            </>
          )}
        </div>
      </nav>

      {showSignIn && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
          onMouseDown={() => setShowSignIn(false)}
        >
          <div
            className="w-full max-w-sm rounded-lg border border-hairline bg-canvas p-6 shadow-xl"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="mb-6">
              <h2 className="text-lg font-semibold text-ink">
                Sign in to synqCode
              </h2>

              <p className="mt-1 text-sm text-body-strong">
                Continue with your preferred account.
              </p>
            </div>

            <div className="space-y-3">
              <button
                type="button"
                onClick={() => signIn("google")}
                className="flex w-full items-center justify-center rounded-sm border border-hairline px-4 py-2.5 text-sm font-medium text-ink transition-colors hover:bg-canvas-soft"
              >
                Continue with Google
              </button>

              <button
                type="button"
                onClick={() => signIn("github")}
                className="flex w-full items-center justify-center rounded-sm border border-hairline px-4 py-2.5 text-sm font-medium text-ink transition-colors hover:bg-canvas-soft"
              >
                Continue with GitHub
              </button>
            </div>

            <button
              type="button"
              onClick={() => setShowSignIn(false)}
              className="mt-4 w-full rounded-sm px-4 py-2 text-sm text-body-strong transition-colors hover:bg-canvas-soft"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </>
  );
}