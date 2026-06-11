"use client";

import { useEffect, useState } from "react";
import { COFFEE_URL } from "@/lib/links";
import { useTournament } from "@/lib/store";

const TS_HOST = "ts.impulzgaming.com";
const TS_DOWNLOAD = "https://teamspeak.com/en/downloads/";
// screenshot met de noise-suppression stappen (Settings → Audio → VAD Mode: Hybrid)
const NOISE_IMG = "/images/teamspeak-noise.png";

export default function TeamSpeakWidget() {
  const { state } = useTournament();
  const [open, setOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [imgOk, setImgOk] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // schuif opzij (met animatie) wanneer het Tournament News-paneel uitstaat
  useEffect(() => {
    const onSidebar = (e: Event) => setSidebarOpen(!!(e as CustomEvent<{ open: boolean }>).detail?.open);
    window.addEventListener("rlp-sidebar", onSidebar);
    return () => window.removeEventListener("rlp-sidebar", onSidebar);
  }, []);

  return (
    <div className={`fixed bottom-4 right-4 z-40 flex flex-col items-end gap-2 transition-transform duration-300 ease-in-out ${sidebarOpen ? "lg:-translate-x-[380px]" : ""}`}>
      {open && (
        <div className="w-72 rounded-lg border border-slate-700 border-t-2 border-t-lime-400 bg-slate-900 p-4 shadow-xl shadow-black/40">
          <div className="mb-1 text-xs font-extrabold uppercase tracking-wide text-slate-100">RLP26 TeamSpeak</div>
          <div className="mb-3 select-all rounded border border-slate-700 bg-slate-950 px-2 py-1.5 font-mono text-xs text-lime-400">{TS_HOST}</div>
          <a
            href={`ts3server://${TS_HOST}`}
            className="block rounded bg-lime-400 px-3 py-2 text-center text-xs font-extrabold uppercase tracking-wide text-lime-950 hover:bg-lime-300"
          >
            Verbind met TeamSpeak
          </a>
          <a
            href={TS_DOWNLOAD}
            target="_blank"
            rel="noopener noreferrer"
            className="group mt-2 flex items-center gap-2.5 rounded-md border border-slate-700 bg-slate-950/60 px-3 py-2 transition-colors hover:border-lime-400/60 hover:bg-slate-800"
          >
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-lime-400/10 text-lime-300">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="h-3.5 w-3.5">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <path d="m7 10 5 5 5-5" />
                <path d="M12 15V3" />
              </svg>
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[11px] font-bold text-slate-100">Nog geen TeamSpeak?</span>
              <span className="block text-[10px] text-slate-400">Gratis downloaden</span>
            </span>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="h-3 w-3 shrink-0 text-lime-400 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5">
              <path d="M7 17 17 7" />
              <path d="M7 7h10v10" />
            </svg>
          </a>

          {/* uitklapbare hulp: ruisonderdrukking aanzetten */}
          <button
            onClick={() => setHelpOpen((v) => !v)}
            className="mt-3 flex w-full cursor-pointer items-center justify-between rounded border border-slate-700 px-2.5 py-1.5 text-left text-[11px] font-bold text-slate-300 hover:border-lime-400/60 hover:text-lime-400"
          >
            🎙️ Last van achtergrondgeluid? Zet ruisonderdrukking aan
            <span className={`transition-transform ${helpOpen ? "rotate-90" : ""}`}>›</span>
          </button>
          {helpOpen && (
            <div className="mt-2 rounded border border-slate-700 bg-slate-950 p-2.5">
              {imgOk && (
                <a href={NOISE_IMG} target="_blank" rel="noopener noreferrer" title="Klik voor groot">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={NOISE_IMG}
                    alt="TeamSpeak: Settings → Audio → Voice Activity Detection op Hybrid"
                    onError={() => setImgOk(false)}
                    className="mb-2 w-full rounded border border-slate-700"
                  />
                </a>
              )}
              <ol className="list-decimal space-y-1 pl-4 text-[11px] leading-relaxed text-slate-400">
                <li>Open <b className="text-slate-200">⚙️ Settings</b></li>
                <li>Kies <b className="text-slate-200">Audio</b></li>
                <li>Zet bij <b className="text-slate-200">Voice Activity Detection (VAD)</b> de Mode op <b className="text-lime-400">Hybrid</b> of <b className="text-lime-400">Gate</b> — beide kunnen werken, afhankelijk van je mic en omgeving. Probeer wat het best klinkt</li>
                <li>Schuif de gevoeligheid bij tot je ruis wegvalt</li>
              </ol>
            </div>
          )}

          <p className="mt-2 text-[10px] leading-relaxed text-slate-500">
            De verbindknop opent de TeamSpeak-app. Lukt dat niet? Kopieer het adres hierboven.
          </p>
          {/* het hele host-blok is klikbaar: subtiel, maar wel duidelijk een link */}
          <a
            href={COFFEE_URL}
            target="_blank"
            rel="noopener noreferrer"
            title="Draag iets bij aan hosting, stroom & onderhoud"
            className="group mt-2.5 block rounded-md border border-slate-800 px-2 pb-2.5 pt-2 text-center transition-colors hover:border-amber-400/50 hover:bg-amber-400/5"
          >
            <p className="text-[10px] uppercase tracking-wide text-slate-500">Draait op</p>
            <span className="relative mx-auto block w-fit transition-transform duration-300 group-hover:scale-[1.04]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/images/ugreen-nas.webp"
                alt="UGREEN DXP8800 Plus"
                className="nas-glow h-28 w-auto"
              />
              {/* knipperende schijf-LED'jes op de echte LED-strip — wit, zoals officieel */}
              <span className="absolute bottom-[33.5%] left-[19%] flex items-center gap-[2px]">
                {[0, 1, 2, 3, 4].map((i) => (
                  <span
                    key={i}
                    className="h-[2px] w-[2px] rounded-full bg-white shadow-[0_0_3px_rgba(255,255,255,0.95)]"
                    style={{ animation: `led-blink ${(0.7 + i * 0.41).toFixed(2)}s steps(1) infinite`, animationDelay: `${i * 0.23}s` }}
                  />
                ))}
              </span>
            </span>
            <p className="text-[11px] font-bold tracking-wide text-slate-300">UGREEN DXP8800 Plus</p>
            <p className="mt-1 text-[10px] text-slate-400">
              hosting, stroom & onderhoud —{" "}
              <span className="font-bold text-amber-400/90 underline decoration-dotted underline-offset-2 group-hover:text-amber-300">draag iets bij</span>
            </p>
          </a>
        </div>
      )}
      {/* groepschat op de pc: WhatsApp opent in de browser of de app */}
      {state?.whatsapp && (
        <a
          href={state.whatsapp}
          target="_blank"
          rel="noopener noreferrer"
          title="Groepschat openen (WhatsApp)"
          className="flex cursor-pointer items-center gap-2 rounded-full border border-[#25D366]/60 bg-slate-900/95 px-4 py-2.5 text-xs font-extrabold uppercase tracking-wide text-[#25D366] shadow-lg shadow-black/40 backdrop-blur hover:bg-[#25D366]/10"
        >
          💬 Groepschat
        </a>
      )}
      <button
        onClick={() => setOpen((v) => !v)}
        title="TeamSpeak"
        className="flex cursor-pointer items-center gap-2.5 rounded-full border-2 border-lime-400/60 bg-slate-900/95 px-5 py-3 text-sm font-extrabold uppercase tracking-wide text-lime-400 shadow-lg shadow-black/40 backdrop-blur hover:bg-lime-400/10"
      >
        {/* simpel headset-icoon */}
        <svg viewBox="0 0 24 24" className="h-5 w-5 fill-none stroke-lime-400" strokeWidth="2.2" strokeLinecap="round">
          <path d="M4 13a8 8 0 1 1 16 0" />
          <rect x="3" y="13" width="4" height="6" rx="1.5" />
          <rect x="17" y="13" width="4" height="6" rx="1.5" />
          <path d="M19 19v1a2 2 0 0 1-2 2h-3" />
        </svg>
        {open ? "Sluiten" : "TeamSpeak"}
      </button>
    </div>
  );
}
