import type { Bracket, DoubleBracket, Game, LegacyDoubleBracket, Match, SlotRef } from "./types";

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

// het effectieve "lijntje" van een match: expliciet gezet (match.next),
// anders de klassieke koppeling (volgende ronde, match m/2, slot m%2).
// null = de winnaar stroomt nergens naartoe.
export function nextOf(b: Bracket, r: number, m: number): SlotRef | null {
  const nxt = b.rounds[r][m].next;
  if (nxt !== undefined) {
    if (!nxt) return null;
    if (nxt.r > r && b.rounds[nxt.r]?.[nxt.m]) return { r: nxt.r, m: nxt.m, s: nxt.s ? 1 : 0 };
    return null;
  }
  if (r + 1 >= b.rounds.length) return null;
  const tm = Math.floor(m / 2);
  if (!b.rounds[r + 1][tm]) return null;
  return { r: r + 1, m: tm, s: (m % 2) as 0 | 1 };
}

// de verliezer-lijn van een match (double-elimination-stijl): alleen expliciet
export function loserNextOf(b: Bracket, r: number, m: number): SlotRef | null {
  const nxt = b.rounds[r][m].loserNext;
  if (!nxt) return null;
  if (nxt.r > r && b.rounds[nxt.r]?.[nxt.m]) return { r: nxt.r, m: nxt.m, s: nxt.s ? 1 : 0 };
  return null;
}

// slots waar een lijn naartoe loopt; die worden door propagate gevuld en zijn
// dus niet handmatig in te vullen of te beslepen
export function fedSlots(b: Bracket): Set<string> {
  const fed = new Set<string>();
  b.rounds.forEach((round, r) =>
    round.forEach((_, m) => {
      const t = nextOf(b, r, m);
      if (t) fed.add(`${t.r}-${t.m}-${t.s}`);
      const lt = loserNextOf(b, r, m);
      if (lt) fed.add(`${lt.r}-${lt.m}-${lt.s}`);
    })
  );
  return fed;
}

// aantal deelnemersplekken = slots zonder inkomende lijn; beweegt automatisch
// mee als de admin rondes/wedstrijden of lijntjes toevoegt of weghaalt
export function entryCount(b: Bracket): number {
  const total = b.rounds.reduce((s, round) => s + round.length * 2, 0);
  return total - fedSlots(b).size;
}

// impliciete (klassieke) lijntjes expliciet maken, zodat structuurwijzigingen
// (match/ronde toevoegen of weghalen) bestaande lijnen nooit stilletjes verleggen
export function materializeLinks(bracket: Bracket): Bracket {
  const b: Bracket = JSON.parse(JSON.stringify(bracket));
  b.rounds.forEach((round, r) => round.forEach((match, m) => { match.next = nextOf(bracket, r, m); }));
  return b;
}

export function addRound(bracket: Bracket): Bracket {
  const b = materializeLinks(bracket);
  b.rounds.push([emptyMatch()]);
  return b;
}

// nieuwe match begint zonder lijn; de admin legt zelf de doorstroom
export function addMatch(bracket: Bracket, r: number): Bracket {
  const b = materializeLinks(bracket);
  b.rounds[r].push({ ...emptyMatch(), next: null });
  return b;
}

const LINK_KEYS = ["next", "loserNext"] as const;

export function removeMatch(bracket: Bracket, r: number, m: number): Bracket {
  const b = materializeLinks(bracket);
  b.rounds[r].splice(m, 1);
  b.rounds.forEach((round) =>
    round.forEach((match) => {
      for (const key of LINK_KEYS) {
        const t = match[key];
        if (!t || t.r !== r) continue;
        if (t.m === m) match[key] = null;
        else if (t.m > m) t.m -= 1;
      }
    })
  );
  return b;
}

export function removeRound(bracket: Bracket, r: number): Bracket {
  const b = materializeLinks(bracket);
  b.rounds.splice(r, 1);
  b.rounds.forEach((round) =>
    round.forEach((match) => {
      for (const key of LINK_KEYS) {
        const t = match[key];
        if (!t) continue;
        if (t.r === r) match[key] = null;
        else if (t.r > r) t.r -= 1;
      }
    })
  );
  return b;
}

