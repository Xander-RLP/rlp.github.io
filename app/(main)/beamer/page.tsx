"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { BEAMER_FOTOS } from "@/lib/beamer-fotos";
import { allMatches, gameStatus, logoColor } from "@/lib/bracket";
import { computeLeaderboards } from "@/lib/leaderboard";
import { useTournament } from "@/lib/store";
import type { BeamerBlock, BeamerSlide } from "@/lib/types";

// Beamerpagina: fullscreen presentatie voor op de muur. Elke slide is een
// raster (24×14) met vrij te slepen blokken: tekst, foto's én live widgets
// (programma van vandaag, upcoming matches, leaderboard). De admin bewerkt
// alles direct op de slide; opslaan gaat vanzelf.

const STANDAARD_SECONDEN = 12;
const POLL_MS = 15000;
const COLS = 24;
const ROWS = 14;
const AREA_BASIS = 888; // referentiehoogte van het slide-vlak op 1080p

const WIDGETS: Record<string, string> = {
  vandaag: "📅 Programma van vandaag",
  matches: "🆚 Upcoming matches",
  leaderboard: "🏆 Leaderboard",
  countdown: "⏳ Countdown naar het volgende",
  lanstart: "🚀 Countdown tot de LAN start",
  klok: "🕐 Grote klok",
  eten: "🍽️ Eetmomenten van vandaag",
  kampioenen: "👑 Kampioenen",
  teams: "👥 Teams & leden",
  gametv: "🎬 Game TV (video)",
  spotify: "🎵 LAN Playlist (Spotify)",
};

// vaste emoji-library: de admin kiest, niet zoeken
const EMOJIS = [
  "🎮", "🕹️", "👾", "🏆", "🥇", "🆚", "🔥", "⚡", "💀", "🏴‍☠️", "🎯", "🎲",
  "🍕", "🍔", "🌭", "🥪", "🍳", "🥓", "☕", "🍵", "🧃", "🥤", "🍺", "🍿",
  "🚿", "🛏️", "😴", "💤", "🚽", "🧹", "🗑️", "🏊", "🪑", "📢", "⚠️", "❗",
  "✅", "❌", "⏰", "📅", "🎵", "🤫", "😎", "🎉", "💩", "🔌", "💻", "🖱️",
];

function infoSlide(p: string, emoji: string, titel: string, tekst: string, images: string[] = []): BeamerSlide {
  return {
    blocks: [
      { id: `${p}-e`, type: "text", content: emoji, x: 12, y: 1, size: 96 },
      { id: `${p}-t`, type: "text", content: titel, x: 12, y: 4, size: 64 },
      { id: `${p}-x`, type: "text", content: tekst, x: 12, y: 7, size: 36 },
      ...images.map((src, i): BeamerBlock => ({
        id: `${p}-i${i}`, type: "image", content: src,
        x: 12 + (i - (images.length - 1) / 2) * 5, y: 9, size: 200,
      })),
    ],
  };
}

const DEFAULT_SLIDES: BeamerSlide[] = [
  { blocks: [{ id: "w-vandaag", type: "widget", content: "vandaag", x: 12, y: 3 }] },
  { blocks: [{ id: "w-matches", type: "widget", content: "matches", x: 12, y: 3 }] },
  { blocks: [{ id: "w-leaderboard", type: "widget", content: "leaderboard", x: 12, y: 3 }] },
  infoSlide("douche", "🚿", "Douchen", "Ochtend: 10:00 – 11:30\nAvond: 20:00 – 21:30", ["/images/beamer/douchen.jpg"]),
  infoSlide("zelf", "🥪", "Zelf service", "Pak het lekker zelf — bestellen kan bij de bar.", ["/images/beamer/zelfservice.jpg", "/images/beamer/bestel.png"]),
  infoSlide("bar", "🍳", "Vers van de bar", "Broodje spek & ei · Broodje knakworst\nKoffie · Thee · Verse jus d'orange", ["/images/beamer/broodje.jpg", "/images/beamer/koffie.webp", "/images/beamer/thee.jpg"]),
  infoSlide("rust", "😴", "Rustruimte", "Even bijkomen mag altijd — slaap zacht, game hard."),
];

// oude slides met losse velden → blokken-slide
function naarBlokken(s: BeamerSlide, si: number): BeamerSlide {
  if (s.blocks) return s;
  const blocks: BeamerBlock[] = [];
  if (s.emoji) blocks.push({ id: `m${si}-e`, type: "text", content: s.emoji, x: 12, y: 1, size: 96 });
  if (s.title) blocks.push({ id: `m${si}-t`, type: "text", content: s.title, x: 12, y: 4, size: 64 });
  if (s.text) blocks.push({ id: `m${si}-x`, type: "text", content: s.text, x: 12, y: 7, size: 36 });
  (s.images ?? []).forEach((src, i) =>
    blocks.push({
      id: `m${si}-i${i}`, type: "image", content: src,
      x: 12 + (i - ((s.images!.length - 1) / 2)) * 5, y: 9, size: s.imageSize ?? 200,
    })
  );
  return { blocks };
}

const uid = () => `b${Date.now().toString(36)}${Math.floor(Math.random() * 1e6).toString(36)}`;

