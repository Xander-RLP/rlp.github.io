"use client";

import { COFFEE_URL } from "@/lib/links";

// donatie-tab linksboven (onder het logo): staat half ingeklapt tegen de
// schermrand, piept af en toe even naar buiten om aandacht te trekken en
// schuift bij hover helemaal uit
export default function CoffeeTab() {
  return (
    <a
      href={COFFEE_URL}
      target="_blank"
      rel="noopener noreferrer"
      title="Buy me a Coffee! — steun de developer van deze site"
      className="coffee-tab fixed left-0 top-[76px] z-40 flex items-center gap-2 rounded-r-full border border-l-0 border-amber-400/60 bg-slate-900/95 py-2 pl-3.5 pr-3 text-xs font-extrabold text-amber-300 shadow-lg shadow-black/40 backdrop-blur"
    >
      <span className="whitespace-nowrap">Buy me a Coffee!</span>
      <span className="text-base leading-none">☕</span>
    </a>
  );
}
