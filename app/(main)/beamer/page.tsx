"use client";

import { useEffect, useMemo, useState } from "react";
import { allMatches, logoColor } from "@/lib/bracket";
import { computeLeaderboards } from "@/lib/leaderboard";
import { useTournament } from "@/lib/store";
import type { BeamerSlide } from "@/lib/types";

// Beamerpagina: fullscreen rotatie voor op de muur tijdens de LAN.
// Live data (programma van vandaag, matches, leaderboard) wisselt af met
// eigen info-slides die de admin hier ter plekke kan bewerken.

const SLIDE_MS = 12000;

const DEFAULT_SLIDES: BeamerSlide[] = [
  { emoji: "🚿", title: "Douchen", text: "Ochtend: 10:00 – 11:30\nAvond: 20:00 – 21:30" },
  { emoji: "🥪", title: "Zelf service", text: "Broodje spek & ei · Broodje knakworst\nKoffie · Thee · Verse jus d'orange\nPak het lekker zelf!" },
  { emoji: "😴", title: "Rustruimte", text: "Even bijkomen mag altijd — slaap zacht, game hard." },
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
  const { state, isAdmin, updateState } = useTournament();
  const [idx, setIdx] = useState(0);
  const [editorOpen, setEditorOpen] = useState(false);
  const [draft, setDraft] = useState<BeamerSlide[] | null>(null);

  const customSlides = state?.beamer ?? DEFAULT_SLIDES;

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

  // rotatie: live slides + eigen info-slides
  const totaal = 3 + customSlides.length;
  useEffect(() => {
    if (editorOpen) return; // niet doordraaien terwijl de admin bewerkt
    const t = setInterval(() => setIdx((i) => (i + 1) % totaal), SLIDE_MS);
    return () => clearInterval(t);
  }, [totaal, editorOpen]);

  if (!state) return null;

  function opslaan() {
    if (!draft) return setEditorOpen(false);
    updateState({ beamer: draft.filter((s) => s.title.trim()) });
    setEditorOpen(false);
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
    const s = customSlides[idx - 3];
    return (
      <div key={`custom-${idx}`} className="beamer-slide items-center text-center">
        {s.emoji && <div className="mb-8 text-9xl">{s.emoji}</div>}
        <h2 className="mb-8 text-7xl font-extrabold uppercase tracking-wide">{s.title}</h2>
        {s.text && (
          <p className="whitespace-pre-line text-4xl leading-relaxed text-slate-200">{s.text}</p>
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

      <div className="flex h-full items-center justify-center px-24">{slide}</div>

      {/* voortgangsbolletjes */}
      <div className="absolute bottom-8 left-1/2 flex -translate-x-1/2 gap-2.5">
        {Array.from({ length: totaal }, (_, i) => (
          <button
            key={i}
            onClick={() => setIdx(i)}
            className={`h-2.5 w-2.5 cursor-pointer rounded-full transition-colors ${i === idx ? "bg-lime-400" : "bg-slate-700 hover:bg-slate-500"}`}
            aria-label={`Slide ${i + 1}`}
          />
        ))}
      </div>

      {/* admin: eigen slides bewerken */}
      {isAdmin && !editorOpen && (
        <button
          onClick={() => { setDraft(JSON.parse(JSON.stringify(customSlides))); setEditorOpen(true); }}
          className="absolute bottom-6 right-8 cursor-pointer rounded border border-slate-700 px-3 py-1.5 text-xs font-bold uppercase tracking-wide text-slate-500 hover:border-lime-400 hover:text-lime-400"
        >
          ⚙️ Slides bewerken
        </button>
      )}
      {isAdmin && editorOpen && draft && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/80 p-8">
          <div className="max-h-full w-full max-w-2xl overflow-y-auto rounded-md border border-slate-700 border-t-2 border-t-lime-400 bg-slate-900 p-6">
            <h3 className="mb-1 text-sm font-extrabold uppercase tracking-wide">Beamer-slides bewerken</h3>
            <p className="mb-4 text-[11px] text-slate-400">
              De live slides (vandaag, matches, leaderboard) draaien automatisch mee; dit zijn jullie eigen info-slides.
            </p>
            {draft.map((s, i) => (
              <div key={i} className="mb-3 flex items-start gap-2 rounded border border-slate-700 bg-slate-950 p-3">
                <input
                  value={s.emoji ?? ""}
                  onChange={(e) => setDraft(draft.map((x, j) => (j === i ? { ...x, emoji: e.target.value } : x)))}
                  placeholder="🚿"
                  maxLength={4}
                  className="w-14 rounded border border-slate-700 bg-slate-900 px-2 py-1.5 text-center text-lg focus:border-lime-400 focus:outline-none"
                />
                <div className="flex min-w-0 flex-1 flex-col gap-2">
                  <input
                    value={s.title}
                    onChange={(e) => setDraft(draft.map((x, j) => (j === i ? { ...x, title: e.target.value } : x)))}
                    placeholder="Titel"
                    maxLength={40}
                    className="rounded border border-slate-700 bg-slate-900 px-2.5 py-1.5 text-sm font-bold focus:border-lime-400 focus:outline-none"
                  />
                  <textarea
                    value={s.text ?? ""}
                    onChange={(e) => setDraft(draft.map((x, j) => (j === i ? { ...x, text: e.target.value } : x)))}
                    placeholder="Tekst (elke regel komt op een eigen regel)"
                    rows={2}
                    className="rounded border border-slate-700 bg-slate-900 px-2.5 py-1.5 text-xs focus:border-lime-400 focus:outline-none"
                  />
                </div>
                <button
                  onClick={() => setDraft(draft.filter((_, j) => j !== i))}
                  title="Slide verwijderen"
                  className="cursor-pointer px-1 text-slate-500 hover:text-red-500"
                >
                  ×
                </button>
              </div>
            ))}
            <button
              onClick={() => setDraft([...draft, { emoji: "", title: "", text: "" }])}
              className="mb-4 w-full cursor-pointer rounded border border-dashed border-slate-600 px-2 py-2 text-xs font-bold text-slate-400 hover:border-lime-400 hover:text-lime-400"
            >
              + Slide
            </button>
            <div className="flex justify-end gap-2">
              <button onClick={() => setEditorOpen(false)} className="cursor-pointer rounded border border-slate-600 px-3.5 py-1.5 text-[11px] font-bold uppercase text-slate-400 hover:border-slate-400">
                Annuleren
              </button>
              <button onClick={opslaan} className="cursor-pointer rounded bg-lime-400 px-3.5 py-1.5 text-[11px] font-bold uppercase text-lime-950 hover:bg-lime-300">
                Opslaan
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
