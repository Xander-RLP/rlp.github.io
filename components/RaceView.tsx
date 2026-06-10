"use client";

import { logoColor } from "@/lib/bracket";
import type { Game, Race } from "@/lib/types";

type Props = {
  game: Game;
  isAdmin: boolean;
  onRaceChange: (race: Race) => void;
};

export default function RaceView({ game, isAdmin, onRaceChange }: Props) {
  const race = game.race ?? { goalLabel: "Doel", target: 20, participants: [] };
  const sorted = [...race.participants].sort((a, b) => b.progress - a.progress);
  const winner = sorted.find((p) => p.progress >= race.target);

  function setProgress(name: string, value: string) {
    const progress = Math.max(0, parseInt(value, 10) || 0);
    onRaceChange({
      ...race,
      participants: race.participants.map((p) => (p.name === name ? { ...p, progress } : p)),
    });
  }

  function addParticipant() {
    const name = prompt("Naam van de deelnemer?")?.trim();
    if (!name || race.participants.some((p) => p.name.toLowerCase() === name.toLowerCase())) return;
    onRaceChange({ ...race, participants: [...race.participants, { name, progress: 0 }] });
  }

  function removeParticipant(name: string) {
    if (!confirm(`${name} uit de race halen?`)) return;
    onRaceChange({ ...race, participants: race.participants.filter((p) => p.name !== name) });
  }

  return (
    <div className="max-w-2xl">
      <div className="mb-4 rounded-md border border-slate-700 bg-slate-800 px-4 py-3">
        <div className="text-sm font-extrabold uppercase tracking-wide text-lime-400">
          🎯 {race.goalLabel}
        </div>
        {game.description && (
          <p className="mt-1 text-[13px] leading-relaxed text-slate-400">{game.description}</p>
        )}
      </div>

      {winner && (
        <div className="mb-4 rounded-md border border-amber-400 bg-amber-400/10 px-4 py-3 text-sm font-extrabold uppercase tracking-wide text-amber-400">
          🏆 Winnaar: {winner.name}
        </div>
      )}

      {sorted.length === 0 ? (
        <p className="text-xs italic text-slate-400">Nog geen deelnemers.</p>
      ) : (
        <div className="overflow-hidden rounded-md border border-slate-700">
          {sorted.map((p, i) => {
            const pct = Math.min(100, Math.round((p.progress / race.target) * 100));
            return (
              <div key={p.name} className="flex items-center gap-3 border-t border-slate-700 bg-slate-800 px-4 py-2.5 first:border-t-0">
                <span className={`w-5 text-sm font-extrabold ${i === 0 ? "text-amber-400" : "text-slate-400"}`}>
                  {i + 1}
                </span>
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded text-[10px] font-extrabold text-white" style={{ background: logoColor(p.name) }}>
                  {p.name.slice(0, 2).toUpperCase()}
                </span>
                <span className="w-32 truncate text-sm font-semibold">{p.name}</span>
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-700">
                  <div
                    className={`h-full rounded-full ${p.progress >= race.target ? "bg-amber-400" : "bg-lime-400"}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
                {isAdmin ? (
                  <input
                    type="number"
                    min={0}
                    value={p.progress}
                    onChange={(e) => setProgress(p.name, e.target.value)}
                    className="w-14 rounded border border-slate-700 bg-slate-950 px-1.5 py-0.5 text-center text-sm font-bold [appearance:textfield] focus:border-lime-400 focus:outline-none [&::-webkit-inner-spin-button]:appearance-none"
                  />
                ) : (
                  <span className="w-14 text-center text-sm font-extrabold text-lime-400">{p.progress}</span>
                )}
                <span className="text-xs text-slate-500">/ {race.target}</span>
                {isAdmin && (
                  <button
                    onClick={() => removeParticipant(p.name)}
                    title="Verwijderen"
                    className="cursor-pointer text-slate-500 hover:text-red-500"
                  >
                    ×
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {isAdmin && (
        <button
          onClick={addParticipant}
          className="mt-3 cursor-pointer rounded border border-dashed border-slate-600 px-3 py-1.5 text-xs font-bold text-lime-400 hover:border-lime-400"
        >
          + Deelnemer toevoegen
        </button>
      )}
    </div>
  );
}
