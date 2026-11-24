"use client";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { EmptyState } from "@/components/ui/notice";
import { History } from "lucide-react";

export function ScoreHistoryChart({ data }: { data: { date: string; total: number }[] }) {
  if (data.length < 2) {
    return (
      <EmptyState icon={History} title="Poänghistoriken byggs upp">
        En punkt sparas varje dag som appen eller Botten körs{data.length === 1 ? ` (första: ${data[0].date}, poäng ${data[0].total.toLocaleString("sv-SE")})` : ""}. Grafen visas från dag två.
      </EmptyState>
    );
  }
  return (
    <div className="h-48">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -20 }}>
          <CartesianGrid stroke="var(--chart-grid)" vertical={false} />
          <XAxis dataKey="date" tick={{ fill: "var(--muted)", fontSize: 10 }} tickLine={false} axisLine={{ stroke: "var(--border)" }} minTickGap={24} />
          <YAxis domain={[1, 10]} ticks={[1, 4, 7, 10]} tick={{ fill: "var(--muted)", fontSize: 10 }} tickLine={false} axisLine={false} />
          <Tooltip
            contentStyle={{ background: "var(--panel)", border: "1px solid var(--border-strong)", borderRadius: 8, fontSize: 12 }}
            labelStyle={{ color: "var(--muted)" }}
            formatter={(v) => [Number(v).toLocaleString("sv-SE"), "Totalpoäng"]}
          />
          <Line type="monotone" dataKey="total" stroke="var(--accent)" strokeWidth={2} dot={{ r: 2 }} isAnimationActive={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
