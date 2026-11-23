"use client";
import { EmptyState } from "@/components/ui/notice";
import { Button } from "@/components/ui/button";
export default function Error({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div className="mx-auto max-w-xl pt-16">
      <EmptyState title="Något gick fel när sidan laddades">
        Oftast beror det på att en datakälla inte svarade. Försök igen om en stund.
        <br /><span className="text-[11px] opacity-70">{error.message}</span>
        <div className="mt-4"><Button onClick={reset} size="sm">Försök igen</Button></div>
      </EmptyState>
    </div>
  );
}
