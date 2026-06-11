"use client";

import Link from "next/link";
import { useState } from "react";
import { logoColor } from "@/lib/bracket";
import { getDragPayload, setDragPayload, type DragPayload } from "@/lib/dnd";

type Props = {
  names: string[];   // afgeleid: iedereen die nog niet in het toernooi is ingedeeld
  isAdmin: boolean;
  entryType: "user" | "team";
  onReturn: (payload: DragPayload) => void; // speler uit het bracket hierheen slepen = slot leegmaken
};

// de wachtbank is volledig afgeleid van de centrale users/teams: wie nog niet
// is ingedeeld staat hier vanzelf, en verdwijnt zodra hij in het bracket staat
export default function Dugout({ names, isAdmin, entryType, onReturn }: Props) {
  const [over, setOver] = useState(false);

  return (
    <div
      onDragOver={(e) => { if (isAdmin) { e.preventDefault(); setOver(true); } }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setOver(false);
        const p = getDragPayload(e);
        if (p && p.from === "slot") onReturn(p);
      }}
      className={`mb-4 rounded-md border border-dashed px-3 py-2.5 ${
        over ? "border-lime-400 bg-lime-400/10" : "border-slate-700 bg-slate-900/60"
      }`}
    >
      <div className="mb-1.5 flex flex-wrap items-center gap-2 text-[11px] font-bold uppercase tracking-wide text-slate-400">
        🪑 Dugout
        <span className="font-semibold normal-case tracking-normal text-slate-500">
          {entryType === "team" ? "— teams" : "— spelers"} die nog niet zijn ingedeeld
          {isAdmin ? "; sleep ze het bracket in (en terug)" : ""}
        </span>
      </div>
      {names.length === 0 ? (
        <p className="text-xs italic text-slate-500">
          Iedereen is ingedeeld!{" "}
          {isAdmin && (
            <>Beheer {entryType === "team"
              ? <Link href="/teams" className="font-bold text-lime-400 hover:text-lime-300">teams</Link>
              : <Link href="/users" className="font-bold text-lime-400 hover:text-lime-300">users</Link>}{" "}
            centraal — de dugout past zich automatisch aan.</>
          )}
        </p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {names.map((name) => (
            <span
              key={name}
              draggable={isAdmin}
              onDragStart={(e) => setDragPayload(e, { name, from: "dugout" })}
              className={`flex items-center gap-2 rounded border border-slate-700 bg-slate-800 px-2 py-1 text-xs font-semibold ${
                isAdmin ? "cursor-grab active:cursor-grabbing" : ""
              }`}
            >
              <span
                className="flex h-5 w-5 shrink-0 items-center justify-center rounded text-[9px] font-extrabold text-white"
                style={{ background: logoColor(name) }}
              >
                {name.slice(0, 2).toUpperCase()}
              </span>
              {name}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
