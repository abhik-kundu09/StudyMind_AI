const SourceCard = ({ sources }) => {
  if (!sources || sources.length === 0) return null;

  return (
    <div className="mt-3 flex flex-wrap gap-2">
      {sources.map((src, i) => (
        <div
          key={i}
          className="group flex items-start gap-2 rounded-xl border px-3 py-2 text-xs transition-all duration-200 cursor-default w-full max-w-[260px] sm:max-w-[280px] sm:w-auto"
          style={{
            background: "rgba(0, 242, 254, 0.04)",
            borderColor: "rgba(0, 242, 254, 0.18)",
          }}
          title={src.text}
        >
          {/* Page badge */}
          <span
            className="mt-0.5 shrink-0 rounded-md px-1.5 py-0.5 font-mono text-[10px] font-medium"
            style={{
              background: "rgba(0, 242, 254, 0.12)",
              color: "#D4A856",
            }}
          >
            {src.page != null ? `p.${src.page}` : "src"}
          </span>

          {/* Preview text */}
          <span
            className="line-clamp-2 leading-relaxed"
            style={{ color: "rgba(180, 195, 230, 0.6)" }}
          >
            {src.text?.slice(0, 100)}
            {src.text?.length > 100 ? "…" : ""}
          </span>
        </div>
      ))}
    </div>
  );
};

export default SourceCard;