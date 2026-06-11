"use client";

import Link from "next/link";
import { allMatches } from "@/lib/bracket";
import { useTournament } from "@/lib/store";

const NEWS = [
  { accent: "border-teal-500", html: <><b className="text-slate-100">Brackets live:</b> alle RLP26 toernooien staan online — indeling is nog een placeholder.</> },
  { accent: "border-lime-500", html: <><b className="text-slate-100">Line-up:</b> CS2 Wingman, League of Legends (ARAM), Rocket League, WC3 Reforged en Shootmania Storm.</> },
  { accent: "border-amber-400", html: <><b className="text-slate-100">Sponsors gezocht!</b> Wil je RLP26 sponsoren? Meld je bij de organisatie.</> },
  { accent: "border-red-500", html: <><b className="text-slate-100">Schedule:</b> definitieve tijden volgen zodra de aanmeldingen rond zijn.</> },
];

const BAR_COLORS = ["bg-teal-500", "bg-lime-500", "bg-amber-400", "bg-red-500"];

export default function Sidebar() {
  const { state } = useTournament();
  const pending = state ? allMatches(state.games).filter((m) => !m.decided).slice(0, 4) : [];

  return (
    <aside className="flex h-full flex-col gap-6 px-4.5 py-5 lg:min-w-[280px]">
      <section>
        <h2 className="mb-3 text-[13px] font-extrabold uppercase tracking-wide">Tournament News</h2>
        {NEWS.map((item, i) => (
          <div key={i} className={`mb-2 rounded-r border-l-[3px] ${item.accent} bg-slate-800 px-2.5 py-2 text-[11px] leading-relaxed text-slate-400`}>
            {item.html}
          </div>
        ))}
      </section>

      <section>
        <h2 className="mb-3 text-[13px] font-extrabold uppercase tracking-wide">Upcoming Matches</h2>
        <div className="rounded-t border border-b-0 border-slate-700 bg-slate-800 py-1 text-center text-[10px] font-bold uppercase tracking-wide text-slate-400">
          Match
        </div>
        <div className="overflow-hidden rounded-b border border-slate-700">
          {pending.length === 0 ? (
            <div className="bg-slate-800 p-3 text-center text-[11px] italic text-slate-400">
              Nog geen matches gepland — vul teams in via admin.
            </div>
          ) : (
            pending.map((m, i) => (
              <div key={i} className="grid grid-cols-[4px_1fr_auto_1fr] items-center gap-2 border-t border-slate-700 bg-slate-800 py-2 pr-2.5 first:border-t-0">
                <div className={`h-full min-h-9 w-1 ${BAR_COLORS[i % BAR_COLORS.length]}`} />
                <div className="min-w-0">
                  <div className="truncate text-xs font-bold">{m.a}</div>
                  <div className="truncate text-[9px] text-slate-400">{m.game.name}</div>
                </div>
                <div className="text-center">
                  <div className="text-xs font-extrabold text-lime-400">VS</div>
                  <div className="text-[8px] tracking-wide text-slate-400">{m.round}</div>
                </div>
                <div className="min-w-0 text-right">
                  <div className="truncate text-xs font-bold">{m.b}</div>
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-[13px] font-extrabold uppercase tracking-wide">Top Players</h2>
        <div className="rounded border border-dashed border-slate-700 bg-slate-800 p-3 text-center text-[11px] italic text-slate-400">
          Nog geen inschrijvingen — de ranking verschijnt zodra het toernooi loopt.
        </div>
      </section>

      <section>
        <h2 className="mb-2 text-[13px] font-extrabold uppercase tracking-wide">🎵 LAN Playlist</h2>
        <iframe
          src="https://open.spotify.com/embed/playlist/4drxBWX7uZiXWBfuikt30S?theme=0"
          width="100%"
          height="80"
          frameBorder="0"
          allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
          loading="lazy"
          className="rounded-lg"
          title="RLP2026 Spotify playlist"
        />
      </section>

      <footer className="mt-auto border-t border-slate-700 pt-4">
        <p className="mb-3 text-center text-[11px] text-slate-400">
          RLP26 zoekt nog sponsors —{" "}
          <Link href="/sponsors" className="text-lime-400 hover:underline">sponsor worden?</Link>
        </p>
        <div className="flex justify-between text-[9px] text-slate-400">
          <div className="flex gap-2.5">
            <Link href="/" className="hover:text-slate-100">Home</Link>
            <Link href="/teams" className="hover:text-slate-100">Teams</Link>
            <Link href="/schedule" className="hover:text-slate-100">Schedule</Link>
          </div>
          <div>© Ronnie LAN Party 2026</div>
        </div>
      </footer>
    </aside>
  );
}
