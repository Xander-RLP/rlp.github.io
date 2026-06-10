"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTournament } from "@/lib/store";

const NAV = [
  { href: "/", label: "Home" },
  { href: "/tournaments", label: "Tournaments" },
  { href: "/schedule", label: "Schedule" },
  { href: "/teams", label: "Teams" },
  { href: "/seatplan", label: "Seatplan" },
  { href: "/tickets", label: "Tickets" },
  { href: "/sponsors", label: "Sponsors" },
  { href: "/contact", label: "Contact" },
];

export default function Header() {
  const pathname = usePathname();
  const { isAdmin, logout } = useTournament();

  return (
    <header className="flex items-center justify-between gap-5 border-b-2 border-teal-500 bg-gradient-to-r from-teal-950 to-teal-900 px-7 py-2.5">
      <Link href="/" className="flex items-center gap-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo.png" alt="RLP26 logo" className="h-12 w-auto rounded" />
        <div>
          <div className="text-lg font-extrabold tracking-wide">RLP26</div>
          <div className="text-[10px] uppercase tracking-[2px] text-teal-400">Ronnie LAN Party</div>
        </div>
      </Link>

      <nav className="flex flex-1 flex-wrap justify-center gap-x-6 gap-y-1">
        {NAV.map(({ href, label }) => (
          <Link
            key={href}
            href={href}
            className={`border-b-2 px-0.5 py-1.5 text-xs font-bold uppercase tracking-widest ${
              pathname === href
                ? "border-lime-400 text-lime-400"
                : "border-transparent text-slate-100 hover:text-lime-300"
            }`}
          >
            {label}
          </Link>
        ))}
      </nav>

      <div className="flex items-center gap-2.5">
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
