function TerminalCard({ children }: { children: React.ReactNode }) {
  return (
    <div className="overflow-hidden rounded-md border border-hairline bg-canvas-soft">
      <div className="flex items-center gap-1.5 border-b border-hairline px-3.5 py-2.5">
        <span className="h-2.5 w-2.5 rounded-full bg-hairline" />
        <span className="h-2.5 w-2.5 rounded-full bg-hairline" />
        <span className="h-2.5 w-2.5 rounded-full bg-hairline" />
      </div>
      <div className="p-4 font-mono text-[13px] leading-4.5 text-body-strong">{children}</div>
    </div>
  );
}

export default function Hero() {
  return (
    <div className="mx-auto max-w-content px-6 pb-16 pt-24 text-center">
      <div className="mx-auto mb-7 inline-flex items-center gap-1.5 rounded-full border border-hairline px-3 py-1 font-mono text-xs text-mute">
        <span className="h-1.5 w-1.5 rounded-full bg-[#5dcaa5]" />
        Now in early access
      </div>

      <h1 className="mx-auto mb-6 max-w-205 text-[40px] font-normal leading-11.5 tracking-[-1px] md:text-[64px] md:leading-17.5 md:tracking-[-1.6px]">
        Code together, <em className="font-serif not-italic">write faster</em>
      </h1>

      <p className="mx-auto mb-9 max-w-140 text-lg leading-7 text-body">
        A collaborative code editor with an AI teammate built in — real-time editing, instant docs,
        and smart suggestions, without leaving your flow.
      </p>

      <div className="mb-20 flex items-center justify-center gap-3">
        <button
          type="button"
          className="rounded-sm bg-primary px-4 py-2 text-sm font-medium text-on-primary transition-opacity hover:opacity-90"
        >
          Start for free
        </button>
        <button
          type="button"
          className="rounded-sm px-4 py-2 text-sm font-medium text-ink transition-colors hover:bg-canvas-soft"
        >
          See how it works &rarr;
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4 text-left md:grid-cols-2">
        <TerminalCard>
          <p className="text-mute">// auth.ts &middot; 2 people editing</p>
          <p>
            <span className="text-[#7f77dd]">function</span> verifyToken(token) {"{"}
          </p>
          <p className="text-mute">&nbsp;&nbsp;// checks signature and expiry</p>
          <p>
            &nbsp;&nbsp;<span className="text-[#5dcaa5]">return</span> jwt.verify(token, SECRET);
          </p>
          <p>{"}"}</p>
          <p className="opacity-40">_</p>
        </TerminalCard>

        <TerminalCard>
          <p className="text-mute">// suggestion</p>
          <p>Add a null check before verifying &mdash;</p>
          <p>
            <span className="text-mute">token</span> can be{" "}
            <span className="text-[#7f77dd]">undefined</span> on first load.
          </p>
          <p className="mt-3">
            <span className="text-[#5dcaa5]">[ Accept ]</span>{" "}
            <span className="text-mute">[ Dismiss ]</span>
          </p>
        </TerminalCard>
      </div>
    </div>
  );
}