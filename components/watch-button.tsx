"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Star, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { WatchItem } from "@/lib/watchlist";

/** Lägg till / ta bort bolaget i bevakningslistan. */
export function WatchButton({ item, watching }: { item: WatchItem; watching: boolean }) {
  const router = useRouter();
  const [on, setOn] = useState(watching);
  const [pending, start] = useTransition();
  const [err, setErr] = useState<string | null>(null);
  async function toggle() {
    setErr(null);
    const res = await fetch("/api/watchlist", {
      method: on ? "DELETE" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(on ? { ticker: item.ticker } : item),
    });
    if (!res.ok) { setErr("Det gick inte att spara."); return; }
    setOn(!on);
    start(() => router.refresh());
  }
  return (
    <span className="flex flex-col items-end">
      <Button onClick={toggle} disabled={pending} variant={on ? "secondary" : "secondary"} title={on ? "Ta bort ur bevakningslistan" : "Lägg till i bevakningslistan"}>
        {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Star className={on ? "h-4 w-4 fill-[var(--accent)] text-accent" : "h-4 w-4"} />}
        {on ? "Bevakas" : "Lägg till i bevakning"}
      </Button>
      {err && <span className="mt-1 text-[11px] text-down">{err}</span>}
    </span>
  );
}
