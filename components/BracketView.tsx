"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { logoColor, propagate, roundTitle, seedOf, seedPairs, teamCount, winnerIdx } from "@/lib/bracket";
import type { Bracket, Game } from "@/lib/types";

type Line = { left: number; top: number; width: number; height: number };

type Props = {
  game: Game;
  isAdmin: boolean;
  onBracketChange: (bracket: Bracket) => void;
};

export default function BracketView({ game, isAdmin, onBracketChange }: Props) {
  const bracket = propagate(game.bracket);
  const totalRounds = bracket.rounds.length;
  const teams = teamCount(bracket);
  const pairs = seedPairs(teams);

  const containerRef = useRef<HTMLDivElement>(null);
  const matchRefs = useRef(new Map<string, HTMLDivElement>());
  const [lines, setLines] = useState<Line[]>([]);

  const recompute = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;
    const origin = container.getBoundingClientRect();
    const next: Line[] = [];
    const line = (left: number, top: number, width: number, height: number) =>
      next.push({ left, top, width: Math.max(width, 1.5), height: Math.max(height, 1.5) });

    for (let r = 0; r < totalRounds - 1; r++) {
      bracket.rounds[r].forEach((_, m) => {
        const srcEl = matchRefs.current.get(`${r}-${m}`);
        const dstEl = matchRefs.current.get(`${r + 1}-${Math.floor(m / 2)}`);
        if (!srcEl || !dstEl) return;
        const src = srcEl.getBoundingClientRect();
        const dst = dstEl.getBoundingClientRect();
        const srcY = src.top + src.height / 2 - origin.top;
        const dstY = dst.top + dst.height / 2 - origin.top;
        const srcX = src.right - origin.left;
        const dstX = dst.left - origin.left;
        const midX = (srcX + dstX) / 2;
        line(srcX, srcY, midX - srcX, 0);
        line(midX, Math.min(srcY, dstY), 0, Math.abs(dstY - srcY));
        if (m % 2 === 0) line(midX, dstY, dstX - midX, 0);
      });
    }
    setLines(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [game, isAdmin]);

  useLayoutEffect(recompute, [recompute]);
  useEffect(() => {
    window.addEventListener("resize", recompute);
    return () => window.removeEventListener("resize", recompute);
  }, [recompute]);

  function setName(m: number, s: number, name: string) {
    const b: Bracket = JSON.parse(JSON.stringify(game.bracket));
    b.rounds[0][m].teams[s].name = name.trim();
    onBracketChange(b);
  }

  function setScore(r: number, m: number, s: number, value: string) {
    const b: Bracket = JSON.parse(JSON.stringify(propagate(game.bracket)));
    b.rounds[r][m].teams[s].score = value === "" ? null : Math.max(0, parseInt(value, 10) || 0);
    onBracketChange(b);
  }

  const gf = bracket.rounds[totalRounds - 1][0];
  const champ = winnerIdx(gf);

  return (
    <div>
      <div ref={containerRef} className="relative flex min-w-[230px] gap-14 pb-5" style={{ minWidth: totalRounds * 250 }}>
        {lines.map((l, i) => (
          <div key={i} className="pointer-events-none absolute bg-lime-500/40" style={l} />
        ))}

        {bracket.rounds.map((matches, r) => {
          const isFinal = r === totalRounds - 1;
          return (
            <div key={r} className="flex min-w-[200px] flex-1 flex-col">
              <div className={`mb-3.5 text-xs font-bold ${isFinal ? "text-center font-extrabold uppercase tracking-wide text-slate-100" : "text-slate-400"}`}>
                {isFinal ? "Grand Finals" : roundTitle(r, totalRounds, teams)}
              </div>
              <div className="flex flex-1 flex-col justify-around gap-4">
                {matches.map((match, m) => {
                  const w = winnerIdx(match, r === 0);
                  return (
                    <div
                      key={m}
                      ref={(el) => { if (el) matchRefs.current.set(`${r}-${m}`, el); }}
                      className={`relative z-10 rounded border bg-slate-800 ${isFinal ? "border-amber-400 shadow-[0_0_18px_rgba(251,191,36,0.15)]" : "border-slate-700"}`}
                    >
                      {match.teams.map((team, s) => {
                        const isBye = r === 0 && !team.name && !!match.teams[1 - s].name;
                        const won = w === s;
                        const lost = w >= 0 && w !== s;
                        const seed = r === 0 ? pairs[m][s] : seedOf(bracket, team.name);
                        const bothNamed = !!(match.teams[0].name && match.teams[1].name);
                        return (
                          <div key={s} className={`flex min-h-9 items-center gap-2 px-2.5 py-1.5 ${s === 1 ? "border-t border-slate-700" : ""} ${won ? "bg-slate-700/60" : ""}`}>
                            <span className="w-4 shrink-0 text-right text-[10px] text-slate-400">{seed}</span>
                            {team.name ? (
                              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded text-[9px] font-extrabold text-white" style={{ background: logoColor(team.name) }}>
                                {team.name.slice(0, 2).toUpperCase()}
                              </span>
                            ) : (
                              <span className="h-5 w-5 shrink-0 rounded bg-slate-700" />
                            )}
                            {isAdmin && r === 0 ? (
                              <input
                                value={team.name}
                                maxLength={24}
                                placeholder="Naam"
                                onChange={(e) => setName(m, s, e.target.value)}
                                className="min-w-0 flex-1 rounded border border-slate-700 bg-slate-950 px-1.5 py-0.5 text-xs font-semibold focus:border-lime-400 focus:outline-none"
                              />
                            ) : (
                              <span className={`min-w-0 flex-1 truncate text-xs ${team.name ? (won ? "font-bold text-slate-100" : lost ? "font-semibold text-slate-400" : "font-semibold") : "italic text-slate-400"}`}>
                                {team.name || (isBye ? "BYE" : "TBD")}
                              </span>
                            )}
                            {isAdmin && bothNamed ? (
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
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {champ >= 0 && (
        <div className="mt-3 text-center text-xs font-extrabold uppercase tracking-wide text-amber-400">
          🏆 Champion: {gf.teams[champ].name}
        </div>
      )}
    </div>
  );
}
