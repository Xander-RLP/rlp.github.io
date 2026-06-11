"use client";

import { useEffect, useState } from "react";
import { COFFEE_URL } from "@/lib/links";

// éénmaal weggeklikt = nooit meer, op de hele site (we willen niemand lastigvallen)
const KEY = "rlp-coffee-hint-weg";

// klein donatie-hintje voor piekmomenten (kampioensbanner, eten-pagina):
// licht van toon, wegklikbaar, en maximaal één gedeelde dismiss-state
export default function CoffeeHint({ children }: { children: React.ReactNode }) {
  const [hidden, setHidden] = useState(true); // start verborgen tot localStorage gelezen is

  useEffect(() => {
    setHidden(localStorage.getItem(KEY) === "1");
  }, []);

  if (hidden) return null;

  return (
    <div className="mx-auto mt-2.5 flex w-fit max-w-full flex-wrap items-center justify-center gap-x-2 gap-y-1 rounded-full border border-amber-400/40 bg-amber-400/10 px-3.5 py-1.5 text-[11px] font-semibold text-amber-200/90">
      <span>{children}</span>
      <a
        href={COFFEE_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="font-extrabold text-amber-300 hover:text-amber-100"
      >
        ☕ Buy me a Coffee!
      </a>
      <button
        onClick={() => { localStorage.setItem(KEY, "1"); setHidden(true); }}
        title="Niet meer tonen"
        className="cursor-pointer pl-1 text-amber-400/60 hover:text-amber-200"
      >
        ×
      </button>
    </div>
  );
}
