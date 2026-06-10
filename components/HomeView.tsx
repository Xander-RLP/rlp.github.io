"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { BRACKET_SIZES, emptyBracket, emptyDouble, gameInitials, logoColor, slugify, teamCount } from "@/lib/bracket";
import { useTournament } from "@/lib/store";
import type { Bracket, DoubleBracket, Game, Race } from "@/lib/types";
import BracketView from "./BracketView";
import DoubleBracketView from "./DoubleBracketView";
import RaceView from "./RaceView";

export default function HomeView() {
  const { state, isAdmin, updateGames, saveStatus, fetchImage } = useTournament();
  const [imageBusy, setImageBusy] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newFormat, setNewFormat] = useState("");
  const [newSize, setNewSize] = useState("8");
  const [newType, setNewType] = useState<"bracket" | "race" | "double">("bracket");

  // game-keuze volgt de URL-hash, zodat tabs en de terug-knop samenwerken
  useEffect(() => {
    const apply = () => setActiveId(decodeURIComponent(window.location.hash.slice(1)) || null);
    apply();
    window.addEventListener("hashchange", apply);
    return () => window.removeEventListener("hashchange", apply);
  }, []);

  if (!state) return <p className="text-sm text-slate-400">Laden…</p>;
  if (!state.games.length) return <p className="text-sm text-slate-400">Nog geen toernooien.</p>;

  const game = state.games.find((g) => g.id === activeId) ?? state.games[0];

  function setBracket(bracket: Bracket) {
    updateGames(state!.games.map((g) => (g.id === game.id ? { ...g, bracket } : g)));
  }

  function setRace(race: Race) {
    updateGames(state!.games.map((g) => (g.id === game.id ? { ...g, race } : g)));
  }

  function setDouble(double: DoubleBracket) {
    updateGames(state!.games.map((g) => (g.id === game.id ? { ...g, double } : g)));
  }

  async function addGame() {
    const name = newName.trim();
    if (!name) return;
    const g: Game = {
      id: slugify(name, state!.games.map((x) => x.id)),
      name,
      type: newType,
      format: newFormat.trim() || (newType === "race" ? "Race · Leaderboard" : newType === "double" ? "Double Elimination" : "Single Elimination"),
      bracket: emptyBracket(newType === "bracket" ? parseInt(newSize, 10) : 4),
      ...(newType === "race" ? { race: { goalLabel: "Eerste bij het doel", target: 20, participants: [] } } : {}),
      ...(newType === "double" ? { double: emptyDouble() } : {}),
    };
    setImageBusy(true);
    g.image = (await fetchImage(g.id, name).catch(() => null)) ?? undefined;
    setImageBusy(false);
    updateGames([...state!.games, g]);
    window.location.hash = g.id;
    setAddOpen(false);
    setNewName("");
    setNewFormat("");
  }

  async function refreshImage() {
    setImageBusy(true);
    const image = await fetchImage(game.id, game.name).catch(() => null);
    setImageBusy(false);
    if (image) {
      updateGames(state!.games.map((g) => (g.id === game.id ? { ...g, image } : g)));
    } else {
      alert(`Geen afbeelding gevonden voor "${game.name}".`);
    }
  }

  function removeGame(g: Game) {
    if (!confirm(`Spel "${g.name}" en het bijbehorende bracket verwijderen?`)) return;
    updateGames(state!.games.filter((x) => x.id !== g.id));
    if (game.id === g.id) window.location.hash = state!.games.find((x) => x.id !== g.id)?.id ?? "";
  }

  function resize(newSizeValue: number) {
    const names = game.bracket.rounds[0].flatMap((m) => m.teams.map((t) => t.name)).filter(Boolean);
    const hasScores = game.bracket.rounds.some((rnd) => rnd.some((m) => m.teams.some((t) => t.score != null)));
    const dropped = Math.max(0, names.length - newSizeValue);
    if (hasScores || dropped > 0) {
      const warn = [
        hasScores ? "alle scores worden gewist" : "",
        dropped > 0 ? `${dropped} deelnemer(s) vervallen` : "",
      ].filter(Boolean).join(" en ");
      if (!confirm(`Bracket naar ${newSizeValue} deelnemers: ${warn}. Doorgaan?`)) return;
    }
    const bracket = emptyBracket(newSizeValue);
    names.slice(0, newSizeValue).forEach((name, i) => {
      bracket.rounds[0][Math.floor(i / 2)].teams[i % 2].name = name;
    });
    setBracket(bracket);
  }

  const icon = game.id.startsWith("cs2")
    ? { bg: "#f0a31b", txt: "CS2" }
    : { bg: logoColor(game.name), txt: gameInitials(game.name) };

  return (
    <div>
      {/* game tabs */}
      <div className="mb-5 flex flex-wrap items-center gap-2 border-b border-slate-700">
        {state.games.map((g) => (
          <a
            key={g.id}
            href={`#${g.id}`}
            className={`relative top-px flex cursor-pointer items-center gap-2 rounded-t-md border border-b-0 px-4 py-2 text-xs font-bold uppercase tracking-wide ${
              g.id === game.id
                ? "border-lime-400 bg-slate-950 text-lime-400"
                : "border-slate-700 bg-slate-800 text-slate-400 hover:text-slate-100"
            }`}
          >
            {g.image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={g.image} alt="" className="h-4 w-4 rounded-sm object-cover" />
            ) : (
              <span className="h-2 w-2 rounded-sm" style={{ background: logoColor(g.name) }} />
            )}
            {g.name}
            {isAdmin && state.games.length > 1 && (
              <button
                onClick={(e) => { e.preventDefault(); removeGame(g); }}
                title="Spel verwijderen"
                className="cursor-pointer pl-0.5 text-slate-400 hover:text-red-500"
              >
                ×
              </button>
            )}
          </a>
        ))}
        {isAdmin && (
          <button
            onClick={() => setAddOpen(true)}
            className="relative top-px cursor-pointer rounded-t-md border border-b-0 border-dashed border-slate-700 bg-slate-800 px-4 py-2 text-xs font-bold text-lime-400 hover:bg-lime-400/10"
          >
            + Spel toevoegen
          </button>
        )}
      </div>

      {/* titel + prize pool */}
      <div className="mb-3.5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3.5">
          {game.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={game.image} alt={game.name} className="h-10 w-10 shrink-0 rounded-md object-cover" />
          ) : (
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md text-sm font-extrabold text-slate-950" style={{ background: icon.bg }}>
              {icon.txt}
            </div>
          )}
          <div>
            <h1 className="text-xl font-extrabold uppercase tracking-wide md:text-2xl">
              {game.type === "race" ? game.name
                : game.type === "double" ? `${game.name}: Double Elimination`
                : `${game.name}: ${teamCount(game.bracket)}-Team Bracket`}
            </h1>
            <div className="text-[11px] uppercase tracking-[1.5px] text-slate-400">
              {game.format || "Single Elimination"}
            </div>
          </div>
        </div>
        <div className="shrink-0 rounded bg-amber-400 px-4 py-2 text-center leading-tight text-amber-950">
          <div className="text-base font-extrabold">TBD</div>
          <div className="text-[9px] font-semibold uppercase tracking-wide">Prize Pool</div>
        </div>
      </div>

      {game.type === "race" ? (
        <RaceView game={game} isAdmin={isAdmin} onRaceChange={setRace} />
      ) : game.type === "double" ? (
        <DoubleBracketView game={game} isAdmin={isAdmin} onDoubleChange={setDouble} />
      ) : (
        <BracketView game={game} isAdmin={isAdmin} onBracketChange={setBracket} />
      )}

      {isAdmin && (game.type === "bracket" || !game.type) && (
        <div className="mt-4 max-w-2xl rounded border border-dashed border-slate-700 px-3 py-2 text-[11px] text-slate-400">
          <b className="text-lime-400">Admin mode:</b> vul de namen in bij de eerste ronde en zet de scores per match.
          De winnaar (hoogste score) schuift automatisch door; een lege plek in ronde 1 is een bye.
          Wijzigingen worden automatisch opgeslagen.
          <div className="mt-2 flex items-center gap-3">
            <span className="flex items-center gap-2">
              Bracket-grootte:
              <select
                value={teamCount(game.bracket)}
                onChange={(e) => resize(parseInt(e.target.value, 10))}
                className="rounded border border-slate-700 bg-slate-950 px-2 py-1 text-xs focus:border-lime-400 focus:outline-none"
              >
                {BRACKET_SIZES.map((n) => <option key={n} value={n}>{n} deelnemers</option>)}
              </select>
            </span>
            <button
              onClick={() => void refreshImage()}
              disabled={imageBusy}
              className="cursor-pointer rounded border border-slate-700 px-2 py-1 text-xs text-slate-400 hover:border-lime-400 hover:text-lime-400 disabled:opacity-50"
            >
              {imageBusy ? "Zoeken…" : "🔍 Plaatje zoeken"}
            </button>
          </div>
        </div>
      )}

      {/* add game modal */}
      {addOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70"
          onClick={(e) => { if (e.target === e.currentTarget) setAddOpen(false); }}
        >
          <div className="w-80 rounded-md border border-slate-700 border-t-2 border-t-lime-400 bg-slate-900 p-7">
            <h3 className="text-sm font-extrabold uppercase tracking-wide">Spel toevoegen</h3>
            <p className="mb-4 text-[11px] text-slate-400">Maak een nieuw bracket aan voor een ander spel.</p>
            <input
              autoFocus
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Spelnaam (bijv. Trackmania)"
              maxLength={40}
              className="mb-3 w-full rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm focus:border-lime-400 focus:outline-none"
            />
            <input
              value={newFormat}
              onChange={(e) => setNewFormat(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") addGame(); }}
              placeholder="Format (bijv. 1v1 · Single Elimination)"
              maxLength={60}
              className="mb-3 w-full rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm focus:border-lime-400 focus:outline-none"
            />
            <select
              value={newType}
              onChange={(e) => setNewType(e.target.value as "bracket" | "race" | "double")}
              className="mb-3 w-full rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm focus:border-lime-400 focus:outline-none"
            >
              <option value="bracket">Bracket (knock-out)</option>
              <option value="double">Double elimination (4 teams, winner + loser bracket)</option>
              <option value="race">Race / leaderboard (bijv. eerste op level 20)</option>
            </select>
            {newType === "bracket" && (
              <select
                value={newSize}
                onChange={(e) => setNewSize(e.target.value)}
                className="mb-3 w-full rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm focus:border-lime-400 focus:outline-none"
              >
                {BRACKET_SIZES.map((n) => <option key={n} value={n}>{n} deelnemers</option>)}
              </select>
            )}
            <div className="flex justify-end gap-2">
              <button onClick={() => setAddOpen(false)} className="cursor-pointer rounded border border-lime-400 px-3.5 py-1.5 text-[11px] font-bold uppercase text-lime-400 hover:bg-lime-400/10">
                Annuleren
              </button>
              <button onClick={addGame} className="cursor-pointer rounded bg-lime-400 px-3.5 py-1.5 text-[11px] font-bold uppercase text-lime-950 hover:bg-lime-300">
                Toevoegen
              </button>
            </div>
          </div>
        </div>
      )}

      {/* save toast */}
      {saveStatus !== "idle" && (
        <div className={`fixed bottom-4 left-1/2 z-40 -translate-x-1/2 rounded border px-4 py-1.5 text-[11px] font-bold tracking-wide ${
          saveStatus === "saved" ? "border-lime-400 bg-slate-800 text-lime-400" : "border-red-500 bg-slate-800 text-red-500"
        }`}>
          {saveStatus === "saved" ? "✓ Opgeslagen — live over ±1 min" : "Opslaan mislukt"}
        </div>
      )}
    </div>
  );
}
