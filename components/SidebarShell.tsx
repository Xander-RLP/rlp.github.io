"use client";

import { useEffect, useState } from "react";
import Sidebar from "./Sidebar";

const KEY = "rlp26-sidebar-dicht";

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
    <div
      className={`grid min-h-[calc(100vh-64px)] grid-cols-1 transition-[grid-template-columns] duration-300 ${
        open ? "lg:grid-cols-[1fr_320px]" : "lg:grid-cols-[1fr_36px]"
      }`}
    >
      <main className="min-w-0 overflow-x-auto px-4 py-5 md:px-7 md:py-6">
        <div className="mx-auto w-full max-w-6xl">{children}</div>
      </main>

      <div className="relative overflow-hidden border-t border-slate-700 bg-slate-900 lg:border-l lg:border-t-0">
        {open ? (
          <>
            <button
              onClick={toggle}
              aria-label="Zijpaneel inklappen"
              title="Inklappen"
              className="absolute right-3 top-4 z-10 rounded border border-slate-700 bg-slate-800 px-1.5 py-0.5 text-xs leading-none text-slate-400 hover:border-teal-500 hover:text-slate-100"
            >
              <span className="hidden lg:inline">»</span>
              <span className="lg:hidden">▴</span>
            </button>
            <Sidebar />
          </>
        ) : (
          <button
            onClick={toggle}
            aria-label="Zijpaneel openen"
            className="flex w-full items-center justify-center gap-1.5 py-2 text-[11px] font-extrabold uppercase tracking-wide text-slate-400 hover:text-teal-400 lg:h-full lg:flex-col lg:py-4"
          >
            <span className="lg:hidden">Tournament News ▾</span>
            <span className="hidden lg:inline">«</span>
            <span className="hidden lg:inline lg:[writing-mode:vertical-rl]">Tournament News</span>
          </button>
        )}
      </div>
    </div>
  );
}
