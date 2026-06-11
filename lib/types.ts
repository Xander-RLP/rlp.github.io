export type Team = { name: string; score: number | null };

// verwijzing naar een team-slot: ronde r, match m, slot s (0 = boven, 1 = onder)
export type SlotRef = { r: number; m: number; s: 0 | 1 };

export type Match = {
  teams: [Team, Team];
  // waar de winnaar naartoe stroomt (het "lijntje"):
  // undefined = klassiek (volgende ronde, match m/2, slot m%2),
  // null = geen lijn, anders een expliciet door de admin gekozen slot
  next?: SlotRef | null;
};

export type Bracket = { rounds: Match[][] };

// double elimination voor 4 teams: winners + losers bracket, GF = WB-winnaar vs LB-winnaar
// generiek double elimination: winners- en losers-rondes voor 4/8/16 teams.
// (oude opgeslagen data in het vaste 4-teams formaat wordt bij het lezen
// genormaliseerd door normalizeDouble in lib/bracket.ts)
export type DoubleBracket = {
  w: Match[][]; // winners bracket, per ronde
  l: Match[][]; // losers bracket, per ronde (afwisselend intake/samenvoegen)
  gf: Match;    // grand finals
};

export type LegacyDoubleBracket = {
  w1: [Match, Match]; // winners ronde 1
  wf: Match;          // winners finale
  l1: Match;          // losers ronde 1 (verliezers van w1)
  lf: Match;          // losers finale (winnaar l1 vs verliezer wf)
  gf: Match;          // grand final
};

export type RaceParticipant = { name: string; progress: number };

export type Race = {
  goalLabel: string; // bijv. "Eerste op level 20"
  target: number;    // bijv. 20
  participants: RaceParticipant[];
};

export type Game = {
  id: string;
  name: string;
  type?: "bracket" | "race" | "double"; // default: bracket
  format?: string;
  description?: string; // bijv. uitleg van het quest/level-event
  start?: string; // agenda: datum/tijd (datetime-local), via admin in te stellen
  durationMin?: number; // geschatte duur in minuten (kalenderblok), default 120
  image?: string; // pad/URL naar spel-plaatje (automatisch gezocht of zelf ingevoerd)
  emoji?: string; // gekozen emoji als icoon wanneer er geen plaatje (gevonden) is
  store?: {
    name: string;  // launcher/winkel, bijv. "Steam" of "Battle.net"
    url: string;
    price?: string; // weggelaten = gratis te spelen
  };
  bracket: Bracket;
  race?: Race;
  double?: DoubleBracket;
  dugout?: string[]; // aangemelde spelers/teams die (nog) niet in het bracket staan
};

export type Seat = {
  id: string;
  side: "top" | "left" | "right" | "bottom";
  name: string; // leeg = vrij
};

export type Sponsor = {
  id: string;
  name: string;
  url?: string;     // website van de sponsor
  logo?: string;    // logo-URL; leeg = favicon van de site of initialen
  tagline?: string; // bijv. "Sponsort de prize pool"
};

export type EetMoment = {
  id: string;
  title: string;
  emoji?: string;
  start: string; // datetime-local
  durationMin: number;
  tikkie?: string; // betaallink — toont een betaalknop op /eten en in de kalender
};

// vast team met leden — winst van dit team telt persoonlijk mee voor de leden
export type TeamDef = { name: string; members: string[] };

// rouleerschema: per ronde een teamindeling, zodat iedereen (zo snel mogelijk)
// één keer met iedereen heeft samengespeeld; punten blijven persoonlijk
export type Rotatie = {
  teamSize: number;
  spelers: string[];
  rondes: string[][][]; // rondes → teams → namen
};

export type TournamentState = {
  games: Game[];
  seats?: Seat[];
  unseated?: string[]; // aangemeld maar nog geen stoel
  eventStart?: string; // startmoment van de LAN zelf (countdown op home)
  sponsors?: Sponsor[];
  eetmomenten?: EetMoment[]; // eetmomenten in de schedule-kalender
  teams?: TeamDef[];   // teamregister voor het leaderboard
  rotatie?: Rotatie;   // gegenereerd rouleerschema
};
