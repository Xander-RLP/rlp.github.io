import type { Bracket, DoubleBracket, Game, Match } from "./types";

export const BRACKET_SIZES = [4, 8, 16, 32];

const LOGO_COLORS = [
  "#d4a017", "#ff6b1a", "#c0392b", "#2980b9", "#8e44ad", "#16a085",
  "#27ae60", "#d35400", "#e63946", "#3498db", "#9b59b6", "#b03a2e",
  "#2c6fb0", "#7f8c8d", "#f1c40f", "#6c7a89",
];

export function logoColor(name: string): string {
  let h = 0;
  for (const c of name) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return LOGO_COLORS[h % LOGO_COLORS.length];
}

export function gameInitials(name: string): string {
  return name.split(/\s+/).filter(Boolean).slice(0, 3).map((w) => w[0]).join("").toUpperCase();
}

// standaard single-elimination seeding (1v16, 8v9, ...) voor elke power-of-two grootte
export function seedPairs(n: number): [number, number][] {
  let order = [1];
  while (order.length < n) {
    const m = order.length * 2 + 1;
    order = order.flatMap((s) => [s, m - s]);
  }
  const pairs: [number, number][] = [];
  for (let i = 0; i < order.length; i += 2) pairs.push([order[i], order[i + 1]]);
  return pairs;
}

export function emptyBracket(size = 16): Bracket {
  const counts: number[] = [];
  for (let n = size / 2; n >= 1; n = Math.floor(n / 2)) counts.push(n);
  return {
    rounds: counts.map((n) =>
      Array.from({ length: n }, (): Match => ({
        teams: [{ name: "", score: null }, { name: "", score: null }],
      }))
    ),
  };
}

export function teamCount(bracket: Bracket): number {
  return bracket.rounds[0].length * 2;
}

export function winnerIdx(match: Match, firstRound = false): number {
  const [a, b] = match.teams;
  if (firstRound) { // bye: eenling in ronde 1 schuift automatisch door
    if (a.name && !b.name) return 0;
    if (!a.name && b.name) return 1;
  }
  if (!a.name || !b.name) return -1;
  if (a.score == null || b.score == null || a.score === b.score) return -1;
  return a.score > b.score ? 0 : 1;
}

// winnaars stromen door naar de volgende ronde; onbesliste feeds maken het slot leeg
export function propagate(bracket: Bracket): Bracket {
  const b: Bracket = JSON.parse(JSON.stringify(bracket));
  for (let r = 0; r < b.rounds.length - 1; r++) {
    b.rounds[r].forEach((match, m) => {
      const w = winnerIdx(match, r === 0);
      const slot = b.rounds[r + 1][Math.floor(m / 2)].teams[m % 2];
      const newName = w < 0 ? "" : match.teams[w].name;
      if (slot.name !== newName) {
        slot.name = newName;
        slot.score = null;
      }
    });
  }
  return b;
}

function emptyMatch(): Match {
  return { teams: [{ name: "", score: null }, { name: "", score: null }] };
}

export function emptyDouble(): DoubleBracket {
  return { w1: [emptyMatch(), emptyMatch()], wf: emptyMatch(), l1: emptyMatch(), lf: emptyMatch(), gf: emptyMatch() };
}

// winnaars stromen door; verliezers vallen het losers bracket in
export function propagateDouble(double: DoubleBracket): DoubleBracket {
  const d: DoubleBracket = JSON.parse(JSON.stringify(double));
  const feed = (match: Match, slot: { name: string; score: number | null }, takeWinner: boolean) => {
    const w = winnerIdx(match);
    const idx = w < 0 ? -1 : takeWinner ? w : 1 - w;
    const newName = idx < 0 ? "" : match.teams[idx].name;
    if (slot.name !== newName) {
      slot.name = newName;
      slot.score = null;
    }
  };
  feed(d.w1[0], d.wf.teams[0], true);
  feed(d.w1[1], d.wf.teams[1], true);
  feed(d.w1[0], d.l1.teams[0], false);
  feed(d.w1[1], d.l1.teams[1], false);
  feed(d.l1, d.lf.teams[0], true);
  feed(d.wf, d.lf.teams[1], false);
  feed(d.wf, d.gf.teams[0], true);
  feed(d.lf, d.gf.teams[1], true);
  return d;
}

