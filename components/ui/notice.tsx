import { AlertTriangle, Info, CloudOff } from "lucide-react";
import { cn } from "@/lib/utils";

type Kind = "info" | "warn" | "offline";

const icons = { info: Info, warn: AlertTriangle, offline: CloudOff };

/** Tydlig notis, t.ex. när vi visar cachad data efter ett nätverksfel. */
export function Notice({ kind = "info", title, children, className }: { kind?: Kind; title: string; children?: React.ReactNode; className?: string }) {
  const Icon = icons[kind];
  return (
    <div
      role="status"
      className={cn(
        "flex items-start gap-3 rounded-lg border px-3.5 py-2.5 text-sm",
        kind === "info" ? "border-border bg-panel-2 text-text-2" : "border-accent/30 bg-accent-soft text-text",
        className,
      )}
    >
      <Icon className={cn("mt-0.5 h-4 w-4 shrink-0", kind === "info" ? "text-muted" : "text-accent")} />
      <div>
        <p className="font-medium">{title}</p>
        {children && <div className="mt-0.5 text-xs text-text-2">{children}</div>}
      </div>
    </div>
  );
}

/** Snyggt tomt tillstånd med förklaring. */
export function EmptyState({ icon: Icon, title, children, className }: { icon?: React.ComponentType<{ className?: string }>; title: string; children?: React.ReactNode; className?: string }) {
  return (
    <div className={cn("flex flex-col items-center justify-center rounded-lg border border-dashed border-border-strong px-6 py-10 text-center", className)}>
      {Icon && (
        <div className="mb-3 grid h-10 w-10 place-items-center rounded-full bg-panel-2">
          <Icon className="h-5 w-5 text-muted" />
        </div>
      )}
      <p className="text-sm font-medium text-text">{title}</p>
      {children && <div className="mt-1 max-w-sm text-xs leading-relaxed text-muted">{children}</div>}
    </div>
  );
}
