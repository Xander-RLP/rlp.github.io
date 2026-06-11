"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { gameInitials, gameStatus, logoColor } from "@/lib/bracket";
import { useTournament } from "@/lib/store";
import HeroSlideshow from "./HeroSlideshow";

function pad(n: number) { return String(n).padStart(2, "0"); }

function Countdown({ target }: { target?: string }) {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    setNow(Date.now());
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  if (!target || !now) return null;
  const end = new Date(target).getTime();
  if (isNaN(end)) return null;
  const diff = Math.max(0, end - now);
  if (diff === 0) {
    return <div className="text-2xl font-extrabold uppercase tracking-wide text-lime-400">🎉 De LAN is begonnen!</div>;
  }
  const days = Math.floor(diff / 86400000);
  const hours = Math.floor(diff / 3600000) % 24;
  const mins = Math.floor(diff / 60000) % 60;
  const secs = Math.floor(diff / 1000) % 60;
  const blocks: [string, string][] = [
    [String(days), "dagen"], [pad(hours), "uur"], [pad(mins), "min"], [pad(secs), "sec"],
  ];
  return (
    <div className="flex gap-2.5 md:gap-4">
      {blocks.map(([value, label]) => (
        <div key={label} className="w-16 rounded-lg border border-lime-400/40 bg-slate-950/70 py-2.5 text-center backdrop-blur md:w-20 md:py-3">
          <div className="text-2xl font-extrabold text-lime-400 md:text-3xl">{value}</div>
          <div className="text-[9px] uppercase tracking-widest text-slate-400 md:text-[10px]">{label}</div>
        </div>
      ))}
    </div>
  );
}

