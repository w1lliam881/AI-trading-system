import type { Metadata } from "next";
import { Suspense } from "react";
import "./globals.css";
import { Sidebar, MobileNav } from "@/components/layout/sidebar";
import { SymbolSearch } from "@/components/layout/search";
import { MarketClock } from "@/components/layout/market-clock";
import { LiveStatus } from "@/components/live/live";
import { TickerTape, TickerTapeSkeleton } from "@/components/layout/ticker-tape";

// Tickerbandet ska alltid visa färsk (eller cachad) data, aldrig byggtidsdata.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: { default: "Terminalen", template: "%s · Terminalen" },
  description: "Lokal analysterminal med regelbaserade investeringsidéer och en låtsashandlare.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="sv" data-theme="dark" suppressHydrationWarning>
      <body className="min-h-screen">
        <div className="flex min-h-screen">
          <Sidebar />
          <div className="flex min-w-0 flex-1 flex-col">
            <header className="sticky top-0 z-40 border-b border-border bg-bg/85 backdrop-blur-md">
              <div className="flex h-14 items-center gap-4 px-5">
                <SymbolSearch />
                <div className="ml-auto hidden items-center gap-5 sm:flex"><LiveStatus /><MarketClock /></div>
              </div>
              <MobileNav />
            </header>
            <Suspense fallback={<TickerTapeSkeleton />}>
              <TickerTape />
            </Suspense>
            <main className="mx-auto w-full max-w-[1440px] flex-1 px-5 py-6 lg:px-8">{children}</main>
            <footer className="border-t border-border px-5 py-4 text-center text-[11px] text-muted lg:px-8">
              Ej finansiell rådgivning. Regelbaserade bedömningar kan vara fel. Kursdata från Yahoo Finance kan vara fördröjd.
            </footer>
          </div>
        </div>
      </body>
    </html>
  );
}
