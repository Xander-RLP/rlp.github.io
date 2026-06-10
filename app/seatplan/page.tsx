"use client";

import { useState } from "react";
import { useTournament } from "@/lib/store";
import type { Seat } from "@/lib/types";

export default function SeatplanPage() {
  const { state, staticMode, isAdmin, claimSeat } = useTournament();
  const [busy, setBusy] = useState(false);

  if (!state) return <p className="text-sm text-slate-400">Laden…</p>;

  const seats = state.seats ?? [];
  const bySide = (side: Seat["side"]) => seats.filter((s) => s.side === side);
  const unseated = state.unseated ?? [];

  async function onSeatClick(seat: Seat) {
    if (busy) return;
    if (seat.name) {
      if (!isAdmin) return;
      if (!confirm(`Stoel ${seat.id} van ${seat.name} vrijgeven?`)) return;
      setBusy(true);
      const err = await claimSeat(seat.id, "");
      setBusy(false);
      if (err) alert(err);
      return;
    }
    if (staticMode) {
      alert("Stoel kiezen kan alleen op de LAN zelf (via de lokale server).");
      return;
    }
    const name = prompt(`Stoel ${seat.id} claimen — wat is je naam?`)?.trim();
    if (!name) return;
    setBusy(true);
    const err = await claimSeat(seat.id, name);
    setBusy(false);
    if (err) alert(err);
  }

  function SeatBox({ seat, vertical = false }: { seat: Seat; vertical?: boolean }) {
    const taken = !!seat.name;
    const clickable = !taken ? !staticMode : isAdmin;
    return (
      <button
        onClick={() => void onSeatClick(seat)}
        disabled={busy}
        title={taken ? (isAdmin ? "Klik om vrij te geven" : seat.name) : "Klik om te claimen"}
        className={`flex items-center justify-center rounded-xl border-2 text-sm font-bold transition-colors ${
          vertical ? "h-28 w-16" : "h-16 w-40"
        } ${
          taken
            ? "border-lime-400 bg-slate-800 text-lime-300"
            : "border-dashed border-slate-600 bg-slate-900 text-slate-400 hover:border-lime-400 hover:text-lime-400"
        } ${clickable ? "cursor-pointer" : "cursor-default"}`}
      >
        <span className={vertical ? "-rotate-90 whitespace-nowrap" : ""}>
          {seat.name || seat.id}
        </span>
      </button>
    );
  }

  return (
    <div>
      <h2 className="mb-1.5 text-[22px] font-extrabold uppercase tracking-wide">Seatplan</h2>
      <p className="mb-5 text-[13px] text-slate-400">
        {staticMode
          ? "De huidige stoelindeling — stoel kiezen kan op de LAN zelf via het lokale netwerk."
          : "Klik op een vrije stoel om hem te claimen met je naam."}
        {isAdmin && " Als admin kun je bezette stoelen vrijgeven door erop te klikken."}
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

        {/* midden: nog geen stoel */}
        <div className="col-start-2 row-start-2 flex min-w-56 flex-col items-center justify-center gap-1 px-6">
          <div className="mb-1 text-[10px] font-extrabold uppercase tracking-wide text-slate-500">
            Nog geen stoel
          </div>
          {unseated.length === 0 ? (
            <span className="text-xs italic text-slate-500">iedereen zit!</span>
          ) : (
            unseated.map((n) => <span key={n} className="text-sm font-semibold text-slate-300">{n}</span>)
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
        Zit je al ergens en kies je een nieuwe stoel? Dan komt je oude stoel automatisch vrij.
      </p>
    </div>
  );
}
