// components/ui/Skeleton.jsx — Noir Gold shimmer skeleton primitive
// Usage: <Skeleton className="h-8 w-32 rounded-xl" />
//        <Skeleton variant="text" lines={3} />

const shimmerStyle = {
  background: "linear-gradient(90deg, rgba(20,17,12,0.6) 25%, rgba(212,168,86,0.07) 50%, rgba(20,17,12,0.6) 75%)",
  backgroundSize: "800px 100%",
  animation: "skeletonShimmer 1.8s ease-in-out infinite",
  border: "1px solid rgba(212,168,86,0.08)",
};

export default function Skeleton({ className = "", style = {}, variant = "block", lines = 1 }) {
  if (variant === "text") {
    return (
      <div className={`flex flex-col gap-2 ${className}`}>
        <style>{`
          @keyframes skeletonShimmer {
            0%   { background-position: -800px 0 }
            100% { background-position:  800px 0 }
          }
        `}</style>
        {Array.from({ length: lines }).map((_, i) => (
          <div
            key={i}
            className="h-3 rounded-md"
            style={{
              ...shimmerStyle,
              width: i === lines - 1 && lines > 1 ? "65%" : "100%",
            }}
          />
        ))}
      </div>
    );
  }

  return (
    <>
      <style>{`
        @keyframes skeletonShimmer {
          0%   { background-position: -800px 0 }
          100% { background-position:  800px 0 }
        }
      `}</style>
      <div
        className={`rounded-xl ${className}`}
        style={{ ...shimmerStyle, ...style }}
      />
    </>
  );
}