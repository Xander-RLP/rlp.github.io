"use client";

import Link from "next/link";
import { allMatches, logoColor } from "@/lib/bracket";
import { computeLeaderboards } from "@/lib/leaderboard";
import { COFFEE_URL } from "@/lib/links";
import { useTournament } from "@/lib/store";

const NEWS = [
  { accent: "border-amber-400", html: <><b className="text-slate-100">🏴‍☠️ The Treasure Hunt be back!</b> And mark me words… the hunt has already begun. Only the keenest traveler shall spot the first signs. <Link href="/tournaments#treasure-hunt" className="font-bold text-amber-400 hover:text-amber-300">Lees meer →</Link></> },
  { accent: "border-teal-500", html: <><b className="text-slate-100">Brackets live:</b> alle RLP26 toernooien staan online — indeling is nog een placeholder.</> },
  { accent: "border-lime-500", html: <><b className="text-slate-100">Line-up:</b> CS2 Wingman, League of Legends (ARAM), Rocket League, WC3 Reforged en Shootmania Storm.</> },
  { accent: "border-amber-400", html: <><b className="text-slate-100">Sponsors gezocht!</b> Wil je RLP26 sponsoren? Meld je bij de organisatie.</> },
  { accent: "border-red-500", html: <><b className="text-slate-100">Schedule:</b> definitieve tijden volgen zodra de aanmeldingen rond zijn.</> },
];

const BAR_COLORS = ["bg-teal-500", "bg-lime-500", "bg-amber-400", "bg-red-500"];
const MEDALS = ["🥇", "🥈", "🥉"];

