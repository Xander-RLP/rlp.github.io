"use client";

import { useEffect, useState } from "react";
import { FOTOS_WACHTWOORD_KEY, decryptFotoUrl, unlockFotos } from "@/lib/fotos";

// Diashow van LAN-foto's achter de hero. De foto's zijn versleuteld; de show
// draait alleen voor bezoekers die het foto-wachtwoord al hebben ingevoerd
// op /fotos — voor de rest blijft de gewone hero-achtergrond staan.

const MAX_FOTOS = 6;
const INTERVAL_MS = 5000;

export default function HeroSlideshow() {
  const [urls, setUrls] = useState<string[]>([]);
  const [active, setActive] = useState(0);

  useEffect(() => {
    const pw = localStorage.getItem(FOTOS_WACHTWOORD_KEY);
    if (!pw) return;
    let cancelled = false;
    const made: string[] = [];
    (async () => {
      try {
        const { key, photos } = await unlockFotos(pw);
        // pak een spreiding over de hele set i.p.v. alleen de eerste paar
        const step = Math.max(1, Math.floor(photos.length / MAX_FOTOS));
        const pick = photos.filter((_, i) => i % step === 0).slice(0, MAX_FOTOS);
        for (const id of pick) {
          const url = await decryptFotoUrl(key, `/fotos/${id}.full.enc`);
          if (cancelled) return URL.revokeObjectURL(url);
          made.push(url);
          setUrls((cur) => [...cur, url]);
        }
      } catch { /* wachtwoord klopt niet meer — dan gewoon geen diashow */ }
    })();
    return () => {
      cancelled = true;
      made.forEach((u) => URL.revokeObjectURL(u));
    };
  }, []);

  useEffect(() => {
    if (urls.length < 2) return;
    const t = setInterval(() => setActive((a) => (a + 1) % urls.length), INTERVAL_MS);
    return () => clearInterval(t);
  }, [urls.length]);

  if (!urls.length) return null;

  return (
    <div className="absolute inset-0 overflow-hidden">
      {urls.map((url, i) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={url}
          src={url}
          alt=""
          className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-[1200ms] ease-in-out ${
            i === active ? "animate-hero-zoom opacity-50" : "opacity-0"
          }`}
        />
      ))}
    </div>
  );
}
