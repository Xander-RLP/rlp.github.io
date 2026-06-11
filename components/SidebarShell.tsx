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
  const [open, setOpen] = useState(true);

  useEffect(() => {
    if (localStorage.getItem(KEY) === "1") setOpen(false);
  }, []);

  function toggle() {
    setOpen((o) => {
      localStorage.setItem(KEY, o ? "1" : "0");
      return !o;
    });
  }

  return (
    <div className="flex min-h-[calc(100vh-64px)] flex-col lg:flex-row">
      <main className="min-w-0 flex-1 overflow-x-auto px-4 py-5 md:px-7 md:py-6">
        <div className="mx-auto w-full max-w-6xl">{children}</div>
      </main>

      <aside
        className={`relative border-t border-slate-700 bg-slate-900 transition-[width] duration-300 ease-in-out lg:border-l lg:border-t-0 ${
          open ? "lg:w-80" : "lg:w-12"
        }`}
      >
        {/* desktop: ronde toggle-knop, zwevend op de rand */}
        <button
          onClick={toggle}
          aria-label={open ? "Zijpaneel inklappen" : "Zijpaneel uitklappen"}
          aria-expanded={open}
          title={open ? "Inklappen" : "Uitklappen"}
          className="absolute -left-3.5 top-7 z-20 hidden h-7 w-7 cursor-pointer items-center justify-center rounded-full border border-slate-600 bg-slate-800 text-slate-300 shadow-md transition-colors hover:border-teal-400 hover:text-teal-300 lg:flex"
        >
          <Chevron className={`h-4 w-4 transition-transform duration-300 ${open ? "" : "rotate-180"}`} />
        </button>

        {/* mobiel: kopbalk die het paneel open/dicht klapt */}
        <button
          onClick={toggle}
          aria-expanded={open}
          className="flex w-full cursor-pointer items-center justify-between px-4 py-3 text-[13px] font-extrabold uppercase tracking-wide hover:text-teal-300 lg:hidden"
        >
          Tournament News
          <Chevron className={`h-4 w-4 transition-transform duration-300 ${open ? "-rotate-90" : "rotate-90"}`} />
        </button>

        {/* inhoud: vaste breedte binnenin, zodat tekst niet hersaust tijdens de animatie */}
        <div
          className={`overflow-hidden transition-opacity duration-200 ease-in-out lg:h-full ${
            open ? "opacity-100" : "hidden opacity-0 lg:block"
          } ${open ? "" : "lg:pointer-events-none"}`}
        >
          <div className="lg:w-80">
            <Sidebar />
          </div>
        </div>

        {/* desktop dichtgeklapt: verticaal label, klikken opent */}
        {!open && (
          <button
            onClick={toggle}
            aria-label="Zijpaneel uitklappen"
            className="absolute inset-0 hidden w-full cursor-pointer items-start justify-center pt-20 text-slate-500 transition-colors hover:text-teal-300 lg:flex"
          >
            <span className="text-[11px] font-extrabold uppercase tracking-widest [writing-mode:vertical-rl]">
              Tournament News
            </span>
          </button>
        )}
      </aside>
    </div>
  );
}
