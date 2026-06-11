"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import {
  addLosersBracket, addMatch, addRound, addSlot, fedSlots, logoColor, outsOf, propagate,
  rankingOf, removeMatch, removeRound, removeSlot, roundTitle, seedOf, seedPairs, setLink, teamCount,
} from "@/lib/bracket";
import { getDragPayload, setDragPayload } from "@/lib/dnd";
import CoffeeHint from "./CoffeeHint";
import type { Bracket, Game, SlotRef } from "@/lib/types";

type Line = { left: number; top: number; width: number; height: number; rank: number };

// lijnkleur per eindpositie: nummer 1 groen, nummer 2 rood, daarna blauw
const LINE_COLORS = ["bg-lime-500/40", "bg-red-500/35", "bg-sky-500/35"];
const lineColor = (rank: number) => LINE_COLORS[Math.min(rank, LINE_COLORS.length - 1)];

type Props = {
  game: Game;
  isAdmin: boolean;
  onUpdate: (patch: Partial<Game>) => void;
};

export default function BracketView({ game, isAdmin, onUpdate }: Props) {
  const bracket = propagate(game.bracket);
  const totalRounds = bracket.rounds.length;
  const teams = teamCount(bracket);
  const pairs = seedPairs(teams);
  const fed = fedSlots(bracket);

  const containerRef = useRef<HTMLDivElement>(null);
  const matchRefs = useRef(new Map<string, HTMLDivElement>());
  const rowRefs = useRef(new Map<string, HTMLDivElement>());
  const [lines, setLines] = useState<Line[]>([]);
  const [editStructure, setEditStructure] = useState(false);
  const [linkFrom, setLinkFrom] = useState<{ r: number; m: number; rank: number } | null>(null);
  const [dropOver, setDropOver] = useState<string | null>(null);

  const recompute = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;
    const origin = container.getBoundingClientRect();
    const next: Line[] = [];

    bracket.rounds.forEach((round, r) =>
      round.forEach((match, m) => {
        const srcEl = matchRefs.current.get(`${r}-${m}`);
        if (!srcEl) return;
        outsOf(bracket, r, m).forEach((t, rank) => {
          if (!t) return;
          const dstEl = matchRefs.current.get(`${t.r}-${t.m}`);
          if (!dstEl) return;
          const line = (left: number, top: number, width: number, height: number) =>
            next.push({ left, top, width: Math.max(width, 1.5), height: Math.max(height, 1.5), rank });
          const src = srcEl.getBoundingClientRect();
          const dst = dstEl.getBoundingClientRect();
          // doel-Y op de echte slot-rij (klopt ook met labels en +slot-knoppen)
          const rowEl = rowRefs.current.get(`${t.r}-${t.m}-${t.s}`);
          const row = rowEl?.getBoundingClientRect();
          const dstSlots = bracket.rounds[t.r][t.m].teams.length;
          const srcY = src.top + src.height / 2 - origin.top;
          const dstY = (row ? row.top + row.height / 2 : dst.top + (dst.height * (t.s + 0.5)) / dstSlots) - origin.top;
          const srcX = src.right - origin.left;
          const dstX = dst.left - origin.left;
          const midX = (srcX + dstX) / 2;
          line(srcX, srcY, midX - srcX, 0);
          line(midX, Math.min(srcY, dstY), 0, Math.abs(dstY - srcY));
          line(midX, dstY, dstX - midX, 0);
        });
      })
    );
    setLines(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [game, isAdmin, editStructure]);

  useLayoutEffect(recompute, [recompute]);
  useEffect(() => {
    window.addEventListener("resize", recompute);
    return () => window.removeEventListener("resize", recompute);
  }, [recompute]);

  // Escape annuleert het lijntje leggen
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setLinkFrom(null); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  function setName(r: number, m: number, s: number, name: string) {
    const b: Bracket = JSON.parse(JSON.stringify(game.bracket));
    b.rounds[r][m].teams[s].name = name.trim();
    onUpdate({ bracket: b });
  }

  function renameSlot(r: number, m: number, s: number, current: string) {
    const name = prompt("Naam aanpassen:", current)?.trim();
    if (!name || name === current) return;
    setName(r, m, s, name);
  }

  // kopje boven het vakje, bijv. winner/loser ronde — tik in bewerkmodus
  function editLabel(r: number, m: number) {
    const current = game.bracket.rounds[r][m].label ?? "";
    const label = prompt('Label voor deze wedstrijd — bijv. "🏆 Winner ronde" of "💀 Loser ronde".\nLeeg laten = geen label.', current);
    if (label == null) return;
    const b: Bracket = JSON.parse(JSON.stringify(game.bracket));
    b.rounds[r][m].label = label.trim() || undefined;
    onUpdate({ bracket: b });
  }

  function setScore(r: number, m: number, s: number, value: string) {
    const b: Bracket = JSON.parse(JSON.stringify(propagate(game.bracket)));
    b.rounds[r][m].teams[s].score = value === "" ? null : Math.max(0, parseInt(value, 10) || 0);
    onUpdate({ bracket: b });
  }

  function handleSlotDrop(e: React.DragEvent, r: number, m: number, s: number) {
    e.preventDefault();
    setDropOver(null);
    const p = getDragPayload(e);
    if (!p) return;
    const b: Bracket = JSON.parse(JSON.stringify(game.bracket));
    const slot = b.rounds[r]?.[m]?.teams[s];
    if (!slot || slot.name) return;
    slot.name = p.name;
    slot.score = null;
    if (p.from === "slot") {
      const src = b.rounds[p.r]?.[p.m]?.teams[p.s];
      if (src && src.name === p.name) {
        src.name = "";
        src.score = null;
      }
    }
    onUpdate({ bracket: b }); // de dugout is afgeleid en past zichzelf aan
  }

  function structAddRound() {
    onUpdate({ bracket: addRound(game.bracket) });
  }

  // in één klik een double elimination maken van de huidige knock-out
  function structAddLosersBracket() {
    const result = addLosersBracket(game.bracket);
    if ("error" in result) {
      alert(result.error);
      return;
    }
    if (!confirm(
      "Dit bouwt onder het huidige bracket een volledig losers bracket + grand finals (double elimination), " +
      "met alle winnaar- en verliezer-lijnen. Bestaande wedstrijden en scores blijven staan. Doorgaan?"
    )) return;
    setLinkFrom(null);
    onUpdate({ bracket: result });
  }

  // verwijderde spelers verschijnen vanzelf weer in de afgeleide dugout
  function structRemoveMatch(r: number, m: number) {
    const match = bracket.rounds[r][m];
    const hasData = match.teams.some((t) => t.name || t.score != null);
    if (hasData && !confirm("Deze wedstrijd bevat namen of scores. Verwijderen? Geplaatste spelers komen terug in de dugout.")) return;
    setLinkFrom(null);
    onUpdate({ bracket: removeMatch(game.bracket, r, m) });
  }

  function structRemoveRound(r: number) {
    const round = bracket.rounds[r];
    const hasData = round.some((mm) => mm.teams.some((t) => t.name || t.score != null));
    if (hasData && !confirm(`Ronde ${r + 1} bevat namen of scores. Hele ronde verwijderen? Geplaatste spelers komen terug in de dugout.`)) return;
    setLinkFrom(null);
    onUpdate({ bracket: removeRound(game.bracket, r) });
  }

  function structRemoveSlot(r: number, m: number, s: number) {
    const team = bracket.rounds[r][m].teams[s];
    if (team.name && !confirm(`Slot van "${team.name}" verwijderen? De speler komt terug in de dugout.`)) return;
    setLinkFrom(null);
    onUpdate({ bracket: removeSlot(game.bracket, r, m, s) });
  }

  // lijntje leggen: bron(positie) is gekozen, klik op een slot in een latere
  // ronde. Een handmatige naam in het doelslot wijkt (terug naar de dugout)
  function clickSlotForLink(r: number, m: number, s: number) {
    if (!linkFrom || r <= linkFrom.r) return;
    const b = setLink(game.bracket, linkFrom, { r, m, s }, linkFrom.rank);
    const slot = b.rounds[r][m].teams[s];
    if (slot.name && !fed.has(`${r}-${m}-${s}`)) {
      slot.name = "";
      slot.score = null;
    }
    onUpdate({ bracket: b });
    setLinkFrom(null);
  }

  const gf = bracket.rounds[totalRounds - 1]?.[0];
  const champRanking = gf ? rankingOf(gf, totalRounds === 1) : [];
  const curLinkTarget = linkFrom ? outsOf(bracket, linkFrom.r, linkFrom.m)[linkFrom.rank] : null;

  return (
    <div>
      {isAdmin && (
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <button
            onClick={() => { setEditStructure((v) => !v); setLinkFrom(null); }}
            className={`cursor-pointer rounded border px-3 py-1.5 text-[11px] font-bold uppercase tracking-wide ${
              editStructure
                ? "border-lime-400 bg-lime-400/10 text-lime-400"
                : "border-slate-700 text-slate-400 hover:border-lime-400 hover:text-lime-400"
            }`}
          >
            {editStructure ? "✓ Klaar met bewerken" : "🔧 Bracket bewerken"}
          </button>
          {editStructure && (
            <button
              onClick={structAddLosersBracket}
              title="Bouwt een losers bracket + grand finals onder het huidige bracket (double elimination) — werkt met elke opbouw"
              className="cursor-pointer rounded border border-red-400/50 px-3 py-1.5 text-[11px] font-bold uppercase tracking-wide text-red-400 hover:bg-red-400/10"
            >
              ➕ Verliezersbracket genereren
            </button>
          )}
          {editStructure && !linkFrom && (
            <span className="text-[11px] text-slate-400">
              Rondes, wedstrijden en speler-slots vrij in te delen. Lijntje leggen: klik het <b className="text-sky-400">→</b>-knopje
              naast een positie (nr 1 groen, nr 2 rood, …) en daarna het doel-slot.
            </span>
          )}
          {linkFrom && (
            <span className="flex items-center gap-2 rounded border border-sky-400/50 bg-sky-400/10 px-2.5 py-1 text-[11px] text-sky-200">
              Klik op een team-slot in een latere ronde: daar stroomt <b>nummer {linkFrom.rank + 1}</b> van deze wedstrijd naartoe.
              <button
                onClick={() => { onUpdate({ bracket: setLink(game.bracket, linkFrom, null, linkFrom.rank) }); setLinkFrom(null); }}
                className="cursor-pointer rounded border border-sky-400/60 px-1.5 py-0.5 font-bold hover:bg-sky-400/20"
              >
                ⊘ Geen lijn
              </button>
              <button
                onClick={() => setLinkFrom(null)}
                className="cursor-pointer rounded border border-slate-500 px-1.5 py-0.5 hover:bg-slate-700"
              >
                Annuleren
              </button>
            </span>
          )}
        </div>
      )}

      <div
        ref={containerRef}
        className="relative flex min-w-[230px] gap-14 pb-5"
        style={{ minWidth: (totalRounds + (editStructure ? 1 : 0)) * 250 }}
      >
        {lines.map((l, i) => (
          <div key={i} className={`pointer-events-none absolute ${lineColor(l.rank)}`} style={{ left: l.left, top: l.top, width: l.width, height: l.height }} />
        ))}

        {bracket.rounds.map((matches, r) => {
          const isFinal = r === totalRounds - 1;
          return (
            <div key={r} className="flex min-w-[200px] flex-1 flex-col">
              <div className={`mb-3.5 flex items-center gap-2 text-xs font-bold ${isFinal ? "justify-center font-extrabold uppercase tracking-wide text-slate-100" : "text-slate-400"}`}>
                {isFinal && !editStructure ? "Grand Finals" : roundTitle(r, totalRounds, teams)}
                {editStructure && totalRounds > 1 && (
                  <button
                    onClick={() => structRemoveRound(r)}
                    title="Ronde verwijderen"
                    className="cursor-pointer rounded border border-slate-700 px-1.5 text-[10px] text-slate-400 hover:border-red-500 hover:text-red-500"
                  >
                    × ronde
                  </button>
                )}
              </div>
              <div className="flex flex-1 flex-col justify-around gap-4">
                {matches.map((match, m) => {
                  const ranking = rankingOf(match, r === 0);
                  const decided = ranking.length > 0;
                  const outs = outsOf(bracket, r, m);
                  const namedCount = match.teams.filter((t) => t.name).length;
                  return (
                    <div
                      key={m}
                      ref={(el) => { if (el) matchRefs.current.set(`${r}-${m}`, el); else matchRefs.current.delete(`${r}-${m}`); }}
                      className={`relative z-10 rounded border bg-slate-800 ${
                        linkFrom?.r === r && linkFrom?.m === m ? "border-sky-400 shadow-[0_0_12px_rgba(56,189,248,0.25)]"
                        : isFinal ? "border-amber-400 shadow-[0_0_18px_rgba(251,191,36,0.15)]"
                        : "border-slate-700"
                      }`}
                    >
                      {editStructure && (
                        <button
                          onClick={() => structRemoveMatch(r, m)}
                          title="Wedstrijd verwijderen"
                          className="absolute -right-2 -top-2 z-20 flex h-5 w-5 cursor-pointer items-center justify-center rounded-full border border-slate-600 bg-slate-900 text-[11px] leading-none text-slate-400 hover:border-red-500 hover:text-red-500"
                        >
                          ×
                        </button>
                      )}
                      {(match.label || editStructure) && (
                        <div
                          onClick={isAdmin && editStructure ? () => editLabel(r, m) : undefined}
                          title={isAdmin && editStructure ? "Tik om het label aan te passen (bijv. 🏆 winner / 💀 loser ronde)" : undefined}
                          className={`border-b border-slate-700 px-2.5 py-1 text-[9px] font-extrabold uppercase tracking-wide ${
                            match.label ? "text-slate-400" : "italic normal-case text-slate-600"
                          } ${isAdmin && editStructure ? "cursor-pointer hover:bg-slate-700/60 hover:text-lime-400" : ""}`}
                        >
                          {match.label ?? "🏷️ label…"}
                        </div>
                      )}
                      {match.teams.map((team, s) => {
                        const slotKey = `${r}-${m}-${s}`;
                        const free = !fed.has(slotKey);
                        const isBye = r === 0 && !team.name && namedCount > 0;
                        const won = decided && ranking[0] === s;
                        const lost = decided && ranking[0] !== s && !!team.name;
                        const seed = r === 0 ? pairs[m]?.[s] ?? "" : seedOf(bracket, team.name);
                        const scorable = namedCount >= 2 && !!team.name;
                        const linkTarget = !!linkFrom && r > linkFrom.r;
                        const isCurTarget = !!curLinkTarget && curLinkTarget.r === r && curLinkTarget.m === m && curLinkTarget.s === s;
                        const droppable = isAdmin && free && !team.name && !linkFrom;
                        const draggable = isAdmin && free && !!team.name && !linkFrom;
                        const isLinkSrc = linkFrom?.r === r && linkFrom?.m === m && linkFrom?.rank === s;
                        const hasOut = !!outs[s];
                        return (
                          <div
                            key={s}
                            ref={(el) => { if (el) rowRefs.current.set(slotKey, el); else rowRefs.current.delete(slotKey); }}
                            onClick={linkTarget ? () => clickSlotForLink(r, m, s) : undefined}
                            onDragOver={droppable ? (e) => { e.preventDefault(); setDropOver(slotKey); } : undefined}
                            onDragLeave={droppable ? () => setDropOver(null) : undefined}
                            onDrop={droppable ? (e) => handleSlotDrop(e, r, m, s) : undefined}
                            className={`relative flex min-h-9 items-center gap-2 px-2.5 py-1.5 ${s > 0 ? "border-t border-slate-700" : ""} ${won ? "bg-slate-700/60" : ""} ${
                              linkTarget ? "cursor-crosshair hover:bg-sky-400/20" : ""
                            } ${isCurTarget ? "bg-sky-400/20" : ""} ${
                              dropOver === slotKey ? "bg-lime-400/20 outline outline-1 outline-lime-400" : ""
                            }`}
                          >
                            <span className="w-4 shrink-0 text-right text-[10px] text-slate-400">{seed}</span>
                            {team.name ? (
                              <span
                                draggable={draggable}
                                onDragStart={draggable ? (e) => setDragPayload(e, { name: team.name, from: "slot", r, m, s }) : undefined}
                                title={draggable ? "Sleep naar de dugout of een ander leeg slot" : undefined}
                                className={`flex h-5 w-5 shrink-0 items-center justify-center rounded text-[9px] font-extrabold text-white ${draggable ? "cursor-grab active:cursor-grabbing" : ""}`}
                                style={{ background: logoColor(team.name) }}
                              >
                                {team.name.slice(0, 2).toUpperCase()}
                              </span>
                            ) : (
                              <span className="h-5 w-5 shrink-0 rounded bg-slate-700" />
                            )}
                            {isAdmin && free && !team.name && !linkFrom ? (
                              <input
                                value={team.name}
                                maxLength={24}
                                placeholder="Naam of sleep…"
                                onChange={(e) => setName(r, m, s, e.target.value)}
                                className="min-w-0 flex-1 rounded border border-slate-700 bg-slate-950 px-1.5 py-0.5 text-xs font-semibold focus:border-lime-400 focus:outline-none"
                              />
                            ) : (
                              <span
                                onDoubleClick={isAdmin && free && team.name && !linkFrom ? () => renameSlot(r, m, s, team.name) : undefined}
                                title={isAdmin && free && team.name && !linkFrom ? "Dubbelklik om de naam aan te passen" : undefined}
                                className={`min-w-0 flex-1 truncate text-xs ${team.name ? (won ? "font-bold text-slate-100" : lost ? "font-semibold text-slate-400" : "font-semibold") : "italic text-slate-400"}`}
                              >
                                {team.name || (isBye ? "BYE" : "TBD")}
                              </span>
                            )}
                            {isAdmin && scorable && !linkFrom && !editStructure ? (
                              <input
                                type="number"
                                min={0}
                                max={99}
                                value={team.score ?? ""}
                                placeholder="-"
                                onChange={(e) => setScore(r, m, s, e.target.value)}
                                className="w-10 rounded border border-slate-700 bg-slate-950 px-1 py-0.5 text-center text-xs font-bold [appearance:textfield] focus:border-lime-400 focus:outline-none [&::-webkit-inner-spin-button]:appearance-none"
                              />
                            ) : (
                              <span className={`w-5 text-center text-[13px] font-extrabold ${won ? "text-lime-400" : lost ? "text-slate-400" : ""}`}>
                                {team.score ?? "–"}
                              </span>
                            )}
                            {editStructure && (
                              <>
                                <button
                                  onClick={(e) => { e.stopPropagation(); setLinkFrom(isLinkSrc ? null : { r, m, rank: s }); }}
                                  title={isLinkSrc ? "Lijn leggen annuleren" : `Lijn voor nummer ${s + 1} van deze wedstrijd leggen`}
                                  className={`absolute -right-3 top-1/2 z-20 flex h-5 w-5 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full border text-[11px] leading-none ${
                                    isLinkSrc
                                      ? "border-sky-400 bg-sky-400 text-sky-950"
                                      : hasOut
                                      ? `border-slate-500 bg-slate-900 hover:border-sky-400 ${s === 0 ? "text-lime-400" : s === 1 ? "text-red-400" : "text-sky-400"}`
                                      : "border-slate-600 bg-slate-900 text-slate-500 hover:border-sky-400 hover:text-sky-400"
                                  }`}
                                >
                                  →
                                </button>
                                {match.teams.length > 2 && (
                                  <button
                                    onClick={(e) => { e.stopPropagation(); structRemoveSlot(r, m, s); }}
                                    title="Speler-slot verwijderen"
                                    className="absolute -left-2.5 top-1/2 z-20 flex h-4 w-4 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full border border-slate-600 bg-slate-900 text-[10px] leading-none text-slate-500 hover:border-red-500 hover:text-red-500"
                                  >
                                    −
                                  </button>
                                )}
                              </>
                            )}
                          </div>
                        );
                      })}
                      {editStructure && (
                        <button
                          onClick={() => onUpdate({ bracket: addSlot(game.bracket, r, m) })}
                          title="Extra speler-slot (veld van 3, 4, … spelers)"
                          className="w-full cursor-pointer border-t border-dashed border-slate-700 px-2 py-1 text-[10px] font-bold text-slate-500 hover:bg-lime-400/10 hover:text-lime-400"
                        >
                          + slot
                        </button>
                      )}
                    </div>
                  );
                })}
                {editStructure && (
                  <button
                    onClick={() => onUpdate({ bracket: addMatch(game.bracket, r) })}
                    className="cursor-pointer rounded border border-dashed border-slate-600 px-2 py-2 text-[11px] font-bold text-slate-400 hover:border-lime-400 hover:text-lime-400"
                  >
                    + Wedstrijd
                  </button>
                )}
              </div>
            </div>
          );
        })}

        {editStructure && (
          <div className="flex min-w-[140px] items-center">
            <button
              onClick={structAddRound}
              className="w-full cursor-pointer rounded border border-dashed border-slate-600 px-2 py-6 text-xs font-bold text-slate-400 hover:border-lime-400 hover:text-lime-400"
            >
              + Ronde
            </button>
          </div>
        )}
      </div>

      {champRanking.length > 0 && gf && (
        <>
          <div className="mt-3 text-center text-xs font-extrabold uppercase tracking-wide text-amber-400">
            🏆 Champion: {gf.teams[champRanking[0]].name}
          </div>
          <CoffeeHint>Mooi toernooi gehad? Deze site draait op koffie —</CoffeeHint>
        </>
      )}
    </div>
  );
}
