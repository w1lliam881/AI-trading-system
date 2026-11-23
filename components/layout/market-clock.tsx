"use client";
import { useEffect, useState } from "react";

/** Visar Stockholmsbörsens status (öppen 09:00–17:30 vardagar) och klocka. Helgdagar ignoreras. */
function stockholmNow() {
  const parts = new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Stockholm", weekday: "short", hour: "2-digit", minute: "2-digit", hour12: false }).formatToParts(new Date());
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  const h = Number(get("hour"));
  const m = Number(get("minute"));
  const wd = get("weekday");
  const weekend = /lör|sön/i.test(wd);
  const mins = h * 60 + m;
  const open = !weekend && mins >= 9 * 60 && mins < 17 * 60 + 30;
  return { label: `${get("hour")}:${get("minute")}`, open };
}

export function MarketClock() {
  const [s, setS] = useState<{ label: string; open: boolean } | null>(null);
  useEffect(() => {
    setS(stockholmNow());
    const id = setInterval(() => setS(stockholmNow()), 15_000);
    return () => clearInterval(id);
  }, []);
  if (!s) return <span className="h-4 w-28" />;
  return (
    <span className="flex items-center gap-2 text-xs text-text-2">
      <span className={`h-1.5 w-1.5 rounded-full ${s.open ? "bg-up shadow-[0_0_8px_var(--up)]" : "bg-muted"}`} />
      <span>Stockholm {s.open ? "öppen" : "stängd"}</span>
      <span className="num text-muted">{s.label}</span>
    </span>
  );
}
