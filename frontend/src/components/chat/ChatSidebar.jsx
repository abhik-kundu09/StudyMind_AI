import { useCallback, useRef, useState } from "react";
import {
  Plus, MessageSquare, Trash2, FileText,
  ChevronDown, Upload, Loader2, CheckCircle2,
  Clock, AlertCircle, X,
} from "lucide-react";
import useChatStore from "../../store/chatStore";

// ── Status badge ──────────────────────────────────────────────────────────────

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

// ── Drop zone ─────────────────────────────────────────────────────────────────

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
      className="relative flex cursor-pointer flex-col items-center justify-center gap-1.5 rounded-xl px-3 py-4 transition-all duration-200 select-none"
      style={{
        border: dragging ? "1px dashed rgba(212,168,86,0.6)" : "1px dashed rgba(212,168,86,0.18)",
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
          <Loader2 size={16} className="animate-spin" style={{ color: "#D4A856" }} />
          <p className="text-[10px]" style={{ color: "rgba(180,195,230,0.4)" }}>
            Uploading… {progress}%
          </p>
          <div className="h-0.5 w-full overflow-hidden rounded-full" style={{ background: "rgba(255,255,255,0.06)" }}>
            <div
              className="h-full rounded-full transition-all duration-200"
              style={{ width: `${progress}%`, background: "#D4A856" }}
            />
          </div>
        </>
      ) : (
        <>
          <Upload size={14} style={{ color: "rgba(212,168,86,0.5)" }} />
          <p className="text-[10px] text-center" style={{ color: "rgba(180,195,230,0.35)" }}>
            <span style={{ color: "rgba(212,168,86,0.7)" }}>Click</span> or drag PDF
          </p>
          <p className="text-[9px]" style={{ color: "rgba(180,195,230,0.2)" }}>Max 20 MB</p>
        </>
      )}
    </div>
  );
};

// ── Session item ──────────────────────────────────────────────────────────────

const SessionItem = ({ session, isActive, onClick, onDelete }) => {
  const [hover, setHover] = useState(false);

  return (
    <div
      className="group relative flex cursor-pointer items-center gap-2 rounded-xl px-3 py-2.5 transition-all duration-150"
      style={{
        background: isActive ? "rgba(212,168,86,0.08)" : hover ? "rgba(255,255,255,0.03)" : "transparent",
        border: isActive ? "1px solid rgba(212,168,86,0.2)" : "1px solid transparent",
      }}
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      <MessageSquare size={14} style={{ color: isActive ? "#D4A856" : "rgba(180,195,230,0.35)", flexShrink: 0 }} />
      <div className="flex-1 min-w-0">
        <p
          className="truncate text-xs font-medium leading-tight"
          style={{ color: isActive ? "#E2E8F8" : "rgba(180,195,230,0.6)" }}
        >
          {session.title || "New Chat"}
        </p>
        {session.document_name && (
          <p className="truncate text-[10px] mt-0.5" style={{ color: "rgba(212,168,86,0.4)" }}>
            {session.document_name}
          </p>
        )}
      </div>
      {(hover || isActive) && (
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(session.id); }}
          className="shrink-0 rounded-md p-1 transition-colors"
          style={{ color: "rgba(180,195,230,0.3)" }}
          onMouseEnter={(e) => (e.currentTarget.style.color = "#f87171")}
          onMouseLeave={(e) => (e.currentTarget.style.color = "rgba(180,195,230,0.3)")}
        >
          <Trash2 size={12} />
        </button>
      )}
    </div>
  );
};

// ── Main sidebar ──────────────────────────────────────────────────────────────
//
// Responsive behavior:
//  - Desktop (md: 768px+): static 256px sidebar, always visible
//  - Mobile  (< 768px): fixed drawer that slides in from the left,
//    triggered by `isOpen` prop, with a dark overlay behind it.
//    Closing happens via overlay click, X button, or after selecting
//    a session / starting a new chat / picking a document.

