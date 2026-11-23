import Link from "next/link";
import { EmptyState } from "@/components/ui/notice";
export default function NotFound() {
  return (
    <div className="mx-auto max-w-xl pt-16">
      <EmptyState title="Sidan finns inte">Länken kan vara felstavad eller så saknas data för tickern. <Link className="text-accent hover:underline" href="/">Till Översikt</Link></EmptyState>
    </div>
  );
}
