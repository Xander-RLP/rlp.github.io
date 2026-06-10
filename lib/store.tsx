"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import type { Game, Seat, TournamentState } from "./types";

type SaveStatus = "idle" | "saved" | "error";

type TournamentContext = {
  state: TournamentState | null;
  staticMode: boolean;
  isAdmin: boolean;
  remoteAdmin: boolean; // ingelogd met GitHub-token op de publieke site
  saveStatus: SaveStatus;
  login: (username: string, password: string) => Promise<boolean>;
  loginGitHub: (token: string) => Promise<boolean>;
  logout: () => void;
  updateGames: (games: Game[]) => void;
  fetchImage: (gameId: string, query: string) => Promise<string | null>;
  reload: () => Promise<void>;
  claimSeat: (seatId: string, name: string) => Promise<string | null>; // null = ok, anders foutmelding
};

const GH_REPO = "XRLP/xrlp.github.io";
const GH_DATA_PATH = "public/data.json";
const GH_CONTENTS = `https://api.github.com/repos/${GH_REPO}/contents/${GH_DATA_PATH}`;

const Ctx = createContext<TournamentContext | null>(null);

export function useTournament(): TournamentContext {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useTournament buiten TournamentProvider");
  return ctx;
}

function toBase64(s: string): string {
  return btoa(String.fromCharCode(...new TextEncoder().encode(s)));
}

function fromBase64(b64: string): string {
  return new TextDecoder().decode(Uint8Array.from(atob(b64), (c) => c.charCodeAt(0)));
}

