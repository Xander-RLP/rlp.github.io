"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { allUsers } from "./users";
import type { EetMoment, Game, Seat, Sponsor, TournamentState } from "./types";

type SaveStatus = "idle" | "saved" | "error";

type TournamentContext = {
  state: TournamentState | null;
  isAdmin: boolean;
  saveStatus: SaveStatus;
  login: (token: string) => Promise<boolean>;
  logout: () => void;
  updateGames: (games: Game[]) => void;
  updateState: (patch: Partial<TournamentState>) => void; // bijv. teams/rotatie
  updateEventStart: (value: string) => void;
  updateSponsors: (sponsors: Sponsor[]) => void;
  updateEetmomenten: (eetmomenten: EetMoment[]) => void;
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
  return new TextDecoder().decode(b64ToBytes(b64));
}

function b64ToBytes(b64: string): Uint8Array {
  return Uint8Array.from(atob(b64.replace(/\n/g, "")), (c) => c.charCodeAt(0));
}

export function TournamentProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<TournamentState | null>(null);
  const [ghToken, setGhToken] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const saveTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const ghTokenRef = useRef<string | null>(null);
  const ghShaRef = useRef<string | null>(null);
  const stateRef = useRef<TournamentState | null>(null);
  ghTokenRef.current = ghToken;
  stateRef.current = state;

  const isAdmin = !!ghToken;

  const loadFromGitHub = useCallback(async (tok: string) => {
    const res = await fetch(GH_CONTENTS, {
      headers: { Authorization: `Bearer ${tok}`, Accept: "application/vnd.github+json" },
      cache: "no-store",
    });
    if (!res.ok) throw new Error("github fetch failed");
    const body = await res.json();
    ghShaRef.current = body.sha;
    return JSON.parse(fromBase64(body.content)) as TournamentState;
  }, []);

  const load = useCallback(async () => {
    const tok = ghTokenRef.current;
    if (tok) {
      try {
        setState(await loadFromGitHub(tok));
        return;
      } catch { /* val terug op het statische bestand */ }
    }
    try {
      const res = await fetch("/data.json", { cache: "no-store" });
      setState(await res.json());
    } catch {
      setState({ games: [] });
    }
  }, [loadFromGitHub]);

  useEffect(() => {
    const gh = localStorage.getItem("rlp_gh_token");
    setGhToken(gh);
    ghTokenRef.current = gh;
    void load();
  }, [load]);

  // bezoekers krijgen elke 10s verse data; de admin is zelf de bron
  useEffect(() => {
    if (isAdmin) return;
    const t = setInterval(() => void load(), 10000);
    return () => clearInterval(t);
  }, [isAdmin, load]);

  // inloggen met een GitHub fine-grained token (Contents r/w op de repo)
  const login = useCallback(async (token: string) => {
    const tok = token.trim();
    if (!tok) return false;
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
    localStorage.removeItem("rlp_gh_token");
    setGhToken(null);
    ghTokenRef.current = null;
  }, []);

  // commit de hele state als public/data.json naar de repo (Pages herbouwt daarna)
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
      const ok = await commitToGitHub(next);
      setSaveStatus(ok ? "saved" : "error");
      setTimeout(() => setSaveStatus("idle"), 2500);
    }, 600);
  }, [commitToGitHub]);

  const updateGames = useCallback((games: Game[]) => {
    const cur = stateRef.current;
    if (!cur) return;
    persist({ ...cur, games });
  }, [persist]);

  const updateState = useCallback((patch: Partial<TournamentState>) => {
    const cur = stateRef.current;
    if (!cur) return;
    persist({ ...cur, ...patch });
  }, [persist]);

  const updateEventStart = useCallback((value: string) => {
    const cur = stateRef.current;
    if (!cur) return;
    persist({ ...cur, eventStart: value || undefined });
  }, [persist]);

  const updateSponsors = useCallback((sponsors: Sponsor[]) => {
    const cur = stateRef.current;
    if (!cur) return;
    persist({ ...cur, sponsors });
  }, [persist]);

  const updateEetmomenten = useCallback((eetmomenten: EetMoment[]) => {
    const cur = stateRef.current;
    if (!cur) return;
    persist({ ...cur, eetmomenten });
  }, [persist]);

  const claimSeat = useCallback(async (seatId: string, name: string) => {
    const cur = stateRef.current;
    if (!cur) return "nog niet geladen";
    if (!ghTokenRef.current) return "Alleen de organisatie kan stoelen wijzigen — log in via /admin.";

    const seats: Seat[] = JSON.parse(JSON.stringify(cur.seats ?? []));
    const seat = seats.find((s) => s.id === seatId);
    if (!seat) return "stoel bestaat niet";
    if (!name) {
      seat.name = ""; // de user blijft gewoon in de centrale lijst staan
    } else {
      if (seat.name) return "deze stoel is al bezet";
      for (const s of seats) if (s.name.toLowerCase() === name.toLowerCase()) s.name = "";
      seat.name = name;
    }
    // centrale users-lijst consolideren; de oude losse unseated-opslag vervalt
    persist({ ...cur, seats, users: allUsers(cur), unseated: undefined });
    return null;
  }, [persist]);

  // spel-icoon zoeken: eerst Steam's vierkante clienticon, dan Wikipedia als vangnet
  const fetchImage = useCallback(async (_gameId: string, query: string) => {
    // Steam bewaart per app een vierkant clienticon (.ico, tot 256px) en klein icoon (.jpg, 32px)
    // op de community-CDN: /steamcommunity/public/images/apps/{appid}/{hash}.{ico,jpg}
    const iconUrl = (appid: string, hash: string, ext: "ico" | "jpg") =>
      `https://cdn.cloudflare.steamstatic.com/steamcommunity/public/images/apps/${appid}/${hash}.${ext}`;
    const imageExists = async (url: string) => {
      try { return (await fetch(url, { method: "HEAD" })).ok; } catch { return false; }
    };

    const searchSteam = async (q: string): Promise<string | null> => {
      // store-URL of kaal appid geplakt? Dan hebben we de appid al
      let appid =
        q.match(/store\.steampowered\.com\/app\/(\d+)/)?.[1] ??
        q.trim().match(/^(\d{3,})$/)?.[1] ?? null;
      let smallIcon: string | null = null;
      if (!appid) {
        // zoeken op naam: Steam stuurt geen CORS-headers, dus via een proxy
        const target = `https://steamcommunity.com/actions/SearchApps/${encodeURIComponent(q)}`;
        const res = await fetch(`https://corsproxy.io/?url=${encodeURIComponent(target)}`);
        if (!res.ok) return null;
        const apps = (await res.json()) as { appid: string; name: string; icon?: string }[];
        appid = apps[0]?.appid ?? null;
        smallIcon = apps[0]?.icon ?? null; // vierkant 32px-icoontje, vast vangnet
      }
      if (!appid) return null;
      // de icon-hashes staan in Steam's appinfo; api.steamcmd.net serveert die CORS-open
      try {
        const res = await fetch(`https://api.steamcmd.net/v1/info/${appid}`);
        const common = (await res.json())?.data?.[appid]?.common as
          { clienticon?: string; icon?: string } | undefined;
        if (common?.clienticon) {
          const url = iconUrl(appid, common.clienticon, "ico");
          if (await imageExists(url)) return url;
        }
        if (common?.icon) {
          const url = iconUrl(appid, common.icon, "jpg");
          if (await imageExists(url)) return url;
        }
      } catch { /* appinfo niet beschikbaar — val terug op het zoek-icoontje */ }
      return smallIcon;
    };

    const search = async (q: string): Promise<string | null> => {
      const params = new URLSearchParams({
        action: "query", format: "json", origin: "*",
        generator: "search", gsrsearch: q, gsrlimit: "5",
        prop: "pageimages", piprop: "thumbnail", pithumbsize: "512",
      });
      const res = await fetch(`https://en.wikipedia.org/w/api.php?${params}`);
      if (!res.ok) return null;
      const data = await res.json();
      const pages = Object.values((data.query?.pages ?? {}) as Record<string, { index?: number; thumbnail?: { source?: string } }>);
      pages.sort((a, b) => (a.index ?? 99) - (b.index ?? 99));
      return pages.find((p) => p.thumbnail?.source)?.thumbnail?.source ?? null;
    };
    const steam = await searchSteam(query).catch(() => null);
    if (steam) return steam;
    try {
      return (await search(query)) ?? (await search(`${query} video game`));
    } catch {
      return null;
    }
  }, []);

  return (
    <Ctx.Provider value={{ state, isAdmin, saveStatus, login, logout, updateGames, updateState, updateEventStart, updateSponsors, updateEetmomenten, fetchImage, reload: load, claimSeat }}>
      {children}
    </Ctx.Provider>
  );
}
