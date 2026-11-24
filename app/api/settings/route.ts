import { NextResponse } from "next/server";
import { setWeights, WeightsSchema, getWeights, DEFAULT_WEIGHTS } from "@/lib/settings";
import { invalidateAnalysis } from "@/lib/engine";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({ weights: getWeights(), defaults: DEFAULT_WEIGHTS });
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = WeightsSchema.safeParse(body?.weights);
  if (!parsed.success) return NextResponse.json({ error: "Ogiltiga vikter (0–100)." }, { status: 400 });
  try {
    setWeights(parsed.data);
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
  invalidateAnalysis();
  return NextResponse.json({ ok: true });
}
