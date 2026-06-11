"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { FOTOS_WACHTWOORD_KEY, decryptFotoUrl, unlockFotos, type FotoGroep } from "@/lib/fotos";

// Foto's staan versleuteld (AES-256-GCM) in de publieke repo; alleen met het
// wachtwoord van de LAN zijn ze te bekijken. Ontsleutelen gebeurt volledig
// in de browser — het wachtwoord verlaat de pagina niet.

export default function FotosPage() {
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [unlocked, setUnlocked] = useState(false);
  const [groups, setGroups] = useState<FotoGroep[]>([]);
  const [thumbs, setThumbs] = useState<Record<string, string>>({});
  const [lightbox, setLightbox] = useState<{ id: string; url?: string } | null>(null);
  const keyRef = useRef<CryptoKey | null>(null);
  const fullCache = useRef(new Map<string, string>());

  const unlock = useCallback(async (pw: string) => {
    setBusy(true);
    setError(null);
    try {
      const { key, groups: g, photos } = await unlockFotos(pw);
      keyRef.current = key;
      localStorage.setItem(FOTOS_WACHTWOORD_KEY, pw);
      setUnlocked(true);
      setGroups(g);
      for (const id of photos) {
        const url = await decryptFotoUrl(key, `/fotos/${id}.thumb.enc`);
        setThumbs((cur) => ({ ...cur, [id]: url }));
      }
    } catch {
      setError("Wachtwoord klopt niet. Vraag het na bij de organisatie.");
      localStorage.removeItem(FOTOS_WACHTWOORD_KEY);
    } finally {
      setBusy(false);
    }
  }, []);

  useEffect(() => {
    const saved = localStorage.getItem(FOTOS_WACHTWOORD_KEY);
    if (saved) void unlock(saved);
  }, [unlock]);

  async function openFoto(id: string) {
    setLightbox({ id });
    const cached = fullCache.current.get(id);
    if (cached) return setLightbox({ id, url: cached });
    try {
      const url = await decryptFotoUrl(keyRef.current!, `/fotos/${id}.full.enc`);
      fullCache.current.set(id, url);
      setLightbox((cur) => (cur?.id === id ? { id, url } : cur));
    } catch {
      setLightbox(null);
    }
  }

  return (
    <div>
      <h2 className="mb-1.5 text-[22px] font-extrabold uppercase tracking-wide">Foto&apos;s</h2>
      <p className="mb-5 text-[13px] text-slate-400">
        Foto&apos;s van de LAN — alleen voor deelnemers. {!unlocked && "Voer het wachtwoord in dat je van de organisatie hebt gekregen."}
      </p>

      {!unlocked ? (
        <form
          className="flex max-w-sm flex-col gap-2.5"
          onSubmit={(e) => { e.preventDefault(); void unlock(password); }}
        >
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Wachtwoord"
            autoFocus
            className="rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-sm outline-none focus:border-teal-500"
          />
          <button
            type="submit"
            disabled={busy || !password}
            className="rounded-md bg-teal-500 px-3 py-2 text-sm font-extrabold uppercase tracking-wide text-teal-950 disabled:opacity-50"
          >
            {busy ? "Ontsleutelen…" : "Bekijk foto's"}
          </button>
          {error && <div className="text-[13px] text-red-400">{error}</div>}
        </form>
      ) : (
        <div className="flex flex-col gap-7">
          {groups.map((g) => (
            <section key={g.title}>
              <h3 className="mb-2.5 flex items-baseline gap-2 text-sm font-extrabold uppercase tracking-wide">
                {g.title}
                <span className="text-[11px] font-semibold normal-case text-slate-400">{g.photos.length} foto&apos;s</span>
              </h3>
              <div className="grid grid-cols-[repeat(auto-fill,minmax(140px,1fr))] gap-2.5">
                {g.photos.map((id) =>
                  thumbs[id] ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      key={id}
                      src={thumbs[id]}
                      alt=""
                      onClick={() => void openFoto(id)}
                      className="aspect-square w-full cursor-pointer rounded-md border border-slate-700 object-cover transition hover:border-teal-500"
                    />
                  ) : (
                    <div key={id} className="flex aspect-square items-center justify-center rounded-md border border-slate-800 text-[11px] text-slate-500">…</div>
                  ),
                )}
              </div>
            </section>
          ))}
        </div>
      )}

      {lightbox && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4"
          onClick={() => setLightbox(null)}
        >
          {lightbox.url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={lightbox.url} alt="" className="max-h-full max-w-full rounded-md" />
          ) : (
            <div className="text-sm text-slate-300">Ontsleutelen…</div>
          )}
        </div>
      )}
    </div>
  );
}
