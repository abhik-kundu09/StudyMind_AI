// components/ui/skeletons/DocumentHubSkeleton.jsx
import Skeleton from "../Skeleton";

export default function DocumentHubSkeleton() {
  return (
    <div className="flex flex-col gap-4">
      <Skeleton className="h-4 w-28" />
      <Skeleton className="h-24 w-full rounded-xl" />
      <div className="flex flex-col gap-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="flex items-center gap-3 rounded-xl px-3 py-2.5"
            style={{ background: "rgba(20,17,12,0.7)", border: "1px solid rgba(212,168,86,0.08)" }}
          >
            <Skeleton className="h-4 w-4 shrink-0 rounded" />
            <div className="flex-1 flex flex-col gap-1.5">
              <Skeleton className="h-3 w-3/4" />
              <Skeleton className="h-2 w-12" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}