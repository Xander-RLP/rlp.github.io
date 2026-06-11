"use client";

import Link from "next/link";
import { useState } from "react";
import { gameInitials, gameStatus, logoColor, slugify } from "@/lib/bracket";
import { useTournament } from "@/lib/store";
import type { EetMoment, Game } from "@/lib/types";

const HOUR_PX = 56;
const DEFAULT_DURATION = 120;
const SNAP_MIN = 15;     // slepen verspringt per kwartier
const MIN_DURATION = 30;

type CalEvent = {
  game?: Game;       // óf een toernooi…
  eet?: EetMoment;   // …óf een eetmoment
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

// Date → "YYYY-MM-DDTHH:mm" in lokale tijd (formaat van datetime-local)
function toLocalInput(d: Date): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}

function idOf(ev: CalEvent): string {
  return ev.game?.id ?? `eet:${ev.eet!.id}`;
}

export default function SchedulePage() {
  const { state, isAdmin, updateGames, updateEetmomenten, saveStatus } = useTournament();
  const [preview, setPreview] = useState<{ id: string; start: Date; end: Date } | null>(null);
  if (!state) return <p className="text-sm text-slate-400">Laden…</p>;

  const eetmomenten = state.eetmomenten ?? [];

  function patchGame(game: Game, patch: Partial<Game>) {
    updateGames(state!.games.map((g) => (g.id === game.id ? { ...g, ...patch } : g)));
  }

  function patchMoment(m: EetMoment, patch: Partial<EetMoment>) {
    updateEetmomenten(eetmomenten.map((x) => (x.id === m.id ? { ...x, ...patch } : x)));
  }

  function addMoment() {
    updateEetmomenten([...eetmomenten, {
      id: slugify("eetmoment", eetmomenten.map((m) => m.id)),
      title: "Nieuw eetmoment",
      emoji: "🍽️",
      start: state!.eventStart || "2026-06-12T12:00",
      durationMin: 60,
    }]);
  }

  function removeMoment(m: EetMoment) {
    if (!confirm(`Eetmoment "${m.title}" verwijderen?`)) return;
    updateEetmomenten(eetmomenten.filter((x) => x.id !== m.id));
  }

  // events bouwen (toernooien + eetmomenten); een lopende sleep-preview gaat vóór
  const events: CalEvent[] = [
    ...state.games
      .filter((g) => g.start && !isNaN(new Date(g.start).getTime()))
      .map((g) => {
        const start = new Date(g.start!);
        const end = new Date(start.getTime() + (g.durationMin ?? DEFAULT_DURATION) * 60000);
        return { game: g, title: g.name, start, end, lane: 0, lanes: 1 };
      }),
    ...eetmomenten
      .filter((m) => m.start && !isNaN(new Date(m.start).getTime()))
      .map((m) => {
        const start = new Date(m.start);
        const end = new Date(start.getTime() + m.durationMin * 60000);
        return { eet: m, title: m.title, emoji: m.emoji, start, end, lane: 0, lanes: 1 };
      }),
  ]
    .map((ev) => (preview && idOf(ev) === preview.id ? { ...ev, start: preview.start, end: preview.end } : ev))
    .sort((a, b) => a.start.getTime() - b.start.getTime());

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

  // slepen (tijd verschuiven) en aan de onderrand trekken (duur aanpassen)
  function beginDrag(e: React.PointerEvent, ev: CalEvent, mode: "move" | "resize") {
    if (!isAdmin || e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();
    const id = idOf(ev);
    const startY = e.clientY;
    const origStart = ev.start;
    const origDur = (ev.end.getTime() - ev.start.getTime()) / 60000;
    // binnen het getoonde uurbereik blijven
    const dayBase = new Date(origStart);
    dayBase.setHours(0, 0, 0, 0);
    const railStart = dayBase.getTime() + minHour * 3600000;
    const railEnd = dayBase.getTime() + maxHour * 3600000;
    let changed = false;
    let lastStart = origStart;
    let lastDur = origDur;

    const onMove = (me: PointerEvent) => {
      const rawMin = ((me.clientY - startY) / HOUR_PX) * 60;
      const deltaMin = Math.round(rawMin / SNAP_MIN) * SNAP_MIN;
      if (mode === "move") {
        let ms = origStart.getTime() + deltaMin * 60000;
        ms = Math.max(railStart, Math.min(railEnd - origDur * 60000, ms));
        lastStart = new Date(ms);
        lastDur = origDur;
      } else {
        const maxDur = (railEnd - origStart.getTime()) / 60000;
        lastDur = Math.max(MIN_DURATION, Math.min(maxDur, origDur + deltaMin));
        lastStart = origStart;
      }
      changed = lastStart.getTime() !== origStart.getTime() || lastDur !== origDur;
      setPreview({ id, start: lastStart, end: new Date(lastStart.getTime() + lastDur * 60000) });
    };

    const onUp = () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      setPreview(null);
      if (!changed) return;
      const patch = { start: toLocalInput(lastStart), durationMin: Math.round(lastDur) };
      if (ev.game) patchGame(ev.game, patch);
      else patchMoment(ev.eet!, patch);
    };

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  }

  function EventBlock({ ev }: { ev: CalEvent }) {
    const g = ev.game;
    const width = 100 / ev.lanes;
    const dragging = preview?.id === idOf(ev);
    const tijd = `${ev.start.toLocaleTimeString("nl-NL", { hour: "2-digit", minute: "2-digit" })} – ${ev.end.toLocaleTimeString("nl-NL", { hour: "2-digit", minute: "2-digit" })}`;
    const pos = {
      top: eventTop(ev),
      height: eventHeight(ev),
      left: `${ev.lane * width}%`,
      width: `calc(${width}% - 4px)`,
    };
    const adminDrag = isAdmin
      ? {
          onPointerDown: (e: React.PointerEvent) => beginDrag(e, ev, "move"),
        }
      : {};
    const resizeHandle = isAdmin && (
      <div
        onPointerDown={(e) => beginDrag(e, ev, "resize")}
        title="Trek om de duur aan te passen"
        className="absolute inset-x-0 bottom-0 flex h-3 cursor-ns-resize items-end justify-center"
      >
        <div className="mb-0.5 h-1 w-8 rounded-full bg-slate-500/60" />
      </div>
    );

    if (!g) {
      // eetmoment: amber blokje; voor bezoekers klikbaar naar /eten
      const inner = (
        <>
          <div className="flex items-center gap-1.5">
            <span className="text-sm leading-none">{ev.emoji ?? "🍽️"}</span>
            <span className="truncate text-xs font-extrabold text-amber-200">{ev.title}</span>
          </div>
          <div className="mt-0.5 text-[10px] font-bold text-amber-300/80">{tijd}</div>
          <div className="truncate text-[10px] text-slate-400">Eten &amp; drinken</div>
        </>
      );
      const cls = `absolute overflow-hidden rounded-md border-l-4 border-l-amber-400 bg-amber-400/10 p-2 shadow-md ring-1 ring-amber-400/30 ${
        dragging ? "z-10 ring-amber-300" : ""
      }`;
      return isAdmin ? (
        <div {...adminDrag} className={`${cls} cursor-grab touch-none select-none active:cursor-grabbing`} style={pos} title={ev.title}>
          {inner}
          {resizeHandle}
        </div>
      ) : (
        <Link href="/eten" className={`${cls} transition-colors hover:bg-amber-400/20`} style={pos} title={`${ev.title} — zie Eten & Drinken`}>
          {inner}
        </Link>
      );
    }

    const st = gameStatus(g);
    return (
      <div
        {...adminDrag}
        className={`absolute overflow-hidden rounded-md border-l-4 bg-slate-800 p-2 shadow-md ring-1 ring-slate-700 ${
          isAdmin ? "cursor-grab touch-none select-none active:cursor-grabbing" : ""
        } ${dragging ? "z-10 ring-lime-400/60" : ""}`}
        style={{ ...pos, borderLeftColor: logoColor(g.name) }}
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
        <div className="mt-0.5 text-[10px] font-bold text-lime-400">{tijd}</div>
        <div className="truncate text-[10px] text-slate-400">{st.text}</div>
        {resizeHandle}
      </div>
    );
  }

  const days = [...byDay.entries()];

  return (
    <div>
      <h2 className="mb-1.5 text-[22px] font-extrabold uppercase tracking-wide">Schedule</h2>
      <p className="mb-6 text-[13px] text-slate-400">
        De kalender van RLP26.
        {isAdmin && " Sleep een blok om de tijd te verschuiven, trek aan de onderrand om de duur aan te passen — of stel alles hieronder precies in."}
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
                  {dayEvents.map((ev) => <EventBlock key={idOf(ev)} ev={ev} />)}
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
                  {/* via slepen kunnen tussenwaarden ontstaan — die ook tonen */}
                  {[...new Set([60, 90, 120, 150, 180, 240, 300, g.durationMin ?? DEFAULT_DURATION])].sort((a, b) => a - b).map((m) => (
                    <option key={m} value={m}>{m % 60 === 0 ? `${m / 60} uur` : `${m} min`}</option>
                  ))}
                </select>
              </div>
            ))}
          </div>

          <div className="mb-3 mt-6 flex items-baseline justify-between">
            <h3 className="text-sm font-extrabold uppercase tracking-wide text-slate-400">Eetmomenten (admin)</h3>
            <button
              onClick={addMoment}
              className="cursor-pointer rounded border border-dashed border-slate-600 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-lime-400 hover:bg-lime-400/10"
            >
              + Eetmoment
            </button>
          </div>
          <div className="overflow-hidden rounded-md border border-slate-700">
            {eetmomenten.length === 0 && (
              <div className="bg-slate-800 px-3.5 py-3 text-[12px] italic text-slate-400">
                Nog geen eetmomenten — voeg er een toe.
              </div>
            )}
            {eetmomenten.map((m) => (
              <div key={m.id} className="flex flex-wrap items-center gap-3 border-t border-slate-700 bg-slate-800 px-3.5 py-2.5 first:border-t-0">
                <input
                  value={m.emoji ?? ""}
                  onChange={(e) => patchMoment(m, { emoji: e.target.value })}
                  maxLength={4}
                  className="w-12 rounded border border-slate-700 bg-slate-950 px-2 py-1 text-center text-sm focus:border-lime-400 focus:outline-none"
                />
                <input
                  value={m.title}
                  onChange={(e) => patchMoment(m, { title: e.target.value })}
                  maxLength={40}
                  className="w-44 rounded border border-slate-700 bg-slate-950 px-2 py-1 text-xs font-bold focus:border-lime-400 focus:outline-none"
                />
                <input
                  type="datetime-local"
                  value={m.start}
                  onChange={(e) => patchMoment(m, { start: e.target.value })}
                  className="rounded border border-slate-700 bg-slate-950 px-2 py-1 text-xs text-slate-100 [color-scheme:dark] focus:border-lime-400 focus:outline-none"
                />
                <select
                  value={m.durationMin}
                  onChange={(e) => patchMoment(m, { durationMin: parseInt(e.target.value, 10) })}
                  className="rounded border border-slate-700 bg-slate-950 px-2 py-1 text-xs focus:border-lime-400 focus:outline-none"
                >
                  {[...new Set([30, 60, 90, 120, 180, m.durationMin])].sort((a, b) => a - b).map((d) => (
                    <option key={d} value={d}>{d} min</option>
                  ))}
                </select>
                <button
                  onClick={() => removeMoment(m)}
                  title="Eetmoment verwijderen"
                  className="ml-auto cursor-pointer text-sm text-slate-500 hover:text-red-400"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* save toast */}
      {saveStatus !== "idle" && (
        <div className={`fixed bottom-4 left-1/2 z-40 -translate-x-1/2 rounded border px-4 py-1.5 text-[11px] font-bold tracking-wide ${
          saveStatus === "saved" ? "border-lime-400 bg-slate-800 text-lime-400" : "border-red-500 bg-slate-800 text-red-500"
        }`}>
          {saveStatus === "saved" ? "✓ Opgeslagen — live over ±1 min" : "Opslaan mislukt"}
        </div>
      )}
    </div>
  );
}
