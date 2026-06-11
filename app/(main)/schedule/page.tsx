"use client";

import Link from "next/link";
import { gameInitials, gameStatus, logoColor } from "@/lib/bracket";
import { useTournament } from "@/lib/store";
import type { Game } from "@/lib/types";

const HOUR_PX = 56;
const DEFAULT_DURATION = 120;

// vaste eetmomenten van de LAN (12–14 juni); details staan op /eten
const EETMOMENTEN = [
  { title: "Ontbijt: ei & spek", emoji: "🍳", start: "2026-06-12T09:00", durationMin: 60 },
  { title: "Ontbijt: ei & spek", emoji: "🍳", start: "2026-06-13T09:00", durationMin: 60 },
  { title: "Ontbijt: ei & spek", emoji: "🍳", start: "2026-06-14T09:00", durationMin: 60 },
  { title: "Samen eten bestellen", emoji: "📦", start: "2026-06-12T18:00", durationMin: 60 },
  { title: "BBQ (€ 15 — Tikkie)", emoji: "🔥", start: "2026-06-13T17:30", durationMin: 120 },
];

type CalEvent = {
  game?: Game; // ontbreekt = eetmoment
  title: string;
  emoji?: string;
  start: Date;
  end: Date;
  lane: number;
  lanes: number;
};

function dayKey(d: Date): string {
  return d.toLocaleDateString("nl-NL", { weekday: "long", day: "numeric", month: "long" });
}

function hourLabel(h: number): string {
  return `${String(h % 24).padStart(2, "0")}:00`;
}

