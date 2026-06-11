import type { Game } from "@/lib/types";

// "Nog geen <game>?"-strip op de toernooipagina: één klik naar de juiste
// winkel/launcher, met prijs vooraf zichtbaar zodat niemand op de LAN-dag
// nog verrast wordt door een download of aankoop.

export default function GameStoreBanner({ game }: { game: Game }) {
  const store = game.store;
  if (!store) return null;
  const free = !store.price;

  return (
    <a
      href={store.url}
      target="_blank"
      rel="noopener noreferrer"
      className="group mb-4 flex flex-wrap items-center justify-between gap-x-4 gap-y-2 rounded-md border border-slate-700 bg-slate-800/60 px-4 py-3 transition-colors hover:border-lime-400/60 hover:bg-slate-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lime-400"
    >
      <div className="flex min-w-0 items-center gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-lime-400/10 text-lime-300">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="h-4.5 w-4.5">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <path d="m7 10 5 5 5-5" />
            <path d="M12 15V3" />
          </svg>
        </span>
        <div className="min-w-0">
          <div className="text-[13px] font-bold text-slate-100">
            Nog geen {game.name} op je pc?
          </div>
          <div className="truncate text-[11px] text-slate-400">
            Installeer &apos;m vóór de LAN — dan start je bracket op tijd.
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2.5">
        <span
          className={`rounded-full border px-2.5 py-0.5 text-[11px] font-bold ${
            free
              ? "border-lime-400/40 bg-lime-400/10 text-lime-300"
              : "border-amber-400/40 bg-amber-400/10 text-amber-300"
          }`}
        >
          {free ? "Gratis" : store.price}
        </span>
        <span className="flex items-center gap-1.5 rounded bg-lime-400 px-3.5 py-1.5 text-[11px] font-extrabold uppercase tracking-wide text-lime-950 transition-colors group-hover:bg-lime-300">
          {free ? "Download via" : "Koop via"} {store.name}
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="h-3 w-3">
            <path d="M7 17 17 7" />
            <path d="M7 7h10v10" />
          </svg>
        </span>
      </div>
    </a>
  );
}
