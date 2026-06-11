export type Team = { name: string; score: number | null };

export type Match = { teams: [Team, Team] };

export type Bracket = { rounds: Match[][] };

// double elimination voor 4 teams: winners + losers bracket, GF = WB-winnaar vs LB-winnaar
export type DoubleBracket = {
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
  image?: string; // pad naar automatisch gezocht spel-plaatje (public/images/...)
  store?: {
    name: string;  // launcher/winkel, bijv. "Steam" of "Battle.net"
    url: string;
    price?: string; // weggelaten = gratis te spelen
  };
  bracket: Bracket;
  race?: Race;
  double?: DoubleBracket;
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

export type TournamentState = {
  games: Game[];
  seats?: Seat[];
  unseated?: string[]; // aangemeld maar nog geen stoel
  eventStart?: string; // startmoment van de LAN zelf (countdown op home)
  sponsors?: Sponsor[];
};
