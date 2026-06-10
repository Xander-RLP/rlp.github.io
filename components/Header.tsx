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
  { href: "/fotos", label: "Foto's" },
  { href: "/contact", label: "Contact" },
];

export default function Header() {
  const pathname = usePathname();
  const { isAdmin, logout } = useTournament();

  return (
    <header className="flex flex-col items-center gap-2 border-b-2 border-teal-500 bg-gradient-to-r from-teal-950 to-teal-900 px-4 py-2.5 md:flex-row md:justify-between md:gap-5 md:px-7">
      <div className="flex w-full items-center justify-between md:w-auto">
        <Link href="/" className="flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="RLP26 logo" className="h-12 w-auto rounded" />
          <div>
            <div className="text-lg font-extrabold tracking-wide">RLP26</div>
            <div className="text-[10px] uppercase tracking-[2px] text-teal-400">Ronnie LAN Party</div>
          </div>
        </Link>
        {isAdmin && (
          <Link
            href="/admin"
            className="rounded bg-amber-400 px-2 py-1 text-[10px] font-extrabold uppercase tracking-wide text-amber-950 md:hidden"
          >
            Admin
          </Link>
        )}
      </div>

      <nav className="flex w-full flex-1 flex-wrap justify-center gap-x-4 gap-y-1 md:w-auto md:gap-x-6">
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
