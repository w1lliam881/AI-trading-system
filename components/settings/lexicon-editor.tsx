"use client";
import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { X, Plus, Loader2 } from "lucide-react";

export function LexiconEditor({ initial }: { initial: Record<string, number> }) {
  const router = useRouter();
  const [words, setWords] = useState(initial);
  const [word, setWord] = useState("");
  const [weight, setWeight] = useState(1);
  const [filter, setFilter] = useState("");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);
  const [, start] = useTransition();

  const list = useMemo(() => Object.entries(words).filter(([w]) => w.includes(filter.toLowerCase())).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "sv")), [words, filter]);

  async function save() {
    setSaving(true);
    const r = await fetch("/api/lexicon", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ words }) });
    setSaving(false);
    setMsg(r.ok ? "Sparat! Nyheterna poängsätts om vid nästa sidladdning." : "Kunde inte spara.");
    if (r.ok) { setDirty(false); start(() => router.refresh()); }
  }

  const input = "h-8 rounded-md border border-border bg-panel-2 px-2.5 text-xs text-text placeholder:text-muted focus:border-border-strong focus:outline-none";
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <input className={input} placeholder="Nytt ord eller fras" value={word} onChange={(e) => setWord(e.target.value)} />
        <select className={input} value={weight} onChange={(e) => setWeight(Number(e.target.value))} aria-label="Vikt">
          {[3, 2, 1, 0.5, -0.5, -1, -2, -3].map((v) => <option key={v} value={v}>{v > 0 ? `+${v}` : v} {v > 0 ? "positiv" : "negativ"}</option>)}
        </select>
        <button onClick={() => { const k = word.trim().toLowerCase(); if (k.length >= 2) { setWords({ ...words, [k]: weight }); setWord(""); setDirty(true); } }} className="flex h-8 items-center gap-1 rounded-md border border-border-strong px-2.5 text-xs hover:bg-hover"><Plus className="h-3.5 w-3.5" /> Lägg till</button>
        <input className={`${input} ml-auto w-40`} placeholder="Filtrera…" value={filter} onChange={(e) => setFilter(e.target.value)} />
      </div>
      <div className="flex max-h-72 flex-wrap gap-1.5 overflow-y-auto rounded-lg border border-border p-2">
        {list.map(([w, v]) => (
          <span key={w} className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11.5px] ${v > 0 ? "bg-up-soft text-up" : v < 0 ? "bg-down-soft text-down" : "bg-panel-2 text-muted"}`}>
            {w} <span className="num opacity-70">{v > 0 ? `+${v}` : v}</span>
            <button onClick={() => { const n = { ...words }; delete n[w]; setWords(n); setDirty(true); }} aria-label={`Ta bort ${w}`} className="opacity-60 hover:opacity-100"><X className="h-3 w-3" /></button>
          </span>
        ))}
      </div>
      <div className="flex items-center gap-3">
        <button onClick={save} disabled={!dirty || saving} className="flex h-9 items-center gap-2 rounded-lg bg-accent px-4 text-sm font-medium text-[#14100a] hover:brightness-110 disabled:opacity-40">{saving && <Loader2 className="h-4 w-4 animate-spin" />} Spara ordlistan</button>
        <span className="text-xs text-muted">{Object.keys(words).length} ord</span>
        {msg && <span className="text-xs text-up">{msg}</span>}
      </div>
      <p className="text-[11px] text-muted">Orden matchas från början av ord i rubriker (”vinstvarning” träffar även ”vinstvarningen”). Sparas i filen <span className="num">config/sentiment-lexicon.json</span>.</p>
    </div>
  );
}