// een slot heeft hooguit één inkomende lijn (winnaar óf verliezer): een andere
// match die al naar hetzelfde slot wees, raakt die lijn kwijt
export function setLink(
  bracket: Bracket,
  from: { r: number; m: number },
  to: SlotRef | null,
  kind: "next" | "loserNext" = "next",
): Bracket {
  const b = materializeLinks(bracket);
  b.rounds[from.r][from.m][kind] = to;
  if (to) {
    b.rounds.forEach((round, r) =>
      round.forEach((match, m) => {
        for (const key of LINK_KEYS) {
          if (r === from.r && m === from.m && key === kind) continue;
          const t = match[key];
          if (t && t.r === to.r && t.m === to.m && t.s === to.s) match[key] = null;
        }
      })
    );
  }
  return b;
}

// alle namen die al meedoen aan een game (dugout + bracket/double/race),
// voor de dubbele-aanmelding-check
export function gameNames(game: Game): string[] {
  const out: string[] = [...(game.dugout ?? [])];
  if (game.type === "double" && game.double) {
    normalizeDouble(game.double).w[0].forEach((m) => m.teams.forEach((t) => { if (t.name) out.push(t.name); }));
  } else if (game.type === "race" && game.race) {
    game.race.participants.forEach((p) => out.push(p.name));
  } else {
    game.bracket.rounds.forEach((round) => round.forEach((m) => m.teams.forEach((t) => { if (t.name) out.push(t.name); })));
  }
  return out;
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

// winnaars (en verliezers, als die lijn er ligt) stromen door langs hun
// lijntje; onbesliste feeds maken het slot leeg
export function propagate(bracket: Bracket): Bracket {
  const b: Bracket = JSON.parse(JSON.stringify(bracket));
  const feed = (t: SlotRef, name: string) => {
    const slot = b.rounds[t.r][t.m].teams[t.s];
    if (slot.name !== name) {
      slot.name = name;
      slot.score = null;
    }
  };
  for (let r = 0; r < b.rounds.length; r++) {
    b.rounds[r].forEach((match, m) => {
      const w = winnerIdx(match, r === 0);
      const t = nextOf(b, r, m);
      if (t) feed(t, w < 0 ? "" : match.teams[w].name);
      const lt = loserNextOf(b, r, m);
      if (lt) {
        // een bye heeft geen verliezer: alleen doorgeven als beide namen bekend zijn
        const bothNamed = !!(match.teams[0].name && match.teams[1].name);
        feed(lt, w >= 0 && bothNamed ? match.teams[1 - w].name : "");
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

// double elimination → vrij bewerkbaar bracket: zelfde matches, namen en
// scores, met expliciete winnaar- én verliezer-lijnen die de double-elim
// doorstroom exact nabootsen. Kolommen: WB ronde r → kolom r, LB ronde li →
// kolom li+1, grand finals achteraan.
export function doubleToBracket(double: DoubleBracket | LegacyDoubleBracket | undefined): Bracket {
  const d: DoubleBracket = JSON.parse(JSON.stringify(normalizeDouble(double)));
  const W = d.w.length;
  const L = d.l.length;
  const numCols = L + 2;
  const rounds: Match[][] = Array.from({ length: numCols }, () => []);
  const pos = new Map<string, { r: number; m: number }>();
  const place = (key: string, col: number, match: Match) => {
    pos.set(key, { r: col, m: rounds[col].length });
    rounds[col].push(match);
  };
  d.w.forEach((round, r) => round.forEach((match, i) => place(`w-${r}-${i}`, r, match)));
  d.l.forEach((round, li) => round.forEach((match, i) => place(`l-${li}-${i}`, li + 1, match)));
  place("gf", numCols - 1, d.gf);

  const link = (fromKey: string, kind: "next" | "loserNext", toKey: string, s: 0 | 1) => {
    const f = pos.get(fromKey)!;
    const t = pos.get(toKey)!;
    rounds[f.r][f.m][kind] = { r: t.r, m: t.m, s };
  };
  // winners bracket: winnaar door, finale naar GF-slot boven
  for (let r = 0; r < W; r++) {
    d.w[r].forEach((_, m) => {
      if (r < W - 1) link(`w-${r}-${m}`, "next", `w-${r + 1}-${Math.floor(m / 2)}`, (m % 2) as 0 | 1);
      else link(`w-${r}-${m}`, "next", "gf", 0);
    });
  }
  // verliezers: WB R1 gepaard de intake in; latere WB-verliezers vallen in de
  // bijbehorende major-ronde (slot onder)
  d.w[0].forEach((_, m) => link(`w-0-${m}`, "loserNext", `l-0-${Math.floor(m / 2)}`, (m % 2) as 0 | 1));
  for (let k = 1; k < W; k++) {
    const li = 2 * k - 1;
    if (!d.l[li]) continue;
    d.w[k].forEach((_, m) => link(`w-${k}-${m}`, "loserNext", `l-${li}-${m}`, 1));
  }
  // losers bracket intern; LB-finale naar GF-slot onder
  for (let li = 0; li < L; li++) {
    d.l[li].forEach((_, m) => {
      if (li === L - 1) {
        link(`l-${li}-${m}`, "next", "gf", 1);
      } else if (d.l[li + 1].length < d.l[li].length) {
        link(`l-${li}-${m}`, "next", `l-${li + 1}-${Math.floor(m / 2)}`, (m % 2) as 0 | 1);
      } else {
        link(`l-${li}-${m}`, "next", `l-${li + 1}-${m}`, 0);
      }
    });
  }
  // resterende impliciete lijnen bevriezen (GF krijgt expliciet "geen lijn")
  return materializeLinks({ rounds });
}

// bouwt onder een klassiek knock-out bracket het volledige losers bracket +
// grand finals (double elimination), met alle winnaar- en verliezer-lijnen.
// Bestaande wedstrijden, namen en scores blijven staan (zij worden de winners-kant).
export function addLosersBracket(bracket: Bracket): Bracket | { error: string } {
  const rs = bracket.rounds;
  const n = (rs[0]?.length ?? 0) * 2;
  const isPow2 = n >= 4 && (n & (n - 1)) === 0;
  const classic = isPow2 && rs.length === Math.log2(n) && rs.every((round, i) => round.length === n / 2 ** (i + 1));
  if (!classic) {
    return {
      error:
        "Verliezersbracket genereren werkt vanaf een standaard knock-out (4/8/16/32 deelnemers, halverende rondes). " +
        "Zet eerst de winners-kant op via 'Snel opzetten' of bouw hem klassiek op.",
    };
  }
  const d = emptyDouble(n);
  rs.forEach((round, r) =>
    round.forEach((m, i) => {
      const copy: Match = JSON.parse(JSON.stringify(m));
      delete copy.next; // doubleToBracket legt alle lijnen opnieuw en expliciet
      delete copy.loserNext;
      d.w[r][i] = copy;
    })
  );
  return doubleToBracket(d);
}

export function roundTitle(r: number, totalRounds: number, teams: number): string {
  const fromEnd = totalRounds - r;
  const ro = teams / 2 ** r;
  const label = fromEnd === 2 ? "Semifinals"
    : fromEnd === 3 ? "Quarterfinals"
    : Number.isInteger(ro) && ro >= 2 ? `Ro${ro}`
    : "";
  return label ? `Round ${r + 1} (${label})` : `Round ${r + 1}`;
}

export function roundShort(r: number, totalRounds: number, teams: number): string {
  const fromEnd = totalRounds - r;
  const ro = teams / 2 ** r;
  return fromEnd === 1 ? "GF" : fromEnd === 2 ? "SF" : fromEnd === 3 ? "QF"
    : Number.isInteger(ro) && ro >= 2 ? `RO${ro}` : `R${r + 1}`;
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
  const gf = rs[rs.length - 1]?.[0];
  const w = gf ? winnerIdx(gf) : -1;
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
