// components/dashboard/DocumentHub.jsx
import { useCallback, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Upload, Loader2, CheckCircle2, Clock, AlertCircle, X, FileText, Sparkles,
} from "lucide-react";

const STATUS_META = {
  pending:    { label: "Queued",     Icon: Clock,        color: "rgba(250,204,21,0.8)" },
  processing: { label: "Processing", Icon: Loader2,      color: "rgba(212,168,86,0.8)", spin: true },
  ready:      { label: "Ready",      Icon: CheckCircle2, color: "rgba(52,211,153,0.8)" },
  failed:     { label: "Failed",     Icon: AlertCircle,  color: "rgba(248,113,113,0.8)" },
};

const StatusBadge = ({ status }) => {
  const meta = STATUS_META[status] ?? STATUS_META.pending;
  return (
    <span className="inline-flex items-center gap-1 text-[9px] font-medium" style={{ color: meta.color }}>
      <meta.Icon size={9} className={meta.spin ? "animate-spin" : ""} />
      {meta.label}
    </span>
  );
};

const DropZone = ({ onFile, uploading, progress }) => {
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef(null);

  const handleDrop = useCallback(
    (e) => {
      e.preventDefault();
      setDragging(false);
      const file = e.dataTransfer.files?.[0];
      if (file) onFile(file);
    },
    [onFile]
  );

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
      onClick={() => !uploading && inputRef.current?.click()}
      className="relative flex cursor-pointer flex-col items-center justify-center gap-1.5 rounded-xl px-3 py-6 transition-all duration-200 select-none"
      style={{
        border: dragging ? "1.5px dashed rgba(212,168,86,0.6)" : "1.5px dashed rgba(212,168,86,0.22)",
        background: dragging ? "rgba(212,168,86,0.05)" : "rgba(255,255,255,0.015)",
        pointerEvents: uploading ? "none" : "auto",
        opacity: uploading ? 0.8 : 1,
      }}
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
          <Loader2 size={18} className="animate-spin" style={{ color: "#D4A856" }} />
          <p className="text-[11px]" style={{ color: "rgba(180,195,230,0.4)" }}>Uploading… {progress}%</p>
          <div className="h-0.5 w-full max-w-[160px] overflow-hidden rounded-full" style={{ background: "rgba(255,255,255,0.06)" }}>
            <div className="h-full rounded-full transition-all duration-200" style={{ width: `${progress}%`, background: "#D4A856" }} />
          </div>
        </>
      ) : (
        <>
          <Upload size={18} style={{ color: "rgba(212,168,86,0.5)" }} />
          <p className="text-xs text-center" style={{ color: "rgba(180,195,230,0.4)" }}>
            <span style={{ color: "rgba(212,168,86,0.7)" }}>Click</span> or drag a PDF
          </p>
          <p className="text-[10px]" style={{ color: "rgba(180,195,230,0.2)" }}>Max 20 MB</p>
        </>
      )}
    </div>
  );
};

const DocumentHub = ({ docsState, onGenerateQuiz }) => {
  const { documents, loading, uploading, uploadProgress, upload, remove } = docsState;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xs font-semibold uppercase tracking-widest" style={{ color: "rgba(212,168,86,0.5)" }}>
          Document Hub
        </h2>
        {documents.length > 0 && (
          <span className="text-[11px]" style={{ color: "rgba(180,195,230,0.35)" }}>
            {documents.length} document{documents.length !== 1 ? "s" : ""}
          </span>
        )}
      </div>

      <DropZone onFile={upload} uploading={uploading} progress={uploadProgress} />

      <div className="flex flex-col gap-2">
        {loading && (
          <p className="text-xs py-3 text-center" style={{ color: "rgba(180,195,230,0.3)" }}>
            Loading documents…
          </p>
        )}
        {!loading && documents.length === 0 && (
          <p className="text-xs py-3 text-center" style={{ color: "rgba(180,195,230,0.3)" }}>
            No documents yet. Upload a PDF to get started.
          </p>
        )}

        <AnimatePresence>
          {documents.map((doc, idx) => {
            const isReady = doc.status === "ready";
            return (
              <motion.div
                key={doc.id}
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 12, transition: { duration: 0.2 } }}
                transition={{ delay: idx * 0.06, duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                className="group flex items-center gap-3 rounded-xl px-3 py-2.5"
                style={{ background: "rgba(20,17,12,0.7)", border: "1px solid rgba(212,168,86,0.12)" }}
              >
                <FileText
                  size={14}
                  className="shrink-0"
                  style={{ color: isReady ? "rgba(212,168,86,0.6)" : "rgba(180,195,230,0.25)" }}
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-medium" style={{ color: isReady ? "#E2E8F8" : "rgba(180,195,230,0.4)" }}>
                    {doc.filename}
                  </p>
                  <StatusBadge status={doc.status} />
                </div>
                {isReady && (
                  <button
                    onClick={() => onGenerateQuiz(doc.id)}
                    className="shrink-0 flex items-center gap-1 rounded-lg px-2 py-1.5 text-[10px] font-medium transition-all cursor-pointer hover:opacity-80"
                    style={{ background: "rgba(212,168,86,0.1)", color: "#D4A856" }}
                    title="Generate a quiz from this document"
                  >
                    <Sparkles size={10} />
                    Quiz
                  </button>
                )}
                <button
                  onClick={() => remove(doc.id, doc.filename)}
                  className="hidden shrink-0 rounded p-1 transition-colors group-hover:flex cursor-pointer"
                  style={{ color: "rgba(180,195,230,0.25)" }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = "#f87171")}
                  onMouseLeave={(e) => (e.currentTarget.style.color = "rgba(180,195,230,0.25)")}
                  title="Delete"
                >
                  <X size={12} />
                </button>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default DocumentHub;