"use client";

import { useEffect, useRef, useState } from "react";
import { COFFEE_URL } from "@/lib/links";

// donatie-tab linksboven (onder het logo). Eén state-machine stuurt de
// positie (rust → piek → open → wegduiken) en álle bewegingen lopen via
// dezelfde transition, zodat hij altijd vloeiend vanaf zijn huidige plek
// animeert — nooit springen, ook niet als states elkaar snel afwisselen.
type Mode = "rest" | "peek" | "open" | "dodge";

const TRANSFORM: Record<Mode, string> = {
  rest: "translateX(calc(-100% + 3.4rem))",  // alleen het kopje steekt uit
  peek: "translateX(-0.25rem)",              // af en toe even helemaal laten zien
  open: "translateX(0)",                     // hover/focus
  dodge: "translateX(calc(-100% + 0.8rem))", // touch elders: bijna helemaal weg
};

export default function CoffeeTab() {
  const ref = useRef<HTMLAnchorElement>(null);
  const [mode, setMode] = useState<Mode>("rest");

  // piek-cyclus: vanuit rust na 6s even naar buiten, 1,8s tonen, weer terug
  useEffect(() => {
    if (mode === "rest") {
      const t = setTimeout(() => setMode("peek"), 6000);
      return () => clearTimeout(t);
    }
    if (mode === "peek") {
      const t = setTimeout(() => setMode("rest"), 1800);
      return () => clearTimeout(t);
    }
    if (mode === "dodge") {
      const t = setTimeout(() => setMode("rest"), 4000);
      return () => clearTimeout(t);
    }
  }, [mode]);

  // touch elders op de pagina → wegduiken zodat hij nooit in de weg zit
  useEffect(() => {
    const onTouch = (e: TouchEvent) => {
      if (ref.current?.contains(e.target as Node)) return;
      setMode("dodge");
    };
    document.addEventListener("touchstart", onTouch, { passive: true });
    return () => document.removeEventListener("touchstart", onTouch);
  }, []);

  return (
    <a
      ref={ref}
      href={COFFEE_URL}
      target="_blank"
      rel="noopener noreferrer"
      title="Buy me a Coffee! — steun de developer van deze site"
      onMouseEnter={() => setMode("open")}
      onMouseLeave={() => setMode("rest")}
      onFocus={() => setMode("open")}
      onBlur={() => setMode("rest")}
      style={{
        transform: TRANSFORM[mode],
        opacity: mode === "dodge" ? 0.55 : 1,
        transition: "transform 0.55s cubic-bezier(0.22, 0.61, 0.36, 1), opacity 0.35s ease, box-shadow 0.35s ease",
      }}
      className={`fixed left-0 top-[118px] z-40 flex items-center gap-2.5 rounded-r-full border-2 border-l-0 border-amber-400 bg-gradient-to-r from-slate-900 to-amber-950/80 py-3 pl-4 pr-3.5 text-sm font-extrabold text-amber-300 backdrop-blur ${
        mode === "open" ? "shadow-[0_0_26px_rgba(251,191,36,0.45)]" : "shadow-[0_0_18px_rgba(251,191,36,0.25)]"
      }`}
    >
      <span className="whitespace-nowrap">Buy me a Coffee!</span>
      <span className="text-2xl leading-none drop-shadow-[0_0_6px_rgba(251,191,36,0.6)]">☕</span>
    </a>
  );
}