function formatStart(start?: string): string {
  if (!start) return "Tijd volgt";
  const d = new Date(start);
  if (isNaN(d.getTime())) return "Tijd volgt";
  return d.toLocaleString("nl-NL", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

export default function HomePage() {
  const { state, isAdmin, updateEventStart } = useTournament();

  const target = state?.eventStart || state?.games.map((g) => g.start).filter(Boolean).sort()[0];

  return (
    <div>
      {/* HERO */}
      <section className="relative flex min-h-[440px] flex-col items-center justify-center overflow-hidden px-4 py-14 text-center md:min-h-[500px]">
        {/* fallback-achtergrond als er (nog) geen video is */}
        <div className="absolute inset-0 bg-gradient-to-br from-teal-950 via-slate-950 to-slate-950" />
        <div className="absolute -left-20 top-10 h-72 w-72 animate-pulse rounded-full bg-teal-500/10 blur-3xl" />
        <div className="absolute -right-20 bottom-0 h-72 w-72 animate-pulse rounded-full bg-lime-500/10 blur-3xl" />
        {/* hero-video: zet een hero.mp4 in public/ en hij speelt automatisch */}
        <video
          autoPlay muted loop playsInline
          className="absolute inset-0 h-full w-full object-cover opacity-40"
          onError={(e) => e.currentTarget.remove()}
        >
          <source src="/hero.mp4" type="video/mp4" />
        </video>
        {/* diashow van LAN-foto's, alleen zichtbaar mét foto-wachtwoord */}
        <HeroSlideshow />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-transparent" />

        <div className="relative flex flex-col items-center gap-5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="RLP26" className="h-36 w-auto drop-shadow-[0_0_30px_rgba(0,184,169,0.35)] md:h-48" />
          <h1 className="text-3xl font-extrabold uppercase tracking-wide md:text-5xl">
            Ronnie <span className="text-lime-400">LAN</span> Party 2026
          </h1>
          <p className="max-w-xl text-sm text-slate-300 md:text-base">
            Eén weekend. Zes toernooien, een seatplan, een TeamSpeak en veel te weinig slaap.
          </p>
          <p className="text-xs font-bold uppercase tracking-widest text-teal-300">
            📅 12 · 13 · 14 juni 2026 — inchecken kan al vanaf donderdag 11 juni
          </p>

          {target ? (
            <Countdown target={target} />
          ) : (
            <div className="text-sm font-bold uppercase tracking-widest text-slate-400">📅 Datum wordt nog geprikt</div>
          )}
          {isAdmin && (
            <label className="flex items-center gap-2 text-xs text-slate-400">
              Startmoment LAN:
              <input
                type="datetime-local"
                value={state?.eventStart ?? ""}
                onChange={(e) => updateEventStart(e.target.value)}
                className="rounded border border-slate-700 bg-slate-950 px-2 py-1 text-xs text-slate-100 [color-scheme:dark] focus:border-lime-400 focus:outline-none"
              />
            </label>
          )}

          <div className="mt-2 flex flex-wrap justify-center gap-3">
            <Link
              href="/tickets"
              className="rounded-md bg-lime-400 px-6 py-3 text-sm font-extrabold uppercase tracking-wide text-lime-950 shadow-lg shadow-lime-400/20 hover:bg-lime-300"
            >
              🎟️ Koop je ticket — € 35
            </Link>
            <Link
              href="/tournaments"
              className="rounded-md border border-lime-400 px-6 py-3 text-sm font-extrabold uppercase tracking-wide text-lime-400 hover:bg-lime-400/10"
            >
              Bekijk de toernooien
            </Link>
          </div>
        </div>
      </section>

      {/* TOERNOOIEN-TEASER */}
      <section className="mx-auto max-w-6xl px-4 py-8 md:px-7">
        <div className="mb-4 flex items-baseline justify-between">
          <h2 className="text-lg font-extrabold uppercase tracking-wide">Tournaments</h2>
          <Link href="/tournaments" className="text-xs font-bold uppercase tracking-wide text-lime-400 hover:underline">
            Alle brackets →
          </Link>
        </div>
        <div className="grid grid-cols-[repeat(auto-fill,minmax(240px,1fr))] gap-3.5">
          {(state?.games ?? []).map((g) => {
            const st = gameStatus(g);
            return (
              <Link
                key={g.id}
                href={`/tournaments#${g.id}`}
                className="flex flex-col gap-2 rounded-md border border-slate-700 bg-slate-800 p-4 hover:border-lime-400"
              >
                <div className="flex items-center gap-2.5">
                  {g.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={g.image} alt="" className="h-9 w-9 shrink-0 rounded-md object-cover" />
                  ) : g.emoji ? (
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-slate-900 text-2xl">
                      {g.emoji}
                    </div>
                  ) : (
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-xs font-extrabold text-slate-950" style={{ background: logoColor(g.name) }}>
                      {gameInitials(g.name)}
                    </div>
                  )}
                  <div className="min-w-0">
                    <div className="truncate text-sm font-extrabold">{g.name}</div>
                    <div className="truncate text-[11px] text-slate-400">{g.format ?? ""}</div>
                  </div>
                  {g.store && (
                    <span
                      className={`ml-auto shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-bold ${
                        g.store.price
                          ? "border-amber-400/40 bg-amber-400/10 text-amber-300"
                          : "border-lime-400/40 bg-lime-400/10 text-lime-300"
                      }`}
                    >
                      {g.store.price ?? "Gratis"}
                    </span>
                  )}
                </div>
                <div className="flex justify-between text-xs text-slate-400">
                  <span>📅 {formatStart(g.start)}</span>
                  <span className={`font-bold ${st.champ ? "text-amber-400" : "text-lime-400"}`}>{st.text}</span>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      {/* LAN PLAYLIST */}
      <section className="mx-auto max-w-6xl px-4 pb-10 md:px-7">
        <div className="flex flex-col gap-5 rounded-xl border border-slate-700 bg-slate-900/60 p-6 md:flex-row md:items-center">
          <div className="md:w-1/2">
            <h2 className="mb-2 text-lg font-extrabold uppercase tracking-wide">🎵 LAN Playlist</h2>
            <p className="text-[13px] leading-relaxed text-slate-400">
              Laten we samen een playlist maken! Voeg je tracks toe aan <b className="text-slate-200">RLP2026</b> —
              dit is wat er op de LAN uit de speakers komt.
            </p>
          </div>
          <div className="md:w-1/2">
            <iframe
              src="https://open.spotify.com/embed/playlist/4drxBWX7uZiXWBfuikt30S?theme=0"
              width="100%"
              height="152"
              frameBorder="0"
              allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
              loading="lazy"
              className="rounded-lg"
              title="RLP2026 Spotify playlist"
            />
          </div>
        </div>
      </section>
    </div>
  );
}
