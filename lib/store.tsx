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
  fetchStore: (query: string) => Promise<{ store: NonNullable<Game["store"]>; matchedName: string } | null>;
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

// lijkt een zoekresultaat echt op de gevraagde titel? Voorkomt dat bijv.
// "Battle for Middle-earth" (niet op Steam) op een willekeurig ander
// LOTR-spel matcht — dan liever geen resultaat en handmatig invullen
function goodTitleMatch(query: string, candidate: string): boolean {
  const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "");
  const a = norm(query);
  const b = norm(candidate);
  if (!a || !b) return false;
  if (a === b) return true;
  const [short, long] = a.length < b.length ? [a, b] : [b, a];
  return long.includes(short) && short.length / long.length >= 0.6;
}

// winkelnamen van CheapShark-storeID's die we herkennen
const SHARK_STORES: Record<string, string> = {
  "1": "Steam", "7": "GOG", "8": "Origin", "11": "Humble Bundle", "13": "Ubisoft", "25": "Epic Games",
};

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
        // zoeken op naam: Steam stuurt geen CORS-headers, dus via een proxy.
        // Alleen accepteren als de titel echt lijkt — anders liever het
        // Epic/Wikipedia-vangnet dan het plaatje van een verkeerd spel
        const target = `https://steamcommunity.com/actions/SearchApps/${encodeURIComponent(q)}`;
        const res = await fetch(`https://corsproxy.io/?url=${encodeURIComponent(target)}`);
        if (!res.ok) return null;
        const apps = (await res.json()) as { appid: string; name: string; icon?: string }[];
        const hit = apps.find((a) => goodTitleMatch(q, a.name));
        appid = hit?.appid ?? null;
        smallIcon = hit?.icon ?? null; // vierkant 32px-icoontje, vast vangnet
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

    // niet op Steam? CheapShark (CORS-open) kent ook Epic/GOG-titels en geeft
    // hun winkel-art terug — bijv. Epic-CDN-plaatjes voor Fall Guys
    const searchCheapShark = async (q: string): Promise<string | null> => {
      try {
        const res = await fetch(`https://www.cheapshark.com/api/1.0/games?title=${encodeURIComponent(q)}&limit=10`);
        if (!res.ok) return null;
        const games = (await res.json()) as { external: string; thumb?: string }[];
        const best = games.filter((g) => goodTitleMatch(q, g.external)).sort((a, b) => a.external.length - b.external.length)[0];
        return best?.thumb ?? null;
      } catch {
        return null;
      }
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
    const shark = await searchCheapShark(query);
    if (shark) return shark;
    try {
      return (await search(query)) ?? (await search(`${query} video game`));
    } catch {
      return null;
    }
  }, []);

  // store-/downloadlink zoeken: eerst Steam (met prijs), daarna Epic/GOG e.d.
  // via CheapShark. Alleen resultaten waarvan de titel echt klopt; de admin
  // bevestigt de match en kan altijd nog zelf een URL invullen.
  const fetchStore = useCallback(async (query: string): Promise<{ store: NonNullable<Game["store"]>; matchedName: string } | null> => {
    // 1. Steam
    try {
      const target = `https://steamcommunity.com/actions/SearchApps/${encodeURIComponent(query)}`;
      const res = await fetch(`https://corsproxy.io/?url=${encodeURIComponent(target)}`);
      if (res.ok) {
        const apps = (await res.json()) as { appid: string; name: string }[];
        const hit = apps.find((a) => goodTitleMatch(query, a.name));
        if (hit) {
          let price: string | undefined;
          try {
            const pd = await fetch(`https://corsproxy.io/?url=${encodeURIComponent(
              `https://store.steampowered.com/api/appdetails?appids=${hit.appid}&cc=nl&filters=price_overview,basic`
            )}`);
            const data = (await pd.json())?.[hit.appid]?.data as
              { is_free?: boolean; price_overview?: { final_formatted?: string } } | undefined;
            if (data && !data.is_free && data.price_overview?.final_formatted) {
              price = data.price_overview.final_formatted;
            }
          } catch { /* prijs is een nice-to-have */ }
          return {
            store: { name: "Steam", url: `https://store.steampowered.com/app/${hit.appid}`, ...(price ? { price } : {}) },
            matchedName: hit.name,
          };
        }
      }
    } catch { /* niet op Steam — probeer de andere winkels */ }
    // 2. Epic/GOG/Origin e.d. via CheapShark
    try {
      const res = await fetch(`https://www.cheapshark.com/api/1.0/games?title=${encodeURIComponent(query)}&limit=15`);
      if (!res.ok) return null;
      const games = (await res.json()) as { gameID: string; external: string }[];
      const best = games.filter((g) => goodTitleMatch(query, g.external)).sort((a, b) => a.external.length - b.external.length)[0];
      if (!best) return null;
      const info = await fetch(`https://www.cheapshark.com/api/1.0/games?id=${best.gameID}`);
      if (!info.ok) return null;
      const deals = ((await info.json())?.deals ?? []) as { storeID: string; dealID: string; price: string }[];
      // voorkeur voor Epic, anders de voordeligste bekende winkel
      const deal = deals.find((d) => d.storeID === "25") ?? deals.find((d) => SHARK_STORES[d.storeID]) ?? deals[0];
      if (!deal) return null;
      const prijs = parseFloat(deal.price);
      return {
        store: {
          name: SHARK_STORES[deal.storeID] ?? "Store",
          url: `https://www.cheapshark.com/redirect?dealID=${deal.dealID}`,
          ...(prijs > 0 ? { price: `$${deal.price}` } : {}),
        },
        matchedName: best.external,
      };
    } catch {
      return null;
    }
  }, []);

  return (
    <Ctx.Provider value={{ state, isAdmin, saveStatus, login, logout, updateGames, updateState, updateEventStart, updateSponsors, updateEetmomenten, fetchImage, fetchStore, reload: load, claimSeat }}>
      {children}
    </Ctx.Provider>
  );
}
