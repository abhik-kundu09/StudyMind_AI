// frontend/src/components/DocumentSidebar.jsx
import { useCallback, useRef, useState } from "react";
import { FileText, Trash2, Upload, X, CheckCircle2, Clock, AlertCircle, Loader2, ChevronRight } from "lucide-react";
import { useDocuments } from "../hooks/useDocuments";

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatBytes(bytes) {
  if (!bytes) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

const STATUS_META = {
  pending:    { label: "Queued",     icon: Clock,       color: "text-yellow-400",  bg: "bg-yellow-400/10" },
  processing: { label: "Processing", icon: Loader2,     color: "text-cyan-400",    bg: "bg-cyan-400/10",  spin: true },
  ready:      { label: "Ready",      icon: CheckCircle2,color: "text-emerald-400", bg: "bg-emerald-400/10" },
  failed:     { label: "Failed",     icon: AlertCircle, color: "text-red-400",     bg: "bg-red-400/10" },
};

function StatusBadge({ status }) {
  const meta  = STATUS_META[status] ?? STATUS_META.pending;
  const Icon  = meta.icon;
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium tracking-wide ${meta.color} ${meta.bg}`}>
      <Icon size={10} className={meta.spin ? "animate-spin" : ""} />
      {meta.label}
    </span>
  );
}

// ── Drop zone ─────────────────────────────────────────────────────────────────

function DropZone({ onFile, uploading, progress }) {
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef(null);

  const handleDrop = useCallback(
    (e) => {
      e.preventDefault();
      setDragging(false);
      const file = e.dataTransfer.files?.[0];
      if (file) onFile(file);
    },
    [onFile],
  );

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
      onClick={() => !uploading && inputRef.current?.click()}
      className={[
        "relative flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed px-4 py-6 transition-all duration-200 select-none",
        dragging
          ? "border-cyan-400 bg-cyan-400/5 shadow-[0_0_20px_rgba(0,242,254,0.08)]"
          : "border-white/10 bg-white/[0.02] hover:border-cyan-400/40 hover:bg-white/[0.04]",
        uploading ? "pointer-events-none opacity-60" : "",
      ].join(" ")}
    >
      <input
        ref={inputRef}
        type="file"
        accept="application/pdf"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onFile(file);
          e.target.value = "";
        }}
      />

      {uploading ? (
        <>
          <Loader2 size={22} className="animate-spin text-cyan-400" />
          <p className="text-xs text-white/50">Uploading… {progress}%</p>
          {/* Progress bar */}
          <div className="h-0.5 w-full overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full rounded-full bg-cyan-400 transition-all duration-200"
              style={{ width: `${progress}%` }}
            />
          </div>
        </>
      ) : (
        <>
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-cyan-400/10">
            <Upload size={16} className="text-cyan-400" />
          </div>
          <p className="text-center text-xs text-white/50">
            <span className="text-cyan-400">Click to upload</span> or drag &amp; drop
          </p>
          <p className="text-[10px] text-white/25">PDF only · max 20 MB</p>
        </>
      )}
    </div>
  );
}

// ── Document row ──────────────────────────────────────────────────────────────

function DocRow({ doc, selected, onSelect, onDelete }) {
  const isReady = doc.status === "ready";

  return (
    <div
      onClick={() => isReady && onSelect(doc)}
      className={[
        "group relative flex items-start gap-3 rounded-xl p-3 transition-all duration-150",
        isReady ? "cursor-pointer" : "cursor-default",
        selected
          ? "bg-cyan-400/10 ring-1 ring-cyan-400/30"
          : isReady
          ? "hover:bg-white/[0.04]"
          : "opacity-60",
      ].join(" ")}
    >
      {/* Icon */}
      <div className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${selected ? "bg-cyan-400/20" : "bg-white/[0.06]"}`}>
        <FileText size={14} className={selected ? "text-cyan-400" : "text-white/40"} />
      </div>

      {/* Info */}
      <div className="min-w-0 flex-1">
        <p className="truncate text-xs font-medium text-white/80" title={doc.filename}>
          {doc.filename}
        </p>
        <div className="mt-1 flex items-center gap-2">
          <StatusBadge status={doc.status} />
          <span className="text-[10px] text-white/30">{formatBytes(doc.file_size)}</span>
          {doc.page_count > 0 && (
            <span className="text-[10px] text-white/30">{doc.page_count}p</span>
          )}
        </div>
      </div>

      {/* Selected indicator */}
      {selected && (
        <ChevronRight size={14} className="mt-1 shrink-0 text-cyan-400" />
      )}

      {/* Delete — shown on hover */}
      <button
        onClick={(e) => { e.stopPropagation(); onDelete(doc.id, doc.filename); }}
        className="absolute right-2 top-2 hidden rounded-md p-1 text-white/30 transition hover:bg-red-500/10 hover:text-red-400 group-hover:flex"
        title="Delete document"
      >
        <Trash2 size={12} />
      </button>
    </div>
  );
}

