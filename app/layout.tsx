import type { Metadata } from "next";
import "./globals.css";
import { TournamentProvider } from "@/lib/store";
import Header from "@/components/Header";
import TeamSpeakWidget from "@/components/TeamSpeakWidget";

export const metadata: Metadata = {
  title: "RLP26 — Tournament Brackets",
  description: "Brackets, schedule en teams van de Ronnie LAN Party 2026",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="nl">
      <body className="min-h-screen bg-slate-950 text-slate-100 antialiased">
        <TournamentProvider>
          <Header />
          {children}
          <TeamSpeakWidget />
        </TournamentProvider>
      </body>
    </html>
  );
}
