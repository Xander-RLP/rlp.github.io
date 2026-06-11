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
      className="coffee-tab fixed left-0 top-[118px] z-40 flex items-center gap-2.5 rounded-r-full border-2 border-l-0 border-amber-400 bg-gradient-to-r from-slate-900 to-amber-950/80 py-3 pl-4 pr-3.5 text-sm font-extrabold text-amber-300 backdrop-blur"
    >
      <span className="whitespace-nowrap">Buy me a Coffee!</span>
      <span className="text-2xl leading-none drop-shadow-[0_0_6px_rgba(251,191,36,0.6)]">☕</span>
    </a>
  );
}
