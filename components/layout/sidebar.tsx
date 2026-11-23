"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAV } from "./nav";
import { cn } from "@/lib/utils";

export function Sidebar() {
  const path = usePathname();
  return (
    <aside className="sticky top-0 hidden h-screen w-[216px] shrink-0 flex-col border-r border-border bg-bg-elev md:flex">
      <Link href="/" className="flex h-14 items-center gap-2.5 px-5">
        <span className="grid h-7 w-7 place-items-center rounded-md bg-accent text-[13px] font-bold text-[#14100a]">T</span>
        <span className="text-[15px] font-semibold tracking-tight">Terminalen</span>
      </Link>
      <nav className="mt-2 flex flex-1 flex-col gap-0.5 px-3">
        {NAV.map(({ href, label, icon: Icon, keys }) => {
          const active = href === "/" ? path === "/" : path.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "group flex h-9 items-center gap-3 rounded-lg px-2.5 text-sm transition-colors",
                active ? "bg-panel-2 text-text" : "text-text-2 hover:bg-hover hover:text-text",
              )}
            >
              <Icon className={cn("h-4 w-4", active ? "text-accent" : "text-muted group-hover:text-text-2")} />
              <span className="flex-1">{label}</span>
              {keys && <kbd className="num hidden text-[10px] text-muted/70 group-hover:inline">{keys}</kbd>}
            </Link>
          );
        })}
      </nav>
      <div className="m-3 rounded-lg border border-border bg-panel p-3 text-[11px] leading-relaxed text-muted">
        Låtsaspengar och regelbaserade bedömningar. Inga riktiga affärer görs.
      </div>
    </aside>
  );
}

export function MobileNav() {
  const path = usePathname();
  return (
    <nav className="flex gap-1 overflow-x-auto border-b border-border px-3 py-2 md:hidden">
      {NAV.map(({ href, label }) => {
        const active = href === "/" ? path === "/" : path.startsWith(href);
        return (
          <Link key={href} href={href} className={cn("rounded-md px-2.5 py-1 text-xs whitespace-nowrap", active ? "bg-panel-2 text-text" : "text-muted")}>
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
