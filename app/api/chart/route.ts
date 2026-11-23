import { NextResponse } from "next/server";
import { z } from "zod";
import { getIntraday } from "@/lib/data/yahoo";

export const dynamic = "force-dynamic";

const Query = z.object({
  ticker: z.string().trim().min(1).max(30),
  range: z.enum(["1d", "5d"]),
});

/** Intradagsdata för 1D/1V. Daglig historik skickas direkt från aktiesidan. */
export async function GET(req: Request) {
  const parsed = Query.safeParse(Object.fromEntries(new URL(req.url).searchParams));
  if (!parsed.success) return NextResponse.json({ error: "Ogiltig förfrågan." }, { status: 400 });
  try {
    const res = await getIntraday(parsed.data.ticker, parsed.data.range);
    return NextResponse.json({ history: res.data, fetchedAt: res.fetchedAt, stale: res.stale, error: res.error });
  } catch (e) {
    return NextResponse.json({ error: `Kunde inte hämta intradagsdata: ${(e as Error).message}` }, { status: 502 });
  }
}
