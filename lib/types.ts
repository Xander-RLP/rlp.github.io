export type Team = { name: string; score: number | null };

export type Match = { teams: [Team, Team] };

export type Bracket = { rounds: Match[][] };

export type Game = {
  id: string;
  name: string;
  format?: string;
  start?: string; // agenda: datum/tijd (datetime-local), via admin in te stellen
  image?: string; // pad naar automatisch gezocht spel-plaatje (public/images/...)
  bracket: Bracket;
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
};
