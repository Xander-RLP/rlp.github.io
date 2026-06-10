"use client";

import { useState } from "react";

const TS_HOST = "ts.impulzgaming.com";

export default function TeamSpeakWidget() {
  const [open, setOpen] = useState(false);

  return (
    <div className="fixed bottom-4 right-4 z-40 flex flex-col items-end gap-2">
      {open && (
        <div className="w-64 rounded-lg border border-slate-700 border-t-2 border-t-lime-400 bg-slate-900 p-4 shadow-xl shadow-black/40">
          <div className="mb-1 text-xs font-extrabold uppercase tracking-wide text-slate-100">RLP26 TeamSpeak</div>
          <div className="mb-3 select-all rounded border border-slate-700 bg-slate-950 px-2 py-1.5 font-mono text-xs text-lime-400">{TS_HOST}</div>
          <a
            href={`ts3server://${TS_HOST}`}
            className="block rounded bg-lime-400 px-3 py-2 text-center text-xs font-extrabold uppercase tracking-wide text-lime-950 hover:bg-lime-300"
          >
            Verbind met TeamSpeak
          </a>
          <p className="mt-2 text-[10px] leading-relaxed text-slate-500">
            Opent in de TeamSpeak-app. Geen TS3? Kopieer het adres hierboven.
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
