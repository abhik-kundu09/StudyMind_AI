// components/ui/skeletons/ScoreboardSkeleton.jsx
import Skeleton from "../Skeleton";

export default function ScoreboardSkeleton() {
  return (
    <div className="flex flex-col gap-4">
      <Skeleton className="h-4 w-24" />
      <div className="grid grid-cols-2 gap-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="flex flex-col gap-2 rounded-2xl p-4"
            style={{ background: "rgba(20,17,12,0.7)", border: "1px solid rgba(212,168,86,0.08)" }}
          >
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-7 w-12" />
          </div>
        ))}
      </div>
      <div
        className="rounded-2xl p-4 flex flex-col gap-3"
        style={{ background: "rgba(20,17,12,0.7)", border: "1px solid rgba(212,168,86,0.08)" }}
      >
        <Skeleton className="h-3 w-28" />
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-8 w-full rounded-lg" />
        ))}
      </div>
    </div>
  );
}