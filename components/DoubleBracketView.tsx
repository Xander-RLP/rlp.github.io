"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { doubleTeamCount, logoColor, normalizeDouble, propagateDouble, seedPairs, winnerIdx } from "@/lib/bracket";
import type { DoubleBracket, Game, Match } from "@/lib/types";

type Line = { left: number; top: number; width: number; height: number };

type Props = {
  game: Game;
  isAdmin: boolean;
  onDoubleChange: (double: DoubleBracket) => void;
};

export default function DoubleBracketView({ game, isAdmin, onDoubleChange }: Props) {
  const d = propagateDouble(game.double);
  const teams = doubleTeamCount(d);
  const pairs = seedPairs(teams);

  const containerRef = useRef<HTMLDivElement>(null);
  const matchRefs = useRef(new Map<string, HTMLDivElement>());
  const [lines, setLines] = useState<Line[]>([]);

  const recompute = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;
    const origin = container.getBoundingClientRect();
    const next: Line[] = [];
    const connect = (fromKey: string, toKey: string, drawInto: boolean) => {
      const srcEl = matchRefs.current.get(fromKey);
      const dstEl = matchRefs.current.get(toKey);
      if (!srcEl || !dstEl) return;
      const src = srcEl.getBoundingClientRect();
      const dst = dstEl.getBoundingClientRect();
      const srcY = src.top + src.height / 2 - origin.top;
      const dstY = dst.top + dst.height / 2 - origin.top;
      const srcX = src.right - origin.left;
      const dstX = dst.left - origin.left;
      const midX = (srcX + dstX) / 2;
      const line = (left: number, top: number, width: number, height: number) =>
        next.push({ left, top, width: Math.max(width, 1.5), height: Math.max(height, 1.5) });
      line(srcX, srcY, midX - srcX, 0);
      line(midX, Math.min(srcY, dstY), 0, Math.abs(dstY - srcY));
      if (drawInto) line(midX, dstY, dstX - midX, 0);
    };

    // winners bracket intern
    for (let r = 0; r < d.w.length - 1; r++) {
      d.w[r].forEach((_, m) => connect(`w-${r}-${m}`, `w-${r + 1}-${Math.floor(m / 2)}`, m % 2 === 0));
    }
    // losers bracket intern
    for (let li = 0; li < d.l.length - 1; li++) {
      const halving = d.l[li + 1].length < d.l[li].length;
      d.l[li].forEach((_, m) =>
        connect(`l-${li}-${m}`, `l-${li + 1}-${halving ? Math.floor(m / 2) : m}`, halving ? m % 2 === 0 : true),
      );
    }
    // finales naar grand finals
    connect(`w-${d.w.length - 1}-0`, "gf", true);
    connect(`l-${d.l.length - 1}-0`, "gf", false);
    setLines(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [game, isAdmin]);

  useLayoutEffect(recompute, [recompute]);
  useEffect(() => {
    window.addEventListener("resize", recompute);
    return () => window.removeEventListener("resize", recompute);
  }, [recompute]);

  function setName(m: number, s: number, name: string) {
    const next: DoubleBracket = JSON.parse(JSON.stringify(normalizeDouble(game.double)));
    next.w[0][m].teams[s].name = name.trim();
    onDoubleChange(next);
  }

  function setScore(section: "w" | "l" | "gf", r: number, m: number, s: number, value: string) {
    const next: DoubleBracket = JSON.parse(JSON.stringify(propagateDouble(game.double)));
    const match = section === "gf" ? next.gf : next[section][r][m];
    match.teams[s].score = value === "" ? null : Math.max(0, parseInt(value, 10) || 0);
    onDoubleChange(next);
  }

  function MatchCard({ match, refKey, label, accent, w0Index }: {
    match: Match;
    refKey: string;
    label?: string;
    accent?: "final" | "lb";
    w0Index?: number; // index in winners ronde 1 → namen invulbaar
  }) {
    const editable = isAdmin && w0Index != null;
    const w = winnerIdx(match, w0Index != null);
    const bothNamed = !!(match.teams[0].name && match.teams[1].name);
    const [section, rStr, mStr] = refKey.split("-");
    return (
      <div
        ref={(el) => { if (el) matchRefs.current.set(refKey, el); }}
        className={`relative z-10 rounded border bg-slate-800 ${
          accent === "final"
            ? "border-amber-400 shadow-[0_0_18px_rgba(251,191,36,0.15)]"
            : accent === "lb" ? "border-slate-600" : "border-slate-700"
        }`}
      >
        {label && (
          <div className="border-b border-slate-700 px-2.5 py-1 text-[9px] font-extrabold uppercase tracking-wide text-slate-400">
            {label}
          </div>
        )}
        {match.teams.map((team, s) => {
          const won = w === s;
          const lost = w >= 0 && w !== s;
          const isBye = w0Index != null && !team.name && !!match.teams[1 - s].name;
          return (
            <div key={s} className={`flex min-h-9 items-center gap-2 px-2.5 py-1.5 ${s === 1 ? "border-t border-slate-700" : ""} ${won ? "bg-slate-700/60" : ""}`}>
              {w0Index != null && (
                <span className="w-4 shrink-0 text-right text-[10px] text-slate-400">{pairs[w0Index][s]}</span>
              )}
              {team.name ? (
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded text-[9px] font-extrabold text-white" style={{ background: logoColor(team.name) }}>
                  {team.name.slice(0, 2).toUpperCase()}
                </span>
              ) : (
                <span className="h-5 w-5 shrink-0 rounded bg-slate-700" />
              )}
              {editable ? (
                <input
                  value={team.name}
                  maxLength={24}
                  placeholder="Naam"
                  onChange={(e) => setName(w0Index!, s, e.target.value)}
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
                  onChange={(e) => setScore(section as "w" | "l" | "gf", parseInt(rStr, 10) || 0, parseInt(mStr, 10) || 0, s, e.target.value)}
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
  }

  const champ = winnerIdx(d.gf);
  const COL = 250;

  return (
    <div className="overflow-x-auto">
      <div ref={containerRef} className="relative pb-5" style={{ minWidth: (d.w.length + 1) * COL }}>
        {lines.map((l, i) => (
          <div key={i} className="pointer-events-none absolute bg-lime-500/40" style={l} />
        ))}

        {/* winners bracket + grand finals */}
        <div className="mb-2.5 text-xs font-extrabold uppercase tracking-wide text-slate-400">Winners Bracket</div>
        <div className="flex gap-14">
          {d.w.map((round, r) => (
            <div key={r} className="flex min-w-[200px] flex-1 flex-col justify-around gap-4">
              {round.map((m, i) => (
                <MatchCard
                  key={i}
                  match={m}
                  refKey={`w-${r}-${i}`}
                  label={r === d.w.length - 1 ? "WB Finale" : `WB Ronde ${r + 1}`}
                  w0Index={r === 0 ? i : undefined}
                />
              ))}
            </div>
          ))}
          <div className="flex min-w-[200px] flex-1 flex-col justify-center">
            <MatchCard match={d.gf} refKey="gf" label="Grand Finals" accent="final" />
            {champ >= 0 && (
              <div className="mt-3 text-center text-xs font-extrabold uppercase tracking-wide text-amber-400">
                🏆 {d.gf.teams[champ].name}
              </div>
            )}
          </div>
        </div>

        {/* losers bracket */}
        <div className="mb-2.5 mt-9 text-xs font-extrabold uppercase tracking-wide text-slate-400">
          Losers Bracket <span className="font-semibold normal-case text-slate-500">— wie hier verliest ligt eruit</span>
        </div>
        <div className="flex gap-14">
          {d.l.map((round, li) => (
            <div key={li} className="flex min-w-[200px] flex-1 flex-col justify-around gap-4">
              {round.map((m, i) => (
                <MatchCard
                  key={i}
                  match={m}
                  refKey={`l-${li}-${i}`}
                  label={li === d.l.length - 1 ? "LB Finale" : `LB Ronde ${li + 1}`}
                  accent="lb"
                />
              ))}
            </div>
          ))}
          {/* lege kolommen zodat LB-kolommen uitlijnen met WB */}
          {Array.from({ length: d.w.length + 1 - d.l.length }, (_, i) => (
            <div key={`pad-${i}`} className="min-w-[200px] flex-1" />
          ))}
        </div>
      </div>
    </div>
  );
}
