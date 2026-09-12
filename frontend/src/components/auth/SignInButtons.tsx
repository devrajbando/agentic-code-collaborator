const AUTH_BASE_URL = "http://localhost:4000";

// OAuth's redirect-based flow can't be done via fetch/AJAX — the browser
// itself needs to navigate to the provider's consent screen, so this is a
// deliberate full-page redirect, not a client-side router push.
function startOAuth(provider: "google" | "github") {
  window.location.href = `${AUTH_BASE_URL}/auth/${provider}`;
}

export default function SignInButtons({ className = "" }: { className?: string }) {
  return (
    <div className={`flex flex-col gap-2.5 ${className}`}>
      <button
        type="button"
        onClick={() => startOAuth("google")}
        className="flex items-center justify-center gap-2.5 rounded-sm border border-hairline bg-canvas-soft px-4 py-2.5 text-sm font-medium text-ink transition-colors duration-150 hover:bg-canvas focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-body-strong"
      >
        <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24">
          <path
            fill="#4285F4"
            d="M23.52 12.27c0-.85-.08-1.67-.22-2.45H12v4.64h6.47a5.53 5.53 0 0 1-2.4 3.63v3.02h3.88c2.27-2.09 3.57-5.17 3.57-8.84z"
          />
          <path
            fill="#34A853"
            d="M12 24c3.24 0 5.95-1.07 7.95-2.9l-3.88-3.02c-1.08.72-2.46 1.15-4.07 1.15-3.13 0-5.78-2.11-6.73-4.96H1.27v3.11C3.26 21.3 7.31 24 12 24z"
          />
          <path
            fill="#FBBC05"
            d="M5.27 14.27a7.2 7.2 0 0 1 0-4.54V6.62H1.27a11.98 11.98 0 0 0 0 10.76l4-3.11z"
          />
          <path
            fill="#EA4335"
            d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.44-3.44C17.94 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.27 6.62l4 3.11C6.22 6.87 8.87 4.75 12 4.75z"
          />
        </svg>
        Continue with Google
      </button>

      <button
        type="button"
        onClick={() => startOAuth("github")}
        className="flex items-center justify-center gap-2.5 rounded-sm border border-hairline bg-canvas-soft px-4 py-2.5 text-sm font-medium text-ink transition-colors duration-150 hover:bg-canvas focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-body-strong"
      >
        <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 0C5.37 0 0 5.37 0 12c0 5.3 3.44 9.8 8.21 11.39.6.11.82-.26.82-.58 0-.29-.01-1.04-.02-2.04-3.34.72-4.04-1.61-4.04-1.61-.55-1.39-1.34-1.76-1.34-1.76-1.09-.75.08-.73.08-.73 1.21.08 1.84 1.24 1.84 1.24 1.07 1.84 2.81 1.31 3.49 1 .11-.78.42-1.31.76-1.61-2.67-.3-5.47-1.34-5.47-5.93 0-1.31.47-2.38 1.24-3.22-.12-.3-.54-1.52.12-3.18 0 0 1.01-.32 3.31 1.23a11.5 11.5 0 0 1 6.03 0c2.3-1.55 3.31-1.23 3.31-1.23.66 1.66.24 2.88.12 3.18.77.84 1.24 1.91 1.24 3.22 0 4.6-2.81 5.62-5.49 5.92.43.37.81 1.1.81 2.22 0 1.6-.02 2.89-.02 3.29 0 .32.22.7.83.58C20.56 21.79 24 17.3 24 12 24 5.37 18.63 0 12 0z" />
        </svg>
        Continue with GitHub
      </button>
    </div>
  );
}