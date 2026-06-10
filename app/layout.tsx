import type { Metadata } from "next";
import "./globals.css";
import { TournamentProvider } from "@/lib/store";
import Header from "@/components/Header";
import Sidebar from "@/components/Sidebar";
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
          <div className="grid min-h-[calc(100vh-64px)] grid-cols-1 lg:grid-cols-[1fr_320px]">
            <main className="overflow-x-auto px-4 py-5 md:px-7 md:py-6">{children}</main>
            <Sidebar />
          </div>
          <TeamSpeakWidget />
        </TournamentProvider>
      </body>
    </html>
  );
}
