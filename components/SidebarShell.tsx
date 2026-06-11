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
  const [panelTop, setPanelTop] = useState(64);

  useEffect(() => {
    if (localStorage.getItem(KEY) === "0") setOpen(true);
  }, []);

  // laat de rest van de UI (TeamSpeak-bubble) weten of het paneel uitstaat
  useEffect(() => {
    window.dispatchEvent(new CustomEvent("rlp-sidebar", { detail: { open } }));
  }, [open]);

  // het paneel valt precies onder de navbar, ook als die over twee regels
  // loopt of (deels) uit beeld is gescrold
  useEffect(() => {
    const header = document.querySelector("header");
    if (!header) return;
    const update = () => setPanelTop(Math.max(0, header.getBoundingClientRect().bottom));
    update();
    const ro = new ResizeObserver(update);
    ro.observe(header);
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, { passive: true });
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update);
    };
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

      {/* desktop: zwevend paneel rechts dat de content nooit verschuift; de
          verticale tab is de enige knop en schuift met het paneel mee —
          pijl naar rechts = paneel open (dichtklappen), naar links = gesloten */}
      <aside
        style={{ top: panelTop }}
        className={`fixed bottom-0 right-0 z-30 hidden w-[380px] border-l border-slate-700 bg-slate-900 shadow-2xl shadow-black/40 transition-transform duration-300 ease-in-out lg:block ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <button
          onClick={toggle}
          aria-label={open ? "Tournament News inklappen" : "Tournament News openen"}
          aria-expanded={open}
          className="absolute right-full top-1/3 z-10 flex cursor-pointer flex-col items-center gap-2 rounded-l-md border border-r-0 border-slate-700 bg-slate-800 px-1.5 py-3.5 text-slate-400 shadow-lg transition-colors hover:border-teal-400 hover:text-teal-300"
        >
          <Chevron className={`h-3.5 w-3.5 transition-transform duration-300 ${open ? "" : "rotate-180"}`} />
          <span className="text-[10px] font-extrabold uppercase tracking-widest [writing-mode:vertical-rl]">
            Tournament News
          </span>
        </button>
        <div className="h-full overflow-y-auto">
          <Sidebar />
        </div>
      </aside>
    </div>
  );
}
