import type { Bracket, DoubleBracket, Game, LegacyDoubleBracket, Match } from "./types";

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

// nieuwe deelnemer in ronde 1: eerst halve matches afmaken (echte wedstrijd),
// dan lege matches (bye). Ronde 1 vol? Dan groeit het bracket naar de volgende
// grootte; de bestaande indeling en scores schuiven mee naar de eerste helft.
export function addParticipant(
  bracket: Bracket,
  name: string,
): { bracket: Bracket; grownTo?: number } | { error: string } {
  const clean = name.trim();
  if (!clean) return { error: "Vul een naam in." };
  const b: Bracket = JSON.parse(JSON.stringify(bracket));
  const r1 = b.rounds[0];
  if (r1.some((m) => m.teams.some((t) => t.name.toLowerCase() === clean.toLowerCase()))) {
    return { error: `"${clean}" staat al in het bracket.` };
  }
  for (const m of r1) {
    if (m.teams.filter((t) => t.name).length === 1) {
      m.teams.find((t) => !t.name)!.name = clean;
      return { bracket: b };
    }
  }
  for (const m of r1) {
    if (m.teams.every((t) => !t.name)) {
      m.teams[0].name = clean;
      return { bracket: b };
    }
  }
  const size = teamCount(b) * 2;
  if (size > Math.max(...BRACKET_SIZES)) return { error: `Het bracket zit vol (max ${Math.max(...BRACKET_SIZES)} deelnemers).` };
  const big = emptyBracket(size);
  b.rounds.forEach((matches, r) => matches.forEach((m, i) => { big.rounds[r][i] = m; }));
  big.rounds[0][r1.length].teams[0].name = clean;
  return { bracket: big, grownTo: size };
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

// generiek double elimination voor 4/8/16 teams.
// losers-rondes wisselen af: intake (verliezers WB R1 gepaard), daarna per
// stap "major" (winnaar LB vs verliezer volgende WB-ronde) en "minor"
// (LB-winnaars onderling gepaard).
export function emptyDouble(size = 4): DoubleBracket {
  const w: Match[][] = [];
  for (let n = size / 2; n >= 1; n = Math.floor(n / 2)) {
    w.push(Array.from({ length: n }, emptyMatch));
  }
  const l: Match[][] = [];
  for (let n = size / 4; n >= 1; n = Math.floor(n / 2)) {
    l.push(Array.from({ length: n }, emptyMatch)); // major-instroom
    l.push(Array.from({ length: n }, emptyMatch)); // (intake telt als eerste)
  }
  return { w, l, gf: emptyMatch() };
}

// oude opgeslagen 4-teams structuur (w1/wf/l1/lf) → generieke vorm
export function normalizeDouble(d: DoubleBracket | LegacyDoubleBracket | undefined): DoubleBracket {
  if (!d) return emptyDouble(4);
  if ("w" in d) return d;
  return { w: [[d.w1[0], d.w1[1]], [d.wf]], l: [[d.l1], [d.lf]], gf: d.gf };
}

export function doubleTeamCount(d: DoubleBracket): number {
  return d.w[0].length * 2;
}

// winnaars stromen door; verliezers vallen het losers bracket in.
// "settled" volgt mee zodat byes pas doorschuiven als hun bron echt vaststaat.
export function propagateDouble(double: DoubleBracket | LegacyDoubleBracket | undefined): DoubleBracket {
  const d: DoubleBracket = JSON.parse(JSON.stringify(normalizeDouble(double)));
  type Res = { winner: string; loser: string; settled: boolean };
  const evalMatch = (m: Match, aSettled: boolean, bSettled: boolean): Res => {
    const a = m.teams[0].name, b = m.teams[1].name;
    if (a && b) {
      const w = winnerIdx(m);
      if (w >= 0) return { winner: m.teams[w].name, loser: m.teams[1 - w].name, settled: true };
      return { winner: "", loser: "", settled: false };
    }
    if (!aSettled || !bSettled) return { winner: "", loser: "", settled: false };
    if (!a && !b) return { winner: "", loser: "", settled: true };
    return { winner: a || b, loser: "", settled: true }; // bye
  };
  const feed = (slot: { name: string; score: number | null }, name: string) => {
    if (slot.name !== name) {
      slot.name = name;
      slot.score = null;
    }
  };

  const wRes: Res[][] = [d.w[0].map((m) => evalMatch(m, true, true))];
  for (let r = 1; r < d.w.length; r++) {
    wRes[r] = d.w[r].map((m, i) => {
      const s0 = wRes[r - 1][2 * i], s1 = wRes[r - 1][2 * i + 1];
      feed(m.teams[0], s0.winner);
      feed(m.teams[1], s1.winner);
      return evalMatch(m, s0.settled, s1.settled);
    });
  }

  const lRes: Res[][] = [];
  d.l.forEach((round, li) => {
    lRes[li] = round.map((m, i) => {
      let s0: Res, s1: Res;
      if (li === 0) {
        // intake: verliezers van WB R1 gepaard
        s0 = wRes[0][2 * i];
        s1 = wRes[0][2 * i + 1];
        feed(m.teams[0], s0.loser);
        feed(m.teams[1], s1.loser);
      } else if (round.length === d.l[li - 1].length) {
        // major: winnaar vorige LB-ronde vs verliezer uit WB-ronde
        const k = Math.ceil(li / 2);
        s0 = lRes[li - 1][i];
        s1 = wRes[k][i];
        feed(m.teams[0], s0.winner);
        feed(m.teams[1], s1.loser);
      } else {
        // minor: LB-winnaars onderling gepaard
        s0 = lRes[li - 1][2 * i];
        s1 = lRes[li - 1][2 * i + 1];
        feed(m.teams[0], s0.winner);
        feed(m.teams[1], s1.winner);
      }
      return evalMatch(m, s0.settled, s1.settled);
    });
  });

  const wf = wRes[d.w.length - 1][0];
  const lf = lRes[d.l.length - 1][0];
  feed(d.gf.teams[0], wf.winner);
  feed(d.gf.teams[1], lf.winner);
  return d;
}

// nieuwe deelnemer in het double bracket; vol? dan verdubbelt het bracket
// (bestaande ronde-1-indeling blijft, latere rondes worden opnieuw afgeleid)
export function addParticipantDouble(
  double: DoubleBracket | LegacyDoubleBracket | undefined,
  name: string,
): { double: DoubleBracket; grownTo?: number } | { error: string } {
  const clean = name.trim();
  if (!clean) return { error: "Vul een naam in." };
  const d: DoubleBracket = JSON.parse(JSON.stringify(normalizeDouble(double)));
  const r1 = d.w[0];
  if (r1.some((m) => m.teams.some((t) => t.name.toLowerCase() === clean.toLowerCase()))) {
    return { error: `"${clean}" staat al in het bracket.` };
  }
  for (const m of r1) {
    if (m.teams.filter((t) => t.name).length === 1) {
      m.teams.find((t) => !t.name)!.name = clean;
      return { double: d };
    }
  }
  for (const m of r1) {
    if (m.teams.every((t) => !t.name)) {
      m.teams[0].name = clean;
      return { double: d };
    }
  }
  const size = doubleTeamCount(d) * 2;
  if (size > Math.max(...BRACKET_SIZES)) return { error: `Het bracket zit vol (max ${Math.max(...BRACKET_SIZES)} teams).` };
  const big = emptyDouble(size);
  r1.forEach((m, i) => { big.w[0][i] = m; });
  big.w[0][r1.length].teams[0].name = clean;
  return { double: big, grownTo: size };
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
    const all = [...d.w.flat(), ...d.l.flat(), d.gf];
    if (all.some((m) => m.teams.some((t) => t.score != null))) return { text: "Bezig", champ: false };
    const filled = d.w[0].flatMap((m) => m.teams).filter((t) => t.name).length;
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
      d.w.forEach((round, r) => round.forEach((m) =>
        push(game, m, r === d.w.length - 1 ? "WB FIN" : `WB R${r + 1}`)));
      d.l.forEach((round, r) => round.forEach((m) =>
        push(game, m, r === d.l.length - 1 ? "LB FIN" : `LB R${r + 1}`)));
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
