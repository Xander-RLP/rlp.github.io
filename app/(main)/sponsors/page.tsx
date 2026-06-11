"use client";

import Link from "next/link";
import { useState } from "react";
import { slugify } from "@/lib/bracket";
import { useTournament } from "@/lib/store";
import type { Sponsor } from "@/lib/types";

// logo-vangnet: geen logo-URL maar wel een site? Dan de favicon van die site.
function logoSrc(s: Sponsor): string | null {
  if (s.logo) return s.logo;
  if (s.url) {
    try {
      return `https://www.google.com/s2/favicons?domain=${new URL(s.url).hostname}&sz=128`;
    } catch { /* kapotte URL — dan initialen */ }
  }
  return null;
}

function initials(name: string): string {
  return name.split(/\s+/).map((w) => w[0]).join("").slice(0, 3).toUpperCase();
}

function hostname(url: string): string | null {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
}

export default function SponsorsPage() {
  const { state, isAdmin, updateSponsors, updateState, saveStatus } = useTournament();
  const [addOpen, setAddOpen] = useState(false);
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [logo, setLogo] = useState("");
  const [tagline, setTagline] = useState("");

  const sponsors = state?.sponsors ?? [];

  function addSponsor() {
    const n = name.trim();
    if (!n) return;
    const sponsor: Sponsor = {
      id: slugify(n, sponsors.map((s) => s.id)),
      name: n,
      url: url.trim() || undefined,
      logo: logo.trim() || undefined,
      tagline: tagline.trim() || undefined,
    };
    updateSponsors([...sponsors, sponsor]);
    setAddOpen(false);
    setName(""); setUrl(""); setLogo(""); setTagline("");
  }

  // koffie-donateur: in één klik sponsor + flitsende shoutout op de beamer
  function addDonateur() {
    const naam = prompt("Naam van de koffie-donateur (komt als sponsor op de site + shoutout op de beamer):")?.trim();
    if (!naam) return;
    const sponsor: Sponsor = {
      id: `${naam.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-koffie`,
      name: naam,
      tagline: "☕ Kocht een koffie voor de developer",
    };
    updateState({
      sponsors: [...sponsors, sponsor],
      shoutout: { naam, tot: new Date(Date.now() + 10 * 60000).toISOString() },
    });
  }

  function removeSponsor(s: Sponsor) {
    if (!confirm(`Sponsor "${s.name}" verwijderen?`)) return;
    updateSponsors(sponsors.filter((x) => x.id !== s.id));
  }

  function SponsorCard({ s }: { s: Sponsor }) {
    const src = logoSrc(s);
    const host = s.url ? hostname(s.url) : null;
    const inner = (
      <>
        {src ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={src} alt="" className="h-12 w-12 shrink-0 rounded-md bg-slate-950/50 object-contain p-1" />
        ) : (
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-md bg-teal-500/15 text-sm font-extrabold text-teal-300">
            {initials(s.name)}
          </div>
        )}
        <div className="min-w-0">
          <div className="truncate text-sm font-extrabold text-slate-100">{s.name}</div>
          {s.tagline && <div className="truncate text-[11px] text-slate-400">{s.tagline}</div>}
          {host && <div className="truncate text-[11px] text-teal-400">{host}</div>}
        </div>
      </>
    );
    const cardClass =
      "flex items-center gap-3.5 rounded-md border border-slate-700 bg-slate-800 p-4 transition-colors";
    return (
      <div className="relative">
        {s.url ? (
          <a href={s.url} target="_blank" rel="noopener noreferrer" className={`${cardClass} hover:border-teal-400`}>
            {inner}
          </a>
        ) : (
          <div className={cardClass}>{inner}</div>
        )}
        {isAdmin && (
          <button
            onClick={() => removeSponsor(s)}
            title="Sponsor verwijderen"
            className="absolute -right-2 -top-2 flex h-6 w-6 cursor-pointer items-center justify-center rounded-full border border-slate-600 bg-slate-900 text-xs text-slate-400 hover:border-red-500 hover:text-red-400"
          >
            ×
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-1.5 flex items-baseline justify-between gap-3">
        <h2 className="text-[22px] font-extrabold uppercase tracking-wide">Sponsors</h2>
        {isAdmin && (
          <span className="flex gap-2">
          <button
            onClick={addDonateur}
            title="Donateur als sponsor toevoegen én 10 minuten flitsend op de beamer tonen"
            className="cursor-pointer rounded border border-amber-400/60 px-3 py-1.5 text-[11px] font-bold uppercase tracking-wide text-amber-300 hover:bg-amber-400/10"
          >
            ☕ Koffie-donateur
          </button>
          <button
            onClick={() => setAddOpen(true)}
            className="cursor-pointer rounded border border-dashed border-slate-600 px-3 py-1.5 text-[11px] font-bold uppercase tracking-wide text-lime-400 hover:bg-lime-400/10"
          >
            + Sponsor toevoegen
          </button>
          </span>
        )}
      </div>
      <p className="mb-5 text-[13px] text-slate-400">
        {sponsors.length
          ? "Deze toppers maken de Ronnie LAN Party mede mogelijk."
          : "RLP26 zoekt nog sponsors!"}
      </p>

      {sponsors.length > 0 && (
        <div className="mb-6 grid grid-cols-[repeat(auto-fill,minmax(240px,1fr))] gap-3.5">
          {sponsors.map((s) => <SponsorCard key={s.id} s={s} />)}
        </div>
      )}

      <div className="rounded-md border border-dashed border-slate-700 bg-slate-800 p-7 text-center">
        <div className="mb-2 text-3xl">🤝</div>
        <h3 className="mb-2 text-base font-extrabold">Jouw logo hier?</h3>
        <p className="mb-4 text-[13px] leading-relaxed text-slate-400">
          We zoeken sponsors voor de Ronnie LAN Party 2026 — denk aan prijzen voor de
          prize pool, hardware of een bijdrage aan de organisatie. Groot of klein,
          alles is welkom en je staat met naam en logo op deze site.
        </p>
        <Link
          href="/contact"
          className="inline-block rounded bg-lime-400 px-4 py-2 text-xs font-bold uppercase tracking-wide text-lime-950 hover:bg-lime-300"
        >
          Word sponsor
        </Link>
      </div>

      {/* sponsor-toevoegen modal */}
      {addOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70"
          onClick={(e) => { if (e.target === e.currentTarget) setAddOpen(false); }}
        >
          <div className="w-96 max-w-[calc(100vw-2rem)] rounded-md border border-slate-700 border-t-2 border-t-lime-400 bg-slate-900 p-7">
            <h3 className="text-sm font-extrabold uppercase tracking-wide">Sponsor toevoegen</h3>
            <p className="mb-4 text-[11px] text-slate-400">
              Alleen een naam is verplicht. Zonder logo-URL pakken we automatisch
              het beeldmerk (favicon) van de website.
            </p>
            <input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Naam (bijv. Showbird)"
              maxLength={50}
              className="mb-3 w-full rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm focus:border-lime-400 focus:outline-none"
            />
            <input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="Website (https://…)"
              className="mb-3 w-full rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm focus:border-lime-400 focus:outline-none"
            />
            <input
              value={logo}
              onChange={(e) => setLogo(e.target.value)}
              placeholder="Logo-URL (optioneel)"
              className="mb-3 w-full rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm focus:border-lime-400 focus:outline-none"
            />
            <input
              value={tagline}
              onChange={(e) => setTagline(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") addSponsor(); }}
              placeholder="Tagline (bijv. Sponsort de prize pool)"
              maxLength={60}
              className="mb-4 w-full rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm focus:border-lime-400 focus:outline-none"
            />
            <div className="flex justify-end gap-2">
              <button onClick={() => setAddOpen(false)} className="cursor-pointer rounded border border-lime-400 px-3.5 py-1.5 text-[11px] font-bold uppercase text-lime-400 hover:bg-lime-400/10">
                Annuleren
              </button>
              <button
                onClick={addSponsor}
                disabled={!name.trim()}
                className="cursor-pointer rounded bg-lime-400 px-3.5 py-1.5 text-[11px] font-bold uppercase text-lime-950 hover:bg-lime-300 disabled:opacity-50"
              >
                Toevoegen
              </button>
            </div>
          </div>
        </div>
      )}

      {/* save toast */}
      {saveStatus !== "idle" && (
        <div className={`fixed bottom-4 left-1/2 z-40 -translate-x-1/2 rounded border px-4 py-1.5 text-[11px] font-bold tracking-wide ${
          saveStatus === "saved" ? "border-lime-400 bg-slate-800 text-lime-400" : "border-red-500 bg-slate-800 text-red-500"
        }`}>
          {saveStatus === "saved" ? "✓ Opgeslagen — live over ±1 min" : "Opslaan mislukt"}
        </div>
      )}
    </div>
  );
}
