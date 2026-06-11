"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { BRACKET_SIZES, doubleToBracket, emptyBracket, emptyDouble, entryCount, gameInitials, logoColor, normalizeDouble, slugify, teamCount, wipeBracket, wipeDouble } from "@/lib/bracket";
import { dugoutNames } from "@/lib/users";
import type { DragPayload } from "@/lib/dnd";
import { useTournament } from "@/lib/store";
import type { Bracket, DoubleBracket, Game, Race } from "@/lib/types";
import BracketView from "./BracketView";
import DoubleBracketView from "./DoubleBracketView";
import Dugout from "./Dugout";
import GameStoreBanner from "./GameStoreBanner";
import RaceView from "./RaceView";

export default function HomeView() {
  const { state, isAdmin, updateGames, saveStatus, fetchImage, fetchStore } = useTournament();
  const [imageBusy, setImageBusy] = useState(false);
  const [storeBusy, setStoreBusy] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newFormat, setNewFormat] = useState("");
  const [newSize, setNewSize] = useState("8");
  const [newType, setNewType] = useState<"bracket" | "race" | "double">("bracket");
  const [newEntryType, setNewEntryType] = useState<"user" | "team">("user");
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
      ...(newType !== "race" ? { entryType: newEntryType } : {}),
      format: newFormat.trim() || (
        newType === "race" ? "Race · Leaderboard"
        : newType === "double" ? "Double Elimination"
        : "Single Elimination"),
      bracket: emptyBracket(newType === "bracket" ? parseInt(newSize, 10) : 4),
      ...(newType === "race" ? { race: { goalLabel: "Eerste bij het doel", target: 20, participants: [] } } : {}),
      ...(newType === "double" ? { double: emptyDouble() } : {}),
    };
    setImageBusy(true);
    // plaatje én store-link in één moeite meezoeken (Steam → Epic/GOG → Wikipedia)
    const [image, store] = await Promise.all([
      fetchImage(g.id, name).catch(() => null),
      fetchStore(name).catch(() => null),
    ]);
    g.image = image ?? undefined;
    g.store = store?.store ?? undefined;
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
      patchGame({ image, emoji: undefined });
    } else {
      alert(`Geen afbeelding gevonden voor "${game.name}". Kies via ✏️ Eigen icoon zelf een emoji of afbeelding-URL.`);
    }
  }

  // store-/downloadlink zoeken (Steam → Epic/GOG via CheapShark). De admin
  // bevestigt de gevonden match; niets (goeds) gevonden? Dan zelf een URL
  // plakken (bijv. een Epic-pagina zoals store.epicgames.com/p/fall-guys)
  async function refreshStore() {
    setStoreBusy(true);
    const found = await fetchStore(game.name).catch(() => null);
    setStoreBusy(false);
    if (found && confirm(
      `Gevonden: "${found.matchedName}" bij ${found.store.name}${found.store.price ? ` (${found.store.price})` : " (gratis)"}.\n${found.store.url}\n\nGebruiken als downloadlink?`
    )) {
      patchGame({ store: found.store });
      return;
    }
    const url = prompt(
      `${found ? "Oké — plak" : `"${game.name}" niet (betrouwbaar) gevonden bij Steam/Epic/GOG. Plak`} zelf een store-/download-URL (bijv. een Epic-pagina).\nLeeg laten = geen downloadbanner.`,
      game.store?.url ?? "",
    )?.trim();
    if (url == null) return;
    if (!url) {
      patchGame({ store: undefined });
      return;
    }
    if (!/^https?:\/\//i.test(url)) {
      alert("Dat lijkt geen URL.");
      return;
    }
    const host = new URL(url).hostname;
    const naam = host.includes("epicgames") ? "Epic Games"
      : host.includes("steampowered") ? "Steam"
      : host.includes("gog.com") ? "GOG"
      : host.includes("battle.net") ? "Battle.net"
      : host.includes("riotgames") ? "Riot Games"
      : host.replace(/^www\./, "");
    const price = prompt("Prijs (leeg = gratis):", game.store?.price ?? "")?.trim() || undefined;
    patchGame({ store: { name: naam, url, ...(price ? { price } : {}) } });
  }

  // alles leeg, opbouw blijft: spelers komen vanzelf terug in de dugout
  function wipe() {
    if (!confirm(
      `Bracket van "${game.name}" wipen?\n\nAlle namen en scores worden gewist; de opbouw (rondes, slots, lijnen en labels) blijft staan. De spelers komen terug in de dugout.`
    )) return;
    if (game.type === "double") patchGame({ double: wipeDouble(game.double) });
    else patchGame({ bracket: wipeBracket(game.bracket) });
  }

  // zelf een icoon kiezen: een emoji, of een URL/pad naar een afbeelding
  function setCustomIcon() {
    const v = prompt(
      "Typ een emoji (bijv. 🏴‍☠️) of plak een afbeelding-URL.\nLeeg laten = terug naar de standaard initialen.",
      game.emoji ?? game.image ?? "",
    )?.trim();
    if (v == null) return;
    if (!v) {
      patchGame({ image: undefined, emoji: undefined });
    } else if (/^(https?:\/\/|\/)/i.test(v)) {
      patchGame({ image: v, emoji: undefined });
    } else if (v.length <= 10 && !/\s/.test(v)) {
      patchGame({ emoji: v, image: undefined });
    } else {
      alert("Dat lijkt geen emoji of afbeelding-URL.");
    }
  }

  // nieuwe deelnemer op een race-tab; toernooien vullen zichzelf via users/teams
  function addPlayer() {
    const name = newPlayer.trim();
    if (!name || game.type !== "race") return;
    const race = game.race ?? { goalLabel: "Doel", target: 20, participants: [] };
    if (race.participants.some((p) => p.name.toLowerCase() === name.toLowerCase())) {
      alert(`"${name}" doet al mee.`);
      return;
    }
    setRace({ ...race, participants: [...race.participants, { name, progress: 0 }] });
    setNewPlayer("");
  }

  // slot leegmaken = de speler verschijnt vanzelf weer in de afgeleide dugout
  function returnToDugout(p: DragPayload) {
    if (p.from !== "slot") return;
    if (game.type === "double") {
      const d: DoubleBracket = JSON.parse(JSON.stringify(normalizeDouble(game.double)));
      const slot = d.w[0][p.m]?.teams[p.s];
      if (!slot || slot.name !== p.name) return;
      slot.name = "";
      slot.score = null;
      patchGame({ double: d });
    } else {
      const b: Bracket = JSON.parse(JSON.stringify(game.bracket));
      const slot = b.rounds[p.r]?.[p.m]?.teams[p.s];
      if (!slot || slot.name !== p.name) return;
      slot.name = "";
      slot.score = null;
      patchGame({ bracket: b });
    }
  }

  // double elimination → vrij bewerkbaar bracket: indeling, scores en alle
  // lijnen (winnaar + verliezer) blijven exact staan, daarna is alles aanpasbaar
  function convertDoubleToBracket() {
    if (!confirm(
      "Om rondes, wedstrijden en lijntjes zelf te bewerken wordt dit double-elimination bracket omgezet naar een vrij bewerkbaar bracket.\n\n" +
      "De huidige indeling, scores en alle lijnen (groen = winnaar, rood = verliezer) blijven staan. Daarna beheer je de opbouw volledig zelf via 🔧 Bracket bewerken. Doorgaan?"
    )) return;
    patchGame({ type: "bracket", bracket: doubleToBracket(game.double), double: undefined });
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
    patchGame({ bracket }); // wie niet past komt vanzelf terug in de afgeleide dugout
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
    patchGame({ double }); // wie niet past komt vanzelf terug in de afgeleide dugout
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
            ) : g.emoji ? (
              <span className="text-sm leading-none">{g.emoji}</span>
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
          ) : game.emoji ? (
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-slate-800 text-2xl">
              {game.emoji}
            </div>
          ) : (
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md text-sm font-extrabold text-slate-950" style={{ background: icon.bg }}>
              {icon.txt}
            </div>
          )}
          <div>
            <h1 className="flex items-center gap-2 text-xl font-extrabold uppercase tracking-wide md:text-2xl">
              {game.type === "race" ? game.name
                : game.type === "double" ? `${game.name}: Double Elimination`
                : `${game.name}: ${entryCount(game.bracket)}-Team Bracket`}
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

      {isAdmin && game.type === "race" && (
        <form
          onSubmit={(e) => { e.preventDefault(); addPlayer(); }}
          className="mb-4 flex max-w-md items-center gap-2 rounded-md border border-dashed border-lime-400/40 bg-lime-400/5 px-3 py-2.5"
        >
          <span className="text-sm">➕</span>
          <input
            value={newPlayer}
            onChange={(e) => setNewPlayer(e.target.value)}
            placeholder="Nieuwe speler of team aanmelden…"
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
          names={dugoutNames(game, state)}
          isAdmin={isAdmin}
          entryType={game.entryType === "team" ? "team" : "user"}
          onReturn={returnToDugout}
        />
      )}

      {game.type === "race" ? (
        <RaceView game={game} isAdmin={isAdmin} onRaceChange={setRace} />
      ) : game.type === "double" ? (
        <>
          {isAdmin && (
            <div className="mb-3">
              <button
                onClick={convertDoubleToBracket}
                className="cursor-pointer rounded border border-slate-700 px-3 py-1.5 text-[11px] font-bold uppercase tracking-wide text-slate-400 hover:border-lime-400 hover:text-lime-400"
              >
                🔧 Bracket bewerken (zet om naar vrij bracket)
              </button>
            </div>
          )}
          <DoubleBracketView game={game} isAdmin={isAdmin} onUpdate={patchGame} />
        </>
      ) : (
        <BracketView game={game} isAdmin={isAdmin} onUpdate={patchGame} />
      )}

      {isAdmin && (
        <div className="mt-4 max-w-2xl rounded border border-dashed border-slate-700 px-3 py-2 text-[11px] text-slate-400">
          <b className="text-lime-400">Admin mode:</b>{" "}
          {game.type === "race" ? (
            <>zet de voortgang per deelnemer; wie het doel haalt wint.</>
          ) : (
            <>sleep spelers uit de <b>dugout</b> (via het gekleurde blokje) naar een leeg slot en terug.
            Vul de scores in — elke eindpositie schuift automatisch door langs zijn eigen lijn.</>
          )}
          {(game.type === "bracket" || !game.type) && (
            <> Met <b>🔧 Bracket bewerken</b> bepaal je alles zelf: rondes, wedstrijden, het aantal
            speler-slots per wedstrijd (+ slot voor velden van 3, 4, …) en per positie het lijntje
            (nr 1 groen, nr 2 rood). Het teamaantal in de titel volgt de opbouw automatisch.</>
          )}
          {game.type === "double" && (
            <> Wil je rondes of lijntjes aanpassen? Gebruik <b>🔧 Bracket bewerken</b> boven het bracket
            om het om te zetten naar een vrij bewerkbaar bracket.</>
          )}
          {" "}Wijzigingen worden automatisch opgeslagen.
          <div className="mt-2 flex flex-wrap items-center gap-3">
            {game.type !== "race" && (
              <span className="flex items-center gap-2">
                Deelname:
                <select
                  value={game.entryType ?? "user"}
                  onChange={(e) => patchGame({ entryType: e.target.value as "user" | "team" })}
                  className="rounded border border-slate-700 bg-slate-950 px-2 py-1 text-xs focus:border-lime-400 focus:outline-none"
                >
                  <option value="user">per speler</option>
                  <option value="team">per team</option>
                </select>
              </span>
            )}
            {game.type !== "race" && (
              <span className="flex items-center gap-2">
                Snel opzetten (vervangt opbouw):
                <select
                  value={game.type === "double" ? normalizeDouble(game.double).w[0].length * 2 : teamCount(game.bracket)}
                  onChange={(e) => (game.type === "double" ? resizeDouble : resize)(parseInt(e.target.value, 10))}
                  className="rounded border border-slate-700 bg-slate-950 px-2 py-1 text-xs focus:border-lime-400 focus:outline-none"
                >
                  {BRACKET_SIZES.map((n) => <option key={n} value={n}>{n} {game.type === "double" ? "teams" : "deelnemers"}</option>)}
                </select>
              </span>
            )}
            <button
              onClick={() => void refreshImage()}
              disabled={imageBusy}
              className="cursor-pointer rounded border border-slate-700 px-2 py-1 text-xs text-slate-400 hover:border-lime-400 hover:text-lime-400 disabled:opacity-50"
            >
              {imageBusy ? "Zoeken…" : "🔍 Plaatje zoeken"}
            </button>
            <button
              onClick={setCustomIcon}
              className="cursor-pointer rounded border border-slate-700 px-2 py-1 text-xs text-slate-400 hover:border-lime-400 hover:text-lime-400"
            >
              ✏️ Eigen icoon
            </button>
            <button
              onClick={() => void refreshStore()}
              disabled={storeBusy}
              className="cursor-pointer rounded border border-slate-700 px-2 py-1 text-xs text-slate-400 hover:border-lime-400 hover:text-lime-400 disabled:opacity-50"
            >
              {storeBusy ? "Zoeken…" : "🛒 Store zoeken"}
            </button>
            {game.type !== "race" && (
              <button
                onClick={wipe}
                title="Alle namen en scores wissen; rondes, slots, lijnen en labels blijven staan"
                className="cursor-pointer rounded border border-slate-700 px-2 py-1 text-xs text-slate-400 hover:border-red-500 hover:text-red-500"
              >
                🧹 Wipe bracket
              </button>
            )}
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
              <option value="bracket">Bracket (vrij in te delen: knock-out, velden van 3+, afvalrace)</option>
              <option value="double">Double elimination (winner + loser bracket)</option>
              <option value="race">Vrij format / leaderboard (elk aantal spelers — bijv. Commander, race)</option>
            </select>
            {newType !== "race" && (
              <select
                value={newEntryType}
                onChange={(e) => setNewEntryType(e.target.value as "user" | "team")}
                className="mb-3 w-full rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm focus:border-lime-400 focus:outline-none"
              >
                <option value="user">Deelname per speler</option>
                <option value="team">Deelname per team</option>
              </select>
            )}
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
