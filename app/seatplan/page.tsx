"use client";

import { useState } from "react";
import { useTournament } from "@/lib/store";
import type { Seat } from "@/lib/types";

type DragPayload = { name: string; fromSeat?: string };

export default function SeatplanPage() {
  const { state, staticMode, isAdmin, claimSeat } = useTournament();
  const [busy, setBusy] = useState(false);
  const [overTarget, setOverTarget] = useState<string | null>(null);

  if (!state) return <p className="text-sm text-slate-400">Laden…</p>;

  const seats = state.seats ?? [];
  const bySide = (side: Seat["side"]) => seats.filter((s) => s.side === side);
  const unseated = state.unseated ?? [];
  const canDrag = !staticMode;

  function setPayload(e: React.DragEvent, payload: DragPayload) {
    e.dataTransfer.setData("application/json", JSON.stringify(payload));
    e.dataTransfer.effectAllowed = "move";
  }

  function getPayload(e: React.DragEvent): DragPayload | null {
    try {
      return JSON.parse(e.dataTransfer.getData("application/json"));
    } catch {
      return null;
    }
  }

  async function dropOnSeat(e: React.DragEvent, seat: Seat) {
    e.preventDefault();
    setOverTarget(null);
    const payload = getPayload(e);
    if (!payload || busy || seat.name) return;
    setBusy(true);
    const err = await claimSeat(seat.id, payload.name);
    setBusy(false);
    if (err) alert(err);
  }

  async function dropOnPool(e: React.DragEvent) {
    e.preventDefault();
    setOverTarget(null);
    const payload = getPayload(e);
    if (!payload?.fromSeat || busy) return;
    setBusy(true);
    const err = await claimSeat(payload.fromSeat, "");
    setBusy(false);
    if (err) alert(err);
  }

  async function releaseSeat(seat: Seat) {
    if (!seat.name || busy) return;
    if (!confirm(`Stoel ${seat.id} van ${seat.name} vrijgeven?`)) return;
    setBusy(true);
    const err = await claimSeat(seat.id, "");
    setBusy(false);
    if (err) alert(err);
  }

  function SeatBox({ seat, vertical = false }: { seat: Seat; vertical?: boolean }) {
    const taken = !!seat.name;
    // gezeten namen zijn alleen voor de admin versleepbaar; intrekken mag iedereen (klik)
    const draggable = canDrag && taken && isAdmin;
    const isOver = overTarget === seat.id;
    return (
      <div
        draggable={draggable}
        onDragStart={(e) => setPayload(e, { name: seat.name, fromSeat: seat.id })}
        onDragOver={(e) => { if (!seat.name) { e.preventDefault(); setOverTarget(seat.id); } }}
        onDragLeave={() => setOverTarget(null)}
        onDrop={(e) => void dropOnSeat(e, seat)}
        onClick={() => { if (taken && canDrag) void releaseSeat(seat); }}
        title={taken ? (canDrag ? "Klik om vrij te geven" : seat.name) : "Sleep een naam hierheen"}
        className={`flex items-center justify-center rounded-xl border-2 text-sm font-bold transition-colors ${
          vertical ? "h-28 w-16" : "h-16 w-40"
        } ${
          taken
            ? `border-lime-400 bg-slate-800 text-lime-300 ${canDrag ? "cursor-pointer" : ""}`
            : isOver
              ? "border-lime-400 bg-lime-400/10 text-lime-400"
              : "border-dashed border-slate-600 bg-slate-900 text-slate-400"
        }`}
      >
        <span className={vertical ? "-rotate-90 whitespace-nowrap" : ""}>
          {seat.name || seat.id}
        </span>
      </div>
    );
  }

  return (
    <div>
      <h2 className="mb-1.5 text-[22px] font-extrabold uppercase tracking-wide">Seatplan</h2>
      <p className="mb-5 max-w-2xl text-[13px] text-slate-400">
        {staticMode
          ? "De huidige stoelindeling — stoel kiezen kan op de LAN zelf via het lokale netwerk."
          : "Sleep je naam uit het midden naar een vrije stoel. Klik op je stoel om hem weer vrij te geven."}
        {isAdmin && " Als admin kun je iedereen verslepen."}
      </p>

      <div className="inline-grid grid-cols-[auto_1fr_auto] gap-4 rounded-xl border border-slate-700 bg-slate-900/50 p-6">
        {/* bovenkant */}
        <div className="col-start-2 flex justify-center gap-4">
          {bySide("top").map((s) => <SeatBox key={s.id} seat={s} />)}
        </div>

        {/* linkerkant */}
        <div className="col-start-1 row-start-2 flex flex-col gap-4">
          {bySide("left").map((s) => <SeatBox key={s.id} seat={s} vertical />)}
        </div>

        {/* midden: pool */}
        <div
          onDragOver={(e) => { e.preventDefault(); setOverTarget("pool"); }}
          onDragLeave={() => setOverTarget(null)}
          onDrop={(e) => void dropOnPool(e)}
          className={`col-start-2 row-start-2 flex min-w-56 flex-col items-center justify-center gap-1.5 rounded-lg px-6 py-4 ${
            overTarget === "pool" ? "bg-lime-400/5 outline-2 outline-dashed outline-lime-400/50" : ""
          }`}
        >
          <div className="mb-1 text-[10px] font-extrabold uppercase tracking-wide text-slate-500">
            Nog geen stoel
          </div>
          {unseated.length === 0 ? (
            <span className="text-xs italic text-slate-500">iedereen zit!</span>
          ) : (
            unseated.map((n) => (
              <span
                key={n}
                draggable={canDrag}
                onDragStart={(e) => setPayload(e, { name: n })}
                className={`rounded border border-slate-600 bg-slate-800 px-3 py-1 text-sm font-semibold text-slate-200 ${
                  canDrag ? "cursor-grab active:cursor-grabbing hover:border-lime-400" : ""
                }`}
              >
                {n}
              </span>
            ))
          )}
        </div>

        {/* rechterkant */}
        <div className="col-start-3 row-start-2 flex flex-col gap-4">
          {bySide("right").map((s) => <SeatBox key={s.id} seat={s} vertical />)}
        </div>

        {/* onderkant */}
        <div className="col-start-2 row-start-3 flex justify-start gap-4 pl-2">
          {bySide("bottom").map((s) => <SeatBox key={s.id} seat={s} />)}
        </div>
      </div>

      <p className="mt-4 max-w-xl text-xs text-slate-500">
        Eenmaal gekozen? Alleen de organisatie kan je daarna nog verplaatsen —
        je stoel intrekken (terug naar de pool) kan altijd.
      </p>
    </div>
  );
}