export function TournamentProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<TournamentState | null>(null);
  const [staticMode, setStaticMode] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [ghToken, setGhToken] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const saveTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const tokenRef = useRef<string | null>(null);
  const ghTokenRef = useRef<string | null>(null);
  const ghShaRef = useRef<string | null>(null);
  const stateRef = useRef<TournamentState | null>(null);
  tokenRef.current = token;
  ghTokenRef.current = ghToken;
  stateRef.current = state;

  const remoteAdmin = staticMode && !!ghToken;
  const isAdmin = (!!token && !staticMode) || remoteAdmin;

  const loadFromGitHub = useCallback(async (tok: string) => {
    const res = await fetch(GH_CONTENTS, {
      headers: { Authorization: `Bearer ${tok}`, Accept: "application/vnd.github+json" },
      cache: "no-store",
    });
    if (!res.ok) throw new Error("github fetch failed");
    const body = await res.json();
    ghShaRef.current = body.sha;
    return JSON.parse(fromBase64(body.content.replace(/\n/g, ""))) as TournamentState;
  }, []);

  const load = useCallback(async () => {
    // lokale server eerst; op statische hosting (GitHub Pages) terugvallen op data.json/GitHub
    try {
      const res = await fetch("/api/games");
      if (!res.ok || !(res.headers.get("Content-Type") ?? "").includes("json")) throw new Error();
      setState(await res.json());
      setStaticMode(false);
      return;
    } catch {
      setStaticMode(true);
    }
    const tok = ghTokenRef.current;
    if (tok) {
      try {
        setState(await loadFromGitHub(tok));
        return;
      } catch { /* val terug op data.json */ }
    }
    try {
      const res = await fetch("/data.json", { cache: "no-store" });
      setState(await res.json());
    } catch {
      setState({ games: [] });
    }
  }, [loadFromGitHub]);

  useEffect(() => {
    setToken(localStorage.getItem("rlp_token"));
    const gh = localStorage.getItem("rlp_gh_token");
    setGhToken(gh);
    ghTokenRef.current = gh;
    void load();
  }, [load]);

  // bezoekers krijgen elke 10s verse data; admins zijn zelf de bron
  useEffect(() => {
    if (isAdmin) return;
    const t = setInterval(() => void load(), 10000);
    return () => clearInterval(t);
  }, [isAdmin, load]);

  const login = useCallback(async (username: string, password: string) => {
    const res = await fetch("/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });
    if (!res.ok) return false;
    const { token: t } = await res.json();
    localStorage.setItem("rlp_token", t);
    setToken(t);
    return true;
  }, []);

  const loginGitHub = useCallback(async (tok: string) => {
    try {
      const fresh = await loadFromGitHub(tok);
      localStorage.setItem("rlp_gh_token", tok);
      setGhToken(tok);
      ghTokenRef.current = tok;
      setState(fresh);
      return true;
    } catch {
      return false;
    }
  }, [loadFromGitHub]);

  const logout = useCallback(() => {
    localStorage.removeItem("rlp_token");
    localStorage.removeItem("rlp_gh_token");
    setToken(null);
    setGhToken(null);
    ghTokenRef.current = null;
  }, []);

  // commit de hele state als public/data.json naar de repo (GitHub Pages herbouwt daarna)
  const commitToGitHub = useCallback(async (next: TournamentState, retry = true): Promise<boolean> => {
    const tok = ghTokenRef.current;
    if (!tok) return false;
    const res = await fetch(GH_CONTENTS, {
      method: "PUT",
      headers: { Authorization: `Bearer ${tok}`, Accept: "application/vnd.github+json" },
      body: JSON.stringify({
        message: "Update tournament data via admin",
        content: toBase64(JSON.stringify(next, null, 2)),
        sha: ghShaRef.current ?? undefined,
      }),
    });
    if (res.ok) {
      ghShaRef.current = (await res.json()).content.sha;
      return true;
    }
    if (res.status === 409 && retry) {
      await loadFromGitHub(tok).catch(() => null); // verse sha ophalen en één keer opnieuw
      return commitToGitHub(next, false);
    }
    return false;
  }, [loadFromGitHub]);

  const persist = useCallback((next: TournamentState) => {
    setState(next);
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      let ok: boolean;
      if (ghTokenRef.current && staticMode) {
        ok = await commitToGitHub(next);
      } else {
        const res = await fetch("/api/games", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${tokenRef.current}` },
          body: JSON.stringify(next),
        });
        ok = res.ok;
        if (res.status === 401) {
          localStorage.removeItem("rlp_token");
          setToken(null);
        }
      }
      setSaveStatus(ok ? "saved" : "error");
      setTimeout(() => setSaveStatus("idle"), 2500);
    }, 600);
  }, [commitToGitHub, staticMode]);

  const updateGames = useCallback((games: Game[]) => {
    const cur = stateRef.current;
    if (!cur) return;
    persist({ ...cur, games });
  }, [persist]);

  const claimSeat = useCallback(async (seatId: string, name: string) => {
    const cur = stateRef.current;
    if (!cur) return "nog niet geladen";

    if (!staticMode) {
      const res = await fetch("/api/seat", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${tokenRef.current}` },
        body: JSON.stringify({ seatId, name }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        return (body.error as string) ?? "er ging iets mis";
      }
      await load();
      return null;
    }

    if (!ghTokenRef.current) return "Stoel kiezen kan op de LAN zelf, of door de organisatie (admin).";

    // remote admin: zelfde regels als de server, maar client-side + commit
    const seats: Seat[] = JSON.parse(JSON.stringify(cur.seats ?? []));
    const seat = seats.find((s) => s.id === seatId);
    if (!seat) return "stoel bestaat niet";
    let unseated = [...(cur.unseated ?? [])];
    if (!name) {
      if (seat.name) unseated.push(seat.name);
      seat.name = "";
    } else {
      if (seat.name) return "deze stoel is al bezet";
      for (const s of seats) if (s.name.toLowerCase() === name.toLowerCase()) s.name = "";
      seat.name = name;
      unseated = unseated.filter((n) => n.toLowerCase() !== name.toLowerCase());
    }
    persist({ ...cur, seats, unseated });
    return null;
  }, [staticMode, load, persist]);

  const fetchImage = useCallback(async (gameId: string, query: string) => {
    if (staticMode) return null; // beeldzoeker draait alleen op de lokale server
    const res = await fetch("/api/game-image", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${tokenRef.current}` },
      body: JSON.stringify({ gameId, query }),
    });
    if (!res.ok) return null;
    return (await res.json()).image as string;
  }, [staticMode]);

  return (
    <Ctx.Provider value={{ state, staticMode, isAdmin, remoteAdmin, saveStatus, login, loginGitHub, logout, updateGames, fetchImage, reload: load, claimSeat }}>
      {children}
    </Ctx.Provider>
  );
}
