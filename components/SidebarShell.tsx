"use client";

import { useEffect, useState } from "react";
import Sidebar from "./Sidebar";

const KEY = "rlp26-sidebar-dicht";

function Chevron({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      <path d="m9 18 6-6-6-6" />
    </svg>
  );
}

export default function SidebarShell({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (localStorage.getItem(KEY) === "0") setOpen(true);
  }, []);

  function toggle() {
    setOpen((o) => {
      localStorage.setItem(KEY, o ? "1" : "0");
      return !o;
    });
  }

  return (
    <div className="min-h-[calc(100vh-64px)]">
      {/* content: altijd in het midden van het scherm, het paneel zweeft erover */}
      <main className="overflow-x-auto px-4 py-5 md:px-7 md:py-6">
        <div className="mx-auto w-full max-w-6xl">{children}</div>
      </main>

      {/* mobiel: paneel onderaan de pagina, in te klappen met de kopbalk */}
      <div className="border-t border-slate-700 bg-slate-900 lg:hidden">
        <button
          onClick={toggle}
          aria-expanded={open}
          className="flex w-full cursor-pointer items-center justify-between px-4 py-3 text-[13px] font-extrabold uppercase tracking-wide hover:text-teal-300"
        >
          Tournament News
          <Chevron className={`h-4 w-4 transition-transform duration-300 ${open ? "-rotate-90" : "rotate-90"}`} />
        </button>
        {open && <Sidebar />}
      </div>

      {/* desktop: zwevend paneel rechts dat de content nooit verschuift */}
      <aside
        className={`fixed bottom-0 right-0 top-16 z-30 hidden w-80 border-l border-slate-700 bg-slate-900 shadow-2xl shadow-black/40 transition-transform duration-300 ease-in-out lg:block ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
        aria-hidden={!open}
      >
        <button
          onClick={toggle}
          aria-label="Zijpaneel inklappen"
          title="Inklappen"
          className="absolute -left-3.5 top-7 z-10 flex h-7 w-7 cursor-pointer items-center justify-center rounded-full border border-slate-600 bg-slate-800 text-slate-300 shadow-md transition-colors hover:border-teal-400 hover:text-teal-300"
        >
          <Chevron className="h-4 w-4" />
        </button>
        <div className="h-full overflow-y-auto">
          <Sidebar />
        </div>
      </aside>

      {/* desktop dichtgeklapt: tab aan de schermrand om het paneel te openen */}
      {!open && (
        <button
          onClick={toggle}
          aria-label="Tournament News openen"
          className="fixed right-0 top-1/3 z-30 hidden cursor-pointer flex-col items-center gap-2 rounded-l-md border border-r-0 border-slate-700 bg-slate-800 px-1.5 py-3.5 text-slate-400 shadow-lg transition-colors hover:border-teal-400 hover:text-teal-300 lg:flex"
        >
          <Chevron className="h-3.5 w-3.5 rotate-180" />
          <span className="text-[10px] font-extrabold uppercase tracking-widest [writing-mode:vertical-rl]">
            Tournament News
          </span>
        </button>
      )}
    </div>
  );
}
