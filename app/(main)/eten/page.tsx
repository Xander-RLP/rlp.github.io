"use client";

import CoffeeHint from "@/components/CoffeeHint";
import { useTournament } from "@/lib/store";

// vangnet zolang de BBQ-Tikkie nog niet via de admin aan het eetmoment hangt
// (€ 15,00 — "BBQ RLP2026", geldig t/m 24 juni)
const BBQ_TIKKIE_FALLBACK = "https://tikkie.me/pay/bfags7ccgh4sqhdhepsh";

const DAGELIJKS = [
  {
    emoji: "🍳",
    title: "Elke ochtend",
    text: "Ei en spek met lekkere verse witte puntjes — zo begint elke LAN-dag goed.",
  },
  {
    emoji: "🍊",
    title: "Verse jus d'orange",
    text: "Vers geperst sap om wakker mee te worden (of bij te komen van de nacht ervoor).",
  },
  {
    emoji: "🌭",
    title: "Later op de dag",
    text: "Verse witte puntjes met lekkere knakworsten voor de kleine honger tussen de matches door.",
  },
];

function TikkieKnop({ href, label }: { href?: string; label: string }) {
  if (!href) {
    return (
      <span className="inline-block rounded border border-dashed border-slate-600 px-4 py-2 text-xs font-bold uppercase tracking-wide text-slate-400">
        Tikkie volgt
      </span>
    );
  }
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-block rounded bg-amber-400 px-4 py-2 text-xs font-extrabold uppercase tracking-wide text-amber-950 hover:bg-amber-300"
    >
      💸 {label}
    </a>
  );
}

export default function EtenPage() {
  const { state } = useTournament();
  // betaallinks hangen aan de eetmomenten (beheerbaar via admin op /schedule)
  const tikkieVan = (id: string) => state?.eetmomenten?.find((m) => m.id === id)?.tikkie;
  const bestellenTikkie = tikkieVan("bestellen-vr");
  const bbqTikkie = tikkieVan("bbq-za") ?? BBQ_TIKKIE_FALLBACK;

  return (
    <div className="mx-auto max-w-3xl">
      <h2 className="mb-1.5 text-[22px] font-extrabold uppercase tracking-wide">Eten &amp; Drinken</h2>
      <p className="mb-5 text-[13px] text-slate-400">
        Niemand fragt goed op een lege maag — dit staat er klaar op de RLP26.
      </p>

      <h3 className="mb-3 text-sm font-extrabold uppercase tracking-wide text-slate-400">Elke dag</h3>
      <div className="mb-7 grid grid-cols-[repeat(auto-fill,minmax(230px,1fr))] gap-3.5">
        {DAGELIJKS.map((item) => (
          <div key={item.title} className="rounded-md border border-slate-700 bg-slate-800 p-4">
            <div className="mb-2 text-2xl">{item.emoji}</div>
            <div className="mb-1 text-sm font-extrabold">{item.title}</div>
            <p className="text-[13px] leading-relaxed text-slate-400">{item.text}</p>
          </div>
        ))}
      </div>

      <h3 className="mb-3 text-sm font-extrabold uppercase tracking-wide text-slate-400">Speciale dagen</h3>
      <div className="grid gap-3.5 sm:grid-cols-2">
        <div className="rounded-md border border-slate-700 bg-slate-800 p-5">
          <div className="mb-2 flex items-center gap-2">
            <span className="text-2xl">📦</span>
            <span className="rounded-full border border-teal-400/40 bg-teal-400/10 px-2.5 py-0.5 text-[11px] font-bold text-teal-300">
              Vrijdag
            </span>
          </div>
          <div className="mb-1 text-sm font-extrabold">Samen eten bestellen</div>
          <p className="mb-4 text-[13px] leading-relaxed text-slate-400">
            Op vrijdag bestellen we met z&apos;n allen eten — kies mee in de groepschat
            wat het wordt. Afrekenen gaat achteraf via Tikkie.
          </p>
          <TikkieKnop href={bestellenTikkie} label="Betaal je deel via Tikkie" />
        </div>

        <div className="rounded-md border border-amber-400/50 bg-slate-800 p-5">
          <div className="mb-2 flex items-center gap-2">
            <span className="text-2xl">🔥</span>
            <span className="rounded-full border border-amber-400/40 bg-amber-400/10 px-2.5 py-0.5 text-[11px] font-bold text-amber-300">
              Zaterdag
            </span>
          </div>
          <div className="mb-1 text-sm font-extrabold">BBQ</div>
          <p className="mb-4 text-[13px] leading-relaxed text-slate-400">
            Zaterdag gaat de barbecue aan! We delen de kosten: <b className="text-slate-200">€ 15,00 p.p.</b> —
            betaal je bijdrage vooraf via Tikkie.
          </p>
          <TikkieKnop href={bbqTikkie} label="Betaal € 15,00 via Tikkie" />
          <p className="mt-2.5 text-[11px] text-slate-500">
            De link is geldig t/m 24 juni — daarna even aankloppen bij de organisatie.
          </p>
        </div>
      </div>

      {/* knipoog onderaan: de developer heeft ook een maag */}
      <div className="mt-6 max-w-3xl">
        <CoffeeHint dismissible={false}>
          ☕ Psst… nu we het toch over eten hebben: de developer van deze site leeft al weken
          op koffie en code. Help &apos;m overleven —
        </CoffeeHint>
      </div>
    </div>
  );
}
