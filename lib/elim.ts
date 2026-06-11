import type { Elim } from "./types";

// logica voor het afvalrace-formaat: rondes met groepen spelers waar de admin
// per ronde aanwijst wie doorgaat; latere rondes bevatten alleen overblijvers

export function normalizeElim(e?: Elim): Elim {
  return e?.rounds?.length ? e : { rounds: [[]] };
}

const eq = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();
const clone = (e: Elim): Elim => JSON.parse(JSON.stringify(e));

// winnaar alleen geldig als die in de finaleronde staat
function validate(e: Elim): Elim {
  const finale = e.rounds[e.rounds.length - 1] ?? [];
  if (e.winner && !finale.some((n) => eq(n, e.winner!))) delete e.winner;
  return e;
}

// speler toevoegen aan ronde 1 (instroom vanuit de dugout)
export function addPlayer(elim: Elim | undefined, name: string): Elim {
  const e = clone(normalizeElim(elim));
  if (!e.rounds[0].some((n) => eq(n, name))) e.rounds[0].push(name);
  return e;
}

// speler weghalen uit ronde r — en daarmee ook uit alle latere rondes
export function removePlayer(elim: Elim | undefined, r: number, name: string): Elim {
  const e = clone(normalizeElim(elim));
  for (let i = r; i < e.rounds.length; i++) {
    e.rounds[i] = e.rounds[i].filter((n) => !eq(n, name));
  }
  return validate(e);
}

// doorgang aan/uit: speler uit ronde r naar ronde r+1 (uitzetten cascadeert)
export function toggleAdvance(elim: Elim | undefined, r: number, name: string): Elim {
  const e = clone(normalizeElim(elim));
  if (r + 1 >= e.rounds.length) return e;
  if (e.rounds[r + 1].some((n) => eq(n, name))) {
    return removePlayer(e, r + 1, name);
  }
  e.rounds[r + 1].push(name);
  return validate(e);
}

export function setWinner(elim: Elim | undefined, name: string | null): Elim {
  const e = clone(normalizeElim(elim));
  if (!name || (e.winner && eq(e.winner, name))) delete e.winner;
  else e.winner = name;
  return validate(e);
}

export function addElimRound(elim: Elim | undefined): Elim {
  const e = clone(normalizeElim(elim));
  e.rounds.push([]);
  return e;
}

export function removeElimRound(elim: Elim | undefined, r: number): Elim {
  const e = clone(normalizeElim(elim));
  if (e.rounds.length <= 1) return e;
  e.rounds.splice(r, 1);
  return validate(e);
}

// alle namen die in de afvalrace voorkomen (voor dubbele-aanmelding-checks)
export function elimNames(elim: Elim | undefined): string[] {
  return normalizeElim(elim).rounds[0] ?? [];
}
