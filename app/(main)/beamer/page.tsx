"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { allMatches, logoColor } from "@/lib/bracket";
import { computeLeaderboards } from "@/lib/leaderboard";
import { useTournament } from "@/lib/store";
import type { BeamerSlide } from "@/lib/types";

// Beamerpagina: fullscreen rotatie voor op de muur tijdens de LAN.
// Live data (programma van vandaag, matches, leaderboard) wisselt af met
// eigen info-slides die de admin direct óp de slide bewerkt (geen modal).

const SLIDE_MS = 12000;
const POLL_MS = 15000;

const DEFAULT_SLIDES: BeamerSlide[] = [
  { emoji: "🚿", title: "Douchen", text: "Ochtend: 10:00 – 11:30\nAvond: 20:00 – 21:30", images: ["/images/beamer/douchen.jpg"] },
  { emoji: "🥪", title: "Zelf service", text: "Pak het lekker zelf — bestellen kan bij de bar.", images: ["/images/beamer/zelfservice.jpg", "/images/beamer/bestel.png"] },
  { emoji: "🍳", title: "Vers van de bar", text: "Broodje spek & ei · Broodje knakworst\nKoffie · Thee · Verse jus d'orange", images: ["/images/beamer/broodje.jpg", "/images/beamer/koffie.webp", "/images/beamer/thee.jpg"] },
  { emoji: "😴", title: "Rustruimte", text: "Even bijkomen mag altijd — slaap zacht, game hard." },
];

