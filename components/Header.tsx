"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { useTournament } from "@/lib/store";

const NAV = [
  { href: "/", label: "Home" },
  { href: "/tournaments", label: "Tournaments" },
  { href: "/schedule", label: "Schedule" },
  { href: "/teams", label: "Teams" },
  { href: "/users", label: "Users" },
  { href: "/leaderboard", label: "Leaderboard" },
  { href: "/seatplan", label: "Seatplan" },
  { href: "/tickets", label: "Tickets" },
  { href: "/eten", label: "Eten" },
  { href: "/sponsors", label: "Sponsors" },
  { href: "/fotos", label: "Foto's" },
  { href: "/contact", label: "Contact" },
];

export default function Header() {
  const pathname = usePathname();
  const { isAdmin, logout } = useTournament();
  const [menuOpen, setMenuOpen] = useState(false);

  // menu dicht zodra er genavigeerd is
  useEffect(() => setMenuOpen(false), [pathname]);

  return (
    <header className="border-b-2 border-teal-500 bg-gradient-to-r from-teal-950 to-teal-900 px-4 py-2.5 md:flex md:items-center md:justify-between md:gap-5 md:px-7">
      <div className="flex items-center justify-between">
        <Link href="/" className="flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="RLP26 logo" className="h-12 w-auto rounded" />
          <div>
            <div className="text-lg font-extrabold tracking-wide">RLP26</div>
            <div className="text-[10px] uppercase tracking-[2px] text-teal-400">Ronnie LAN Party</div>
          </div>
        </Link>

        <div className="flex items-center gap-2 md:hidden">
          {isAdmin && (
            <Link
              href="/admin"
              className="rounded bg-amber-400 px-2 py-1 text-[10px] font-extrabold uppercase tracking-wide text-amber-950"
            >
              Admin
            </Link>
          )}
          <button
            onClick={() => setMenuOpen((o) => !o)}
            aria-label={menuOpen ? "Menu sluiten" : "Menu openen"}
            aria-expanded={menuOpen}
            className="flex h-10 w-10 flex-col items-center justify-center gap-[5px] rounded border border-teal-700"
          >
            <span className={`h-0.5 w-5 bg-slate-100 transition ${menuOpen ? "translate-y-[7px] rotate-45" : ""}`} />
            <span className={`h-0.5 w-5 bg-slate-100 transition ${menuOpen ? "opacity-0" : ""}`} />
            <span className={`h-0.5 w-5 bg-slate-100 transition ${menuOpen ? "-translate-y-[7px] -rotate-45" : ""}`} />
          </button>
        </div>
      </div>

      <nav
        className={`${menuOpen ? "flex" : "hidden"} mt-2 flex-col gap-0.5 border-t border-teal-800 pt-2 md:mt-0 md:flex md:flex-1 md:flex-row md:flex-wrap md:justify-center md:gap-x-6 md:gap-y-1 md:border-t-0 md:pt-0`}
      >
        {NAV.map(({ href, label }) => {
          // statische export geeft paden een slash op het eind ("/teams/")
          const active = pathname === href || pathname === `${href}/`;
          return (
            <Link
              key={href}
              href={href}
              className={`rounded px-2 py-2.5 text-xs font-bold uppercase tracking-widest md:rounded-none md:border-b-2 md:px-0.5 md:py-1.5 ${
                active
                  ? "bg-teal-900 text-lime-400 md:border-lime-400 md:bg-transparent"
                  : "text-slate-100 hover:text-lime-300 md:border-transparent"
              }`}
            >
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="hidden items-center gap-2.5 md:flex">
        {isAdmin && (
          <>
            <Link
              href="/admin"
              className="rounded bg-amber-400 px-2 py-1 text-[10px] font-extrabold uppercase tracking-wide text-amber-950"
            >
              Admin
            </Link>
            <button
              onClick={logout}
              className="cursor-pointer rounded border border-lime-400 px-3.5 py-1.5 text-[11px] font-bold uppercase tracking-wide text-lime-400 hover:bg-lime-400/10"
            >
              Logout
            </button>
          </>
        )}
      </div>
    </header>
  );
}
