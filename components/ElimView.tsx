"use client";

import { logoColor } from "@/lib/bracket";
import { addElimRound, normalizeElim, removeElimRound, setWinner, toggleAdvance } from "@/lib/elim";
import { getDragPayload, setDragPayload } from "@/lib/dnd";
import { useState } from "react";
import type { Game } from "@/lib/types";

type Props = {
  game: Game;
  isAdmin: boolean;
  onUpdate: (patch: Partial<Game>) => void;
};

// afvalrace: kolommen met groepen; de admin klikt spelers door naar de
// volgende ronde, afvallers blijven doorgestreept achter. De finalegrootte
// bepaal je zelf door rondes toe te voegen en doorgangers aan te wijzen.
export default function ElimView({ game, isAdmin, onUpdate }: Props) {
  const elim = normalizeElim(game.elim);
  const dugout = game.dugout ?? [];
  const [dropOver, setDropOver] = useState(false);
  const last = elim.rounds.length - 1;

  function handleEntryDrop(e: React.DragEvent) {
    e.preventDefault();
    setDropOver(false);
    const p = getDragPayload(e);
    if (!p || p.from !== "dugout") return;
    const next = JSON.parse(JSON.stringify(elim));
    if (!next.rounds[0].some((n: string) => n.toLowerCase() === p.name.toLowerCase())) {
      next.rounds[0].push(p.name);
    }
    onUpdate({ elim: next, dugout: dugout.filter((n) => n !== p.name) });
  }

  return (
    <div className="overflow-x-auto">
      <div className="flex gap-6 pb-5" style={{ minWidth: (elim.rounds.length + (isAdmin ? 1 : 0)) * 220 }}>
        {elim.rounds.map((players, r) => {
          const isFinal = r === last;
          const nextRound = elim.rounds[r + 1];
          return (
            <div
              key={r}
              onDragOver={r === 0 && isAdmin ? (e) => { e.preventDefault(); setDropOver(true); } : undefined}
              onDragLeave={r === 0 ? () => setDropOver(false) : undefined}
              onDrop={r === 0 && isAdmin ? handleEntryDrop : undefined}
              className={`flex min-w-[200px] flex-1 flex-col rounded-md border p-3 ${
                isFinal ? "border-amber-400/70" : "border-slate-700"
              } ${r === 0 && dropOver ? "border-lime-400 bg-lime-400/10" : "bg-slate-900/40"}`}
            >
              <div className={`mb-2.5 flex items-center gap-2 text-xs font-bold ${isFinal ? "font-extrabold uppercase tracking-wide text-amber-400" : "text-slate-400"}`}>
                {isFinal && elim.rounds.length > 1 ? "Finale" : `Ronde ${r + 1}`}
                <span className="font-semibold text-slate-500">({players.length})</span>
                {isAdmin && elim.rounds.length > 1 && (
                  <button
                    onClick={() => {
                      if (players.length && !confirm(`Ronde ${r + 1} verwijderen?`)) return;
                      onUpdate({ elim: removeElimRound(elim, r) });
                    }}
                    title="Ronde verwijderen"
                    className="ml-auto cursor-pointer rounded border border-slate-700 px-1.5 text-[10px] text-slate-400 hover:border-red-500 hover:text-red-500"
                  >
                    ×
                  </button>
                )}
              </div>

              <div className="flex flex-col gap-1.5">
                {players.length === 0 && (
                  <span className="rounded border border-dashed border-slate-700 px-2 py-2 text-center text-[11px] italic text-slate-500">
                    {r === 0
                      ? isAdmin ? "sleep deelnemers uit de dugout hierheen" : "nog geen deelnemers"
                      : isAdmin ? "klik in de vorige ronde wie doorgaat" : "nog niet gespeeld"}
                  </span>
                )}
                {players.map((name) => {
                  const advanced = !!nextRound?.some((n) => n.toLowerCase() === name.toLowerCase());
                  const eliminated = !isFinal && !!nextRound?.length && !advanced;
                  const isWinner = isFinal && !!elim.winner && elim.winner.toLowerCase() === name.toLowerCase();
                  const clickable = isAdmin && (isFinal ? elim.rounds.length > 1 : true);
                  return (
                    <div
                      key={name}
                      onClick={clickable ? () => onUpdate({ elim: isFinal ? setWinner(elim, name) : toggleAdvance(elim, r, name) }) : undefined}
                      title={
                        !isAdmin ? undefined
                          : isFinal ? (isWinner ? "Klik om de winnaar te wissen" : "Klik om als winnaar aan te wijzen")
                          : advanced ? "Klik om de doorgang terug te draaien"
                          : "Klik om door te laten gaan naar de volgende ronde"
                      }
                      className={`flex items-center gap-2 rounded border px-2 py-1.5 text-xs font-semibold ${
                        isWinner ? "border-amber-400 bg-amber-400/15 text-amber-300"
                          : advanced ? "border-lime-400/60 bg-lime-400/10"
                          : eliminated ? "border-slate-800 bg-slate-900 text-slate-500 line-through"
                          : "border-slate-700 bg-slate-800"
                      } ${clickable ? "cursor-pointer hover:border-lime-400" : ""}`}
                    >
                      <span
                        draggable={isAdmin && r === 0}
                        onDragStart={isAdmin && r === 0 ? (e) => { e.stopPropagation(); setDragPayload(e, { name, from: "slot", r: 0, m: 0, s: 0 }); } : undefined}
                        title={isAdmin && r === 0 ? "Sleep terug naar de dugout" : undefined}
                        className={`flex h-5 w-5 shrink-0 items-center justify-center rounded text-[9px] font-extrabold text-white ${isAdmin && r === 0 ? "cursor-grab active:cursor-grabbing" : ""}`}
                        style={{ background: logoColor(name) }}
                      >
                        {name.slice(0, 2).toUpperCase()}
                      </span>
                      <span className="min-w-0 flex-1 truncate">{name}</span>
                      {isWinner ? <span>👑</span> : advanced ? <span className="text-lime-400">✓</span> : null}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}

        {isAdmin && (
          <div className="flex min-w-[130px] items-center">
            <button
              onClick={() => onUpdate({ elim: addElimRound(elim) })}
              className="w-full cursor-pointer rounded border border-dashed border-slate-600 px-2 py-6 text-xs font-bold text-slate-400 hover:border-lime-400 hover:text-lime-400"
            >
              + Ronde
            </button>
          </div>
        )}
      </div>

      {elim.winner && (
        <div className="mt-1 text-center text-xs font-extrabold uppercase tracking-wide text-amber-400">
          🏆 Champion: {elim.winner}
        </div>
      )}
    </div>
  );
}
