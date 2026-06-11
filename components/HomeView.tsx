"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { BRACKET_SIZES, emptyBracket, emptyDouble, gameInitials, gameNames, logoColor, normalizeDouble, slugify, teamCount } from "@/lib/bracket";
import type { DragPayload } from "@/lib/dnd";
import { useTournament } from "@/lib/store";
import type { Bracket, DoubleBracket, Game, Race } from "@/lib/types";
import BracketView from "./BracketView";
import DoubleBracketView from "./DoubleBracketView";
import Dugout from "./Dugout";
import GameStoreBanner from "./GameStoreBanner";
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
  const [newPlayer, setNewPlayer] = useState("");

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

  // één gecombineerde update voor de actieve game (bracket + dugout in één keer,
  // anders overschrijven losse updates elkaar)
  function patchGame(patch: Partial<Game>) {
    updateGames(state!.games.map((g) => (g.id === game.id ? { ...g, ...patch } : g)));
  }

  function setRace(race: Race) {
    patchGame({ race });
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

  // nieuwe speler/team op de actieve tab — komt in de dugout (het bracket
  // verandert pas als de admin de speler er zelf in sleept)
  function addPlayer() {
    const name = newPlayer.trim();
    if (!name) return;
    if (game.type === "race") {
      const race = game.race ?? { goalLabel: "Doel", target: 20, participants: [] };
      if (race.participants.some((p) => p.name.toLowerCase() === name.toLowerCase())) {
        alert(`"${name}" doet al mee.`);
        return;
      }
      setRace({ ...race, participants: [...race.participants, { name, progress: 0 }] });
    } else {
      if (gameNames(game).some((n) => n.toLowerCase() === name.toLowerCase())) {
        alert(`"${name}" doet al mee.`);
        return;
      }
      patchGame({ dugout: [...(game.dugout ?? []), name] });
    }
    setNewPlayer("");
  }

  // speler uit een bracket-slot terug op de bank slepen
  function returnToDugout(p: DragPayload) {
    if (p.from !== "slot") return;
    const dugoutNext = [...(game.dugout ?? []), p.name];
    if (game.type === "double") {
      const d: DoubleBracket = JSON.parse(JSON.stringify(normalizeDouble(game.double)));
      const slot = d.w[0][p.m]?.teams[p.s];
      if (!slot || slot.name !== p.name) return;
      slot.name = "";
      slot.score = null;
      patchGame({ double: d, dugout: dugoutNext });
    } else {
      const b: Bracket = JSON.parse(JSON.stringify(game.bracket));
      const slot = b.rounds[p.r]?.[p.m]?.teams[p.s];
      if (!slot || slot.name !== p.name) return;
      slot.name = "";
      slot.score = null;
      patchGame({ bracket: b, dugout: dugoutNext });
    }
  }

  function removeFromDugout(name: string) {
    if (!confirm(`"${name}" uitschrijven?`)) return;
    patchGame({ dugout: (game.dugout ?? []).filter((n) => n !== name) });
  }

  function removeGame(g: Game) {
    if (!confirm(`Spel "${g.name}" en het bijbehorende bracket verwijderen?`)) return;
    updateGames(state!.games.filter((x) => x.id !== g.id));
    if (game.id === g.id) window.location.hash = state!.games.find((x) => x.id !== g.id)?.id ?? "";
  }

  // preset: vervangt de hele opbouw (incl. eigen rondes/lijnen) door een
  // standaard knock-out; deelnemers die niet passen gaan naar de dugout
  function resize(newSizeValue: number) {
    const names = game.bracket.rounds[0].flatMap((m) => m.teams.map((t) => t.name)).filter(Boolean);
    const hasScores = game.bracket.rounds.some((rnd) => rnd.some((m) => m.teams.some((t) => t.score != null)));
    const overflow = names.slice(newSizeValue);
    if (hasScores || overflow.length > 0) {
      const warn = [
        hasScores ? "alle scores worden gewist" : "",
        overflow.length > 0 ? `${overflow.length} deelnemer(s) gaan terug naar de dugout` : "",
      ].filter(Boolean).join(" en ");
      if (!confirm(`Standaard bracket met ${newSizeValue} deelnemers: ${warn}. Eigen rondes en lijntjes vervallen. Doorgaan?`)) return;
    }
    const bracket = emptyBracket(newSizeValue);
    names.slice(0, newSizeValue).forEach((name, i) => {
      bracket.rounds[0][Math.floor(i / 2)].teams[i % 2].name = name;
    });
    patchGame({ bracket, ...(overflow.length ? { dugout: [...(game.dugout ?? []), ...overflow] } : {}) });
  }

  function resizeDouble(newSizeValue: number) {
    const d = normalizeDouble(game.double);
    const names = d.w[0].flatMap((m) => m.teams.map((t) => t.name)).filter(Boolean);
    const hasScores = [...d.w.flat(), ...d.l.flat(), d.gf].some((m) => m.teams.some((t) => t.score != null));
    const overflow = names.slice(newSizeValue);
    if (hasScores || overflow.length > 0) {
      const warn = [
        hasScores ? "alle scores worden gewist" : "",
        overflow.length > 0 ? `${overflow.length} team(s) gaan terug naar de dugout` : "",
      ].filter(Boolean).join(" en ");
      if (!confirm(`Double bracket naar ${newSizeValue} teams: ${warn}. Doorgaan?`)) return;
    }
    const double = emptyDouble(newSizeValue);
    names.slice(0, newSizeValue).forEach((name, i) => {
      double.w[0][Math.floor(i / 2)].teams[i % 2].name = name;
    });
    patchGame({ double, ...(overflow.length ? { dugout: [...(game.dugout ?? []), ...overflow] } : {}) });
  }

  const icon = game.id.startsWith("cs2")
    ? { bg: "#f0a31b", txt: "CS2" }
    : { bg: logoColor(game.name), txt: gameInitials(game.name) };

  return (
    <div>
      {/* game tabs: op mobiel één scrollbare rij, op desktop wrappend */}
      <div className="mb-5 flex items-center gap-2 overflow-x-auto border-b border-slate-700 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden md:flex-wrap md:overflow-visible">
        {state.games.map((g) => (
          <a
            key={g.id}
            href={`#${g.id}`}
            ref={(el) => { if (el && g.id === game.id) el.scrollIntoView({ inline: "center", block: "nearest" }); }}
            className={`relative top-px flex shrink-0 cursor-pointer items-center gap-2 whitespace-nowrap rounded-t-md border border-b-0 px-4 py-2 text-xs font-bold uppercase tracking-wide ${
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
            className="relative top-px shrink-0 cursor-pointer whitespace-nowrap rounded-t-md border border-b-0 border-dashed border-slate-700 bg-slate-800 px-4 py-2 text-xs font-bold text-lime-400 hover:bg-lime-400/10"
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
            <h1 className="flex items-center gap-2 text-xl font-extrabold uppercase tracking-wide md:text-2xl">
              {game.type === "race" ? game.name
                : game.type === "double" ? `${game.name}: Double Elimination`
                : `${game.name}: ${teamCount(game.bracket)}-Team Bracket`}
              {isAdmin && (
                <button
                  onClick={() => {
                    const name = prompt("Nieuwe naam voor dit toernooi:", game.name)?.trim();
                    if (name && name !== game.name) {
                      updateGames(state!.games.map((g) => (g.id === game.id ? { ...g, name } : g)));
                    }
                  }}
                  title="Naam aanpassen"
                  className="cursor-pointer text-sm text-slate-500 hover:text-lime-400"
                >
                  ✏️
                </button>
              )}
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

      <GameStoreBanner game={game} />

      {isAdmin && (
        <form
          onSubmit={(e) => { e.preventDefault(); addPlayer(); }}
          className="mb-4 flex max-w-md items-center gap-2 rounded-md border border-dashed border-lime-400/40 bg-lime-400/5 px-3 py-2.5"
        >
          <span className="text-sm">➕</span>
          <input
            value={newPlayer}
            onChange={(e) => setNewPlayer(e.target.value)}
            placeholder={game.type === "race" ? "Nieuwe speler of team aanmelden…" : "Nieuwe speler of team aanmelden… (komt in de dugout)"}
            maxLength={24}
            className="min-w-0 flex-1 rounded border border-slate-700 bg-slate-950 px-2.5 py-1.5 text-xs font-semibold focus:border-lime-400 focus:outline-none"
          />
          <button
            type="submit"
            disabled={!newPlayer.trim()}
            className="shrink-0 cursor-pointer rounded bg-lime-400 px-3.5 py-1.5 text-[11px] font-extrabold uppercase tracking-wide text-lime-950 hover:bg-lime-300 disabled:opacity-50"
          >
            Toevoegen
          </button>
        </form>
      )}

      {game.type !== "race" && (
        <Dugout
          names={game.dugout ?? []}
          isAdmin={isAdmin}
          onReturn={returnToDugout}
          onRemove={removeFromDugout}
        />
      )}

      {game.type === "race" ? (
        <RaceView game={game} isAdmin={isAdmin} onRaceChange={setRace} />
      ) : game.type === "double" ? (
        <DoubleBracketView game={game} isAdmin={isAdmin} onUpdate={patchGame} />
      ) : (
        <BracketView game={game} isAdmin={isAdmin} onUpdate={patchGame} />
      )}

      {isAdmin && game.type !== "race" && (
        <div className="mt-4 max-w-2xl rounded border border-dashed border-slate-700 px-3 py-2 text-[11px] text-slate-400">
          <b className="text-lime-400">Admin mode:</b> nieuwe aanmeldingen komen in de <b>dugout</b>;
          sleep ze via het gekleurde blokje naar een leeg slot en terug. Vul de scores per match in —
          de winnaar schuift automatisch door langs de lijntjes.
          {(game.type === "bracket" || !game.type) && (
            <> Met <b>🔧 Bracket bewerken</b> voeg je zelf rondes en wedstrijden toe en bepaal je de
            lijntjes (klik de →-knop op een wedstrijd en daarna het doel-slot).</>
          )}
          {" "}Wijzigingen worden automatisch opgeslagen.
          <div className="mt-2 flex items-center gap-3">
            <span className="flex items-center gap-2">
              Standaard-opzet:
              <select
                value={game.type === "double" ? normalizeDouble(game.double).w[0].length * 2 : teamCount(game.bracket)}
                onChange={(e) => (game.type === "double" ? resizeDouble : resize)(parseInt(e.target.value, 10))}
                className="rounded border border-slate-700 bg-slate-950 px-2 py-1 text-xs focus:border-lime-400 focus:outline-none"
              >
                {BRACKET_SIZES.map((n) => <option key={n} value={n}>{n} {game.type === "double" ? "teams" : "deelnemers"}</option>)}
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
              <option value="bracket">Bracket (knock-out, zelf in te delen rondes)</option>
              <option value="double">Double elimination (winner + loser bracket)</option>
              <option value="race">Vrij format / leaderboard (elk aantal spelers — bijv. Commander, race)</option>
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