export default function SchedulePage() {
  const { state, isAdmin, updateGames } = useTournament();
  if (!state) return <p className="text-sm text-slate-400">Laden…</p>;

  function patchGame(game: Game, patch: Partial<Game>) {
    updateGames(state!.games.map((g) => (g.id === game.id ? { ...g, ...patch } : g)));
  }

  // events bouwen (toernooien + eetmomenten) en per dag groeperen
  const events: CalEvent[] = [
    ...state.games
      .filter((g) => g.start && !isNaN(new Date(g.start).getTime()))
      .map((g) => {
        const start = new Date(g.start!);
        const end = new Date(start.getTime() + (g.durationMin ?? DEFAULT_DURATION) * 60000);
        return { game: g, title: g.name, start, end, lane: 0, lanes: 1 };
      }),
    ...EETMOMENTEN.map((m) => {
      const start = new Date(m.start);
      const end = new Date(start.getTime() + m.durationMin * 60000);
      return { title: m.title, emoji: m.emoji, start, end, lane: 0, lanes: 1 };
    }),
  ].sort((a, b) => a.start.getTime() - b.start.getTime());

  const unscheduled = state.games.filter((g) => !events.some((e) => e.game?.id === g.id));

  const byDay = new Map<string, CalEvent[]>();
  for (const ev of events) {
    const key = dayKey(ev.start);
    byDay.set(key, [...(byDay.get(key) ?? []), ev]);
  }

  // overlappende events naast elkaar zetten (lanes per dag)
  for (const dayEvents of byDay.values()) {
    const laneEnds: number[] = [];
    for (const ev of dayEvents) {
      let lane = laneEnds.findIndex((end) => end <= ev.start.getTime());
      if (lane === -1) {
        lane = laneEnds.length;
        laneEnds.push(0);
      }
      laneEnds[lane] = ev.end.getTime();
      ev.lane = lane;
    }
    for (const ev of dayEvents) ev.lanes = laneEnds.length;
  }

  // uurbereik over alle dagen (uren binnen de dag, einde na middernacht doorgeteld)
  const startHours = events.map((e) => e.start.getHours());
  const endHours = events.map((e) => {
    let h = e.end.getHours() + (e.end.getMinutes() > 0 ? 1 : 0);
    if (e.end.getDate() !== e.start.getDate()) h += 24;
    return h;
  });
  const minHour = events.length ? Math.max(0, Math.min(...startHours) - 1) : 10;
  const maxHour = events.length ? Math.min(28, Math.max(...endHours, minHour + 6) + 1) : 18;
  const hours = Array.from({ length: maxHour - minHour }, (_, i) => minHour + i);

  function eventTop(ev: CalEvent): number {
    return (ev.start.getHours() + ev.start.getMinutes() / 60 - minHour) * HOUR_PX;
  }

  function eventHeight(ev: CalEvent): number {
    return Math.max(40, ((ev.end.getTime() - ev.start.getTime()) / 3600000) * HOUR_PX);
  }

  function EventBlock({ ev }: { ev: CalEvent }) {
    const g = ev.game;
    const width = 100 / ev.lanes;
    const tijd = `${ev.start.toLocaleTimeString("nl-NL", { hour: "2-digit", minute: "2-digit" })} – ${ev.end.toLocaleTimeString("nl-NL", { hour: "2-digit", minute: "2-digit" })}`;

    if (!g) {
      // eetmoment: amber blokje dat doorklikt naar /eten
      return (
        <Link
          href="/eten"
          className="absolute overflow-hidden rounded-md border-l-4 border-l-amber-400 bg-amber-400/10 p-2 shadow-md ring-1 ring-amber-400/30 transition-colors hover:bg-amber-400/20"
          style={{ top: eventTop(ev), height: eventHeight(ev), left: `${ev.lane * width}%`, width: `calc(${width}% - 4px)` }}
          title={`${ev.title} — zie Eten & Drinken`}
        >
          <div className="flex items-center gap-1.5">
            <span className="text-sm leading-none">{ev.emoji}</span>
            <span className="truncate text-xs font-extrabold text-amber-200">{ev.title}</span>
          </div>
          <div className="mt-0.5 text-[10px] font-bold text-amber-300/80">{tijd}</div>
          <div className="truncate text-[10px] text-slate-400">Eten &amp; drinken</div>
        </Link>
      );
    }

    const st = gameStatus(g);
    return (
      <div
        className="absolute overflow-hidden rounded-md border-l-4 bg-slate-800 p-2 shadow-md ring-1 ring-slate-700"
        style={{
          top: eventTop(ev),
          height: eventHeight(ev),
          left: `${ev.lane * width}%`,
          width: `calc(${width}% - 4px)`,
          borderLeftColor: logoColor(g.name),
        }}
        title={`${g.name} — ${g.format ?? ""}`}
      >
        <div className="flex items-center gap-1.5">
          {g.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={g.image} alt="" className="h-5 w-5 rounded object-cover" />
          ) : (
            <span className="flex h-5 w-5 items-center justify-center rounded text-[8px] font-extrabold text-slate-950" style={{ background: logoColor(g.name) }}>
              {gameInitials(g.name)}
            </span>
          )}
          <span className="truncate text-xs font-extrabold">{g.name}</span>
        </div>
        <div className="mt-0.5 text-[10px] font-bold text-lime-400">
          {ev.start.toLocaleTimeString("nl-NL", { hour: "2-digit", minute: "2-digit" })}
          {" – "}
          {ev.end.toLocaleTimeString("nl-NL", { hour: "2-digit", minute: "2-digit" })}
        </div>
        <div className="truncate text-[10px] text-slate-400">{st.text}</div>
      </div>
    );
  }

  const days = [...byDay.entries()];

  return (
    <div>
      <h2 className="mb-1.5 text-[22px] font-extrabold uppercase tracking-wide">Schedule</h2>
      <p className="mb-6 text-[13px] text-slate-400">
        De kalender van RLP26.
        {isAdmin && " Als admin plan je hieronder de tijden en duur per toernooi."}
      </p>

      {days.length === 0 ? (
        <p className="mb-8 text-sm italic text-slate-400">
          Nog niets ingepland — zodra er tijden bekend zijn verschijnt hier de kalender.
        </p>
      ) : (
        <div className="mb-8 overflow-x-auto">
          <div
            className="grid min-w-[560px] rounded-xl border border-slate-700 bg-slate-900/60"
            style={{ gridTemplateColumns: `64px repeat(${days.length}, minmax(220px, 1fr))` }}
          >
            {/* kop: dagen */}
            <div className="border-b border-slate-700" />
            {days.map(([day]) => (
              <div key={day} className="border-b border-l border-slate-700 px-3 py-2.5 text-center text-xs font-extrabold uppercase tracking-wide text-lime-400">
                {day}
              </div>
            ))}

            {/* tijdkolom */}
            <div className="relative" style={{ height: hours.length * HOUR_PX }}>
              {hours.map((h, i) => (
                <div key={h} className="absolute right-2 -translate-y-1/2 text-[10px] font-bold text-slate-500" style={{ top: i * HOUR_PX }}>
                  {i > 0 && hourLabel(h)}
                </div>
              ))}
            </div>

            {/* dagkolommen */}
            {days.map(([day, dayEvents]) => (
              <div key={day} className="relative border-l border-slate-700" style={{ height: hours.length * HOUR_PX }}>
                {hours.map((h, i) => (
                  <div key={h} className="absolute inset-x-0 border-t border-slate-800" style={{ top: i * HOUR_PX }} />
                ))}
                <div className="absolute inset-x-1 inset-y-0">
                  {dayEvents.map((ev) => <EventBlock key={ev.game?.id ?? `${ev.title}-${ev.start.toISOString()}`} ev={ev} />)}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {unscheduled.length > 0 && !isAdmin && (
        <p className="mb-8 text-xs text-slate-500">
          Nog zonder tijd: {unscheduled.map((g) => g.name).join(", ")} — tijden volgen.
        </p>
      )}

      {isAdmin && (
        <section className="max-w-2xl">
          <h3 className="mb-3 text-sm font-extrabold uppercase tracking-wide text-slate-400">Planning (admin)</h3>
          <div className="overflow-hidden rounded-md border border-slate-700">
            {state.games.map((g) => (
              <div key={g.id} className="flex flex-wrap items-center gap-3 border-t border-slate-700 bg-slate-800 px-3.5 py-2.5 first:border-t-0">
                <span className="h-2 w-2 rounded-sm" style={{ background: logoColor(g.name) }} />
                <span className="w-40 truncate text-sm font-bold">{g.name}</span>
                <input
                  type="datetime-local"
                  value={g.start ?? ""}
                  onChange={(e) => patchGame(g, { start: e.target.value || undefined })}
                  className="rounded border border-slate-700 bg-slate-950 px-2 py-1 text-xs text-slate-100 [color-scheme:dark] focus:border-lime-400 focus:outline-none"
                />
                <select
                  value={g.durationMin ?? DEFAULT_DURATION}
                  onChange={(e) => patchGame(g, { durationMin: parseInt(e.target.value, 10) })}
                  className="rounded border border-slate-700 bg-slate-950 px-2 py-1 text-xs focus:border-lime-400 focus:outline-none"
                >
                  {[60, 90, 120, 150, 180, 240, 300].map((m) => (
                    <option key={m} value={m}>{m >= 60 ? `${m / 60}` : m} uur</option>
                  ))}
                </select>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
