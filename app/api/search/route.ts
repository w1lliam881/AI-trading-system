import { NextResponse } from "next/server";
import { z } from "zod";
import { searchSymbols } from "@/lib/data/yahoo";

export const dynamic = "force-dynamic";

const Query = z.object({ q: z.string().trim().min(1).max(60) });

export async function GET(req: Request) {
  const parsed = Query.safeParse(Object.fromEntries(new URL(req.url).searchParams));
  if (!parsed.success) return NextResponse.json({ error: "Ange en sökterm." }, { status: 400 });
  try {
    const res = await searchSymbols(parsed.data.q);
    return NextResponse.json({ hits: res.data, fetchedAt: res.fetchedAt, stale: res.stale });
  } catch (e) {
    return NextResponse.json({ error: `Sökningen mot Yahoo misslyckades: ${(e as Error).message}` }, { status: 502 });
  }
}
