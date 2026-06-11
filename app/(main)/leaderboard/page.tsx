"use client";

import { useState } from "react";
import { logoColor } from "@/lib/bracket";
import { computeLeaderboards, generateRotatie, pairCoverage, type LeaderboardEntry } from "@/lib/leaderboard";
import { useTournament } from "@/lib/store";

function Podium({ rank }: { rank: number }) {
  const medal = rank === 1 ? "🥇" : rank === 2 ? "🥈" : rank === 3 ? "🥉" : null;
  return medal
    ? <span className="w-7 text-center text-base">{medal}</span>
    : <span className="w-7 text-center text-[11px] font-bold text-slate-500">{rank}</span>;
}

function Board({ title, hint, entries }: { title: string; hint: string; entries: LeaderboardEntry[] }) {
  return (
    <section className="flex-1 basis-72">
      <h3 className="mb-1 text-sm font-extrabold uppercase tracking-wide">{title}</h3>
      <p className="mb-3 text-[11px] text-slate-400">{hint}</p>
      {entries.length === 0 ? (
        <p className="rounded border border-dashed border-slate-700 px-3 py-2.5 text-xs italic text-slate-400">
          Nog geen compo&apos;s beslist.
        </p>
      ) : (
        <div className="flex flex-col gap-1.5">
          {entries.map((e, i) => (
            <div key={e.name} className={`flex items-center gap-2.5 rounded border px-2.5 py-1.5 ${i === 0 ? "border-amber-400/60 bg-amber-400/10" : "border-slate-700 bg-slate-800"}`}>
              <Podium rank={i + 1} />
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded text-[9px] font-extrabold text-white" style={{ background: logoColor(e.name) }}>
                {e.name.slice(0, 2).toUpperCase()}
              </span>
              <div className="min-w-0 flex-1">
                <div className="truncate text-xs font-bold">{e.name}</div>
                <div className="truncate text-[10px] text-slate-400">{e.games.join(" · ")}</div>
              </div>
              <span className="shrink-0 text-sm font-extrabold text-lime-400">{e.wins}</span>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

export default function LeaderboardPage() {
  const { state, isAdmin, updateState } = useTournament();
  const [newTeam, setNewTeam] = useState("");
  const [newMembers, setNewMembers] = useState("");
  const [rotSpelers, setRotSpelers] = useState<string | null>(null);
  const [rotSize, setRotSize] = useState("3");
  const [rotRondes, setRotRondes] = useState("4");

  if (!state) return <p className="text-sm text-slate-400">Laden…</p>;

  const { personal, teams } = computeLeaderboards(state);
  const registry = state.teams ?? [];
  const rotatie = state.rotatie;

  // standaard spelerslijst: het rouleerschema zelf, anders iedereen van het stoelenplan
  const defaultSpelers = (rotatie?.spelers ?? [
    ...(state.seats ?? []).map((s) => s.name).filter(Boolean),
    ...(state.unseated ?? []),
  ]).join(", ");
  const spelersValue = rotSpelers ?? defaultSpelers;

  function addTeam() {
    const name = newTeam.trim();
    const members = newMembers.split(",").map((m) => m.trim()).filter(Boolean);
    if (!name || members.length < 2) {
      alert("Vul een teamnaam en minimaal twee leden in (komma-gescheiden).");
      return;
    }
    if (registry.some((t) => t.name.toLowerCase() === name.toLowerCase())) {
      alert(`Team "${name}" bestaat al.`);
      return;
    }
    updateState({ teams: [...registry, { name, members }] });
    setNewTeam("");
    setNewMembers("");
  }

  function removeTeam(name: string) {
    if (!confirm(`Team "${name}" uit het register verwijderen?`)) return;
    updateState({ teams: registry.filter((t) => t.name !== name) });
  }

  function genereer() {
    const spelers = spelersValue.split(",").map((s) => s.trim()).filter(Boolean);
    const teamSize = parseInt(rotSize, 10);
    const numRondes = Math.max(1, Math.min(20, parseInt(rotRondes, 10) || 1));
    if (spelers.length < teamSize * 2) {
      alert(`Minimaal ${teamSize * 2} spelers nodig voor teams van ${teamSize}.`);
      return;
    }
    if (new Set(spelers.map((s) => s.toLowerCase())).size !== spelers.length) {
      alert("Er staan dubbele namen in de spelerslijst.");
      return;
    }
    updateState({ rotatie: { teamSize, spelers, rondes: generateRotatie(spelers, teamSize, numRondes) } });
  }

  const coverage = rotatie ? pairCoverage(rotatie.spelers, rotatie.rondes) : null;

  return (
    <div className="mx-auto max-w-5xl">
      <h2 className="mb-1.5 text-[22px] font-extrabold uppercase tracking-wide">Leaderboard</h2>
      <p className="mb-5 text-[13px] text-slate-400">
        Wie heeft de meeste compo&apos;s gewonnen? Teamwinsten tellen ook persoonlijk mee voor de teamleden.
      </p>

      <div className="mb-8 flex flex-wrap gap-7">
        <Board title="🧑 Persoonlijk" hint="Gewonnen compo's per persoon (incl. teamwinsten)." entries={personal} />
        <Board title="👥 Teams" hint="Gewonnen compo's per team." entries={teams} />
      </div>

      {/* teamregister: koppelt teamnamen aan personen voor de persoonlijke telling */}
      {(isAdmin || registry.length > 0) && (
        <section className="mb-8">
          <h3 className="mb-1 text-sm font-extrabold uppercase tracking-wide">Teamregister</h3>
          <p className="mb-3 text-[11px] text-slate-400">
            Koppel een teamnaam aan de leden, dan tellen winsten van dat team persoonlijk mee.
            Teamnamen als &quot;Xander + Bo&quot; worden automatisch herkend.
          </p>
          <div className="flex flex-wrap gap-2">
            {registry.map((t) => (
              <span key={t.name} className="flex items-center gap-2 rounded border border-slate-700 bg-slate-800 px-2.5 py-1.5 text-xs">
                <b>{t.name}</b>
                <span className="text-slate-400">{t.members.join(", ")}</span>
                {isAdmin && (
                  <button onClick={() => removeTeam(t.name)} title="Team verwijderen" className="cursor-pointer text-slate-400 hover:text-red-500">×</button>
                )}
              </span>
            ))}
          </div>
          {isAdmin && (
            <form
              onSubmit={(e) => { e.preventDefault(); addTeam(); }}
              className="mt-3 flex max-w-2xl flex-wrap items-center gap-2 rounded-md border border-dashed border-lime-400/40 bg-lime-400/5 px-3 py-2.5"
            >
              <input
                value={newTeam}
                onChange={(e) => setNewTeam(e.target.value)}
                placeholder="Teamnaam (zoals in het bracket)"
                maxLength={24}
                className="min-w-0 flex-1 rounded border border-slate-700 bg-slate-950 px-2.5 py-1.5 text-xs font-semibold focus:border-lime-400 focus:outline-none"
              />
              <input
                value={newMembers}
                onChange={(e) => setNewMembers(e.target.value)}
                placeholder="Leden, komma-gescheiden"
                className="min-w-0 flex-1 rounded border border-slate-700 bg-slate-950 px-2.5 py-1.5 text-xs font-semibold focus:border-lime-400 focus:outline-none"
              />
              <button type="submit" className="shrink-0 cursor-pointer rounded bg-lime-400 px-3.5 py-1.5 text-[11px] font-extrabold uppercase tracking-wide text-lime-950 hover:bg-lime-300">
                Toevoegen
              </button>
            </form>
          )}
        </section>
      )}

      {/* rouleerschema */}
      <section>
        <h3 className="mb-1 text-sm font-extrabold uppercase tracking-wide">🔁 Rouleerschema</h3>
        <p className="mb-3 text-[11px] text-slate-400">
          Teams rouleren per compo zodat iedereen één keer met iedereen samenspeelt — punten blijven persoonlijk.
          Gebruik de teamnaam (bijv. &quot;Xander + Bo + Leon&quot;) in het bracket, dan telt een winst automatisch
          voor elke speler mee op het persoonlijke leaderboard.
        </p>

        {isAdmin && (
          <div className="mb-4 max-w-2xl rounded-md border border-dashed border-lime-400/40 bg-lime-400/5 px-3 py-2.5">
            <label className="mb-1 block text-[11px] font-bold text-slate-300">Spelers (komma-gescheiden)</label>
            <textarea
              value={spelersValue}
              onChange={(e) => setRotSpelers(e.target.value)}
              rows={2}
              className="mb-2 w-full rounded border border-slate-700 bg-slate-950 px-2.5 py-1.5 text-xs font-semibold focus:border-lime-400 focus:outline-none"
            />
            <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-300">
              <label className="flex items-center gap-1.5">
                Teamgrootte:
                <select value={rotSize} onChange={(e) => setRotSize(e.target.value)} className="rounded border border-slate-700 bg-slate-950 px-2 py-1 text-xs focus:border-lime-400 focus:outline-none">
                  {[2, 3, 4].map((n) => <option key={n} value={n}>{n}</option>)}
                </select>
              </label>
              <label className="flex items-center gap-1.5">
                Rondes:
                <input
                  type="number" min={1} max={20} value={rotRondes}
                  onChange={(e) => setRotRondes(e.target.value)}
                  className="w-14 rounded border border-slate-700 bg-slate-950 px-2 py-1 text-center text-xs focus:border-lime-400 focus:outline-none"
                />
              </label>
              <button onClick={genereer} className="cursor-pointer rounded bg-lime-400 px-3.5 py-1.5 text-[11px] font-extrabold uppercase tracking-wide text-lime-950 hover:bg-lime-300">
                {rotatie ? "Opnieuw genereren" : "Genereer schema"}
              </button>
              {rotatie && (
                <button
                  onClick={() => { if (confirm("Rouleerschema verwijderen?")) updateState({ rotatie: undefined }); }}
                  className="cursor-pointer rounded border border-slate-600 px-3 py-1.5 text-[11px] font-bold uppercase tracking-wide text-slate-400 hover:border-red-500 hover:text-red-500"
                >
                  Verwijderen
                </button>
              )}
            </div>
          </div>
        )}

        {!rotatie ? (
          <p className="rounded border border-dashed border-slate-700 px-3 py-2.5 text-xs italic text-slate-400">
            Nog geen rouleerschema{isAdmin ? " — genereer er hierboven een." : "."}
          </p>
        ) : (
          <>
            {coverage && (
              <p className="mb-3 text-[11px] text-slate-400">
                <b className={coverage.played === coverage.total ? "text-lime-400" : "text-amber-400"}>
                  {coverage.played}/{coverage.total}
                </b>{" "}
                duo&apos;s hebben samengespeeld na dit schema
                {coverage.played === coverage.total ? " — iedereen heeft met iedereen gespeeld! 🎉" : "."}
              </p>
            )}
            <div className="grid grid-cols-[repeat(auto-fill,minmax(230px,1fr))] gap-3">
              {rotatie.rondes.map((teamsInRonde, r) => (
                <div key={r} className="rounded border border-slate-700 bg-slate-800 p-3">
                  <div className="mb-2 text-[11px] font-extrabold uppercase tracking-wide text-slate-400">
                    Compo {r + 1}
                  </div>
                  <div className="flex flex-col gap-1.5">
                    {teamsInRonde.map((team, t) => {
                      const teamName = team.join(" + ");
                      return (
                        <div key={t} className="flex items-center gap-2 rounded border border-slate-700 bg-slate-900 px-2 py-1.5 text-xs">
                          <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded text-[9px] font-extrabold text-white" style={{ background: logoColor(teamName) }}>
                            T{t + 1}
                          </span>
                          <span className="min-w-0 flex-1 truncate font-semibold">{teamName}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </section>
    </div>
  );
}
