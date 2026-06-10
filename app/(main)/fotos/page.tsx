"use client";

import { useCallback, useEffect, useRef, useState } from "react";

// Foto's staan versleuteld (AES-256-GCM) in de publieke repo; alleen met het
// wachtwoord van de LAN zijn ze te bekijken. Ontsleutelen gebeurt volledig
// in de browser — het wachtwoord verlaat de pagina niet.

const STORAGE_KEY = "rlp26-fotos-wachtwoord";

async function deriveKey(password: string, saltB64: string, iterations: number) {
  const enc = new TextEncoder();
  const salt = Uint8Array.from(atob(saltB64), (c) => c.charCodeAt(0));
  const base = await crypto.subtle.importKey("raw", enc.encode(password), "PBKDF2", false, ["deriveKey"]);
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt, iterations, hash: "SHA-256" },
    base,
    { name: "AES-GCM", length: 256 },
    false,
    ["decrypt"],
  );
}

async function decryptBlob(key: CryptoKey, buf: ArrayBuffer) {
  const bytes = new Uint8Array(buf);
  return crypto.subtle.decrypt({ name: "AES-GCM", iv: bytes.slice(0, 12) }, key, bytes.slice(12));
}

async function fetchDecrypted(key: CryptoKey, path: string) {
  const res = await fetch(path);
  if (!res.ok) throw new Error(`${path}: ${res.status}`);
  return decryptBlob(key, await res.arrayBuffer());
}

export default function FotosPage() {
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [unlocked, setUnlocked] = useState(false);
  const [thumbs, setThumbs] = useState<{ id: string; url: string }[]>([]);
  const [lightbox, setLightbox] = useState<{ id: string; url?: string } | null>(null);
  const keyRef = useRef<CryptoKey | null>(null);
  const fullCache = useRef(new Map<string, string>());

  const unlock = useCallback(async (pw: string) => {
    setBusy(true);
    setError(null);
    try {
      const meta = await (await fetch("/fotos/meta.json")).json() as { salt: string; iterations: number };
      const key = await deriveKey(pw, meta.salt, meta.iterations);
      // verkeerd wachtwoord ⇒ GCM-verificatie van het manifest faalt
      const manifest = JSON.parse(new TextDecoder().decode(
        await fetchDecrypted(key, "/fotos/manifest.enc"),
      )) as { photos: string[] };
      keyRef.current = key;
      localStorage.setItem(STORAGE_KEY, pw);
      setUnlocked(true);
      for (const id of manifest.photos) {
        const data = await fetchDecrypted(key, `/fotos/${id}.thumb.enc`);
        const url = URL.createObjectURL(new Blob([data], { type: "image/jpeg" }));
        setThumbs((cur) => [...cur, { id, url }]);
      }
    } catch {
      setError("Wachtwoord klopt niet. Vraag het na bij de organisatie.");
      localStorage.removeItem(STORAGE_KEY);
    } finally {
      setBusy(false);
    }
  }, []);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) void unlock(saved);
  }, [unlock]);

  async function openFoto(id: string) {
    setLightbox({ id });
    const cached = fullCache.current.get(id);
    if (cached) return setLightbox({ id, url: cached });
    try {
      const data = await fetchDecrypted(keyRef.current!, `/fotos/${id}.full.enc`);
      const url = URL.createObjectURL(new Blob([data], { type: "image/jpeg" }));
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
        <div className="grid grid-cols-[repeat(auto-fill,minmax(140px,1fr))] gap-2.5">
          {thumbs.map((t) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={t.id}
              src={t.url}
              alt=""
              onClick={() => void openFoto(t.id)}
              className="aspect-square w-full cursor-pointer rounded-md border border-slate-700 object-cover transition hover:border-teal-500"
            />
          ))}
          {busy && <div className="flex aspect-square items-center justify-center rounded-md border border-slate-800 text-[11px] text-slate-500">Laden…</div>}
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
