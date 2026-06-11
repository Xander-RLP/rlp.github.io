"use client";

import { useState } from "react";
import { logoColor } from "@/lib/bracket";
import { useTournament } from "@/lib/store";
import { addUserPatch, allUsers, removeUserEverywhere, renameEverywhere, seatOf, teamsOf, userExists } from "@/lib/users";

export default function UsersPage() {
  const { state, isAdmin, updateState } = useTournament();
  const [newUser, setNewUser] = useState("");

  if (!state) return <p className="text-sm text-slate-400">Laden…</p>;

  const users = allUsers(state);

  function addUser() {
    const result = addUserPatch(state!, newUser);
    if ("error" in result) {
      alert(result.error);
      return;
    }
    updateState(result);
    setNewUser("");
  }

  function renameUser(name: string) {
    const next = prompt(`Nieuwe naam voor "${name}" (werkt door in stoelenplan, teams, rouleerschema en toernooien):`, name)?.trim();
    if (!next || next === name) return;
    if (next.toLowerCase() !== name.toLowerCase() && userExists(state!, next)) {
      if (!confirm(`"${next}" bestaat al — samenvoegen met die user?`)) return;
    }
    updateState(renameEverywhere(state!, name, next));
  }

  function removeUser(name: string) {
    if (!confirm(`"${name}" verwijderen? De user verdwijnt uit het stoelenplan, teams en het rouleerschema. Toernooi-uitslagen blijven staan.`)) return;
    updateState(removeUserEverywhere(state!, name));
  }

  return (
    <div className="mx-auto max-w-3xl">
      <h2 className="mb-1.5 text-[22px] font-extrabold uppercase tracking-wide">Users</h2>
      <p className="mb-5 text-[13px] text-slate-400">
        De centrale spelerslijst van RLP26 — het stoelenplan, de teams en het leaderboard gebruiken deze users.
      </p>

      {isAdmin && (
        <form
          onSubmit={(e) => { e.preventDefault(); addUser(); }}
          className="mb-5 flex max-w-md items-center gap-2 rounded-md border border-dashed border-lime-400/40 bg-lime-400/5 px-3 py-2.5"
        >
          <span className="text-sm">➕</span>
          <input
            value={newUser}
            onChange={(e) => setNewUser(e.target.value)}
            placeholder="Nieuwe user aanmaken…"
            maxLength={24}
            className="min-w-0 flex-1 rounded border border-slate-700 bg-slate-950 px-2.5 py-1.5 text-xs font-semibold focus:border-lime-400 focus:outline-none"
          />
          <button
            type="submit"
            disabled={!newUser.trim()}
            className="shrink-0 cursor-pointer rounded bg-lime-400 px-3.5 py-1.5 text-[11px] font-extrabold uppercase tracking-wide text-lime-950 hover:bg-lime-300 disabled:opacity-50"
          >
            Toevoegen
          </button>
        </form>
      )}

      {users.length === 0 ? (
        <p className="text-xs italic text-slate-400">Nog geen users{isAdmin ? " — maak de eerste aan." : "."}</p>
      ) : (
        <div className="flex flex-col gap-1.5">
          {users.map((name) => {
            const seat = seatOf(state, name);
            const inTeams = teamsOf(state, name);
            return (
              <div key={name} className="flex items-center gap-2.5 rounded border border-slate-700 bg-slate-800 px-2.5 py-1.5">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded text-[10px] font-extrabold text-white" style={{ background: logoColor(name) }}>
                  {name.slice(0, 2).toUpperCase()}
                </span>
                <span className="min-w-0 flex-1 truncate text-sm font-bold">{name}</span>
                <span className="hidden gap-1.5 sm:flex">
                  {seat && (
                    <span className="rounded bg-slate-900 px-1.5 py-0.5 text-[10px] font-bold text-slate-400">💺 {seat}</span>
                  )}
                  {inTeams.map((t) => (
                    <span key={t} className="rounded bg-slate-900 px-1.5 py-0.5 text-[10px] font-bold text-slate-400">👥 {t}</span>
                  ))}
                </span>
                {isAdmin && (
                  <>
                    <button onClick={() => renameUser(name)} title="Naam bewerken" className="cursor-pointer text-xs text-slate-500 hover:text-lime-400">✏️</button>
                    <button onClick={() => removeUser(name)} title="User verwijderen" className="cursor-pointer px-1 text-sm text-slate-500 hover:text-red-500">×</button>
                  </>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
