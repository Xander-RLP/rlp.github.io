"use client";

import { useState } from "react";

const TS_HOST = "ts.impulzgaming.com";
const TS_DOWNLOAD = "https://teamspeak.com/en/downloads/";
// screenshot met de noise-suppression stappen (Settings → Audio → VAD Mode: Hybrid)
const NOISE_IMG = "/images/teamspeak-noise.png";

export default function TeamSpeakWidget() {
  const [open, setOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [imgOk, setImgOk] = useState(true);

  return (
    <div className="fixed bottom-4 right-4 z-40 flex flex-col items-end gap-2">
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
            className="mt-2 block rounded border border-lime-400/60 px-3 py-2 text-center text-xs font-bold uppercase tracking-wide text-lime-400 hover:bg-lime-400/10"
          >
            ⬇ Nog geen TeamSpeak? Download
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
        </div>
      )}
      <button
        onClick={() => setOpen((v) => !v)}
        title="TeamSpeak"
        className="flex cursor-pointer items-center gap-2 rounded-full border border-lime-400/60 bg-slate-900/95 px-4 py-2.5 text-xs font-extrabold uppercase tracking-wide text-lime-400 shadow-lg shadow-black/40 backdrop-blur hover:bg-lime-400/10"
      >
        {/* simpel headset-icoon */}
        <svg viewBox="0 0 24 24" className="h-4 w-4 fill-none stroke-lime-400" strokeWidth="2.2" strokeLinecap="round">
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
