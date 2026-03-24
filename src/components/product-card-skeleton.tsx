export function ProductCardSkeleton() {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-black/10 bg-white">
      <div className="h-40 w-full animate-pulse bg-[#f0f0f0]" />
      <div className="space-y-2 p-3">
        <div className="h-3 w-3/4 animate-pulse rounded bg-[#f0f0f0]" />
        <div className="h-3 w-1/3 animate-pulse rounded bg-[#f0f0f0]" />
      </div>
      <div className="flex gap-2 px-3 pb-3">
        <div className="h-10 w-full animate-pulse rounded-full bg-[#f0f0f0]" />
      </div>
    </div>
  );
}
