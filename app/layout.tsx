import type { Metadata } from "next";
import "./globals.css";
import { TournamentProvider } from "@/lib/store";
import CoffeeTab from "@/components/CoffeeTab";
import Header from "@/components/Header";
import TeamSpeakWidget from "@/components/TeamSpeakWidget";

export const metadata: Metadata = {
  title: "RLP26 — Ronnie LAN Party",
  description: "Brackets, schedule en teams van de Ronnie LAN Party 2026",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="nl">
      <body className="min-h-screen bg-slate-950 text-slate-100 antialiased">
        <TournamentProvider>
          <Header />
          {children}
          <footer className="mt-10 border-t border-slate-800 py-5 text-center text-[11px] text-slate-500">
            © Ronnie LAN Party 2026
          </footer>
          <CoffeeTab />
          <TeamSpeakWidget />
        </TournamentProvider>
      </body>
    </html>
  );
}
