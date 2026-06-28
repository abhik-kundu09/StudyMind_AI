// components/dashboard/QuizGenerateModal.jsx
import { useEffect, useState } from "react";
import { X, Sparkles, AlertCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import ModalPortal from "../ui/ModalPortal";

const DIFFICULTIES = [
  { value: "easy",   label: "Easy"   },
  { value: "medium", label: "Medium" },
  { value: "hard",   label: "Hard"   },
  { value: "mixed",  label: "Mixed"  },
];

const overlayVariants = {
  hidden:  { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.25 } },
  exit:    { opacity: 0, transition: { duration: 0.2 } },
};

const modalVariants = {
  hidden:  { opacity: 0, scale: 0.94, y: 16, filter: "blur(4px)" },
  visible: {
    opacity: 1, scale: 1, y: 0, filter: "blur(0px)",
    transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] },
  },
  exit: {
    opacity: 0, scale: 0.97, y: 8, filter: "blur(2px)",
    transition: { duration: 0.22, ease: [0.55, 0, 1, 0.45] },
  },
};

const QuizGenerateModal = ({
  open,
  onClose,
  documents,
  quizState,
  onReady,
  preselectedDocId = null,
}) => {
  const [docId,         setDocId]         = useState("");
  const [difficulty,    setDifficulty]    = useState("medium");
  const [questionCount, setQuestionCount] = useState(10);

  const { phase, errorMessage, generate, quiz } = quizState;

  useEffect(() => {
    if (open) setDocId(preselectedDocId ?? "");
  }, [open, preselectedDocId]);

  useEffect(() => {
    if (open && phase === "ready" && quiz) onReady(quiz);
  }, [open, phase, quiz, onReady]);

  const readyDocuments = documents.filter((d) => d.status === "ready");
  const isGenerating   = phase === "generating";

  const handleGenerate = () => {
    if (!docId) return;
    generate(docId, questionCount, difficulty);
  };

  return (
    <ModalPortal>
      <AnimatePresence>
        {open && (
          <motion.div
            key="quiz-modal-overlay"
            style={{
              position: "fixed", inset: 0, zIndex: 9999,
              display: "flex", alignItems: "center", justifyContent: "center",
              padding: "1rem", background: "rgba(0,0,0,0.75)",
            }}
            variants={overlayVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            onClick={isGenerating ? undefined : onClose}
          >
            <div style={{ position: "absolute", inset: 0, backdropFilter: "blur(6px)" }} />

            <motion.div
              key="quiz-modal-content"
              style={{
                position: "relative", width: "100%", maxWidth: "448px",
                borderRadius: "1rem", padding: "1.5rem",
                background: "rgba(14,12,10,0.98)",
                border: "1px solid rgba(212,168,86,0.22)",
                boxShadow: "0 0 80px rgba(212,168,86,0.08), 0 32px 64px rgba(0,0,0,0.6)",
              }}
              variants={modalVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              onClick={(e) => e.stopPropagation()}
            >
              <div style={{ position: "absolute", top: 0, left: "2rem", right: "2rem", height: "1px", background: "linear-gradient(90deg, transparent, rgba(212,168,86,0.6), transparent)" }} />

              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.25rem" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <Sparkles size={16} style={{ color: "#D4A856" }} />
                  <h2 style={{ fontSize: "0.875rem", fontWeight: 600, color: "#F0E6D2" }}>Generate Quiz</h2>
                </div>
                {!isGenerating && (
                  <button onClick={onClose} className="rounded-lg p-1 transition-colors cursor-pointer hover:opacity-80" style={{ color: "rgba(180,195,230,0.4)" }}>
                    <X size={16} />
                  </button>
                )}
              </div>

              {isGenerating ? (
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "1rem", padding: "2.5rem 0" }}>
                  <div style={{ position: "relative" }}>
                    <div style={{ height: 56, width: 56, borderRadius: "50%", border: "2px solid rgba(212,168,86,0.1)", borderTop: "2px solid #D4A856", animation: "spin 1s linear infinite" }} />
                    <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
                    <Sparkles size={14} style={{ color: "#D4A856", position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)" }} />
                  </div>
                  <p style={{ fontSize: "0.875rem", fontWeight: 500, color: "#F0E6D2" }}>Generating your quiz…</p>
                  <p style={{ fontSize: "0.75rem", textAlign: "center", color: "rgba(180,195,230,0.4)" }}>
                    Analysing document and crafting questions
                  </p>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                  {phase === "failed" && errorMessage && (
                    <div style={{ display: "flex", alignItems: "flex-start", gap: "0.5rem", borderRadius: "0.75rem", padding: "0.625rem 0.75rem", fontSize: "0.75rem", background: "rgba(248,113,113,0.08)", color: "#f87171" }}>
                      <AlertCircle size={14} style={{ marginTop: 2, flexShrink: 0 }} />
                      {errorMessage}
                    </div>
                  )}

                  <div style={{ display: "flex", flexDirection: "column", gap: "0.375rem" }}>
                    <label style={{ fontSize: "0.75rem", fontWeight: 500, color: "rgba(180,195,230,0.6)" }}>Source document</label>
                    {readyDocuments.length === 0 ? (
                      <p style={{ fontSize: "0.75rem", color: "rgba(180,195,230,0.35)" }}>
                        No ready documents yet. Upload one from the Document Hub first.
                      </p>
                    ) : (
                      <select
                        value={docId}
                        onChange={(e) => setDocId(e.target.value)}
                        className="cursor-pointer"
                        style={{ width: "100%", borderRadius: "0.75rem", padding: "0.625rem 0.75rem", fontSize: "0.875rem", outline: "none", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(212,168,86,0.15)", color: "#E2E8F8" }}
                      >
                        <option value="" style={{ background: "#0A0908" }}>Select a document…</option>
                        {readyDocuments.map((d) => (
                          <option key={d.id} value={d.id} style={{ background: "#0A0908" }}>{d.filename}</option>
                        ))}
                      </select>
                    )}
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", gap: "0.375rem" }}>
                    <label style={{ fontSize: "0.75rem", fontWeight: 500, color: "rgba(180,195,230,0.6)" }}>Difficulty</label>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "0.5rem" }}>
                      {DIFFICULTIES.map((d) => (
                        <button
                          key={d.value}
                          onClick={() => setDifficulty(d.value)}
                          className="cursor-pointer"
                          style={{
                            borderRadius: "0.5rem", padding: "0.375rem 0", fontSize: "0.75rem", fontWeight: 500, transition: "all 0.15s",
                            background: difficulty === d.value ? "rgba(212,168,86,0.15)" : "rgba(255,255,255,0.02)",
                            border: difficulty === d.value ? "1px solid rgba(212,168,86,0.4)" : "1px solid rgba(212,168,86,0.1)",
                            color: difficulty === d.value ? "#D4A856" : "rgba(180,195,230,0.5)",
                          }}
                        >
                          {d.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", gap: "0.375rem" }}>
                    <label style={{ fontSize: "0.75rem", fontWeight: 500, color: "rgba(180,195,230,0.6)" }}>
                      Questions: <span style={{ color: "#D4A856" }}>{questionCount}</span>
                    </label>
                    <input
                      type="range"
                      min={3}
                      max={20}
                      value={questionCount}
                      onChange={(e) => setQuestionCount(Number(e.target.value))}
                      className="w-full accent-[#D4A856]"
                    />
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "10px", color: "rgba(180,195,230,0.3)" }}>
                      <span>3</span><span>20</span>
                    </div>
                  </div>

                  <button
                    onClick={handleGenerate}
                    disabled={!docId}
                    className="cursor-pointer active:scale-95"
                    style={{
                      marginTop: "0.25rem", display: "flex", width: "100%", alignItems: "center",
                      justifyContent: "center", gap: "0.5rem", borderRadius: "0.75rem",
                      padding: "0.625rem 0", fontSize: "0.875rem", fontWeight: 500, transition: "all 0.15s",
                      background: docId ? "linear-gradient(135deg, #D4A856, #E8B894)" : "rgba(212,168,86,0.08)",
                      color: docId ? "#0A0908" : "rgba(212,168,86,0.3)",
                      opacity: !docId ? 0.4 : 1, cursor: !docId ? "not-allowed" : "pointer",
                    }}
                  >
                    <Sparkles size={14} />
                    Generate Quiz
                  </button>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </ModalPortal>
  );
};

export default QuizGenerateModal;