import { NextResponse } from "next/server";
import { z } from "zod";
import { addToWatchlist, removeFromWatchlist, WatchItemSchema, getWatchlist } from "@/lib/watchlist";
import { invalidateAnalysis } from "@/lib/engine";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({ items: getWatchlist() });
}

export async function POST(req: Request) {
  const parsed = WatchItemSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Ogiltigt bolag." }, { status: 400 });
  addToWatchlist(parsed.data);
  invalidateAnalysis();
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request) {
  const parsed = z.object({ ticker: z.string().min(1).max(25) }).safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Ogiltig ticker." }, { status: 400 });
  removeFromWatchlist(parsed.data.ticker);
  invalidateAnalysis();
  return NextResponse.json({ ok: true });
}