const ChatSidebar = ({
  onNewChat,
  onSelectSession,
  onDeleteSession,
  documents = [],
  uploading = false,
  uploadProgress = 0,
  onUploadDocument,
  onDeleteDocument,
  isOpen = false,
  onClose,
}) => {
  const [showDocs, setShowDocs] = useState(false);

  const sessions = useChatStore((s) => s.sessions);
  const activeSessionId = useChatStore((s) => s.activeSessionId);

  const handleDelete = useCallback(
    (docId, filename, e) => {
      e.stopPropagation();
      onDeleteDocument?.(docId, filename);
    },
    [onDeleteDocument]
  );

  // Wrap actions that should auto-close the drawer on mobile
  const handleNewChat = useCallback(
    (...args) => {
      onNewChat(...args);
      onClose?.();
    },
    [onNewChat, onClose]
  );

  const handleSelectSession = useCallback(
    (id) => {
      onSelectSession(id);
      onClose?.();
    },
    [onSelectSession, onClose]
  );

  return (
    <>
      {/* Mobile overlay — only rendered when drawer is open */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 md:hidden"
          style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(2px)" }}
          onClick={onClose}
        />
      )}

      <div
        className={`flex h-full w-64 shrink-0 flex-col fixed md:static inset-y-0 left-0 z-50 transition-transform duration-300 ease-out md:translate-x-0 ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
        style={{
          background: "rgba(10, 12, 28, 0.97)",
          borderRight: "1px solid rgba(212,168,86,0.08)",
        }}
      >
        {/* Header */}
        <div className="flex items-center gap-2 px-4 py-5">
          <div
            className="flex h-7 w-7 items-center justify-center rounded-lg text-xs font-bold"
            style={{ background: "linear-gradient(135deg, #D4A856, #E8B894)", color: "#0A0908" }}
          >
            S
          </div>
          <span className="text-sm font-semibold flex-1" style={{ color: "#E2E8F8" }}>
            StudyMind
          </span>
          {/* Close button — mobile only */}
          <button
            onClick={onClose}
            className="md:hidden rounded-lg p-1.5 transition-colors"
            style={{ color: "rgba(180,195,230,0.4)" }}
          >
            <X size={16} />
          </button>
        </div>

        {/* New Chat button */}
        <div className="px-3 pb-3">
          <button
            onClick={() => handleNewChat()}
            className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-xs font-medium transition-all duration-150"
            style={{ background: "rgba(212,168,86,0.06)", border: "1px solid rgba(212,168,86,0.18)", color: "#D4A856" }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(212,168,86,0.12)")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "rgba(212,168,86,0.06)")}
          >
            <Plus size={14} />
            New Chat
          </button>
        </div>

        {/* Documents section */}
        <div className="px-3 pb-2">
          <button
            onClick={() => setShowDocs((v) => !v)}
            className="flex w-full items-center justify-between rounded-lg px-2 py-1.5 text-[11px] font-medium transition-colors"
            style={{ color: "rgba(212,168,86,0.5)" }}
            onMouseEnter={(e) => (e.currentTarget.style.color = "rgba(212,168,86,0.8)")}
            onMouseLeave={(e) => (e.currentTarget.style.color = "rgba(212,168,86,0.5)")}
          >
            <span className="flex items-center gap-1.5">
              <FileText size={11} />
              Documents {documents.length > 0 && `(${documents.length})`}
            </span>
            <ChevronDown
              size={11}
              style={{ transform: showDocs ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s" }}
            />
          </button>

          {showDocs && (
            <div className="mt-2 space-y-2">
              <DropZone onFile={onUploadDocument} uploading={uploading} progress={uploadProgress} />

              {documents.length > 0 && (
                <div className="space-y-0.5">
                  {documents.map((doc) => {
                    const isReady = doc.status === "ready";
                    return (
                      <div
                        key={doc.id}
                        className="group flex items-center gap-2 rounded-lg px-2 py-1.5 transition-colors"
                        style={{ background: "rgba(255,255,255,0.02)" }}
                      >
                        <button
                          onClick={() => isReady && handleNewChat(doc.id, doc.filename)}
                          disabled={!isReady}
                          className="flex flex-1 min-w-0 items-start gap-2 text-left"
                          title={isReady ? `Chat with ${doc.filename}` : doc.status}
                        >
                          <FileText
                            size={10}
                            className="mt-0.5 shrink-0"
                            style={{ color: isReady ? "rgba(212,168,86,0.5)" : "rgba(180,195,230,0.2)" }}
                          />
                          <div className="min-w-0">
                            <p
                              className="truncate text-[11px] leading-tight"
                              style={{ color: isReady ? "rgba(180,195,230,0.7)" : "rgba(180,195,230,0.35)" }}
                            >
                              {doc.filename}
                            </p>
                            <StatusBadge status={doc.status} />
                          </div>
                        </button>

                        <button
                          onClick={(e) => handleDelete(doc.id, doc.filename, e)}
                          className="hidden shrink-0 rounded p-0.5 transition-colors group-hover:flex"
                          style={{ color: "rgba(180,195,230,0.25)" }}
                          onMouseEnter={(e) => (e.currentTarget.style.color = "#f87171")}
                          onMouseLeave={(e) => (e.currentTarget.style.color = "rgba(180,195,230,0.25)")}
                          title="Delete"
                        >
                          <X size={11} />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}

              {documents.length === 0 && !uploading && (
                <p className="text-center text-[10px] py-1" style={{ color: "rgba(180,195,230,0.2)" }}>
                  No documents yet
                </p>
              )}
            </div>
          )}
        </div>

        {/* Divider */}
        <div className="mx-4 mb-2" style={{ borderTop: "1px solid rgba(212,168,86,0.06)" }} />

        <p className="px-4 pb-1 text-[10px] font-medium uppercase tracking-widest" style={{ color: "rgba(212,168,86,0.3)" }}>
          Recent
        </p>

        {/* Session list */}
        <div className="flex-1 overflow-y-auto px-2 pb-4 space-y-0.5">
          {sessions.length === 0 && (
            <p className="px-3 py-6 text-center text-xs" style={{ color: "rgba(180,195,230,0.25)" }}>
              No chats yet. Start one above.
            </p>
          )}
          {sessions.map((session) => (
            <SessionItem
              key={session.id}
              session={session}
              isActive={session.id === activeSessionId}
              onClick={() => handleSelectSession(session.id)}
              onDelete={onDeleteSession}
            />
          ))}
        </div>
      </div>
    </>
  );
};

export default ChatSidebar;