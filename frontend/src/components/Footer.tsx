const footerColumns = [
  { heading: "Product", links: ["Features", "Pricing", "Changelog"] },
  { heading: "Resources", links: ["Docs", "Guides", "Support"] },
  { heading: "Company", links: ["About", "Careers", "Contact"] },
];

export default function Footer() {
  return (
    <footer className="border-t border-hairline bg-canvas px-6 py-12">
      <div className="mx-auto grid max-w-content grid-cols-2 gap-8 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
        <div>
          <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-ink">
            <span className="h-5 w-5 rounded-sm bg-primary" aria-hidden="true" />
            synqCode
          </div>
          <p className="max-w-55 text-sm text-mute">
            A collaborative code editor with an AI teammate built in.
          </p>
        </div>

        {footerColumns.map((col) => (
          <div key={col.heading}>
            <h4 className="mb-3.5 font-mono text-xs uppercase tracking-wide text-mute">
              {col.heading}
            </h4>
            {col.links.map((link) => (
              <a
                key={link}
                href="#"
                className="mb-2.5 block text-sm text-body transition-colors hover:text-ink"
              >
                {link}
              </a>
            ))}
          </div>
        ))}
      </div>

      <div className="mx-auto mt-10 flex max-w-content flex-col items-center justify-between gap-3 border-t border-hairline pt-6 text-[13px] text-mute md:flex-row">
        <span>&copy; 2026 synqCode. All rights reserved.</span>
        <span>Built for developers who ship together.</span>
      </div>
    </footer>
  );
}