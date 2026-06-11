"use client";

import Link from "next/link";
import { useState } from "react";
import { logoColor } from "@/lib/bracket";
import { useTournament } from "@/lib/store";
import { allUsers, renameEverywhere } from "@/lib/users";
import type { TeamDef } from "@/lib/types";

export default function TeamsPage() {
  const { state, isAdmin, updateState } = useTournament();
  const [newTeam, setNewTeam] = useState("");

  if (!state) return <p className="text-sm text-slate-400">Laden…</p>;

  const teams = state.teams ?? [];
  const users = allUsers(state);
  const norm = (n: string) => n.trim().toLowerCase();

  // puur informatief: wie zit nog nergens in, en wie zit in meerdere teams (en welke)?
  const teamsOf = (u: string) => teams.filter((t) => t.members.some((m) => norm(m) === norm(u)));
  const zonderTeam = users.filter((u) => teamsOf(u).length === 0);
  const inMeerdere = users
    .map((u) => ({ name: u, in: teamsOf(u).map((t) => t.name) }))
    .filter((x) => x.in.length > 1);

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

  return (
    <div className="mx-auto max-w-5xl">
      <h2 className="mb-1.5 text-[22px] font-extrabold uppercase tracking-wide">Teams</h2>
      <p className="mb-5 text-[13px] text-slate-400">
        Het teamregister van RLP26: vaste teams met hun leden. Teams bestaan uit{" "}
        <Link href="/users" className="font-bold text-lime-400 hover:text-lime-300">users</Link>;
        winsten van een team tellen op het{" "}
        <Link href="/leaderboard" className="font-bold text-lime-400 hover:text-lime-300">leaderboard</Link>{" "}
        persoonlijk mee voor de leden.
      </p>

      {/* puur informatief: dekking van de teamindeling */}
      {(zonderTeam.length > 0 || inMeerdere.length > 0) && (
        <div className="mb-5 flex flex-col gap-1.5 rounded-md border border-slate-700 bg-slate-900/60 px-3 py-2.5 text-[11px] text-slate-400">
          {zonderTeam.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="font-bold text-amber-400">⚠ Nog in geen enkel team:</span>
              {zonderTeam.map((u) => (
                <span key={u} className="rounded border border-slate-700 bg-slate-800 px-1.5 py-0.5 font-semibold text-slate-300">{u}</span>
              ))}
            </div>
          )}
          {inMeerdere.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="font-bold text-sky-400">ℹ In meerdere teams:</span>
              {inMeerdere.map((x) => (
                <span key={x.name} className="rounded border border-slate-700 bg-slate-800 px-1.5 py-0.5 font-semibold text-slate-300">
                  {x.name} <span className="text-slate-500">({x.in.join(" + ")})</span>
                </span>
              ))}
            </div>
          )}
        </div>
      )}

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
        <p className="text-xs italic text-slate-400">Nog geen teams{isAdmin ? " — maak het eerste aan." : "."}</p>
      ) : (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(260px,1fr))] gap-3">
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
                  {team.members.map((m) => {
                    const ook = teamsOf(m).filter((t) => t.name !== team.name).map((t) => t.name);
                    return (
                      <span key={m} className="flex items-center gap-1.5 rounded border border-slate-700 bg-slate-900 px-2 py-1 text-xs font-semibold" title={ook.length ? `${m} zit ook in: ${ook.join(", ")}` : undefined}>
                        <span className="flex h-4 w-4 items-center justify-center rounded text-[8px] font-extrabold text-white" style={{ background: logoColor(m) }}>
                          {m.slice(0, 2).toUpperCase()}
                        </span>
                        {m}
                        {isAdmin && (
                          <button onClick={() => removeMember(team, m)} title="Uit team halen" className="cursor-pointer text-slate-500 hover:text-red-500">×</button>
                        )}
                      </span>
                    );
                  })}
                </div>
                {isAdmin && beschikbaar.length > 0 && (
                  <select
                    value=""
                    onChange={(e) => addMember(team, e.target.value)}
                    className="mt-2 w-full cursor-pointer rounded border border-dashed border-slate-600 bg-slate-950 px-2 py-1 text-[11px] text-slate-400 focus:border-lime-400 focus:outline-none"
                  >
                    <option value="">+ user toevoegen…</option>
                    {beschikbaar.map((u) => (
                      <option key={u} value={u}>
                        {u}{teamsOf(u).length === 0 ? " (nog geen team)" : ` (al in ${teamsOf(u).map((t) => t.name).join(", ")})`}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
