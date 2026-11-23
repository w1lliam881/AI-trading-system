import { Skeleton } from "@/components/ui/skeleton";
export default function Loading() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-8 w-56" />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-xl" />)}</div>
      <div className="grid gap-6 lg:grid-cols-3"><Skeleton className="h-80 rounded-xl lg:col-span-2" /><Skeleton className="h-80 rounded-xl" /></div>
    </div>
  );
}