// vaste emoji-library: de admin kiest, niet zoeken
const EMOJIS = [
  "🎮", "🕹️", "👾", "🏆", "🥇", "🆚", "🔥", "⚡", "💀", "🏴‍☠️", "🎯", "🎲",
  "🍕", "🍔", "🌭", "🥪", "🍳", "🥓", "☕", "🍵", "🧃", "🥤", "🍺", "🍿",
  "🚿", "🛏️", "😴", "💤", "🚽", "🧹", "🗑️", "🏊", "🪑", "📢", "⚠️", "❗",
  "✅", "❌", "⏰", "📅", "🎵", "🤫", "😎", "🎉", "💩", "🔌", "💻", "🖱️",
];

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
  const { state, isAdmin, updateState, reload } = useTournament();
  const [idx, setIdx] = useState(0);
  const [bezig, setBezig] = useState(false); // admin is aan het typen → rotatie pauzeren
  const [pickerOpen, setPickerOpen] = useState(false);
  // lokale kladversie zodat typen niet bij elke toets een commit triggert
  const [draft, setDraft] = useState<BeamerSlide[] | null>(null);
  const draftRef = useRef(draft);
  draftRef.current = draft;

  const slides = draft ?? state?.beamer ?? DEFAULT_SLIDES;

  // óók als admin elke 15s verse data halen: de beamer hangt vaak een heel
  // weekend open en moet scores/schema's live blijven tonen
  useEffect(() => {
    const t = setInterval(() => {
      if (!draftRef.current && !bezig) void reload();
    }, POLL_MS);
    return () => clearInterval(t);
  }, [reload, bezig]);

  // programma van vandaag: toernooien + eetmomenten op tijd
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

  const totaal = 3 + slides.length;
  useEffect(() => {
    if (bezig || pickerOpen) return;
    const t = setInterval(() => setIdx((i) => (i + 1) % totaal), SLIDE_MS);
    return () => clearInterval(t);
  }, [totaal, bezig, pickerOpen]);

  if (!state) return null;

  // ---- inline bewerken ----
  function startEdit(): BeamerSlide[] {
    const d = draft ?? JSON.parse(JSON.stringify(state!.beamer ?? DEFAULT_SLIDES));
    if (!draft) setDraft(d);
    return d;
  }

  function patchSlide(i: number, patch: Partial<BeamerSlide>) {
    const d = startEdit().map((s, j) => (j === i ? { ...s, ...patch } : s));
    setDraft(d);
  }

  function bewaar(d?: BeamerSlide[]) {
    const data = d ?? draftRef.current;
    if (!data) return;
    updateState({ beamer: data.filter((s) => s.title.trim() || s.text?.trim() || s.images?.length) });
    setDraft(null);
    setBezig(false);
  }

  function nieuweSlide() {
    const d = [...startEdit(), { emoji: "📢", title: "Nieuwe slide", text: "" }];
    setDraft(d);
    bewaar(d);
    setIdx(3 + d.length - 1);
  }

  function verwijderSlide(i: number) {
    if (!confirm("Deze slide verwijderen?")) return;
    const d = startEdit().filter((_, j) => j !== i);
    bewaar(d);
    setIdx(0);
  }

  function fotoToevoegen(i: number) {
    const url = prompt("Pad of URL van de foto (bijv. /images/beamer/koffie.webp):")?.trim();
    if (!url) return;
    const d = startEdit();
    bewaar(d.map((s, j) => (j === i ? { ...s, images: [...(s.images ?? []), url] } : s)));
  }

  const slide = (() => {
    if (idx === 0) {
      return (
        <div key="vandaag" className="beamer-slide">
          <h2 className="mb-10 text-6xl font-extrabold uppercase tracking-wide">📅 Vandaag</h2>
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
    if (idx === 1) {
      return (
        <div key="matches" className="beamer-slide">
          <h2 className="mb-10 text-6xl font-extrabold uppercase tracking-wide">🆚 Upcoming matches</h2>
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
    if (idx === 2) {
      return (
        <div key="leaderboard" className="beamer-slide">
          <h2 className="mb-10 text-6xl font-extrabold uppercase tracking-wide">🏆 Leaderboard</h2>
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
    const i = idx - 3;
    const s = slides[i];
    if (!s) return null;
    return (
      <div
        key={`custom-${i}`}
        className="beamer-slide w-full items-center text-center"
        onFocusCapture={() => isAdmin && setBezig(true)}
        onBlurCapture={() => { setBezig(false); if (draftRef.current) bewaar(); }}
      >
        {/* emoji: admin kiest uit de library */}
        {isAdmin ? (
          <button
            onClick={() => setPickerOpen((v) => !v)}
            title="Kies een emoji"
            className="mb-6 cursor-pointer rounded-2xl border-2 border-dashed border-transparent text-9xl leading-none transition-colors hover:border-lime-400/50"
          >
            {s.emoji || "➕"}
          </button>
        ) : (
          s.emoji && <div className="mb-6 text-9xl leading-none">{s.emoji}</div>
        )}
        {pickerOpen && isAdmin && (
          <div className="absolute left-1/2 top-24 z-20 grid w-[28rem] -translate-x-1/2 grid-cols-12 gap-1 rounded-md border border-slate-700 bg-slate-900 p-3 shadow-2xl">
            {EMOJIS.map((e) => (
              <button
                key={e}
                onClick={() => { patchSlide(i, { emoji: e }); setPickerOpen(false); setTimeout(() => bewaar(), 0); }}
                className="cursor-pointer rounded p-1 text-xl hover:bg-slate-700"
              >
                {e}
              </button>
            ))}
            <button
              onClick={() => { patchSlide(i, { emoji: "" }); setPickerOpen(false); setTimeout(() => bewaar(), 0); }}
              className="col-span-12 mt-1 cursor-pointer rounded border border-slate-700 py-1 text-[11px] font-bold text-slate-400 hover:text-red-400"
            >
              geen emoji
            </button>
          </div>
        )}

        {/* titel en tekst: gewoon op de slide zelf typen */}
        {isAdmin ? (
          <input
            value={s.title}
            onChange={(e) => patchSlide(i, { title: e.target.value })}
            placeholder="Titel…"
            className="w-full max-w-4xl border-b-2 border-dashed border-transparent bg-transparent text-center text-7xl font-extrabold uppercase tracking-wide outline-none transition-colors placeholder:text-slate-600 hover:border-slate-600 focus:border-lime-400"
          />
        ) : (
          <h2 className="text-7xl font-extrabold uppercase tracking-wide">{s.title}</h2>
        )}
        {isAdmin ? (
          <textarea
            value={s.text ?? ""}
            onChange={(e) => patchSlide(i, { text: e.target.value })}
            placeholder="Tekst… (Enter = nieuwe regel)"
            rows={Math.max(2, (s.text ?? "").split("\n").length)}
            className="mt-8 w-full max-w-4xl resize-none rounded border-2 border-dashed border-transparent bg-transparent text-center text-4xl leading-relaxed text-slate-200 outline-none transition-colors placeholder:text-slate-600 hover:border-slate-600 focus:border-lime-400"
          />
        ) : (
          s.text && <p className="mt-8 whitespace-pre-line text-4xl leading-relaxed text-slate-200">{s.text}</p>
        )}

        {/* foto's uit de presentatie (of eigen) */}
        {(s.images?.length || isAdmin) && (
          <div className="mt-10 flex items-center justify-center gap-6">
            {(s.images ?? []).map((src, fi) => (
              <span key={fi} className="relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={src} alt="" className="h-52 w-auto rounded-xl border border-slate-700 object-cover shadow-xl shadow-black/40" />
                {isAdmin && (
                  <button
                    onClick={() => { const d = startEdit(); bewaar(d.map((x, j) => (j === i ? { ...x, images: x.images?.filter((_, k) => k !== fi) } : x))); }}
                    title="Foto weghalen"
                    className="absolute -right-2 -top-2 flex h-6 w-6 cursor-pointer items-center justify-center rounded-full border border-slate-600 bg-slate-900 text-xs text-slate-400 hover:border-red-500 hover:text-red-500"
                  >
                    ×
                  </button>
                )}
              </span>
            ))}
            {isAdmin && (
              <button
                onClick={() => fotoToevoegen(i)}
                title="Foto toevoegen"
                className="flex h-52 w-36 cursor-pointer items-center justify-center rounded-xl border-2 border-dashed border-slate-700 text-3xl text-slate-600 transition-colors hover:border-lime-400/60 hover:text-lime-400"
              >
                📷+
              </button>
            )}
          </div>
        )}

        {isAdmin && (
          <button
            onClick={() => verwijderSlide(i)}
            className="mt-8 cursor-pointer rounded border border-slate-800 px-3 py-1 text-xs font-bold uppercase tracking-wide text-slate-600 hover:border-red-500 hover:text-red-500"
          >
            × slide verwijderen
          </button>
        )}
      </div>
    );
  })();

  return (
    <div className="fixed inset-0 z-[100] overflow-hidden bg-slate-950 text-slate-100">
      {/* sfeer-achtergrond */}
      <div className="absolute -left-32 top-16 h-96 w-96 animate-pulse rounded-full bg-teal-500/10 blur-3xl" />
      <div className="absolute -right-32 bottom-16 h-96 w-96 animate-pulse rounded-full bg-lime-500/10 blur-3xl" />

      <div className="absolute left-10 top-8 flex items-center gap-4">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo.png" alt="RLP26" className="h-16 w-auto" />
        <div className="text-2xl font-extrabold uppercase tracking-wide">Ronnie <span className="text-lime-400">LAN</span> Party</div>
      </div>
      <Klok />

      <div className="flex h-full items-center justify-center overflow-y-auto px-24 py-28">{slide}</div>

      {/* voortgangsbolletjes + admin-acties */}
      <div className="absolute bottom-8 left-1/2 flex -translate-x-1/2 items-center gap-2.5">
        {Array.from({ length: totaal }, (_, i) => (
          <button
            key={i}
            onClick={() => { setIdx(i); setPickerOpen(false); }}
            className={`h-2.5 w-2.5 cursor-pointer rounded-full transition-colors ${i === idx ? "bg-lime-400" : "bg-slate-700 hover:bg-slate-500"}`}
            aria-label={`Slide ${i + 1}`}
          />
        ))}
        {isAdmin && (
          <button
            onClick={nieuweSlide}
            title="Nieuwe slide"
            className="ml-2 cursor-pointer rounded-full border border-slate-700 px-2 py-0.5 text-xs font-bold text-slate-500 hover:border-lime-400 hover:text-lime-400"
          >
            + slide
          </button>
        )}
      </div>

      {isAdmin && idx >= 3 && (
        <p className="absolute bottom-8 right-8 text-[11px] text-slate-600">
          ✏️ klik op de emoji, titel of tekst om direct te bewerken — opslaan gaat vanzelf
        </p>
      )}
    </div>
  );
}