export function roundTitle(r: number, totalRounds: number, teams: number): string {
  const fromEnd = totalRounds - r;
  const label = fromEnd === 2 ? "Semifinals"
    : fromEnd === 3 ? "Quarterfinals"
    : `Ro${teams / 2 ** r}`;
  return `Round ${r + 1} (${label})`;
}

export function roundShort(r: number, totalRounds: number, teams: number): string {
  const fromEnd = totalRounds - r;
  return fromEnd === 1 ? "GF" : fromEnd === 2 ? "SF" : fromEnd === 3 ? "QF" : `RO${teams / 2 ** r}`;
}

export function seedOf(bracket: Bracket, name: string): number | "" {
  if (!name) return "";
  const pairs = seedPairs(teamCount(bracket));
  for (let m = 0; m < bracket.rounds[0].length; m++) {
    for (let s = 0; s < 2; s++) {
      if (bracket.rounds[0][m].teams[s].name === name) return pairs[m][s];
    }
  }
  return "";
}

export function slugify(name: string, existing: string[]): string {
  const base = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || "game";
  let id = base;
  let n = 2;
  while (existing.includes(id)) id = `${base}-${n++}`;
  return id;
}

export function gameStatus(game: Game): { text: string; champ: boolean } {
  if (game.type === "double" && game.double) {
    const d = propagateDouble(game.double);
    const w = winnerIdx(d.gf);
    if (w >= 0) return { text: `\u{1F3C6} ${d.gf.teams[w].name}`, champ: true };
    const all = [...d.w1, d.wf, d.l1, d.lf, d.gf];
    if (all.some((m) => m.teams.some((t) => t.score != null))) return { text: "Bezig", champ: false };
    const filled = d.w1.flatMap((m) => m.teams).filter((t) => t.name).length;
    return { text: filled ? "Start binnenkort" : "Aanmeldingen open", champ: false };
  }
  if (game.type === "race" && game.race) {
    const winner = [...game.race.participants].sort((a, b) => b.progress - a.progress)
      .find((p) => p.progress >= game.race!.target);
    if (winner) return { text: `\u{1F3C6} ${winner.name}`, champ: true };
    if (game.race.participants.some((p) => p.progress > 0)) return { text: "Bezig", champ: false };
    return { text: game.race.participants.length ? "Start binnenkort" : "Aanmeldingen open", champ: false };
  }
  const rs = game.bracket.rounds;
  const gf = rs[rs.length - 1][0];
  const w = winnerIdx(gf);
  if (w >= 0) return { text: `\u{1F3C6} ${gf.teams[w].name}`, champ: true };
  const anyScore = rs.some((rnd) => rnd.some((m) => m.teams.some((t) => t.score != null)));
  if (anyScore) return { text: "Bezig", champ: false };
  const filled = rs[0].flatMap((m) => m.teams).filter((t) => t.name).length;
  return { text: filled ? "Start binnenkort" : "Aanmeldingen open", champ: false };
}

export type PendingMatch = { game: Game; a: string; b: string; round: string; decided: boolean; scoreA: number | null; scoreB: number | null; winner: number };

export function allMatches(games: Game[]): PendingMatch[] {
  const out: PendingMatch[] = [];
  const push = (game: Game, m: Match, round: string) => {
    const [a, b] = m.teams;
    if (!a.name || !b.name) return;
    const w = winnerIdx(m);
    out.push({ game, a: a.name, b: b.name, round, decided: w >= 0, scoreA: a.score, scoreB: b.score, winner: w });
  };
  for (const game of games) {
    if (game.type === "double" && game.double) {
      const d = propagateDouble(game.double);
      push(game, d.w1[0], "WB R1");
      push(game, d.w1[1], "WB R1");
      push(game, d.wf, "WB FIN");
      push(game, d.l1, "LB R1");
      push(game, d.lf, "LB FIN");
      push(game, d.gf, "GF");
      continue;
    }
    const rs = propagate(game.bracket).rounds;
    const tc = teamCount(game.bracket);
    rs.forEach((matches, r) => {
      for (const m of matches) {
        const [a, b] = m.teams;
        if (!a.name || !b.name) continue;
        const w = winnerIdx(m);
        out.push({
          game, a: a.name, b: b.name,
          round: roundShort(r, rs.length, tc),
          decided: w >= 0, scoreA: a.score, scoreB: b.score, winner: w,
        });
      }
    });
  }
  return out;
}
