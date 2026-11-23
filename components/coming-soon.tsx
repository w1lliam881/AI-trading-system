import { EmptyState } from "@/components/ui/notice";
import { PageTitle } from "@/components/page-title";
import { Hammer } from "lucide-react";

export function ComingSoon({ title, subtitle, phase, children }: { title: string; subtitle: string; phase: number; children: React.ReactNode }) {
  return (
    <div className="space-y-6">
      <PageTitle title={title} subtitle={subtitle} />
      <EmptyState icon={Hammer} title={`Byggs i fas ${phase}`} className="py-16">{children}</EmptyState>
    </div>
  );
}
