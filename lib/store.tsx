"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import type { Game, TournamentState } from "./types";

type SaveStatus = "idle" | "saved" | "error";

type TournamentContext = {
  state: TournamentState | null;
  staticMode: boolean;
  isAdmin: boolean;
  saveStatus: SaveStatus;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => void;
  updateGames: (games: Game[]) => void;
  fetchImage: (gameId: string, query: string) => Promise<string | null>;
  reload: () => Promise<void>;
  claimSeat: (seatId: string, name: string) => Promise<string | null>; // null = ok, anders foutmelding
};

const Ctx = createContext<TournamentContext | null>(null);

export function useTournament(): TournamentContext {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useTournament buiten TournamentProvider");
  return ctx;
}

export function TournamentProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<TournamentState | null>(null);
  const [staticMode, setStaticMode] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const saveTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const tokenRef = useRef<string | null>(null);
  tokenRef.current = token;

  const isAdmin = !!token && !staticMode;

  const load = useCallback(async () => {
    // lokale server eerst; op statische hosting (GitHub Pages) terugvallen op data.json
    try {
      const res = await fetch("/api/games");
      if (!res.ok || !(res.headers.get("Content-Type") ?? "").includes("json")) throw new Error();
      setState(await res.json());
      setStaticMode(false);
    } catch {
      setStaticMode(true);
      try {
        const res = await fetch("/data.json", { cache: "no-store" });
        setState(await res.json());
      } catch {
        setState({ games: [] });
      }
    }
  }, []);

  useEffect(() => {
    setToken(localStorage.getItem("rlp_token"));
    void load();
  }, [load]);

  // bezoekers krijgen elke 10s verse data; de admin is zelf de bron
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

  const logout = useCallback(() => {
    localStorage.removeItem("rlp_token");
    setToken(null);
  }, []);

  const updateGames = useCallback((games: Game[]) => {
    const next = { games };
    setState(next);
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      const res = await fetch("/api/games", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${tokenRef.current}` },
        body: JSON.stringify(next),
      });
      if (res.ok) {
        setSaveStatus("saved");
      } else {
        if (res.status === 401) {
          localStorage.removeItem("rlp_token");
          setToken(null);
        }
        setSaveStatus("error");
      }
      setTimeout(() => setSaveStatus("idle"), 1800);
    }, 400);
  }, []);

  const claimSeat = useCallback(async (seatId: string, name: string) => {
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
  }, [load]);

  const fetchImage = useCallback(async (gameId: string, query: string) => {
    const res = await fetch("/api/game-image", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${tokenRef.current}` },
      body: JSON.stringify({ gameId, query }),
    });
    if (!res.ok) return null;
    return (await res.json()).image as string;
  }, []);

  return (
    <Ctx.Provider value={{ state, staticMode, isAdmin, saveStatus, login, logout, updateGames, fetchImage, reload: load, claimSeat }}>
      {children}
    </Ctx.Provider>
  );
}
