// components/ui/skeletons/QuestionSkeleton.jsx
import Skeleton from "../Skeleton";

export default function QuestionSkeleton() {
  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-1.5">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-3 w-20" />
        </div>
        <Skeleton className="h-7 w-7 rounded-lg" />
      </div>
      <Skeleton className="h-1 w-full rounded-full" />
      <div
        className="rounded-2xl p-6 flex flex-col gap-5"
        style={{ background: "rgba(20,17,12,0.7)", border: "1px solid rgba(212,168,86,0.08)" }}
      >
        <Skeleton className="h-3 w-20" />
        <div className="flex flex-col gap-1">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-4/5" />
        </div>
        <div className="flex flex-col gap-2 mt-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full rounded-xl" />
          ))}
        </div>
      </div>
      <div className="flex items-center justify-between gap-3">
        <Skeleton className="h-10 w-24 rounded-xl" />
        <Skeleton className="h-10 flex-1 rounded-xl" />
      </div>
    </div>
  );
}