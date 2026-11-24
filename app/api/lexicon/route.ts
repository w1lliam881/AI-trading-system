import { NextResponse } from "next/server";
import { z } from "zod";
import { loadLexicon, saveLexicon } from "@/lib/analysis/sentiment";
import { invalidateAnalysis } from "@/lib/engine";
import { getDb } from "@/lib/db";

export const dynamic = "force-dynamic";

const Body = z.object({
  words: z.record(z.string().trim().toLowerCase().min(2).max(40), z.number().min(-3).max(3)),
});

export async function GET() {
  return NextResponse.json(loadLexicon());
}

export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Ogiltig ordlista." }, { status: 400 });
  const lex = loadLexicon();
  saveLexicon({ ...lex, words: parsed.data.words });
  // Nyheterna måste poängsättas om: rensa nyhetscachen.
  getDb().prepare("DELETE FROM cache WHERE key LIKE 'news:%'").run();
  invalidateAnalysis();
  return NextResponse.json({ ok: true });
}
