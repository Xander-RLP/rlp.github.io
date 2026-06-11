"use client";

import { useState } from "react";
import { logoColor } from "@/lib/bracket";
import { getDragPayload, setDragPayload, type DragPayload } from "@/lib/dnd";

type Props = {
  names: string[];
  isAdmin: boolean;
  onReturn: (payload: DragPayload) => void; // speler uit het bracket terug op de bank
  onRemove: (name: string) => void;         // speler helemaal uitschrijven
  quickFill?: { label: string; onClick: () => void }[]; // bijv. "alle users" / "alle teams"
};

// de wachtbank: nieuwe aanmeldingen komen hier, de admin sleept ze het bracket in en terug
export default function Dugout({ names, isAdmin, onReturn, onRemove, quickFill = [] }: Props) {
  const [over, setOver] = useState(false);

  if (!isAdmin && names.length === 0) return null;

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
          {isAdmin ? "— sleep spelers het bracket in, of een bracket-slot hierheen" : "— wachten op een plek in het bracket"}
        </span>
        {isAdmin && quickFill.map((a) => (
          <button
            key={a.label}
            onClick={a.onClick}
            className="cursor-pointer rounded border border-slate-600 px-2 py-0.5 font-bold normal-case tracking-normal text-slate-400 hover:border-lime-400 hover:text-lime-400"
          >
            {a.label}
          </button>
        ))}
      </div>
      {names.length === 0 ? (
        <p className="text-xs italic text-slate-500">Leeg — nieuwe aanmeldingen komen eerst hier.</p>
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
              {isAdmin && (
                <button
                  onClick={() => onRemove(name)}
                  title="Uitschrijven"
                  className="cursor-pointer pl-0.5 text-slate-400 hover:text-red-500"
                >
                  ×
                </button>
              )}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