function GroteKlok() {
  const [nu, setNu] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setNu(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  return (
    <div className="text-center">
      <div className="font-mono text-[10rem] font-bold leading-none tabular-nums">
        {nu.toLocaleTimeString("nl-NL", { hour: "2-digit", minute: "2-digit" })}
      </div>
      <div className="mt-2 text-2xl uppercase tracking-widest text-slate-400">
        {nu.toLocaleDateString("nl-NL", { weekday: "long", day: "numeric", month: "long" })}
      </div>
    </div>
  );
}

function CountdownWidget({ doel, label, emoji }: { doel: Date; label: string; emoji: string }) {
  const [nu, setNu] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNu(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  const rest = Math.max(0, doel.getTime() - nu);
  const u = Math.floor(rest / 3600000);
  const m = Math.floor((rest % 3600000) / 60000);
  const sec = Math.floor((rest % 60000) / 1000);
  return (
    <div className="text-center">
      <div className="mb-3 text-3xl uppercase tracking-widest text-slate-400">Straks</div>
      <div className="mb-6 text-6xl font-extrabold">{emoji} {label}</div>
      <div className="font-mono text-8xl font-bold tabular-nums text-lime-400">
        {u > 0 ? `${u}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}` : `${m}:${String(sec).padStart(2, "0")}`}
      </div>
    </div>
  );
}

function Klok() {
  const [nu, setNu] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setNu(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  return (
    <div className="absolute right-10 top-8 text-right">
      <div className="font-mono text-5xl font-bold tabular-nums text-slate-100">
        {nu.toLocaleTimeString("nl-NL", { hour: "2-digit", minute: "2-digit" })}
      </div>
      <div className="text-sm uppercase tracking-widest text-slate-400">
        {nu.toLocaleDateString("nl-NL", { weekday: "long", day: "numeric", month: "long" })}
      </div>
    </div>
  );
}

export default function BeamerPage() {
  const { state, isAdmin, updateState, reload, saveStatus } = useTournament();
  const [idx, setIdx] = useState(0);
  const [bezig, setBezig] = useState(false);
  const [emojiMenu, setEmojiMenu] = useState(false);
  const [widgetMenu, setWidgetMenu] = useState(false);
  const [emojiVoorBlok, setEmojiVoorBlok] = useState<number | null>(null);
  const [fotoMenu, setFotoMenu] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [bewerkModus, setBewerkModus] = useState(false);
  const [managerOpen, setManagerOpen] = useState(false);
  const [hulplijn, setHulplijn] = useState<{ x: number | null; y: number | null }>({ x: null, y: null });
  const [isFull, setIsFull] = useState(false);
  const [actief, setActief] = useState(true);
  const [draft, setDraft] = useState<BeamerSlide[] | null>(null);
  const draftRef = useRef(draft);
  draftRef.current = draft;
  const lastSaveRef = useRef(0); // reload 30s pauzeren na een save (race-bescherming)
  const areaRef = useRef<HTMLDivElement>(null);

  const slides = useMemo(
    () => (draft ?? state?.beamer ?? DEFAULT_SLIDES).map(naarBlokken),
    [draft, state]
  );
  const totaal = Math.max(1, slides.length);
  const huidige = slides[idx % totaal];
  const slidesRef = useRef(slides);
  slidesRef.current = slides;
  const slideMs = Math.max(3, state?.beamerInterval ?? STANDAARD_SECONDEN) * 1000;

  // na 5s stilte faden de bedien-elementen weg; beweging haalt ze terug
  useEffect(() => {
    let t: ReturnType<typeof setTimeout>;
    const wake = () => {
      setActief(true);
      clearTimeout(t);
      t = setTimeout(() => setActief(false), 5000);
    };
    wake();
    window.addEventListener("mousemove", wake);
    window.addEventListener("mousedown", wake);
    window.addEventListener("keydown", wake);
    return () => {
      clearTimeout(t);
      window.removeEventListener("mousemove", wake);
      window.removeEventListener("mousedown", wake);
      window.removeEventListener("keydown", wake);
    };
  }, []);

  // fullscreen-knop verdwijnt zodra we echt fullscreen staan
  useEffect(() => {
    const onFs = () => setIsFull(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onFs);
    return () => document.removeEventListener("fullscreenchange", onFs);
  }, []);

  // de pagina achter de overlay mag niet scrollen — geen scrollbalk in beeld
  useEffect(() => {
    const vorige = document.documentElement.style.overflow;
    document.documentElement.style.overflow = "hidden";
    return () => {
      document.documentElement.style.overflow = vorige;
    };
  }, []);

  // óók als admin verse data blijven halen: de beamer hangt een weekend open
  useEffect(() => {
    const t = setInterval(() => {
      // niet verversen vlak na een eigen save: de commit moet eerst rond zijn,
      // anders overschrijft de oude server-staat je verse bewerking
      if (!draftRef.current && !bezig && Date.now() - lastSaveRef.current > 30000) void reload();
    }, POLL_MS);
    return () => clearInterval(t);
  }, [reload, bezig]);

  // automatische rotatie
  useEffect(() => {
    if (bezig || bewerkModus || managerOpen || emojiMenu || widgetMenu || fotoMenu || emojiVoorBlok != null) return;
    const t = setInterval(() => setIdx((i) => {
      // verborgen slides overslaan; via de ref zodat een data-poll de
      // timer niet reset (daardoor bleef de beamer bij bezoekers hangen)
      const sl = slidesRef.current;
      const n = Math.max(1, sl.length);
      for (let stap = 1; stap <= n; stap++) {
        const kandidaat = (i + stap) % n;
        if (!sl[kandidaat]?.hidden) return kandidaat;
      }
      return i;
    }), slideMs);
    return () => clearInterval(t);
  }, [slideMs, bezig, bewerkModus, managerOpen, emojiMenu, widgetMenu, fotoMenu, emojiVoorBlok]);

  // presenteren zoals Keynote/PowerPoint: pijltjes, spatie, PageUp/Down
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const ae = document.activeElement as HTMLElement | null;
      const tag = (ae?.tagName ?? "").toLowerCase();
      if (tag === "input" || tag === "textarea" || ae?.isContentEditable) return;
      if (["ArrowRight", "PageDown", " "].includes(e.key)) {
        e.preventDefault();
        setIdx((i) => (i + 1) % totaal);
      } else if (["ArrowLeft", "PageUp"].includes(e.key)) {
        e.preventDefault();
        setIdx((i) => (i - 1 + totaal) % totaal);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [totaal]);

  // live data voor de widgets
  const vandaag = useMemo(() => {
    if (!state) return [];
    const sameDay = (s?: string) => !!s && new Date(s).toDateString() === new Date().toDateString();
    return [
      ...state.games.filter((g) => sameDay(g.start)).map((g) => ({
        time: new Date(g.start!), label: g.name, emoji: g.emoji ?? "🎮",
      })),
      ...(state.eetmomenten ?? []).filter((e) => sameDay(e.start)).map((e) => ({
        time: new Date(e.start), label: e.title, emoji: e.emoji ?? "🍽️",
      })),
    ].sort((a, b) => +a.time - +b.time);
  }, [state]);
  const pending = useMemo(() => (state ? allMatches(state.games).filter((m) => !m.decided).slice(0, 6) : []), [state]);
  const top = useMemo(() => (state ? computeLeaderboards(state).personal.slice(0, 5) : []), [state]);

  if (!state) return null;

  const chrome = actief || bezig || bewerkModus || managerOpen || emojiMenu || widgetMenu || fotoMenu || emojiVoorBlok != null;
  const fade = `transition-opacity duration-1000 ${chrome ? "opacity-100" : "pointer-events-none opacity-0"}`;

  // ---- bewerken ----
  function startEdit(): BeamerSlide[] {
    const d = draft ?? (JSON.parse(JSON.stringify(slides)) as BeamerSlide[]);
    if (!draft) setDraft(d);
    return d;
  }

  function bewaar(d?: BeamerSlide[]) {
    const data = d ?? draftRef.current;
    if (!data) return;
    lastSaveRef.current = Date.now();
    updateState({ beamer: data });
    setDraft(null);
    setBezig(false);
  }

  function patchBlock(bi: number, patch: Partial<BeamerBlock>, meteen = false): BeamerSlide[] {
    const d = startEdit().map((s, si) =>
      si === idx % totaal ? { ...s, blocks: s.blocks!.map((b, j) => (j === bi ? { ...b, ...patch } : b)) } : s
    );
    setDraft(d);
    if (meteen) bewaar(d);
    return d;
  }

  function addBlock(block: Omit<BeamerBlock, "id" | "x" | "y"> & Partial<Pick<BeamerBlock, "x" | "y">>) {
    setBewerkModus(true);
    const d = startEdit().map((s, si) =>
      si === idx % totaal
        ? { ...s, blocks: [...(s.blocks ?? []), { id: uid(), x: 12, y: 6, ...block }] }
        : s
    );
    bewaar(d);
  }

  function removeBlock(bi: number) {
    const d = startEdit().map((s, si) =>
      si === idx % totaal ? { ...s, blocks: s.blocks!.filter((_, j) => j !== bi) } : s
    );
    bewaar(d);
  }

  function nieuweSlide() {
    setBewerkModus(true);
    const d = [...startEdit()];
    const plek = (idx % totaal) + 1;
    d.splice(plek, 0, { blocks: [{ id: uid(), type: "text" as const, content: "Nieuwe slide", x: 12, y: 5, size: 64 }] });
    bewaar(d);
    setIdx(plek);
  }

  function toggleVerborgen(si: number) {
    const d = startEdit().map((sl, j) => (j === si ? { ...sl, hidden: !sl.hidden } : sl));
    bewaar(d);
  }

  function verwijderSlideOp(si: number) {
    if (!confirm(`Slide ${si + 1} verwijderen?`)) return;
    const d = startEdit().filter((_, j) => j !== si);
    bewaar(d);
    if (idx >= d.length) setIdx(0);
  }

  function verplaatsSlideOp(si: number, richting: -1 | 1) {
    const naar = si + richting;
    if (naar < 0 || naar >= totaal) return;
    const d = [...startEdit()];
    const [slide] = d.splice(si, 1);
    d.splice(naar, 0, slide);
    bewaar(d);
    if (idx % totaal === si) setIdx(naar);
  }

  // huidige slide een plek naar voren of achteren schuiven
  function verplaatsSlide(richting: -1 | 1) {
    const van = idx % totaal;
    const naar = van + richting;
    if (naar < 0 || naar >= totaal) return;
    const d = [...startEdit()];
    const [slide] = d.splice(van, 1);
    d.splice(naar, 0, slide);
    bewaar(d);
    setIdx(naar);
  }

  function verwijderSlide() {
    if (!confirm("Deze hele slide verwijderen?")) return;
    const d = startEdit().filter((_, si) => si !== idx % totaal);
    bewaar(d);
    setIdx(0);
  }

  // blok slepen met grid-snap; ankerpunt is boven-midden van het blok.
  // De grab-offset blijft behouden zodat het blok niet naar de muis springt
  function dragBlock(e: React.PointerEvent, bi: number) {
    if (!isAdmin) return;
    e.preventDefault();
    e.stopPropagation();
    const area = areaRef.current?.getBoundingClientRect();
    if (!area) return;
    const blok = (huidige?.blocks ?? [])[bi];
    if (!blok) return;
    const offsetX = e.clientX - (area.left + (blok.x / COLS) * area.width);
    const offsetY = e.clientY - (area.top + (blok.y / ROWS) * area.height);
    setBezig(true);
    setDragActive(true);
    let laatste: BeamerSlide[] | null = null;
    const anderen = (huidige?.blocks ?? []).filter((_, j) => j !== bi);
    const move = (me: PointerEvent) => {
      const ruwX = ((me.clientX - offsetX - area.left) / area.width) * COLS;
      const ruwY = ((me.clientY - offsetY - area.top) / area.height) * ROWS;
      // magnetisch snappen: eerst het midden (gecentreerd is heilig op een
      // beamer), daarna de posities van andere blokken op deze slide.
      // Standaard kwart-cel-stapjes voor fijn werk; Shift = volledig vrij
      const stap = me.shiftKey ? 0.001 : 0.25;
      const rond = (v: number) => Math.round(v / stap) * stap;
      let gx = Math.max(0, Math.min(COLS, rond(ruwX)));
      let snapX: number | null = null;
      for (const doel of [COLS / 2, ...anderen.map((a) => a.x)]) {
        if (Math.abs(ruwX - doel) < 0.5) { gx = doel; snapX = doel; break; }
      }
      let gy = Math.max(0, Math.min(ROWS - 1, rond(ruwY)));
      let snapY: number | null = null;
      for (const doel of [ROWS / 2, ...anderen.map((a) => a.y)]) {
        if (Math.abs(ruwY - doel) < 0.5) { gy = doel; snapY = doel; break; }
      }
      setHulplijn({ x: snapX, y: snapY });
      laatste = patchBlock(bi, { x: gx, y: gy });
    };
    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      setDragActive(false);
      setHulplijn({ x: null, y: null });
      bewaar(laatste ?? undefined);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  }

  // mini-weergave van een slide (gedeeld door manager en filmstrip)
  function miniatuur(sl: BeamerSlide) {
    return (sl.blocks ?? []).map((b) => {
      const f = 130 / AREA_BASIS;
      const stijlPos = { left: `${(b.x / COLS) * 100}%`, top: `${(b.y / ROWS) * 100}%` } as React.CSSProperties;
      if (b.type === "image") {
        // eslint-disable-next-line @next/next/no-img-element
        return <img key={b.id} src={b.content} alt="" style={{ ...stijlPos, height: (b.size ?? 200) * f }} className="absolute w-auto -translate-x-1/2 rounded-sm" />;
      }
      if (b.type === "widget") {
        return <span key={b.id} style={stijlPos} className="absolute -translate-x-1/2 whitespace-nowrap rounded bg-lime-400/20 px-1 text-[8px] font-bold text-lime-300">{WIDGETS[b.content] ?? b.content}</span>;
      }
      return <span key={b.id} style={{ ...stijlPos, fontSize: Math.max(4, (b.size ?? 40) * f) }} className="absolute -translate-x-1/2 whitespace-pre-line text-center font-bold leading-tight">{b.content}</span>;
    });
  }

  function widgetBody(naam: string) {
    if (naam === "vandaag") {
      return (
        <div>
          <h2 className="mb-8 text-6xl font-extrabold uppercase tracking-wide">📅 Vandaag</h2>
          {vandaag.length === 0 ? (
            <p className="text-4xl text-slate-300">Geen programma — vrij spelen! 🎉</p>
          ) : (
            <div className="flex flex-col gap-4">
              {vandaag.map((item, i) => (
                <div key={i} className="flex items-center gap-6 text-4xl">
                  <span className="w-32 font-mono font-bold tabular-nums text-lime-400">
                    {item.time.toLocaleTimeString("nl-NL", { hour: "2-digit", minute: "2-digit" })}
                  </span>
                  <span>{item.emoji}</span>
                  <span className="font-semibold">{item.label}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      );
    }
    if (naam === "matches") {
      return (
        <div>
          <h2 className="mb-8 text-6xl font-extrabold uppercase tracking-wide">🆚 Upcoming matches</h2>
          {pending.length === 0 ? (
            <p className="text-4xl text-slate-300">Geen open matches — bekijk het leaderboard!</p>
          ) : (
            <div className="flex flex-col gap-5">
              {pending.map((m, i) => (
                <div key={i} className="flex items-baseline gap-5 text-4xl">
                  <span className="font-bold">{m.a}</span>
                  <span className="text-2xl font-extrabold text-lime-400">VS</span>
                  <span className="font-bold">{m.b}</span>
                  <span className="ml-3 text-xl text-slate-400">{m.game.name} · {m.round}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      );
    }
    if (naam === "leaderboard") {
      return (
        <div>
          <h2 className="mb-8 text-6xl font-extrabold uppercase tracking-wide">🏆 Leaderboard</h2>
          <div className="flex flex-col gap-4">
            {top.map((e, i) => (
              <div key={e.name} className="flex items-center gap-6 text-4xl">
                <span className="w-16">{["🥇", "🥈", "🥉"][i] ?? `${i + 1}.`}</span>
                <span className="flex h-12 w-12 items-center justify-center rounded text-xl font-extrabold text-white" style={{ background: logoColor(e.name) }}>
                  {e.name.slice(0, 2).toUpperCase()}
                </span>
                <span className="flex-1 font-semibold">{e.name}</span>
                <span className="font-mono font-bold text-lime-400">{e.wins}</span>
              </div>
            ))}
          </div>
        </div>
      );
    }
    if (naam === "klok") return <GroteKlok />;
    if (naam === "spotify") {
      return (
        <iframe
          src="https://open.spotify.com/embed/playlist/4drxBWX7uZiXWBfuikt30S?theme=0"
          width="520"
          height="352"
          frameBorder="0"
          allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
          loading="lazy"
          className="rounded-xl"
          title="RLP2026 Spotify playlist"
        />
      );
    }
    if (naam === "lanstart") {
      const start = state!.eventStart ? new Date(state!.eventStart) : null;
      if (!start) return <p className="text-3xl text-slate-400">Startmoment nog niet ingesteld (kan via de homepage)</p>;
      return start.getTime() > Date.now()
        ? <CountdownWidget doel={start} label="Ronnie LAN Party 2026" emoji="🚀" />
        : <p className="text-6xl font-extrabold">🎉 De LAN is begonnen!</p>;
    }
    if (naam === "countdown") {
      const nu = Date.now();
      const items = [
        ...state!.games.filter((g) => g.start && new Date(g.start).getTime() > nu)
          .map((g) => ({ tijd: new Date(g.start!), label: g.name, emoji: g.emoji ?? "🎮" })),
        ...(state!.eetmomenten ?? []).filter((e) => new Date(e.start).getTime() > nu)
          .map((e) => ({ tijd: new Date(e.start), label: e.title, emoji: e.emoji ?? "🍽️" })),
      ].sort((a, b) => +a.tijd - +b.tijd);
      const eerst = items[0];
      return eerst
        ? <CountdownWidget doel={eerst.tijd} label={eerst.label} emoji={eerst.emoji} />
        : <p className="text-4xl text-slate-300">Geen programma meer — vrij spelen! 🎉</p>;
    }
    if (naam === "eten") {
      const vandaagEten = (state!.eetmomenten ?? [])
        .filter((e) => new Date(e.start).toDateString() === new Date().toDateString())
        .sort((a, b) => +new Date(a.start) - +new Date(b.start));
      return (
        <div>
          <h2 className="mb-8 text-6xl font-extrabold uppercase tracking-wide">🍽️ Eten vandaag</h2>
          {vandaagEten.length === 0 ? (
            <p className="text-4xl text-slate-300">Geen eetmomenten gepland — snacks zat!</p>
          ) : (
            <div className="flex flex-col gap-4">
              {vandaagEten.map((e, i) => (
                <div key={i} className="flex items-center gap-6 text-4xl">
                  <span className="w-32 font-mono font-bold tabular-nums text-lime-400">
                    {new Date(e.start).toLocaleTimeString("nl-NL", { hour: "2-digit", minute: "2-digit" })}
                  </span>
                  <span>{e.emoji ?? "🍽️"}</span>
                  <span className="font-semibold">{e.title}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      );
    }
    if (naam === "kampioenen") {
      const winnaars = state!.games
        .map((g) => ({ g, st: gameStatus(g) }))
        .filter((x) => x.st.champ);
      return (
        <div>
          <h2 className="mb-8 text-6xl font-extrabold uppercase tracking-wide">👑 Kampioenen</h2>
          {winnaars.length === 0 ? (
            <p className="text-4xl text-slate-300">Nog geen kampioenen — de strijd loopt!</p>
          ) : (
            <div className="flex flex-col gap-4">
              {winnaars.map(({ g, st }, i) => (
                <div key={i} className="flex items-center gap-6 text-4xl">
                  <span className="w-72 truncate text-2xl text-slate-400">{g.name}</span>
                  <span className="font-bold text-amber-300">{st.text}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      );
    }
    if (naam === "teams") {
      return (
        <div>
          <h2 className="mb-8 text-6xl font-extrabold uppercase tracking-wide">👥 Teams</h2>
          <div className="flex max-w-4xl flex-wrap justify-center gap-5">
            {(state!.teams ?? []).map((t) => (
              <div key={t.name} className="rounded-xl border border-slate-700 bg-slate-900/70 px-6 py-4 text-center">
                <div className="mb-1 text-3xl font-extrabold">{t.name}</div>
                <div className="text-2xl text-slate-400">{t.members.join(" · ")}</div>
              </div>
            ))}
          </div>
        </div>
      );
    }
    if (naam === "gametv") {
      const nu = Date.now();
      const ls = state!.liveStream;
      const yt = ls?.match(/(?:youtube\.com\/.*[?&]v=|youtu\.be\/|youtube\.com\/live\/)([\w-]{11})/)?.[1];
      const tvGame = state!.games
        .filter((g) => g.video)
        .sort((a, b) => new Date(a.start ?? 0).getTime() - new Date(b.start ?? 0).getTime())
        .find((g) => !g.start || new Date(g.start).getTime() + (g.durationMin ?? 120) * 60000 > nu)
        ?? state!.games.find((g) => g.video);
      const src = yt
        ? `https://www.youtube-nocookie.com/embed/${yt}?autoplay=1&mute=1&rel=0`
        : tvGame?.video
        ? `https://www.youtube-nocookie.com/embed/${tvGame.video}?mute=1&loop=1&playlist=${tvGame.video}&rel=0`
        : null;
      return src ? (
        <iframe
          src={src}
          title="Game TV"
          allow="autoplay; encrypted-media; fullscreen"
          allowFullScreen
          className="aspect-video w-[56rem] rounded-xl border border-slate-700"
        />
      ) : (
        <p className="text-3xl text-slate-400">Geen video beschikbaar</p>
      );
    }
    return <p className="text-2xl text-red-400">onbekende widget: {naam}</p>;
  }

  return (
    <div
      className="fixed inset-0 z-[100] overflow-hidden bg-slate-950 text-slate-100"
      onClick={(e) => {
        // klik op een lege plek = volgende slide (zoals een presentatie) —
        // maar nooit in bewerkmodus, anders is bouwen onmogelijk
        if (bewerkModus) return;
        if ((e.target as HTMLElement).closest("button, input, textarea, a, [contenteditable], [data-blok]")) return;
        setIdx((i) => (i + 1) % totaal);
      }}
    >
      {/* sfeer-achtergrond */}
      <div className="absolute -left-32 top-16 h-96 w-96 animate-pulse rounded-full bg-teal-500/10 blur-3xl" />
      <div className="absolute -right-32 bottom-16 h-96 w-96 animate-pulse rounded-full bg-lime-500/10 blur-3xl" />

      <a href="/" title="Terug naar de site" className="absolute left-10 top-8 flex items-center gap-4 transition-opacity hover:opacity-80">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo.png" alt="RLP26" className="h-16 w-auto" />
        <div className="text-2xl font-extrabold uppercase tracking-wide">Ronnie <span className="text-lime-400">LAN</span> Party</div>
      </a>
      <Klok />

      {/* het slide-raster */}
      <div ref={areaRef} className="absolute inset-x-0 bottom-20 top-28">
        {/* raster + middellijnen: faden zacht in tijdens het slepen en weer uit */}
        <div className={`pointer-events-none absolute inset-0 transition-opacity duration-500 ${dragActive ? "opacity-100" : bewerkModus ? "opacity-30" : "opacity-0"}`}>
          <div
            className="absolute inset-0"
            style={{
              backgroundImage:
                "linear-gradient(to right, rgba(148,163,184,0.10) 1px, transparent 1px), linear-gradient(to bottom, rgba(148,163,184,0.10) 1px, transparent 1px)",
              backgroundSize: `${100 / COLS}% ${100 / ROWS}%`,
            }}
          />
          <div className="absolute inset-y-0 left-1/2 w-px bg-lime-400/70" />
          <div className="absolute inset-x-0 top-1/2 h-px bg-lime-400/40" />
          {hulplijn.x != null && hulplijn.x !== COLS / 2 && (
            <div className="absolute inset-y-0 w-px bg-sky-400/80" style={{ left: `${(hulplijn.x / COLS) * 100}%` }} />
          )}
          {hulplijn.y != null && hulplijn.y !== ROWS / 2 && (
            <div className="absolute inset-x-0 h-px bg-sky-400/80" style={{ top: `${(hulplijn.y / ROWS) * 100}%` }} />
          )}
        </div>
        {(huidige?.blocks ?? []).map((b, bi) => (
          <div
            key={b.id}
            data-blok=""
            style={{ left: `${(b.x / COLS) * 100}%`, top: `${(b.y / ROWS) * 100}%` }}
            className="group absolute -translate-x-1/2"
          >
            {/* mini-toolbar per blok */}
            {isAdmin && (
              <span className={`absolute -top-9 left-1/2 z-10 flex -translate-x-1/2 gap-1 opacity-0 transition-opacity group-hover:opacity-100 ${chrome ? "" : "!opacity-0"}`}>
                <button
                  onClick={() => patchBlock(bi, { locked: !b.locked }, true)}
                  title={b.locked ? "Ontgrendel dit blok" : "Vergrendel dit blok (beschermt tegen per-ongeluk-klikken)"}
                  className={`flex h-7 w-7 cursor-pointer items-center justify-center rounded border text-xs ${
                    b.locked ? "border-amber-400 bg-amber-400/15 text-amber-300" : "border-slate-600 bg-slate-900 text-slate-300 hover:border-amber-400"
                  }`}
                >
                  {b.locked ? "🔒" : "🔓"}
                </button>
                {!b.locked && (
                <button
                  onPointerDown={(e) => dragBlock(e, bi)}
                  title="Sleep om te verplaatsen"
                  className="flex h-7 w-8 cursor-grab items-center justify-center rounded border border-slate-600 bg-slate-900 text-xs text-slate-300 active:cursor-grabbing"
                >
                  ⠿
                </button>
                )}
                {!b.locked && (() => {
                  // schaal-parameters per bloktype: foto in px, tekst in fontgrootte,
                  // widget als percentage (transform-scale)
                  const basis = b.type === "image" ? 200 : b.type === "text" ? 40 : 100;
                  const stap = b.type === "image" ? 32 : b.type === "text" ? 8 : 10;
                  const max = b.type === "image" ? 880 : b.type === "text" ? 160 : 220;
                  const min = b.type === "image" ? 96 : b.type === "text" ? 16 : 40;
                  return (
                    <>
                      <button
                        onClick={() => patchBlock(bi, { size: Math.min(max, (b.size ?? basis) + stap) }, true)}
                        title="Groter"
                        className="flex h-7 w-7 cursor-pointer items-center justify-center rounded border border-slate-600 bg-slate-900 text-xs text-slate-300 hover:border-lime-400"
                      >
                        🔍+
                      </button>
                      <button
                        onClick={() => patchBlock(bi, { size: Math.max(min, (b.size ?? basis) - stap) }, true)}
                        title="Kleiner"
                        className="flex h-7 w-7 cursor-pointer items-center justify-center rounded border border-slate-600 bg-slate-900 text-xs text-slate-300 hover:border-lime-400"
                      >
                        🔍−
                      </button>
                    </>
                  );
                })()}
                {!b.locked && b.type === "text" && (
                  <>
                    <button
                      onClick={() => patchBlock(bi, { align: b.align === "left" ? "right" : b.align === "right" ? "center" : "left" }, true)}
                      title={`Uitlijning: ${b.align ?? "center"} (klik om te wisselen)`}
                      className="flex h-7 w-7 cursor-pointer items-center justify-center rounded border border-slate-600 bg-slate-900 text-xs text-slate-300 hover:border-lime-400"
                    >
                      {b.align === "left" ? "⬅" : b.align === "right" ? "➡" : "↔"}
                    </button>
                    <button
                      onClick={() => { const volgorde = [400, 600, 700, 800]; const cur = b.weight ?? 700; patchBlock(bi, { weight: volgorde[(volgorde.indexOf(cur) + 1) % volgorde.length] }, true); }}
                      title={`Dikte: ${b.weight ?? 700} (klik om te wisselen)`}
                      style={{ fontWeight: b.weight ?? 700 }}
                      className="flex h-7 w-7 cursor-pointer items-center justify-center rounded border border-slate-600 bg-slate-900 text-xs text-slate-300 hover:border-lime-400"
                    >
                      B
                    </button>
                    <button
                      onClick={() => patchBlock(bi, { font: b.font === "serif" ? "mono" : b.font === "mono" ? "sans" : "serif" }, true)}
                      title={`Lettertype: ${b.font ?? "sans"} (klik om te wisselen)`}
                      className={`flex h-7 w-7 cursor-pointer items-center justify-center rounded border border-slate-600 bg-slate-900 text-xs text-slate-300 hover:border-lime-400 ${b.font === "serif" ? "font-serif" : b.font === "mono" ? "font-mono" : "font-sans"}`}
                    >
                      Aa
                    </button>
                    <button
                      onClick={() => setEmojiVoorBlok(emojiVoorBlok === bi ? null : bi)}
                      title="Emoji invoegen (uit de library)"
                      className="flex h-7 w-7 cursor-pointer items-center justify-center rounded border border-slate-600 bg-slate-900 text-xs text-slate-300 hover:border-lime-400"
                    >
                      😀
                    </button>
                  </>
                )}
                {!b.locked && (
                <button
                  onClick={() => removeBlock(bi)}
                  title="Blok verwijderen"
                  className="flex h-7 w-7 cursor-pointer items-center justify-center rounded border border-slate-600 bg-slate-900 text-xs text-slate-300 hover:border-red-500 hover:text-red-500"
                >
                  ×
                </button>
                )}
              </span>
            )}

            {b.type === "text" && (() => {
              const stijl = {
                fontSize: b.size ?? 40,
                fontWeight: b.weight ?? 700,
                textAlign: (b.align ?? "center") as React.CSSProperties["textAlign"],
              };
              const fontClass = b.font === "serif" ? "font-serif" : b.font === "mono" ? "font-mono" : "font-sans";
              return isAdmin && !b.locked ? (
                <div
                  contentEditable
                  suppressContentEditableWarning
                  onFocus={() => setBezig(true)}
                  onBlur={(e) => patchBlock(bi, { content: e.currentTarget.innerText }, true)}
                  style={stijl}
                  className={`min-w-12 max-w-[70vw] break-words whitespace-pre-line rounded border-2 border-dashed border-transparent leading-snug outline-none transition-colors hover:border-slate-600 focus:border-lime-400 ${fontClass}`}
                >
                  {b.content}
                </div>
              ) : (
                <div style={stijl} className={`max-w-[70vw] break-words whitespace-pre-line leading-snug ${fontClass}`}>
                  {b.content}
                </div>
              );
            })()}
            {b.type === "image" && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={b.content}
                alt=""
                style={{ height: b.size ?? 200 }}
                onPointerDown={(e) => dragBlock(e, bi)}
                className={`w-auto rounded-xl border border-slate-700 object-cover shadow-xl shadow-black/40 ${isAdmin ? "cursor-grab active:cursor-grabbing" : ""}`}
              />
            )}
            {b.type === "widget" && (
              <div
                onPointerDown={b.locked ? undefined : (e) => dragBlock(e, bi)}
                style={{ transform: `scale(${(b.size ?? 100) / 100})`, transformOrigin: "top center" }}
                className={`w-max ${isAdmin && !b.locked ? "cursor-grab active:cursor-grabbing" : ""}`}
              >
                {widgetBody(b.content)}
              </div>
            )}

            {/* emoji-library voor dit tekstblok */}
            {emojiVoorBlok === bi && (
              <span className="absolute left-1/2 top-full z-20 mt-2 grid w-[26rem] -translate-x-1/2 grid-cols-12 gap-1 rounded-md border border-slate-700 bg-slate-900 p-3 shadow-2xl">
                {EMOJIS.map((e) => (
                  <button
                    key={e}
                    onClick={() => { patchBlock(bi, { content: `${b.content}${b.content ? " " : ""}${e}` }, true); setEmojiVoorBlok(null); }}
                    className="cursor-pointer rounded p-1 text-xl hover:bg-slate-700"
                  >
                    {e}
                  </button>
                ))}
              </span>
            )}
          </div>
        ))}
        {slides.length === 0 && (
          <p className="flex h-full items-center justify-center text-3xl text-slate-500">
            Nog geen slides{isAdmin ? " — voeg er een toe met + slide" : ""}.
          </p>
        )}
      </div>

      {/* voortgang tot de volgende slide (reset per slide via de key) */}
      {!bezig && !bewerkModus && !managerOpen && (
        <div key={`vb-${idx}-${slideMs}`} className="beamer-voortgang absolute bottom-0 left-0 h-[3px] bg-lime-400/60" style={{ animationDuration: `${slideMs}ms` }} />
      )}

      {/* beheerbalk: knoppen boven, slide-navigatie eronder */}
      <div className={`absolute bottom-6 left-1/2 flex -translate-x-1/2 flex-col items-center gap-2 ${fade}`}>
        {isAdmin && (
          <button
            onClick={() => setBewerkModus((v) => !v)}
            title={bewerkModus ? "Bewerkmodus uit: klikken bladert weer en de rotatie loopt door" : "Bewerkmodus aan: klikken bladert niet en de rotatie pauzeert"}
            className={`cursor-pointer rounded-full border px-3 py-0.5 text-xs font-bold uppercase tracking-wide ${
              bewerkModus ? "border-lime-400 bg-lime-400/15 text-lime-300" : "border-slate-700 text-slate-500 hover:border-lime-400 hover:text-lime-400"
            }`}
          >
            {bewerkModus ? "✏️ bewerkmodus aan" : "✏️ bewerken"}
          </button>
        )}
        {isAdmin && (
          <label className="flex cursor-pointer items-center gap-1 rounded-full border border-slate-700 px-2 py-0.5 text-xs font-bold text-slate-500 hover:border-lime-400">
            ⏱
            <select
              value={state?.beamerInterval ?? STANDAARD_SECONDEN}
              onChange={(e) => updateState({ beamerInterval: parseInt(e.target.value, 10) })}
              title="Hoe lang elke slide blijft staan"
              className="cursor-pointer bg-transparent text-xs focus:outline-none"
            >
              {[5, 8, 10, 12, 15, 20, 30, 45, 60].map((n) => <option key={n} value={n} className="bg-slate-900">{n}s</option>)}
            </select>
          </label>
        )}
        {isAdmin && (
          <button
            onClick={() => setManagerOpen(true)}
            title="Alle slides beheren: overzicht, verbergen, verplaatsen, verwijderen"
            className="cursor-pointer rounded-full border border-slate-700 px-3 py-0.5 text-xs font-bold uppercase tracking-wide text-slate-500 hover:border-lime-400 hover:text-lime-400"
          >
            ⊞ overzicht
          </button>
        )}
        {isAdmin && (
          <div className="flex items-center gap-2.5">

            <button onClick={nieuweSlide} title="Nieuwe slide" className="cursor-pointer rounded-full border border-slate-700 px-2 py-0.5 text-xs font-bold text-slate-500 hover:border-lime-400 hover:text-lime-400">
              + slide
            </button>
            <button onClick={verwijderSlide} title="Deze slide verwijderen" className="cursor-pointer rounded-full border border-slate-700 px-2 py-0.5 text-xs font-bold text-slate-500 hover:border-red-500 hover:text-red-500">
              × slide
            </button>
            <button onClick={() => verplaatsSlide(-1)} title="Slide naar voren verplaatsen" className="cursor-pointer rounded-full border border-slate-700 px-2 py-0.5 text-xs font-bold text-slate-500 hover:border-lime-400 hover:text-lime-400">
              ◀
            </button>
            <button onClick={() => verplaatsSlide(1)} title="Slide naar achteren verplaatsen" className="cursor-pointer rounded-full border border-slate-700 px-2 py-0.5 text-xs font-bold text-slate-500 hover:border-lime-400 hover:text-lime-400">
              ▶
            </button>
            <span className="mx-1 h-4 w-px bg-slate-700" />
            <button onClick={() => addBlock({ type: "text", content: "Tekst…", size: 40 })} className="cursor-pointer rounded-full border border-slate-700 px-2 py-0.5 text-xs font-bold text-slate-500 hover:border-lime-400 hover:text-lime-400">
              + tekst
            </button>
            <span className="relative">
              <button
                onClick={() => { setFotoMenu((v) => !v); setEmojiMenu(false); setWidgetMenu(false); }}
                className="cursor-pointer rounded-full border border-slate-700 px-2 py-0.5 text-xs font-bold text-slate-500 hover:border-lime-400 hover:text-lime-400"
              >
                + foto
              </button>
              {fotoMenu && (
                <span className="absolute bottom-8 left-1/2 block w-[42rem] -translate-x-1/2 rounded-md border border-slate-700 bg-slate-900 p-3 shadow-2xl">
                  <span className="mb-2 block text-[11px] font-bold uppercase tracking-wide text-slate-400">
                    Foto's uit de presentatie — klik om te plaatsen
                  </span>
                  <span className="grid max-h-72 grid-cols-6 gap-2 overflow-y-auto pr-1">
                    {BEAMER_FOTOS.map((src) => (
                      <button key={src} onClick={() => { addBlock({ type: "image", content: src, size: 200 }); setFotoMenu(false); }} className="cursor-pointer overflow-hidden rounded border border-slate-700 transition-colors hover:border-lime-400">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={src} alt="" loading="lazy" className="h-16 w-full object-cover" />
                      </button>
                    ))}
                  </span>
                  <button
                    onClick={() => { const url = prompt("Eigen pad of URL van een foto:")?.trim(); if (url) { addBlock({ type: "image", content: url, size: 200 }); setFotoMenu(false); } }}
                    className="mt-2 w-full cursor-pointer rounded border border-dashed border-slate-600 py-1.5 text-[11px] font-bold text-slate-400 hover:border-lime-400 hover:text-lime-400"
                  >
                    🔗 eigen URL…
                  </button>
                </span>
              )}
            </span>
            <span className="relative">
              <button onClick={() => { setEmojiMenu((v) => !v); setWidgetMenu(false); }} className="cursor-pointer rounded-full border border-slate-700 px-2 py-0.5 text-xs font-bold text-slate-500 hover:border-lime-400 hover:text-lime-400">
                + emoji
              </button>
              {emojiMenu && (
                <span className="absolute bottom-8 left-1/2 grid w-[26rem] -translate-x-1/2 grid-cols-12 gap-1 rounded-md border border-slate-700 bg-slate-900 p-3 shadow-2xl">
                  {EMOJIS.map((e) => (
                    <button key={e} onClick={() => { addBlock({ type: "text", content: e, size: 96 }); setEmojiMenu(false); }} className="cursor-pointer rounded p-1 text-xl hover:bg-slate-700">
                      {e}
                    </button>
                  ))}
                </span>
              )}
            </span>
            <span className="relative">
              <button onClick={() => { setWidgetMenu((v) => !v); setEmojiMenu(false); }} className="cursor-pointer rounded-full border border-slate-700 px-2 py-0.5 text-xs font-bold text-slate-500 hover:border-lime-400 hover:text-lime-400">
                + widget
              </button>
              {widgetMenu && (
                <span className="absolute bottom-8 left-1/2 flex w-64 -translate-x-1/2 flex-col gap-1 rounded-md border border-slate-700 bg-slate-900 p-2 shadow-2xl">
                  {Object.entries(WIDGETS).map(([naam, label]) => (
                    <button key={naam} onClick={() => { addBlock({ type: "widget", content: naam }); setWidgetMenu(false); }} className="cursor-pointer rounded px-2 py-1.5 text-left text-xs font-bold text-slate-300 hover:bg-slate-700">
                      {label}
                    </button>
                  ))}
                </span>
              )}
            </span>
                    </div>
        )}
        <div className="flex items-center gap-2.5">
        {totaal <= 20 ? (
          Array.from({ length: totaal }, (_, i) => (
            <button
              key={i}
              onClick={() => setIdx(i)}
              className={`h-2.5 w-2.5 cursor-pointer rounded-full transition-colors ${i === idx % totaal ? "bg-lime-400" : "bg-slate-700 hover:bg-slate-500"}`}
              aria-label={`Slide ${i + 1}`}
            />
          ))
        ) : (
          /* grote decks: compacte pager in plaats van 100+ bolletjes */
          <span className="flex items-center gap-2">
            <button
              onClick={() => setIdx((i) => (i - 1 + totaal) % totaal)}
              aria-label="Vorige slide"
              className="cursor-pointer rounded-full border border-slate-700 px-2 py-0.5 text-xs font-bold text-slate-400 hover:border-lime-400 hover:text-lime-400"
            >
              ‹
            </button>
            <span className="min-w-16 text-center font-mono text-xs tabular-nums text-slate-400">
              {(idx % totaal) + 1} / {totaal}
            </span>
            <button
              onClick={() => setIdx((i) => (i + 1) % totaal)}
              aria-label="Volgende slide"
              className="cursor-pointer rounded-full border border-slate-700 px-2 py-0.5 text-xs font-bold text-slate-400 hover:border-lime-400 hover:text-lime-400"
            >
              ›
            </button>
          </span>
        )}
        </div>
      </div>

      {isAdmin && (
        <p className={`absolute right-8 text-[11px] text-slate-600 ${isFull ? "bottom-8" : "bottom-24"} ${fade}`}>
          ✏️ klik op tekst om te typen · sleep via ⠿ of de foto/widget zelf (Shift = vrij slepen) · opslaan gaat vanzelf
        </p>
      )}

      {/* opslaan-feedback: de admin moet zien dat een bewerking echt staat */}
      {saveStatus !== "idle" && (
        <div className={`absolute bottom-8 left-8 z-20 rounded border px-4 py-1.5 text-[11px] font-bold tracking-wide ${
          saveStatus === "saved" ? "border-lime-400 bg-slate-800 text-lime-400" : "border-red-500 bg-slate-800 text-red-500"
        }`}>
          {saveStatus === "saved" ? "✓ Opgeslagen" : "⚠ Opslaan mislukt — check verbinding/login"}
        </div>
      )}

      {/* filmstrip: slide-viewport links tijdens het bewerken */}
      {isAdmin && bewerkModus && (
        <aside className="absolute bottom-20 left-0 top-28 z-20 w-56 overflow-y-auto border-r border-slate-800/80 bg-slate-950/55 p-3 opacity-90 backdrop-blur-sm transition-opacity hover:opacity-100 [scrollbar-width:thin]">
          <div className="flex flex-col gap-2">
            {slides.map((sl, si) => (
              <button
                key={si}
                onClick={() => setIdx(si)}
                title={`Naar slide ${si + 1} — sleep om de volgorde te wijzigen`}
                draggable
                onDragStart={(e) => e.dataTransfer.setData("text/plain", String(si))}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  const van = parseInt(e.dataTransfer.getData("text/plain"), 10);
                  if (isNaN(van) || van === si) return;
                  const d = [...startEdit()];
                  const [verplaatst] = d.splice(van, 1);
                  d.splice(si, 0, verplaatst);
                  bewaar(d);
                  setIdx(si);
                }}
                className={`relative block aspect-video w-full cursor-pointer overflow-hidden rounded border bg-slate-950 transition-colors ${
                  si === idx % totaal ? "border-lime-400" : "border-slate-700 hover:border-slate-500"
                } ${sl.hidden ? "opacity-40" : ""}`}
              >
                {miniatuur(sl)}
                <span className="absolute bottom-0.5 left-1 rounded bg-slate-900/80 px-1 text-[9px] font-bold text-slate-400">{si + 1}</span>
                {sl.hidden && <span className="absolute right-1 top-1 text-[9px]">🙈</span>}
              </button>
            ))}
          </div>
        </aside>
      )}

      {/* slide-manager: alle slides als miniaturen beheren */}
      {isAdmin && managerOpen && (
        <div className="absolute inset-0 z-30 overflow-y-auto bg-slate-950/95 p-10 backdrop-blur">
          <div className="mb-5 flex items-center justify-between">
            <h2 className="text-xl font-extrabold uppercase tracking-wide">
              Slides beheren <span className="text-sm font-semibold normal-case text-slate-400">— {slides.filter((x) => !x.hidden).length} zichtbaar van {totaal}; klik een miniatuur om ernaartoe te gaan</span>
            </h2>
            <button onClick={() => setManagerOpen(false)} className="cursor-pointer rounded border border-slate-600 px-4 py-1.5 text-xs font-bold uppercase text-slate-300 hover:border-lime-400 hover:text-lime-400">
              ✕ sluiten
            </button>
          </div>
          <div className="grid grid-cols-[repeat(auto-fill,minmax(230px,1fr))] gap-4">
            {slides.map((sl, si) => (
              <div key={si} className={`rounded-md border ${si === idx % totaal ? "border-lime-400" : "border-slate-700"} ${sl.hidden ? "opacity-45" : ""} bg-slate-900`}>
                <button
                  onClick={() => { setIdx(si); setManagerOpen(false); }}
                  className="relative block aspect-video w-full cursor-pointer overflow-hidden rounded-t-md bg-slate-950"
                  title={`Naar slide ${si + 1}`}
                >
                  {miniatuur(sl)}
                  {sl.hidden && <span className="absolute right-1 top-1 rounded bg-slate-900/90 px-1.5 text-[9px] font-bold text-amber-400">verborgen</span>}
                </button>
                <div className="flex items-center justify-between gap-1 px-2 py-1.5">
                  <span className="text-[10px] font-bold text-slate-500">#{si + 1}</span>
                  <span className="flex gap-1">
                    <button onClick={() => verplaatsSlideOp(si, -1)} title="Naar voren" className="cursor-pointer rounded border border-slate-700 px-1.5 text-[10px] text-slate-400 hover:border-lime-400 hover:text-lime-400">◀</button>
                    <button onClick={() => verplaatsSlideOp(si, 1)} title="Naar achteren" className="cursor-pointer rounded border border-slate-700 px-1.5 text-[10px] text-slate-400 hover:border-lime-400 hover:text-lime-400">▶</button>
                    <button onClick={() => toggleVerborgen(si)} title={sl.hidden ? "Weer tonen in de rotatie" : "Verbergen uit de rotatie (blijft bewaard)"} className="cursor-pointer rounded border border-slate-700 px-1.5 text-[10px] text-slate-400 hover:border-amber-400 hover:text-amber-300">{sl.hidden ? "🙈" : "👁"}</button>
                    <button onClick={() => verwijderSlideOp(si)} title="Verwijderen" className="cursor-pointer rounded border border-slate-700 px-1.5 text-[10px] text-slate-400 hover:border-red-500 hover:text-red-500">×</button>
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* shoutout: koffie-donateur flitsend in beeld */}
      {state.shoutout && new Date(state.shoutout.tot).getTime() > Date.now() && (
        <div className="pointer-events-none absolute inset-x-0 top-24 z-40 flex justify-center">
          <div className="shoutout-banner flex items-center gap-4 rounded-2xl border-2 border-amber-300 bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-400 px-10 py-5 text-3xl font-extrabold text-amber-950 shadow-[0_0_60px_rgba(251,191,36,0.7)]">
            ☕ <span>{state.shoutout.naam} kocht een koffie voor de developer!</span> 🎉
          </div>
          {["☕", "🎉", "⚡", "☕", "🎉", "☕", "⚡", "🎉"].map((e, i) => (
            <span
              key={i}
              className="confetti absolute top-0 text-3xl"
              style={{ left: `${12 + i * 10}%`, animationDelay: `${i * 0.45}s` }}
            >
              {e}
            </span>
          ))}
        </div>
      )}

      {/* terug naar de site + fullscreen; faden weg bij stilte */}
      <div className={`absolute bottom-8 right-8 flex items-center gap-2 ${fade}`}>
        <a
          href="/"
          title="Terug naar de site"
          className="flex cursor-pointer items-center gap-2 rounded border border-slate-700 px-3 py-1.5 text-xs font-bold uppercase tracking-wide text-slate-400 hover:border-lime-400 hover:text-lime-400"
        >
          🏠 Site
        </a>
        {!isFull && (
          <button
            onClick={() => void document.documentElement.requestFullscreen().catch(() => {})}
            title="Fullscreen (zoals F11) — Esc om terug te keren"
            className="flex cursor-pointer items-center gap-2 rounded border border-slate-700 px-3 py-1.5 text-xs font-bold uppercase tracking-wide text-slate-400 hover:border-lime-400 hover:text-lime-400"
          >
            ⛶ Fullscreen
          </button>
        )}
      </div>
    </div>
  );
}
