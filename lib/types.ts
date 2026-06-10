export type Team = { name: string; score: number | null };

export type Match = { teams: [Team, Team] };

export type Bracket = { rounds: Match[][] };

export type RaceParticipant = { name: string; progress: number };

export type Race = {
  goalLabel: string; // bijv. "Eerste op level 20"
  target: number;    // bijv. 20
  participants: RaceParticipant[];
};

export type Game = {
  id: string;
  name: string;
  type?: "bracket" | "race"; // default: bracket
  format?: string;
  description?: string; // bijv. uitleg van het quest/level-event
  start?: string; // agenda: datum/tijd (datetime-local), via admin in te stellen
  image?: string; // pad naar automatisch gezocht spel-plaatje (public/images/...)
  bracket: Bracket;
  race?: Race;
};

export type Seat = {
  id: string;
  side: "top" | "left" | "right" | "bottom";
  name: string; // leeg = vrij
};

export type TournamentState = {
  games: Game[];
  seats?: Seat[];
  unseated?: string[]; // aangemeld maar nog geen stoel
  eventStart?: string; // startmoment van de LAN zelf (countdown op home)
};
