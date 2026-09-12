export default function CreateOrJoinTile({ onCreate, onJoin }: { onCreate: () => void; onJoin: () => void }) {
  return (
    <div className="relative flex min-h-37 flex-col items-center justify-center gap-3 rounded-md border border-dashed border-hairline p-5 text-mute transition-colors duration-150 hover:border-body-strong hover:text-body-strong">
      {/* corner-bracket motif: a quiet nod to retro HUD framing, marking this as an "open slot" */}
      <span aria-hidden="true" className="pointer-events-none absolute left-2 top-2 h-3 w-3 border-l border-t border-current opacity-40" />
      <span aria-hidden="true" className="pointer-events-none absolute right-2 top-2 h-3 w-3 border-r border-t border-current opacity-40" />
      <span aria-hidden="true" className="pointer-events-none absolute bottom-2 left-2 h-3 w-3 border-b border-l border-current opacity-40" />
      <span aria-hidden="true" className="pointer-events-none absolute bottom-2 right-2 h-3 w-3 border-b border-r border-current opacity-40" />

      <span className="font-display-retro text-2xl leading-none">+</span>
      <div className="flex gap-2 text-[13px]">
        <button
          type="button"
          onClick={onCreate}
          className="rounded-sm underline decoration-hairline underline-offset-2 hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-body-strong"
        >
          Create
        </button>
        <span aria-hidden="true">or</span>
        <button
          type="button"
          onClick={onJoin}
          className="rounded-sm underline decoration-hairline underline-offset-2 hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-body-strong"
        >
          join
        </button>
        <span>a project</span>
      </div>
    </div>
  );
}