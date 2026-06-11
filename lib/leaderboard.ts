import { propagate, propagateDouble, winnerIdx } from "./bracket";
import type { Game, TeamDef, TournamentState } from "./types";

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

// persoonlijk: elke compo-winst telt voor alle (geregistreerde of in de naam
// genoemde) teamleden; teams: alleen winnaars die uit meer personen bestaan
export function computeLeaderboards(state: TournamentState): {
  personal: LeaderboardEntry[];
  teams: LeaderboardEntry[];
} {
  const personal = new Map<string, LeaderboardEntry>();
  const teams = new Map<string, LeaderboardEntry>();
  const add = (map: Map<string, LeaderboardEntry>, name: string, game: string) => {
    const key = name.toLowerCase();
    const e = map.get(key) ?? { name, wins: 0, games: [] };
    e.wins += 1;
    e.games.push(game);
    map.set(key, e);
  };
  for (const g of state.games) {
    const winner = gameWinner(g);
    if (!winner) continue;
    const members = splitMembers(winner, state.teams ?? []);
    if (members.length > 1) add(teams, winner, g.name);
    members.forEach((p) => add(personal, p, g.name));
  }
  const sorted = (m: Map<string, LeaderboardEntry>) =>
    [...m.values()].sort((a, b) => b.wins - a.wins || a.name.localeCompare(b.name));
  return { personal: sorted(personal), teams: sorted(teams) };
}

// rouleerschema: per ronde worden teams greedy gevormd (steeds de speler die
// het minst vaak met de huidige teamleden speelde erbij); elke ronde proberen
// we alle startposities en houden we de indeling met de minste herhaalde duo's —
// zo heeft iedereen zo snel mogelijk één keer met iedereen gespeeld
export function generateRotatie(players: string[], teamSize: number, numRounds: number): string[][][] {
  const pairKey = (a: string, b: string) => [a, b].sort().join("|");
  const pairCount = new Map<string, number>();
  const pairs = (team: string[]) =>
    team.flatMap((a, i) => team.slice(i + 1).map((b) => pairKey(a, b)));
  const buildRound = (shift: number): { teams: string[][]; penalty: number } => {
    const pool = [...players.slice(shift), ...players.slice(0, shift)];
    const teams: string[][] = [];
    while (pool.length) {
      const team = [pool.shift()!];
      while (team.length < teamSize && pool.length) {
        let bestIdx = 0;
        let bestScore = Infinity;
        pool.forEach((cand, i) => {
          const score = team.reduce((s, t) => s + (pairCount.get(pairKey(cand, t)) ?? 0), 0);
          if (score < bestScore) {
            bestScore = score;
            bestIdx = i;
          }
        });
        team.push(pool.splice(bestIdx, 1)[0]);
      }
      teams.push(team);
    }
    const penalty = teams.flatMap(pairs).reduce((s, k) => s + (pairCount.get(k) ?? 0), 0);
    return { teams, penalty };
  };

  const rondes: string[][][] = [];
  for (let r = 0; r < numRounds; r++) {
    // startpositie draait per ronde mee, anders valt elke ronde hetzelfde uit
    const start = (r * teamSize) % players.length;
    let best = buildRound(start);
    for (let i = 1; i < players.length && best.penalty > 0; i++) {
      const cand = buildRound((start + i) % players.length);
      if (cand.penalty < best.penalty) best = cand;
    }
    best.teams.flatMap(pairs).forEach((k) => pairCount.set(k, (pairCount.get(k) ?? 0) + 1));
    rondes.push(best.teams);
  }
  return rondes;
}

// welk deel van alle mogelijke duo's heeft al eens samengespeeld?
export function pairCoverage(players: string[], rondes: string[][][]): { played: number; total: number } {
  const seen = new Set<string>();
  rondes.forEach((teams) =>
    teams.forEach((team) =>
      team.forEach((a, i) => team.slice(i + 1).forEach((b) => seen.add([a, b].sort().join("|"))))
    )
  );
  const n = players.length;
  return { played: seen.size, total: (n * (n - 1)) / 2 };
}
