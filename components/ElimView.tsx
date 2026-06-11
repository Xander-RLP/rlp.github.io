"use client";

import { logoColor } from "@/lib/bracket";
import { addElimRound, normalizeElim, removeElimRound, setWinner, toggleAdvance } from "@/lib/elim";
import { getDragPayload, setDragPayload } from "@/lib/dnd";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import type { Game } from "@/lib/types";

type Line = { left: number; top: number; width: number; height: number };

type Props = {
  game: Game;
  isAdmin: boolean;
  onUpdate: (patch: Partial<Game>) => void;
};

// afvalrace: kolommen met groepen; de admin klikt spelers door naar de
// volgende ronde, afvallers blijven doorgestreept achter. De finalegrootte
// bepaal je zelf door rondes toe te voegen en doorgangers aan te wijzen.
// Doorgestoten spelers krijgen een verbindingslijn naar hun plek in de
// volgende ronde, zoals op een echt tournament board.
export default function ElimView({ game, isAdmin, onUpdate }: Props) {
  const elim = normalizeElim(game.elim);
  const [dropOver, setDropOver] = useState(false);
  const last = elim.rounds.length - 1;

  const containerRef = useRef<HTMLDivElement>(null);
  const rowRefs = useRef(new Map<string, HTMLDivElement>());
  const roundRefs = useRef(new Map<number, HTMLDivElement>());
  const [lines, setLines] = useState<Line[]>([]);
  const rowKey = (r: number, name: string) => `${r}-${name.trim().toLowerCase()}`;

  const recompute = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;
    const origin = container.getBoundingClientRect();
    const next: Line[] = [];
    const line = (left: number, top: number, width: number, height: number) =>
      next.push({ left, top, width: Math.max(width, 1.5), height: Math.max(height, 1.5) });

    elim.rounds.forEach((players, r) => {
      const volgende = elim.rounds[r + 1];
      if (!volgende) return;
      // lijnen lopen van panelrand tot panelrand, op de hoogte van de spelerrij
      const srcPanel = roundRefs.current.get(r);
      const dstPanel = roundRefs.current.get(r + 1);
      if (!srcPanel || !dstPanel) return;
      const srcX = srcPanel.getBoundingClientRect().right - origin.left;
      const dstX = dstPanel.getBoundingClientRect().left - origin.left;
      const midX = (srcX + dstX) / 2;
      players.forEach((name) => {
        if (!volgende.some((n) => n.trim().toLowerCase() === name.trim().toLowerCase())) return;
        const srcEl = rowRefs.current.get(rowKey(r, name));
        const dstEl = rowRefs.current.get(rowKey(r + 1, name));
        if (!srcEl || !dstEl) return;
        const srcY = srcEl.getBoundingClientRect().top + srcEl.getBoundingClientRect().height / 2 - origin.top;
        const dstY = dstEl.getBoundingClientRect().top + dstEl.getBoundingClientRect().height / 2 - origin.top;
        line(srcX, srcY, midX - srcX, 0);
        line(midX, Math.min(srcY, dstY), 0, Math.abs(dstY - srcY));
        line(midX, dstY, dstX - midX, 0);
      });
    });
    setLines(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [game, isAdmin]);

  useLayoutEffect(recompute, [recompute]);
  useEffect(() => {
    window.addEventListener("resize", recompute);
    return () => window.removeEventListener("resize", recompute);
  }, [recompute]);

  function handleEntryDrop(e: React.DragEvent) {
    e.preventDefault();
    setDropOver(false);
    const p = getDragPayload(e);
    if (!p || p.from !== "dugout") return;
    const next = JSON.parse(JSON.stringify(elim));
    if (!next.rounds[0].some((n: string) => n.toLowerCase() === p.name.toLowerCase())) {
      next.rounds[0].push(p.name);
    }
    onUpdate({ elim: next }); // de dugout is afgeleid en past zichzelf aan
  }

  return (
    <div className="overflow-x-auto">
      <div ref={containerRef} className="relative flex gap-10 pb-5" style={{ minWidth: (elim.rounds.length + (isAdmin ? 1 : 0)) * 230 }}>
        {lines.map((l, i) => (
          <div key={i} className="pointer-events-none absolute z-0 bg-lime-500/40" style={l} />
        ))}
        {elim.rounds.map((players, r) => {
          const isFinal = r === last;
          const nextRound = elim.rounds[r + 1];
          return (
            <div
              key={r}
              ref={(el) => { if (el) roundRefs.current.set(r, el); else roundRefs.current.delete(r); }}
              onDragOver={r === 0 && isAdmin ? (e) => { e.preventDefault(); setDropOver(true); } : undefined}
              onDragLeave={r === 0 ? () => setDropOver(false) : undefined}
              onDrop={r === 0 && isAdmin ? handleEntryDrop : undefined}
              className={`z-10 flex min-w-[200px] flex-1 flex-col rounded-md border p-3 ${
                isFinal ? "border-amber-400/70" : "border-slate-700"
              } ${r === 0 && dropOver ? "border-lime-400 bg-lime-400/10" : "bg-slate-900/80"}`}
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
                      ref={(el) => { if (el) rowRefs.current.set(rowKey(r, name), el); else rowRefs.current.delete(rowKey(r, name)); }}
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
