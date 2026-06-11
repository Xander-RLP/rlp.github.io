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

// de uitgaande lijnen van een match, per eindpositie: outs[0] = waar nummer 1
// naartoe stroomt, outs[1] = nummer 2 (bij 1v1 de verliezer), enz.
// Expliciete outs winnen; anders legacy next/loserNext, waarbij next zonder
// waarde de klassieke koppeling is (volgende ronde, match m/2, slot m%2).
export function outsOf(b: Bracket, r: number, m: number): (SlotRef | null)[] {
  const match = b.rounds[r][m];
  const n = match.teams.length;
  const valid = (t?: SlotRef | null): SlotRef | null => {
    if (!t) return null;
    if (t.r > r && b.rounds[t.r]?.[t.m] && t.s >= 0 && t.s < b.rounds[t.r][t.m].teams.length) {
      return { r: t.r, m: t.m, s: t.s };
    }
    return null;
  };
  if (match.outs !== undefined) {
    return Array.from({ length: n }, (_, k) => valid(match.outs![k]));
  }
  let win: SlotRef | null = null;
  if (match.next !== undefined) {
    win = valid(match.next);
  } else if (r + 1 < b.rounds.length) {
    win = valid({ r: r + 1, m: Math.floor(m / 2), s: m % 2 });
  }
  const lose = valid(match.loserNext ?? null);
  return Array.from({ length: n }, (_, k) => (k === 0 ? win : k === 1 ? lose : null));
}

// slots waar een lijn naartoe loopt; die worden door propagate gevuld en zijn
// dus niet handmatig in te vullen of te beslepen
export function fedSlots(b: Bracket): Set<string> {
  const fed = new Set<string>();
  b.rounds.forEach((round, r) =>
    round.forEach((_, m) => {
      outsOf(b, r, m).forEach((t) => { if (t) fed.add(`${t.r}-${t.m}-${t.s}`); });
    })
  );
  return fed;
}

// aantal deelnemersplekken = slots zonder inkomende lijn; beweegt automatisch
// mee als de admin rondes/wedstrijden, slots of lijntjes toevoegt of weghaalt
export function entryCount(b: Bracket): number {
  const total = b.rounds.reduce((s, round) => s + round.reduce((x, m) => x + m.teams.length, 0), 0);
  return total - fedSlots(b).size;
}

// impliciete (klassieke) lijntjes expliciet maken als outs, zodat structuur-
// wijzigingen (match/ronde/slot toevoegen of weghalen) bestaande lijnen nooit
// stilletjes verleggen
export function materializeLinks(bracket: Bracket): Bracket {
  const b: Bracket = JSON.parse(JSON.stringify(bracket));
  b.rounds.forEach((round, r) =>
    round.forEach((match, m) => {
      match.outs = outsOf(bracket, r, m);
      delete match.next;
      delete match.loserNext;
    })
  );
  return b;
}

export function addRound(bracket: Bracket): Bracket {
  const b = materializeLinks(bracket);
  b.rounds.push([emptyMatch()]);
  return b;
}

// nieuwe match begint zonder lijnen; de admin legt zelf de doorstroom
export function addMatch(bracket: Bracket, r: number): Bracket {
  const b = materializeLinks(bracket);
  b.rounds[r].push({ ...emptyMatch(), outs: [null, null] });
  return b;
}

// extra speler-slot in een match (veld van 3, 4, … spelers)
export function addSlot(bracket: Bracket, r: number, m: number): Bracket {
  const b: Bracket = JSON.parse(JSON.stringify(bracket));
  const match = b.rounds[r][m];
  match.teams.push({ name: "", score: null });
  if (match.outs) match.outs.push(null);
  return b;
}

// slot weghalen: inkomende lijnen naar dit slot vervallen, hogere slots
// schuiven een plek op; de lijn van de laatste eindpositie vervalt mee
export function removeSlot(bracket: Bracket, r: number, m: number, s: number): Bracket {
  const b = materializeLinks(bracket);
  const match = b.rounds[r][m];
  if (match.teams.length <= 2) return b;
  match.teams.splice(s, 1);
  match.outs = (match.outs ?? []).slice(0, match.teams.length);
  b.rounds.forEach((round) =>
    round.forEach((mm) => {
      mm.outs = (mm.outs ?? []).map((t) => {
        if (!t || t.r !== r || t.m !== m) return t;
        if (t.s === s) return null;
        return t.s > s ? { ...t, s: t.s - 1 } : t;
      });
    })
  );
  return b;
}

export function removeMatch(bracket: Bracket, r: number, m: number): Bracket {
  const b = materializeLinks(bracket);
  b.rounds[r].splice(m, 1);
  b.rounds.forEach((round) =>
    round.forEach((match) => {
      match.outs = (match.outs ?? []).map((t) => {
        if (!t || t.r !== r) return t;
        if (t.m === m) return null;
        return t.m > m ? { ...t, m: t.m - 1 } : t;
      });
    })
  );
  return b;
}

