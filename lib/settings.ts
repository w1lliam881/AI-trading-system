import { z } from "zod";
import { getDb } from "./db";

export const WeightsSchema = z.object({
  technical: z.number().min(0).max(100),
  fundamental: z.number().min(0).max(100),
  news: z.number().min(0).max(100),
  macro: z.number().min(0).max(100),
  events: z.number().min(0).max(100),
});
export type Weights = z.infer<typeof WeightsSchema>;

/** Förvalda vikter (procent). */
export const DEFAULT_WEIGHTS: Weights = { technical: 20, fundamental: 25, news: 20, macro: 20, events: 15 };

function getJson<T>(key: string, schema: z.ZodType<T>, fallback: T): T {
  const row = getDb().prepare("SELECT value FROM settings WHERE key = ?").get(key) as { value: string } | undefined;
  if (!row) return fallback;
  const parsed = schema.safeParse(JSON.parse(row.value));
  return parsed.success ? parsed.data : fallback;
}

function setJson(key: string, value: unknown) {
  getDb().prepare("INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)").run(key, JSON.stringify(value));
}

export function getWeights(): Weights {
  return getJson("weights", WeightsSchema, DEFAULT_WEIGHTS);
}

export function setWeights(w: Weights) {
  const parsed = WeightsSchema.parse(w);
  if (Object.values(parsed).reduce((s, v) => s + v, 0) <= 0) throw new Error("Minst en vikt måste vara större än 0.");
  setJson("weights", parsed);
}