// ── Main sidebar ──────────────────────────────────────────────────────────────

/**
 * DocumentSidebar
 *
 * Props:
 *   selectedDocId  — currently attached document id (string | null)
 *   onSelect       — (doc | null) => void  called when user picks / deselects a doc
 *   onClose        — () => void  called when sidebar close button is pressed (mobile)
 *   className      — extra classes for the outer wrapper
 */
export default function DocumentSidebar({
  selectedDocId,
  onSelect,
  onClose,
  className = "",
}) {
  const { documents, loading, uploading, uploadProgress, upload, remove } =
    useDocuments();

  const handleSelect = useCallback(
    (doc) => {
      // Toggle — clicking the already-selected doc deselects it
      onSelect?.(selectedDocId === doc.id ? null : doc.id);
    },
    [selectedDocId, onSelect],
  );

  const readyDocs    = documents.filter((d) => d.status === "ready");
  const pendingDocs  = documents.filter((d) => ["pending", "processing"].includes(d.status));
  const failedDocs   = documents.filter((d) => d.status === "failed");

  return (
    <aside
      className={[
        "flex h-full w-72 shrink-0 flex-col border-r border-white/[0.06] bg-[#0D0F1C]",
        className,
      ].join(" ")}
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/[0.06] px-4 py-4">
        <div>
          <h2 className="text-sm font-semibold text-white/80 tracking-wide">Documents</h2>
          <p className="text-[10px] text-white/30 mt-0.5">
            {readyDocs.length} ready · {documents.length} total
          </p>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-white/30 transition hover:bg-white/[0.06] hover:text-white/60"
          >
            <X size={14} />
          </button>
        )}
      </div>

      {/* Drop zone */}
      <div className="px-3 pt-3">
        <DropZone
          onFile={upload}
          uploading={uploading}
          progress={uploadProgress}
        />
      </div>

      {/* Active selection callout */}
      {selectedDocId && (
        <div className="mx-3 mt-3 flex items-center justify-between rounded-lg bg-cyan-400/10 px-3 py-2 ring-1 ring-cyan-400/20">
          <p className="text-[10px] text-cyan-400">
            Document attached to chat
          </p>
          <button
            onClick={() => onSelect?.(null)}
            className="text-[10px] text-cyan-400/60 underline underline-offset-2 hover:text-cyan-400"
          >
            Remove
          </button>
        </div>
      )}

      {/* Document list */}
      <div className="mt-3 flex-1 overflow-y-auto px-2 pb-4 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-white/10">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 size={18} className="animate-spin text-white/20" />
          </div>
        ) : documents.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 py-12 text-center">
            <FileText size={28} className="text-white/10" />
            <p className="text-xs text-white/30">No documents yet</p>
            <p className="text-[10px] text-white/20">Upload a PDF to get started</p>
          </div>
        ) : (
          <div className="space-y-1">
            {/* Ready */}
            {readyDocs.length > 0 && (
              <>
                <p className="px-2 pb-1 pt-2 text-[10px] font-medium uppercase tracking-widest text-white/20">
                  Ready
                </p>
                {readyDocs.map((doc) => (
                  <DocRow
                    key={doc.id}
                    doc={doc}
                    selected={selectedDocId === doc.id}
                    onSelect={handleSelect}
                    onDelete={remove}
                  />
                ))}
              </>
            )}

            {/* Processing */}
            {pendingDocs.length > 0 && (
              <>
                <p className="px-2 pb-1 pt-3 text-[10px] font-medium uppercase tracking-widest text-white/20">
                  Processing
                </p>
                {pendingDocs.map((doc) => (
                  <DocRow
                    key={doc.id}
                    doc={doc}
                    selected={false}
                    onSelect={() => {}}
                    onDelete={remove}
                  />
                ))}
              </>
            )}

            {/* Failed */}
            {failedDocs.length > 0 && (
              <>
                <p className="px-2 pb-1 pt-3 text-[10px] font-medium uppercase tracking-widest text-white/20">
                  Failed
                </p>
                {failedDocs.map((doc) => (
                  <DocRow
                    key={doc.id}
                    doc={doc}
                    selected={false}
                    onSelect={() => {}}
                    onDelete={remove}
                  />
                ))}
              </>
            )}
          </div>
        )}
      </div>
    </aside>
  );
}