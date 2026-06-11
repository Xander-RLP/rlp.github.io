export type Team = { name: string; score: number | null };

// verwijzing naar een team-slot: ronde r, match m, slot s (0 = bovenste)
export type SlotRef = { r: number; m: number; s: number };

export type Match = {
  // 2 of meer slots: 1v1-wedstrijden, maar ook velden van 3, 4+ spelers
  teams: Team[];
  // kopje boven het vakje, bijv. "🏆 WB Ronde 1" of "💀 LB Finale"
  label?: string;
  // lijnen per eindpositie: outs[0] = waar nummer 1 naartoe stroomt,
  // outs[1] = nummer 2 (bij 1v1 de verliezer), enz. null = geen lijn
  outs?: (SlotRef | null)[];
  // legacy lijnen (worden bij het lezen genormaliseerd naar outs):
  // next = winnaar (undefined = klassiek: volgende ronde, match m/2, slot m%2),
  // loserNext = verliezer
  next?: SlotRef | null;
  loserNext?: SlotRef | null;
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
  entryType?: "user" | "team"; // per speler of per team aanmelden (default: user)
  format?: string;
  description?: string; // bijv. uitleg van het quest/level-event
  start?: string; // agenda: datum/tijd (datetime-local), via admin in te stellen
  durationMin?: number; // geschatte duur in minuten (kalenderblok), default 120
  image?: string; // pad/URL naar spel-plaatje (automatisch gezocht of zelf ingevoerd)
  emoji?: string; // gekozen emoji als icoon wanneer er geen plaatje (gevonden) is
  video?: string; // YouTube-videoId met gameplay — voeding voor de Game TV in de sidebar
  store?: {
    name: string;  // launcher/winkel, bijv. "Steam" of "Battle.net"
    url: string;
    price?: string; // weggelaten = gratis te spelen
  };
  bracket: Bracket;
  race?: Race;
  double?: DoubleBracket;
  dugout?: string[]; // legacy: de dugout is nu afgeleid van users/teams (lib/users.ts dugoutNames)
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

export type TournamentState = {
  games: Game[];
  seats?: Seat[];
  users?: string[];    // centrale gebruikerslijst (beheer op /users)
  unseated?: string[]; // legacy: opgegaan in users — alleen nog gelezen voor migratie
  eventStart?: string; // startmoment van de LAN zelf (countdown op home)
  sponsors?: Sponsor[];
  eetmomenten?: EetMoment[]; // eetmomenten in de schedule-kalender
  teams?: TeamDef[];   // teams met leden (beheer op /teams); leden zijn users
  whatsapp?: string;   // invite-link van de groepschat (chat.whatsapp.com/…)
  liveStream?: string; // eigen livestream (YouTube/Twitch-URL) — krijgt voorrang in de Game TV
};
