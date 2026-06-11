import { propagate, propagateDouble, winnerIdx } from "./bracket";
import type { Game, TeamDef, TournamentState } from "./types";
import { allUsers } from "./users";

// de (huidige) winnaar van een compo, of null zolang die niet beslist is
export function gameWinner(game: Game): string | null {
  if (game.type === "double" && game.double) {
    const d = propagateDouble(game.double);
    const w = winnerIdx(d.gf);
    return w >= 0 ? d.gf.teams[w].name : null;
  }
  if (game.type === "race" && game.race) {
    const winner = [...game.race.participants]
      .sort((a, b) => b.progress - a.progress)
      .find((p) => p.progress >= game.race!.target);
    return winner?.name ?? null;
  }
  const rs = propagate(game.bracket).rounds;
  const gf = rs[rs.length - 1]?.[0];
  const w = gf ? winnerIdx(gf) : -1;
  return w >= 0 ? gf!.teams[w].name : null;
}

// een winnaarsnaam terugbrengen tot personen: eerst het teamregister,
// anders namen als "Xander + Bo" of "Jean & Indy" splitsen op het scheidingsteken
export function splitMembers(name: string, registry: TeamDef[]): string[] {
  const reg = registry.find((t) => t.name.toLowerCase() === name.toLowerCase());
  if (reg && reg.members.length) return reg.members;
  const parts = name.split(/\s*(?:&|\+|,|\/)\s*|\s+en\s+/i).map((p) => p.trim()).filter(Boolean);
  return parts.length > 1 ? parts : [name];
}

export type LeaderboardEntry = { name: string; wins: number; games: string[] };

// volledig dynamisch: alle bekende users en teams staan erop (ook met 0
// winsten); elke compo-winst telt voor alle (geregistreerde of in de naam
// genoemde) teamleden. Teams: winnaars die uit meer personen bestaan.
export function computeLeaderboards(state: TournamentState): {
  personal: LeaderboardEntry[];
  teams: LeaderboardEntry[];
} {
  const personal = new Map<string, LeaderboardEntry>();
  const teams = new Map<string, LeaderboardEntry>();
  const ensure = (map: Map<string, LeaderboardEntry>, name: string) => {
    const key = name.toLowerCase();
    if (!map.has(key)) map.set(key, { name, wins: 0, games: [] });
    return map.get(key)!;
  };
  // basis: iedereen en elk team doet mee
  allUsers(state).forEach((u) => ensure(personal, u));
  (state.teams ?? []).forEach((t) => ensure(teams, t.name));
  // resultaten eroverheen
  for (const g of state.games) {
    const winner = gameWinner(g);
    if (!winner) continue;
    const members = splitMembers(winner, state.teams ?? []);
    if (members.length > 1) {
      const e = ensure(teams, winner);
      e.wins += 1;
      e.games.push(g.name);
    }
    members.forEach((p) => {
      const e = ensure(personal, p);
      e.wins += 1;
      e.games.push(g.name);
    });
  }
  const sorted = (m: Map<string, LeaderboardEntry>) =>
    [...m.values()].sort((a, b) => b.wins - a.wins || a.name.localeCompare(b.name));
  return { personal: sorted(personal), teams: sorted(teams) };
}

// analytisch: wie heeft al met wie samengespeeld? Afgeleid uit de echte
// toernooi-data — elke team-inschrijving (geregistreerd team of naam als
// "Xander + Bo") telt als samenspelen voor de leden in die compo.
export function pairsPlayed(state: TournamentState): Map<string, string[]> {
  const norm = (n: string) => n.trim().toLowerCase();
  const key = (a: string, b: string) => [norm(a), norm(b)].sort().join("|");
  const played = new Map<string, string[]>();
  for (const g of state.games) {
    // alle namen die in deze compo voorkomen (bracket, dugout, race), ontdubbeld
    const names = new Map<string, string>();
    const add = (n: string) => { if (n) names.set(norm(n), n); };
    g.bracket?.rounds.forEach((round) => round.forEach((m) => m.teams.forEach((t) => add(t.name))));
    if (g.type === "double" && g.double) {
      const d = propagateDouble(g.double);
      [...d.w.flat(), ...d.l.flat(), d.gf].forEach((m) => m.teams.forEach((t) => add(t.name)));
    }
    // alleen wie echt is ingedeeld telt — de dugout is afgeleid en doet niet mee
    g.race?.participants.forEach((p) => add(p.name));

    for (const name of names.values()) {
      const members = splitMembers(name, state.teams ?? []);
      if (members.length < 2) continue;
      members.forEach((a, i) =>
        members.slice(i + 1).forEach((b) => {
          const k = key(a, b);
          const games = played.get(k) ?? [];
          if (!games.includes(g.name)) games.push(g.name);
          played.set(k, games);
        })
      );
    }
  }
  return played;
}

export function pairKey(a: string, b: string): string {
  return [a.trim().toLowerCase(), b.trim().toLowerCase()].sort().join("|");
}
