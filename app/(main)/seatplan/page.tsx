"use client";

import Link from "next/link";
import { useState } from "react";
import { useTournament } from "@/lib/store";
import { allUsers } from "@/lib/users";
import type { Seat } from "@/lib/types";

type DragPayload = { name: string; fromSeat?: string };

export default function SeatplanPage() {
  const { state, isAdmin, claimSeat } = useTournament();
  const [busy, setBusy] = useState(false);
  const [overTarget, setOverTarget] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null); // tik-om-te-plaatsen

  if (!state) return <p className="text-sm text-slate-400">Laden…</p>;

  const seats = state.seats ?? [];
  const bySide = (side: Seat["side"]) => seats.filter((s) => s.side === side);
  // de pool is afgeleid: alle centrale users die (nog) geen stoel hebben
  const unseated = allUsers(state).filter(
    (n) => !seats.some((s) => s.name && s.name.toLowerCase() === n.toLowerCase())
  );
  const canEdit = isAdmin;

  async function place(seatId: string, name: string) {
    if (busy) return;
    setBusy(true);
    const err = await claimSeat(seatId, name);
    setBusy(false);
    setSelected(null);
    if (err) alert(err);
  }

  function setPayload(e: React.DragEvent, payload: DragPayload) {
    e.dataTransfer.setData("text/plain", JSON.stringify(payload));
    e.dataTransfer.effectAllowed = "move";
  }

  function getPayload(e: React.DragEvent): DragPayload | null {
    try {
      return JSON.parse(e.dataTransfer.getData("text/plain"));
    } catch {
      return null;
    }
  }

  async function dropOnSeat(e: React.DragEvent, seat: Seat) {
    e.preventDefault();
    setOverTarget(null);
    const payload = getPayload(e);
    if (!payload || seat.name) return;
    await place(seat.id, payload.name);
  }

  async function dropOnPool(e: React.DragEvent) {
    e.preventDefault();
    setOverTarget(null);
    const payload = getPayload(e);
    if (!payload?.fromSeat) return;
    await place(payload.fromSeat, "");
  }

  async function onSeatClick(seat: Seat) {
    if (!canEdit) {
      alert("Stoelen wijzigen kan alleen de organisatie — log in via /admin.");
      return;
    }
    if (busy) return;
    if (!seat.name && selected) {
      await place(seat.id, selected);
      return;
    }
    if (seat.name) {
      if (!confirm(`Stoel ${seat.id} van ${seat.name} vrijgeven?`)) return;
      await place(seat.id, "");
    }
  }

  function SeatBox({ seat, vertical = false }: { seat: Seat; vertical?: boolean }) {
    const taken = !!seat.name;
    // gezeten namen zijn alleen voor de admin versleepbaar; intrekken mag iedereen (klik)
    const draggable = canEdit && taken && isAdmin;
    const isOver = overTarget === seat.id;
    const isTarget = !taken && !!selected;
    return (
      <div
        draggable={draggable}
        onDragStart={(e) => setPayload(e, { name: seat.name, fromSeat: seat.id })}
        onDragOver={(e) => { if (!seat.name) { e.preventDefault(); setOverTarget(seat.id); } }}
        onDragLeave={() => setOverTarget(null)}
        onDrop={(e) => void dropOnSeat(e, seat)}
        onClick={() => void onSeatClick(seat)}
        title={taken ? (canEdit ? "Klik om vrij te geven" : seat.name) : selected ? `Plaats ${selected} hier` : "Sleep of tik een naam hierheen"}
        className={`flex select-none items-center justify-center rounded-xl border-2 text-sm font-bold transition-colors ${
          vertical ? "h-28 w-16" : "h-16 w-40"
        } ${
          taken
            ? `border-lime-400 bg-slate-800 text-lime-300 ${canEdit ? "cursor-pointer" : ""}`
            : isOver || isTarget
              ? "animate-pulse cursor-pointer border-lime-400 bg-lime-400/10 text-lime-400"
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
    <div className="mx-auto w-fit max-w-full">
      <h2 className="mb-1.5 text-[22px] font-extrabold uppercase tracking-wide">Seatplan</h2>
      <p className="mb-5 w-0 min-w-full text-[13px] text-slate-400">
        {canEdit
          ? "Tik een naam aan en daarna een vrije stoel — of sleep hem ernaartoe. Klik op een bezette stoel om hem vrij te geven."
          : "De huidige stoelindeling. Wil je een (andere) stoel? Geef het door aan de organisatie."}
      </p>

      <div className="inline-grid select-none grid-cols-[auto_1fr_auto] gap-4 rounded-xl border border-slate-700 bg-slate-900/50 p-6">
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
            Nog geen stoel{canEdit && unseated.length > 0 ? " — tik je naam aan" : ""}
          </div>
          {unseated.length === 0 ? (
            <span className="text-xs italic text-slate-500">iedereen zit!</span>
          ) : (
            unseated.map((n) => (
              <button
                key={n}
                draggable={canEdit}
                onDragStart={(e) => setPayload(e, { name: n })}
                onClick={() => {
                  if (!canEdit) {
                    alert("Stoelen wijzigen kan alleen de organisatie — log in via /admin.");
                    return;
                  }
                  setSelected(selected === n ? null : n);
                }}
                className={`select-none rounded border px-3 py-1 text-sm font-semibold ${
                  selected === n
                    ? "border-lime-400 bg-lime-400/15 text-lime-300 ring-2 ring-lime-400/40"
                    : "border-slate-600 bg-slate-800 text-slate-200"
                } ${canEdit ? "cursor-grab active:cursor-grabbing hover:border-lime-400" : "cursor-default"}`}
              >
                {n}
              </button>
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

      <p className="mt-4 w-0 min-w-full text-xs text-slate-500">
        De organisatie deelt de stoelen in — wijzigingen staan binnen een minuut voor iedereen op de site.
        {isAdmin && (
          <> Spelers toevoegen of verwijderen doe je centraal op de{" "}
          <Link href="/users" className="font-bold text-lime-400 hover:text-lime-300">Users-pagina</Link>.</>
        )}
      </p>
    </div>
  );
}
