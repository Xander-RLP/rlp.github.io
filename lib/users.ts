import type { DoubleBracket, Game, LegacyDoubleBracket, Match, TournamentState } from "./types";

// Centrale gebruikerslogica. Users worden opgeslagen in state.users; oudere
// bronnen (stoelnamen, de oude unseated-lijst en teamleden) worden meegelezen
// zodat bestaande data zonder migratie blijft werken. Bij de eerste schrijf-
// actie wordt alles geconsolideerd naar state.users en vervalt unseated.

const norm = (n: string) => n.trim().toLowerCase();

// alle bekende users, in opslagvolgorde en zonder (hoofdletter-)duplicaten
export function allUsers(state: TournamentState): string[] {
  const seen = new Map<string, string>();
  const add = (n?: string) => {
    const clean = n?.trim();
    if (clean && !seen.has(norm(clean))) seen.set(norm(clean), clean);
  };
  (state.users ?? []).forEach(add);
  (state.seats ?? []).forEach((s) => add(s.name));
  (state.unseated ?? []).forEach(add);
  (state.teams ?? []).forEach((t) => t.members.forEach(add));
  return [...seen.values()];
}

export function userExists(state: TournamentState, name: string): boolean {
  return allUsers(state).some((u) => norm(u) === norm(name));
}

// nieuwe user toevoegen; consolideert meteen de centrale lijst
export function addUserPatch(state: TournamentState, name: string): Partial<TournamentState> | { error: string } {
  const clean = name.trim();
  if (!clean) return { error: "Vul een naam in." };
  if (userExists(state, clean)) return { error: `"${clean}" bestaat al.` };
  return { users: [...allUsers(state), clean], unseated: undefined };
}

// hernoem een naam overal: users, stoelen, teams, rouleerschema én alle
// toernooi-data (bracket-slots, double brackets, races en dugouts). Wordt ook
// gebruikt voor teamnamen, zodat uitslagen aan het team gekoppeld blijven.
export function renameEverywhere(state: TournamentState, from: string, to: string): Partial<TournamentState> {
  const ren = (n: string) => (n && norm(n) === norm(from) ? to : n);
  const games: Game[] = JSON.parse(JSON.stringify(state.games));
  for (const g of games) {
    g.bracket?.rounds.forEach((round) => round.forEach((m) => m.teams.forEach((t) => { t.name = ren(t.name); })));
    if (g.double) {
      // opgeslagen data kan nog het oude 4-teams formaat hebben
      const d = g.double as DoubleBracket | LegacyDoubleBracket;
      const matches: Match[] = "w" in d
        ? [...d.w.flat(), ...d.l.flat(), d.gf]
        : [d.w1[0], d.w1[1], d.wf, d.l1, d.lf, d.gf];
      matches.forEach((m) => m.teams.forEach((t) => { t.name = ren(t.name); }));
    }
    g.race?.participants.forEach((p) => { p.name = ren(p.name); });
    if (g.dugout) g.dugout = g.dugout.map(ren);
  }
  // na hernoemen ontdubbelen (hernoemen naar een bestaande naam voegt samen)
  const users: string[] = [];
  for (const u of allUsers(state).map(ren)) {
    if (!users.some((x) => norm(x) === norm(u))) users.push(u);
  }
  return {
    users,
    unseated: undefined,
    seats: (state.seats ?? []).map((s) => ({ ...s, name: ren(s.name) })),
    teams: (state.teams ?? []).map((t) => ({ name: ren(t.name), members: t.members.map(ren) })),
    games,
  };
}

// user verwijderen: uit de centrale lijst, het stoelenplan en teams.
// Toernooi-uitslagen blijven bewust staan (historie).
export function removeUserEverywhere(state: TournamentState, name: string): Partial<TournamentState> {
  const eq = (n: string) => norm(n) === norm(name);
  return {
    users: allUsers(state).filter((n) => !eq(n)),
    unseated: undefined,
    seats: (state.seats ?? []).map((s) => (eq(s.name) ? { ...s, name: "" } : s)),
    teams: (state.teams ?? []).map((t) => ({ ...t, members: t.members.filter((m) => !eq(m)) })),
  };
}

// namen die al écht in het toernooi staan (bracket-slots, double, afvalrace, race)
export function placedNames(game: Game): string[] {
  const out: string[] = [];
  const add = (n: string) => { if (n) out.push(n); };
  if (game.type === "double" && game.double) {
    const d = game.double as DoubleBracket | LegacyDoubleBracket;
    const matches: Match[] = "w" in d
      ? [...d.w.flat(), ...d.l.flat(), d.gf]
      : [d.w1[0], d.w1[1], d.wf, d.l1, d.lf, d.gf];
    matches.forEach((m) => m.teams.forEach((t) => add(t.name)));
  } else if (game.type === "race" && game.race) {
    game.race.participants.forEach((p) => add(p.name));
  } else {
    game.bracket.rounds.forEach((round) => round.forEach((m) => m.teams.forEach((t) => add(t.name))));
  }
  return out;
}

// de dugout is afgeleid, geen opslag: alle users (of teams, afhankelijk van de
// deelname-instelling) die nog niet in het toernooi zijn ingedeeld. Verandert
// er iets bij users of teams, dan beweegt elke dugout automatisch mee.
export function dugoutNames(game: Game, state: TournamentState): string[] {
  const pool = game.entryType === "team" ? (state.teams ?? []).map((t) => t.name) : allUsers(state);
  const placed = placedNames(game).map(norm);
  return pool.filter((n) => !placed.includes(norm(n)));
}

// op welke stoel zit deze user (of null)?
export function seatOf(state: TournamentState, name: string): string | null {
  return (state.seats ?? []).find((s) => s.name && norm(s.name) === norm(name))?.id ?? null;
}

// in welke teams zit deze user?
export function teamsOf(state: TournamentState, name: string): string[] {
  return (state.teams ?? []).filter((t) => t.members.some((m) => norm(m) === norm(name))).map((t) => t.name);
}
