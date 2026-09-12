const features = [
  {
    glyph: "</>",
    title: "Real-time editing",
    body: "See every teammate's cursor and changes as they type — no merge conflicts, no waiting to sync.",
  },
  {
    glyph: "Aa",
    title: "Instant documentation",
    body: "Get clear, accurate doc comments generated the moment you write a new function.",
  },
  {
    glyph: "!",
    title: "Smart suggestions",
    body: "Catch bugs and edge cases before you run the code, with one-click accept or dismiss.",
  },
];

export default function Features() {
  return (
    <section className="mx-auto max-w-content px-6 py-24">
      <div className="mx-auto mb-14 max-w-120 text-center">
        <h2 className="mb-3 text-[32px] font-medium tracking-[-0.8px]">
          Everything your team needs, in one editor
        </h2>
        <p className="text-base text-body">
          Real-time collaboration and an AI teammate that actually understands your codebase.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {features.map((feature) => (
          <div key={feature.title} className="rounded-md border border-hairline bg-canvas-soft p-6">
            <div className="mb-5 flex h-9 w-9 items-center justify-center rounded-sm border border-hairline bg-canvas font-mono text-sm text-body-strong">
              {feature.glyph}
            </div>
            <h3 className="mb-2 text-base font-medium">{feature.title}</h3>
            <p className="text-sm leading-5 text-body">{feature.body}</p>
          </div>
        ))}
      </div>
    </section>
  );
}