export function removeRound(bracket: Bracket, r: number): Bracket {
  const b = materializeLinks(bracket);
  b.rounds.splice(r, 1);
  b.rounds.forEach((round) =>
    round.forEach((match) => {
      match.outs = (match.outs ?? []).map((t) => {
        if (!t) return t;
        if (t.r === r) return null;
        return t.r > r ? { ...t, r: t.r - 1 } : t;
      });
    })
  );
  return b;
}

// lijn voor eindpositie `rank` van een match leggen. Een slot heeft hooguit
// één inkomende lijn: een andere lijn naar hetzelfde slot vervalt
export function setLink(
  bracket: Bracket,
  from: { r: number; m: number },
  to: SlotRef | null,
  rank: number,
): Bracket {
  const b = materializeLinks(bracket);
  const match = b.rounds[from.r][from.m];
  while ((match.outs ?? (match.outs = [])).length < match.teams.length) match.outs.push(null);
  match.outs[rank] = to;
  if (to) {
    b.rounds.forEach((round, r) =>
      round.forEach((mm, m) => {
        mm.outs = (mm.outs ?? []).map((t, k) => {
          if (r === from.r && m === from.m && k === rank) return t;
          if (t && t.r === to.r && t.m === to.m && t.s === to.s) return null;
          return t;
        });
      })
    );
  }
  return b;
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

// eindvolgorde van een match/veld: slot-indexen op rangorde (hoogste score
// eerst). Leeg = nog niet beslist (wachtende feeds, ontbrekende scores of
// gelijkspel). In ronde 1 is een deels gevuld veld gewoon speelbaar (bye)
export function rankingOf(match: Match, firstRound = false): number[] {
  const named = match.teams.map((t, i) => ({ t, i })).filter((x) => x.t.name);
  if (named.length === 0) return [];
  if (!firstRound && named.length < match.teams.length) return []; // feeds nog onderweg
  if (named.length === 1) return firstRound ? [named[0].i] : [];
  if (named.some((x) => x.t.score == null)) return [];
  const scores = named.map((x) => x.t.score);
  if (new Set(scores).size !== scores.length) return []; // gelijkspel
  return [...named].sort((a, b) => b.t.score! - a.t.score!).map((x) => x.i);
}

// elke eindpositie stroomt door langs zijn eigen lijn; onbesliste feeds
// maken het doelslot leeg
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
      const outs = outsOf(b, r, m);
      if (outs.every((t) => !t)) return;
      const ranking = rankingOf(match, r === 0);
      outs.forEach((t, k) => {
        if (!t) return;
        const idx = ranking[k];
        feed(t, idx === undefined ? "" : match.teams[idx].name);
      });
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
  d.w.forEach((round, r) => round.forEach((match, i) => {
    match.label = r === W - 1 ? "🏆 WB Finale" : `🏆 WB Ronde ${r + 1}`;
    place(`w-${r}-${i}`, r, match);
  }));
  d.l.forEach((round, li) => round.forEach((match, i) => {
    match.label = li === L - 1 ? "💀 LB Finale" : `💀 LB Ronde ${li + 1}`;
    place(`l-${li}-${i}`, li + 1, match);
  }));
  d.gf.label = "👑 Grand Finals";
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

// bouwt onder het huidige bracket een verliezersbracket + grand finals
// (double elimination), ongeacht de opbouw: elke eindpositie zonder lijn
// (nummer 2, 3, … van een wedstrijd) valt erin. Werkt dus ook met eigen
// rondes, velden van 3+ spelers en aantallen die geen macht van 2 zijn.
// Bestaande wedstrijden, namen, scores en lijnen blijven staan; op een
// klassieke knock-out komt er exact het klassieke double elimination uit.
export function addLosersBracket(bracket: Bracket): Bracket | { error: string } {
  const b = materializeLinks(bracket);
  const rs = b.rounds;

  // de finale van de winners-kant: laatste wedstrijd zonder winnaar-lijn
  let finaleRef: { r: number; m: number } | null = null;
  for (let r = rs.length - 1; r >= 0 && !finaleRef; r--) {
    for (let m = 0; m < rs[r].length; m++) {
      if (!outsOf(b, r, m)[0]) { finaleRef = { r, m }; break; }
    }
  }
  if (!finaleRef) return { error: "Geen wedstrijden gevonden om een verliezersbracket onder te bouwen." };
  const finale = finaleRef;

  // instroom: alle eindposities ≥ nummer 2 zonder lijn. Verliezers van WB
  // ronde r stromen (zoals bij klassiek double elimination) in op kolom 2r
  type Ref = { r: number; m: number; rank: number; col: number; carrier?: boolean };
  let pending: Ref[] = [];
  rs.forEach((round, r) => round.forEach((_, m) => {
    outsOf(b, r, m).forEach((t, rank) => {
      if (rank >= 1 && !t) pending.push({ r, m, rank, col: Math.max(1, 2 * r) });
    });
  }));
  if (pending.length === 0) {
    return { error: "Alle verliezersposities hebben al een lijn — er valt geen verliezersbracket onder te bouwen." };
  }

  rs.forEach((round, r) => round.forEach((match, m) => {
    if (!match.label) match.label = finale.r === r && finale.m === m ? "🏆 WB Finale" : `🏆 WB Ronde ${r + 1}`;
  }));

  const setOut = (ref: Ref, to: SlotRef) => { rs[ref.r][ref.m].outs![ref.rank] = to; };
  const ensureRound = (c: number) => { while (rs.length <= c) rs.push([]); };

  // per kolom: LB-winnaars van de vorige ronde tegen instromende verliezers
  // ("major"), wat overblijft onderling ("minor"/intake); bij een oneven
  // aantal wacht de laatste een kolom
  let ready: Ref[] = [];
  let lbRonde = 0;
  for (let c = 1; pending.length || ready.length > 1; c++) {
    const carriers = ready.filter((x) => x.carrier);
    const drops = [...ready.filter((x) => !x.carrier), ...pending.filter((d) => d.col <= c)];
    pending = pending.filter((d) => d.col > c);
    const pairs: [Ref, Ref][] = [];
    const zip = Math.min(carriers.length, drops.length);
    for (let i = 0; i < zip; i++) pairs.push([carriers[i], drops[i]]);
    const rest = [...carriers.slice(zip), ...drops.slice(zip)];
    while (rest.length >= 2) pairs.push([rest.shift()!, rest.shift()!]);
    ready = rest;
    if (pairs.length === 0) continue;
    lbRonde++;
    ensureRound(c);
    for (const [a, z] of pairs) {
      const m = rs[c].length;
      rs[c].push({ ...emptyMatch(), outs: [null, null], label: `💀 LB Ronde ${lbRonde}` });
      setOut(a, { r: c, m, s: 0 });
      setOut(z, { r: c, m, s: 1 });
      ready.push({ r: c, m, rank: 0, col: c, carrier: true });
    }
  }
  const survivor = ready[0];
  if (survivor.carrier) rs[survivor.r][survivor.m].label = "💀 LB Finale";

  const gfCol = Math.max(finale.r, survivor.r) + 1;
  ensureRound(gfCol);
  const gfM = rs[gfCol].length;
  rs[gfCol].push({ ...emptyMatch(), outs: [null, null], label: "👑 Grand Finals" });
  setOut({ ...finale, rank: 0, col: 0 }, { r: gfCol, m: gfM, s: 0 });
  setOut(survivor, { r: gfCol, m: gfM, s: 1 });
  return b;
}

// bracket wipen: alle namen en scores leeg, maar de opbouw (rondes, slots,
// lijnen en labels) blijft staan — de spelers komen vanzelf terug in de dugout
export function wipeBracket(bracket: Bracket): Bracket {
  const b: Bracket = JSON.parse(JSON.stringify(bracket));
  b.rounds.forEach((round) => round.forEach((m) => m.teams.forEach((t) => { t.name = ""; t.score = null; })));
  return b;
}

export function wipeDouble(double: DoubleBracket | LegacyDoubleBracket | undefined): DoubleBracket {
  const d: DoubleBracket = JSON.parse(JSON.stringify(normalizeDouble(double)));
  [...d.w.flat(), ...d.l.flat(), d.gf].forEach((m) => m.teams.forEach((t) => { t.name = ""; t.score = null; }));
  return d;
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
  const ranking = gf ? rankingOf(gf) : [];
  if (ranking.length) return { text: `\u{1F3C6} ${gf.teams[ranking[0]].name}`, champ: true };
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
        // velden met 3+ spelers tonen we als "A vs B vs C"
        const named = m.teams.filter((t) => t.name);
        if (named.length < 2 || named.length < m.teams.length) continue;
        if (m.teams.length === 2) {
          const [a, b] = m.teams;
          const w = winnerIdx(m);
          out.push({
            game, a: a.name, b: b.name,
            round: roundShort(r, rs.length, tc),
            decided: w >= 0, scoreA: a.score, scoreB: b.score, winner: w,
          });
        } else {
          const ranking = rankingOf(m);
          out.push({
            game,
            a: named[0].name,
            b: named.slice(1).map((t) => t.name).join(" vs "),
            round: roundShort(r, rs.length, tc),
            decided: ranking.length > 0,
            scoreA: named[0].score,
            scoreB: null,
            winner: -1,
          });
        }
      }
    });
  }
  return out;
}
