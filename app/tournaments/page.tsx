"use client";

import Link from "next/link";
import { gameInitials, gameStatus, logoColor } from "@/lib/bracket";
import { useTournament } from "@/lib/store";

function formatStart(start?: string): string {
  if (!start) return "Tijd volgt";
  const d = new Date(start);
  if (isNaN(d.getTime())) return "Tijd volgt";
  return d.toLocaleString("nl-NL", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

export default function TournamentsPage() {
  const { state } = useTournament();
  if (!state) return <p className="text-sm text-slate-400">Laden…</p>;

  return (
    <div>
      <h2 className="mb-1.5 text-[22px] font-extrabold uppercase tracking-wide">Tournaments</h2>
      <p className="mb-5 text-[13px] text-slate-400">
        Alle toernooien van RLP26 — klik op een toernooi voor het bracket.
      </p>
      <div className="grid grid-cols-[repeat(auto-fill,minmax(260px,1fr))] gap-3.5">
        {state.games.map((g) => {
          const total = g.bracket.rounds[0].length * 2;
          const filled = g.bracket.rounds[0].flatMap((m) => m.teams).filter((t) => t.name).length;
          const st = gameStatus(g);
          const icon = g.id.startsWith("cs2")
            ? { bg: "#f0a31b", txt: "CS2" }
            : { bg: logoColor(g.name), txt: gameInitials(g.name) };
          return (
            <Link
              key={g.id}
              href={`/#${g.id}`}
              className="flex flex-col gap-2 rounded-md border border-slate-700 bg-slate-800 p-4 hover:border-lime-400"
            >
              <div className="flex items-center gap-2.5">
                {g.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={g.image} alt="" className="h-9 w-9 shrink-0 rounded-md object-cover" />
                ) : (
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-xs font-extrabold text-slate-950" style={{ background: icon.bg }}>
                    {icon.txt}
                  </div>
                )}
                <div>
                  <div className="text-[15px] font-extrabold">{g.name}</div>
                  <div className="text-[11px] text-slate-400">{g.format ?? ""}</div>
                </div>
              </div>
              <div className="flex justify-between text-xs text-slate-400">
                <span>{filled}/{total} deelnemers</span>
                <span className={`font-bold ${st.champ ? "text-amber-400" : "text-lime-400"}`}>{st.text}</span>
              </div>
              <div className="text-xs text-slate-400">📅 {formatStart(g.start)}</div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
