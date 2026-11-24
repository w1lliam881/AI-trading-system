import { NextResponse } from "next/server";
import { z } from "zod";
import { getLiveQuotes } from "@/lib/data/live";

export const dynamic = "force-dynamic";

const Query = z.object({
  symbols: z
    .string()
    .transform((s) => s.split(",").map((x) => x.trim()).filter(Boolean))
    .pipe(z.array(z.string().regex(/^[\^A-Za-z0-9.\-=]{1,25}$/)).min(1).max(120)),
});

export async function GET(req: Request) {
  const parsed = Query.safeParse(Object.fromEntries(new URL(req.url).searchParams));
  if (!parsed.success) return NextResponse.json({ error: "Ogiltiga symboler." }, { status: 400 });
  const res = await getLiveQuotes(parsed.data.symbols);
  return NextResponse.json(res, { headers: { "Cache-Control": "no-store" } });
}