export default function Sidebar() {
  const { state, isAdmin, updateState } = useTournament();
  const pending = state ? allMatches(state.games).filter((m) => !m.decided).slice(0, 4) : [];

  // Game TV: een eigen livestream wint; anders een nu-lopend toernooi
  // (volgens het schema), anders gewoon gameplay van een van de games
  const now = Date.now();
  const liveGame = state?.games.find((g) => {
    if (!g.start) return false;
    const start = new Date(g.start).getTime();
    return now >= start && now <= start + (g.durationMin ?? 120) * 60000;
  });
  const tvGame = liveGame?.video
    ? liveGame
    : state?.games
        .filter((g) => g.video)
        .sort((a, b) => new Date(a.start ?? 0).getTime() - new Date(b.start ?? 0).getTime())
        .find((g) => !g.start || new Date(g.start).getTime() + (g.durationMin ?? 120) * 60000 > now)
      ?? state?.games.find((g) => g.video);

  function tvEmbed(): string | null {
    const host = typeof window !== "undefined" ? window.location.hostname : "xrlp.github.io";
    const ls = state?.liveStream;
    if (ls) {
      const yt = ls.match(/(?:youtube\.com\/.*[?&]v=|youtu\.be\/|youtube\.com\/live\/)([\w-]{11})/)?.[1];
      if (yt) return `https://www.youtube-nocookie.com/embed/${yt}?autoplay=1&mute=1&rel=0`;
      const tw = ls.match(/twitch\.tv\/(\w+)/)?.[1];
      if (tw) return `https://player.twitch.tv/?channel=${tw}&parent=${host}&muted=true`;
    }
    if (tvGame?.video) {
      return `https://www.youtube-nocookie.com/embed/${tvGame.video}?mute=1&loop=1&playlist=${tvGame.video}&rel=0`;
    }
    return null;
  }

  function setLiveStream() {
    const url = prompt(
      "Livestream-URL (YouTube of Twitch) — krijgt voorrang op de gameplay-video.\nLeeg laten = terug naar Game TV.",
      state?.liveStream ?? "",
    )?.trim();
    if (url == null) return;
    updateState({ liveStream: url || undefined });
  }

  const embed = tvEmbed();
  const top = state
    ? computeLeaderboards(state).personal.filter((e) => e.wins > 0).slice(0, 3)
    : [];

  return (
    <aside className="flex h-full flex-col gap-6 px-4.5 py-5">
      {/* Game TV / live match */}
      {embed && (
        <section className="news-in">
          <h2 className="mb-2 flex items-center gap-2 text-[13px] font-extrabold uppercase tracking-wide">
            {state?.liveStream || liveGame ? (
              <>
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-500 opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-red-500" />
                </span>
                {state?.liveStream ? "Live" : `Live: ${liveGame!.name}`}
              </>
            ) : (
              <>🎬 Game TV — {tvGame?.name}</>
            )}
            {isAdmin && (
              <button onClick={setLiveStream} title="Livestream instellen" className="cursor-pointer text-[11px] text-slate-500 hover:text-lime-400">✏️</button>
            )}
          </h2>
          <iframe
            src={embed}
            title="RLP26 Game TV"
            allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
            allowFullScreen
            className="aspect-video w-full rounded-lg border border-slate-700"
          />
          {!state?.liveStream && !liveGame && tvGame?.start && (
            <p className="mt-1 text-[10px] text-slate-500">
              Nog geen eigen live match — alvast in de sfeer met {tvGame.name}.
            </p>
          )}
        </section>
      )}

      <section>
        {/* op mobiel is de kopbalk van SidebarShell al de titel */}
        <h2 className="mb-3 hidden text-[13px] font-extrabold uppercase tracking-wide lg:block">Tournament News</h2>
        {NEWS.map((item, i) => (
          <div
            key={i}
            style={{ animationDelay: `${i * 110}ms` }}
            className={`news-in mb-2 rounded-r border-l-[3px] ${item.accent} bg-slate-800 px-2.5 py-2 text-[11px] leading-relaxed text-slate-400 transition-all duration-200 hover:translate-x-0.5 hover:bg-slate-700/70`}
          >
            {item.html}
          </div>
        ))}
      </section>

      <section className="news-in" style={{ animationDelay: "250ms" }}>
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
              <Link
                key={i}
                href={`/tournaments#${m.game.id}`}
                title={`Naar het ${m.game.name}-toernooi`}
                className="grid grid-cols-[4px_1fr_auto_1fr] items-center gap-2 border-t border-slate-700 bg-slate-800 py-2 pr-2.5 transition-colors first:border-t-0 hover:bg-slate-700/70"
              >
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
              </Link>
            ))
          )}
        </div>
      </section>

      <section className="news-in" style={{ animationDelay: "350ms" }}>
        <h2 className="mb-3 text-[13px] font-extrabold uppercase tracking-wide">Top Players</h2>
        {top.length === 0 ? (
          <Link href="/leaderboard" className="block rounded border border-dashed border-slate-700 bg-slate-800 p-3 text-center text-[11px] italic text-slate-400 transition-colors hover:border-lime-400/60 hover:text-slate-300">
            Nog geen compo&apos;s beslist — bekijk het leaderboard →
          </Link>
        ) : (
          <div className="overflow-hidden rounded border border-slate-700">
            {top.map((e, i) => (
              <Link
                key={e.name}
                href="/leaderboard"
                title="Naar het leaderboard"
                className="flex items-center gap-2.5 border-t border-slate-700 bg-slate-800 px-2.5 py-2 transition-colors first:border-t-0 hover:bg-slate-700/70"
              >
                <span className="w-5 text-center text-sm">{MEDALS[i]}</span>
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded text-[9px] font-extrabold text-white" style={{ background: logoColor(e.name) }}>
                  {e.name.slice(0, 2).toUpperCase()}
                </span>
                <span className="min-w-0 flex-1 truncate text-xs font-bold">{e.name}</span>
                <span className="text-xs font-extrabold text-lime-400">{e.wins}</span>
              </Link>
            ))}
            <Link href="/leaderboard" className="block border-t border-slate-700 bg-slate-800/60 py-1.5 text-center text-[10px] font-bold uppercase tracking-wide text-slate-400 transition-colors hover:text-lime-400">
              Volledig leaderboard →
            </Link>
          </div>
        )}
      </section>

      <section className="news-in" style={{ animationDelay: "450ms" }}>
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
        <p className="mb-2 text-center text-[11px] text-slate-400">
          RLP26 zoekt nog sponsors —{" "}
          <Link href="/sponsors" className="text-lime-400 hover:underline">sponsor worden?</Link>
        </p>
        <span className="mx-auto mb-2 block h-px w-3/4 bg-gradient-to-r from-transparent via-slate-500/60 to-transparent" aria-hidden />
        <p className="mb-3 text-center text-[11px] text-slate-400">
          ☕ Of steun de developer van deze site —{" "}
          <a href={COFFEE_URL} target="_blank" rel="noopener noreferrer" className="font-bold text-amber-400 hover:text-amber-300">Buy me a Coffee!</a>
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
