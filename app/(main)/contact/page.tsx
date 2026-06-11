"use client";

import { COFFEE_URL } from "@/lib/links";
import { useTournament } from "@/lib/store";

export default function ContactPage() {
  const { state, isAdmin, updateState } = useTournament();
  const whatsapp = state?.whatsapp;

  function setWhatsapp() {
    const url = prompt(
      "Invite-link van de groepschat (https://chat.whatsapp.com/…).\nLeeg laten = knop verbergen.",
      whatsapp ?? "",
    )?.trim();
    if (url == null) return;
    if (url && !/^https?:\/\//i.test(url)) {
      alert("Dat lijkt geen link.");
      return;
    }
    updateState({ whatsapp: url || undefined });
  }

  return (
    <div className="mx-auto max-w-3xl">
      <h2 className="mb-1.5 text-[22px] font-extrabold uppercase tracking-wide">Contact</h2>
      <p className="mb-5 text-[13px] text-slate-400">
        Vragen over de Ronnie LAN Party, aanmeldingen of sponsoring?
      </p>

      <div className="grid max-w-3xl grid-cols-[repeat(auto-fill,minmax(230px,1fr))] gap-3.5">
        <div className="rounded-md border border-slate-700 bg-slate-800 p-4 text-[13px] leading-relaxed">
          <div className="mb-1.5 flex items-center gap-2 text-[10px] font-extrabold uppercase tracking-wide text-slate-400">
            Groepschat
            {isAdmin && (
              <button onClick={setWhatsapp} title="WhatsApp-link instellen" className="cursor-pointer text-slate-500 hover:text-lime-400">✏️</button>
            )}
          </div>
          Spreek de organisatie aan op de LAN of stuur een bericht in de groepschat.
          {whatsapp && (
            <a
              href={whatsapp}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2.5 flex items-center justify-center gap-2 rounded bg-[#25D366] px-3 py-2 text-xs font-extrabold uppercase tracking-wide text-emerald-950 hover:brightness-110"
            >
              💬 Open de groepschat
            </a>
          )}
        </div>
        <div className="rounded-md border border-slate-700 bg-slate-800 p-4 text-[13px] leading-relaxed">
          <div className="mb-1.5 text-[10px] font-extrabold uppercase tracking-wide text-slate-400">Aanmelden</div>
          Meld je team of jezelf aan bij de organisatie — vermeld spel en naam.
        </div>
        <div className="rounded-md border border-slate-700 bg-slate-800 p-4 text-[13px] leading-relaxed">
          <div className="mb-1.5 text-[10px] font-extrabold uppercase tracking-wide text-slate-400">Locatie</div>
          RLP26 main stage: Roswinkelerstraat 136, 7895 AS Roswinkel — tijden volgen via het schedule.
        </div>
        <div className="rounded-md border border-amber-400/40 bg-amber-400/5 p-4 text-[13px] leading-relaxed">
          <div className="mb-1.5 text-[10px] font-extrabold uppercase tracking-wide text-amber-400">☕ Buy me a Coffee!</div>
          Deze site is in de avonduren gebouwd door één developer. Vind je &apos;m tof? Steun &apos;m met een kleine donatie!
          <a
            href={COFFEE_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2.5 flex items-center justify-center gap-2 rounded bg-amber-400 px-3 py-2 text-xs font-extrabold uppercase tracking-wide text-amber-950 hover:bg-amber-300"
          >
            ☕ Buy me a Coffee!
          </a>
        </div>
      </div>

      {/* routekaart naar de main stage */}
      <div className="mt-6 max-w-3xl">
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-extrabold uppercase tracking-wide">📍 Zo vind je ons</h3>
          <a
            href="https://maps.app.goo.gl/dFgZ4gpszbvKTTsn9"
            target="_blank"
            rel="noopener noreferrer"
            className="rounded border border-lime-400/60 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-lime-400 hover:bg-lime-400/10"
          >
            Open in Google Maps ↗
          </a>
        </div>
        <iframe
          title="Kaart: Roswinkelerstraat 136, Roswinkel"
          src="https://www.google.com/maps?q=Roswinkelerstraat+136,+7895+AS+Roswinkel&output=embed&hl=nl&z=14"
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          allowFullScreen
          className="h-80 w-full rounded-md border border-slate-700"
        />
      </div>
    </div>
  );
}
