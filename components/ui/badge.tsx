import { cn } from "@/lib/utils";

type Tone = "neutral" | "accent" | "up" | "down" | "outline";

const tones: Record<Tone, string> = {
  neutral: "bg-panel-2 text-text-2 border-border",
  accent: "bg-accent-soft text-accent border-transparent",
  up: "bg-up-soft text-up border-transparent",
  down: "bg-down-soft text-down border-transparent",
  outline: "bg-transparent text-muted border-border-strong",
};

export function Badge({
  tone = "neutral",
  className,
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & { tone?: Tone }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[11px] font-medium leading-none",
        tones[tone],
        className,
      )}
      {...props}
    />
  );
}
