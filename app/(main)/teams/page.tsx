"use client";

import Link from "next/link";
import { useState } from "react";
import { logoColor } from "@/lib/bracket";
import { generateRotatie, pairCoverage } from "@/lib/leaderboard";
import { useTournament } from "@/lib/store";
import { allUsers, renameEverywhere } from "@/lib/users";
import type { TeamDef } from "@/lib/types";

export default function TeamsPage() {
  const { state, isAdmin, updateState } = useTournament();
  const [newTeam, setNewTeam] = useState("");
  const [rotSpelers, setRotSpelers] = useState<string | null>(null);
  const [rotSize, setRotSize] = useState("3");
  const [rotRondes, setRotRondes] = useState("4");

  if (!state) return <p className="text-sm text-slate-400">Laden…</p>;

  const teams = state.teams ?? [];
  const users = allUsers(state);
  const rotatie = state.rotatie;
  const norm = (n: string) => n.trim().toLowerCase();

  function saveTeams(next: TeamDef[]) {
    updateState({ teams: next });
  }

  function addTeam() {
    const name = newTeam.trim();
    if (!name) return;
    if (teams.some((t) => norm(t.name) === norm(name))) {
      alert(`Team "${name}" bestaat al.`);
      return;
    }
    saveTeams([...teams, { name, members: [] }]);
    setNewTeam("");
  }

  // teamnaam hernoemen werkt door in toernooi-uitslagen, zodat winsten
  // aan het team gekoppeld blijven
  function renameTeam(team: TeamDef) {
    const next = prompt(`Nieuwe naam voor team "${team.name}" (werkt door in toernooien):`, team.name)?.trim();
    if (!next || next === team.name) return;
    if (teams.some((t) => t !== team && norm(t.name) === norm(next))) {
      alert(`Team "${next}" bestaat al.`);
      return;
    }
    updateState(renameEverywhere(state!, team.name, next));
  }

  function removeTeam(team: TeamDef) {
    if (!confirm(`Team "${team.name}" verwijderen? De users zelf blijven bestaan.`)) return;
    saveTeams(teams.filter((t) => t.name !== team.name));
  }

  function addMember(team: TeamDef, member: string) {
    if (!member) return;
    saveTeams(teams.map((t) => (t.name === team.name ? { ...t, members: [...t.members, member] } : t)));
  }

  function removeMember(team: TeamDef, member: string) {
    saveTeams(teams.map((t) => (t.name === team.name ? { ...t, members: t.members.filter((m) => m !== member) } : t)));
  }

  // ---- rouleerschema ----
  const defaultSpelers = (rotatie?.spelers ?? users).join(", ");
  const spelersValue = rotSpelers ?? defaultSpelers;

  function genereer() {
    const spelers = spelersValue.split(",").map((s) => s.trim()).filter(Boolean);
    const teamSize = parseInt(rotSize, 10);
    const numRondes = Math.max(1, Math.min(20, parseInt(rotRondes, 10) || 1));
    const onbekend = spelers.filter((s) => !users.some((u) => norm(u) === norm(s)));
    if (onbekend.length && !confirm(`Niet elke naam is een bestaande user (${onbekend.join(", ")}). Toch doorgaan?`)) return;
    if (spelers.length < teamSize * 2) {
      alert(`Minimaal ${teamSize * 2} spelers nodig voor teams van ${teamSize}.`);
      return;
    }
    if (new Set(spelers.map(norm)).size !== spelers.length) {
      alert("Er staan dubbele namen in de spelerslijst.");
      return;
    }
    updateState({ rotatie: { teamSize, spelers, rondes: generateRotatie(spelers, teamSize, numRondes) } });
  }

  const coverage = rotatie ? pairCoverage(rotatie.spelers, rotatie.rondes) : null;

  return (
    <div className="mx-auto max-w-5xl">
      <h2 className="mb-1.5 text-[22px] font-extrabold uppercase tracking-wide">Teams</h2>
      <p className="mb-5 text-[13px] text-slate-400">
        Het teamregister van RLP26: vaste teams met hun leden. Teams bestaan uit{" "}
        <Link href="/users" className="font-bold text-lime-400 hover:text-lime-300">users</Link>;
        winsten van een team tellen op het leaderboard persoonlijk mee voor de leden.
      </p>

      {/* team aanmaken */}
      {isAdmin && (
        <form
          onSubmit={(e) => { e.preventDefault(); addTeam(); }}
          className="mb-5 flex max-w-md items-center gap-2 rounded-md border border-dashed border-lime-400/40 bg-lime-400/5 px-3 py-2.5"
        >
          <span className="text-sm">➕</span>
          <input
            value={newTeam}
            onChange={(e) => setNewTeam(e.target.value)}
            placeholder="Nieuw team aanmaken… (naam zoals in het bracket)"
            maxLength={24}
            className="min-w-0 flex-1 rounded border border-slate-700 bg-slate-950 px-2.5 py-1.5 text-xs font-semibold focus:border-lime-400 focus:outline-none"
          />
          <button
            type="submit"
            disabled={!newTeam.trim()}
            className="shrink-0 cursor-pointer rounded bg-lime-400 px-3.5 py-1.5 text-[11px] font-extrabold uppercase tracking-wide text-lime-950 hover:bg-lime-300 disabled:opacity-50"
          >
            Aanmaken
          </button>
        </form>
      )}

      {/* team overzicht */}
      {teams.length === 0 ? (
        <p className="mb-8 text-xs italic text-slate-400">Nog geen teams{isAdmin ? " — maak het eerste aan." : "."}</p>
      ) : (
        <div className="mb-8 grid grid-cols-[repeat(auto-fill,minmax(260px,1fr))] gap-3">
          {teams.map((team) => {
            const beschikbaar = users.filter((u) => !team.members.some((m) => norm(m) === norm(u)));
            return (
              <div key={team.name} className="rounded-md border border-slate-700 bg-slate-800 p-3">
                <div className="mb-2 flex items-center gap-2">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded text-[10px] font-extrabold text-white" style={{ background: logoColor(team.name) }}>
                    {team.name.slice(0, 2).toUpperCase()}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-sm font-extrabold">{team.name}</span>
                  {isAdmin && (
                    <>
                      <button onClick={() => renameTeam(team)} title="Team hernoemen" className="cursor-pointer text-xs text-slate-500 hover:text-lime-400">✏️</button>
                      <button onClick={() => removeTeam(team)} title="Team verwijderen" className="cursor-pointer px-1 text-sm text-slate-500 hover:text-red-500">×</button>
                    </>
                  )}
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {team.members.length === 0 && (
                    <span className="text-[11px] italic text-slate-500">nog geen leden</span>
                  )}
                  {team.members.map((m) => (
                    <span key={m} className="flex items-center gap-1.5 rounded border border-slate-700 bg-slate-900 px-2 py-1 text-xs font-semibold">
                      <span className="flex h-4 w-4 items-center justify-center rounded text-[8px] font-extrabold text-white" style={{ background: logoColor(m) }}>
                        {m.slice(0, 2).toUpperCase()}
                      </span>
                      {m}
                      {isAdmin && (
                        <button onClick={() => removeMember(team, m)} title="Uit team halen" className="cursor-pointer text-slate-500 hover:text-red-500">×</button>
                      )}
                    </span>
                  ))}
                </div>
                {isAdmin && beschikbaar.length > 0 && (
                  <select
                    value=""
                    onChange={(e) => addMember(team, e.target.value)}
                    className="mt-2 w-full cursor-pointer rounded border border-dashed border-slate-600 bg-slate-950 px-2 py-1 text-[11px] text-slate-400 focus:border-lime-400 focus:outline-none"
                  >
                    <option value="">+ user toevoegen…</option>
                    {beschikbaar.map((u) => <option key={u} value={u}>{u}</option>)}
                  </select>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* rouleerschema */}
      <section>
        <h3 className="mb-1 text-sm font-extrabold uppercase tracking-wide">🔁 Rouleerschema</h3>
        <p className="mb-3 text-[11px] text-slate-400">
          Teams rouleren per compo zodat iedereen één keer met iedereen samenspeelt — punten blijven persoonlijk.
          Gebruik de teamnaam (bijv. &quot;Xander + Bo + Leon&quot;) in het bracket, dan telt een winst automatisch
          voor elke speler mee op het leaderboard.
        </p>

        {isAdmin && (
          <div className="mb-4 max-w-2xl rounded-md border border-dashed border-lime-400/40 bg-lime-400/5 px-3 py-2.5">
            <label className="mb-1 block text-[11px] font-bold text-slate-300">Spelers (komma-gescheiden, voorgevuld met alle users)</label>
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
