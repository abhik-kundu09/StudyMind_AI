// pages/Flashcards/index.jsx
import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  BookOpen, ChevronLeft, RotateCcw, Layers, Zap,
  CheckCircle, XCircle, Clock, Trash2, Plus, ArrowRight, Trophy,
} from "lucide-react";
import { useFlashcards } from "../../hooks/useFlashcards";
import { useDocuments } from "../../hooks/useDocuments";
import AppFooter from "../../components/AppFooter";
import DeckSkeleton from "../../components/ui/skeletons/DeckSkeleton";
import ModalPortal from "../../components/ui/ModalPortal";

const QUALITY_OPTIONS = [
  { score: 0, label: "Blackout", color: "#EF4444", bg: "rgba(239,68,68,0.12)"   },
  { score: 2, label: "Hard",     color: "#F97316", bg: "rgba(249,115,22,0.12)"  },
  { score: 3, label: "Good",     color: "#C0C0C8", bg: "rgba(192,192,200,0.12)" },
  { score: 4, label: "Easy",     color: "#D4A856", bg: "rgba(212,168,86,0.12)"  },
  { score: 5, label: "Perfect",  color: "#E8B894", bg: "rgba(232,184,148,0.12)" },
];

const deckGridVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08, delayChildren: 0.05 } },
};

const deckCardVariants = {
  hidden:  { opacity: 0, y: 20, scale: 0.96 },
  visible: { opacity: 1, y: 0,  scale: 1,    transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] } },
};

function FlipCard({ front, back, flipped, onFlip }) {
  return (
    <motion.div
      onClick={onFlip}
      style={{ perspective: "1200px", cursor: "pointer" }}
      className="w-full"
      whileHover={{ scale: 1.01 }}
      transition={{ duration: 0.2 }}
    >
      <motion.div
        animate={{ rotateY: flipped ? 180 : 0 }}
        transition={{ duration: 0.55, ease: [0.4, 0, 0.2, 1] }}
        style={{ position: "relative", width: "100%", minHeight: "260px", transformStyle: "preserve-3d" }}
      >
        <div style={{ position: "absolute", inset: 0, backfaceVisibility: "hidden", WebkitBackfaceVisibility: "hidden", background: "rgba(20,17,12,0.85)", border: "1px solid rgba(212,168,86,0.25)", borderRadius: "20px", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "2rem", backdropFilter: "blur(12px)", boxShadow: "0 0 40px rgba(212,168,86,0.08)" }}>
          <span style={{ fontSize: "10px", letterSpacing: "3px", color: "#D4A856", textTransform: "uppercase", marginBottom: "1.5rem", opacity: 0.7 }}>Question</span>
          <p style={{ color: "#F0E6D2", fontSize: "1.15rem", fontWeight: 500, textAlign: "center", lineHeight: 1.6 }}>{front}</p>
          <span style={{ marginTop: "2rem", fontSize: "12px", color: "rgba(212,168,86,0.5)", letterSpacing: "1px" }}>tap to reveal →</span>
        </div>
        <div style={{ position: "absolute", inset: 0, backfaceVisibility: "hidden", WebkitBackfaceVisibility: "hidden", transform: "rotateY(180deg)", background: "rgba(20,17,12,0.92)", border: "1px solid rgba(232,184,148,0.3)", borderRadius: "20px", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "2rem", backdropFilter: "blur(12px)", boxShadow: "0 0 40px rgba(232,184,148,0.12)" }}>
          <span style={{ fontSize: "10px", letterSpacing: "3px", color: "#E8B894", textTransform: "uppercase", marginBottom: "1.5rem", opacity: 0.7 }}>Answer</span>
          <p style={{ color: "#F0E6D2", fontSize: "1.05rem", textAlign: "center", lineHeight: 1.75 }}>{back}</p>
        </div>
      </motion.div>
    </motion.div>
  );
}

function DeckCard({ deck, onStudy, onDelete }) {
  return (
    <motion.div
      variants={deckCardVariants}
      whileHover={{ borderColor: "rgba(212,168,86,0.45)", boxShadow: "0 0 28px rgba(212,168,86,0.1)", transition: { duration: 0.2 } }}
      style={{ background: "rgba(20,17,12,0.7)", border: "1px solid rgba(212,168,86,0.15)", borderRadius: "16px", padding: "1.25rem 1.5rem", backdropFilter: "blur(12px)", display: "flex", flexDirection: "column", gap: "0.75rem" }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "0.5rem" }}>
        <p style={{ color: "#F0E6D2", fontWeight: 600, fontSize: "0.95rem", lineHeight: 1.4 }}>{deck.doc_name}</p>
        <button onClick={() => onDelete(deck.doc_id)} style={{ color: "rgba(239,68,68,0.5)", background: "none", border: "none", padding: "2px", flexShrink: 0 }} className="cursor-pointer hover:opacity-80">
          <Trash2 size={14} />
        </button>
      </div>
      <div style={{ display: "flex", gap: "1rem" }}>
        <span style={{ fontSize: "12px", color: "#C0C0C8" }}><span style={{ color: "#D4A856", fontWeight: 600 }}>{deck.total}</span> cards</span>
        {deck.due > 0 && <span style={{ fontSize: "12px", color: "#E8B894" }}><span style={{ fontWeight: 600 }}>{deck.due}</span> due</span>}
      </div>
      <motion.button
        onClick={() => onStudy(deck.doc_id)}
        disabled={deck.due === 0}
        whileTap={deck.due > 0 ? { scale: 0.97 } : {}}
        style={{ background: deck.due > 0 ? "rgba(212,168,86,0.1)" : "rgba(255,255,255,0.03)", border: `1px solid ${deck.due > 0 ? "rgba(212,168,86,0.4)" : "rgba(255,255,255,0.06)"}`, borderRadius: "10px", padding: "0.5rem 1rem", color: deck.due > 0 ? "#D4A856" : "rgba(255,255,255,0.2)", fontSize: "13px", fontWeight: 500, display: "flex", alignItems: "center", gap: "6px", justifyContent: "center" }}
        className={deck.due > 0 ? "cursor-pointer hover:opacity-80" : ""}
      >
        {deck.due > 0 ? <><Zap size={13} /> Study {deck.due} due</> : <><CheckCircle size={13} /> All caught up</>}
      </motion.button>
    </motion.div>
  );
}

function SessionComplete({ reviewed, onBack }) {
  return (
    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }} style={{ textAlign: "center", padding: "4rem 2rem", maxWidth: "480px", margin: "0 auto" }}>
      <motion.div initial={{ scale: 0.7, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 0.15, duration: 0.5, ease: [0.22, 1, 0.36, 1] }} style={{ width: 72, height: 72, borderRadius: "50%", background: "rgba(212,168,86,0.12)", border: "2px solid rgba(212,168,86,0.4)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 1.5rem" }}>
        <Trophy size={32} color="#D4A856" />
      </motion.div>
      <h2 style={{ color: "#F0E6D2", fontSize: "1.5rem", fontWeight: 700, marginBottom: "0.5rem" }}>Session Complete</h2>
      <p style={{ color: "#C0C0C8", marginBottom: "0.5rem" }}>You reviewed <span style={{ color: "#D4A856", fontWeight: 600 }}>{reviewed}</span> card{reviewed !== 1 ? "s" : ""}.</p>
      <p style={{ color: "rgba(192,192,200,0.5)", fontSize: "13px", marginBottom: "2.5rem" }}>Cards will resurface based on your ratings.</p>
      <motion.button onClick={onBack} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }} style={{ background: "rgba(212,168,86,0.1)", border: "1px solid rgba(212,168,86,0.4)", borderRadius: "12px", padding: "0.75rem 2rem", color: "#D4A856", fontWeight: 600, fontSize: "14px", display: "inline-flex", alignItems: "center", gap: "8px" }} className="cursor-pointer">
        <Layers size={16} /> Back to Decks
      </motion.button>
    </motion.div>
  );
}

export default function FlashcardsPage() {
  const navigate = useNavigate();
  const { documents } = useDocuments();
  const { decks, loading, generating, error, fetchDecks, startSession, generate, review, removeDeck } = useFlashcards();

  const [view,          setView]          = useState("decks");
  const [queue,         setQueue]         = useState([]);
  const [currentIdx,    setCurrentIdx]    = useState(0);
  const [flipped,       setFlipped]       = useState(false);
  const [reviewedCount, setReviewedCount] = useState(0);
  const [showGenModal,  setShowGenModal]  = useState(false);
  const [selectedDocId, setSelectedDocId] = useState("");
  const [genSuccess,    setGenSuccess]    = useState(null);

  useEffect(() => { fetchDecks(); }, [fetchDecks]);

  const handleStudy = useCallback(async (docId) => {
    const cards = await startSession(docId);
    if (cards.length === 0) return;
    setQueue(cards); setCurrentIdx(0); setFlipped(false); setReviewedCount(0); setView("session");
  }, [startSession]);

  const handleReview = useCallback(async (quality) => {
    const card = queue[currentIdx];
    await review(card._id, quality);
    const nextIdx = currentIdx + 1;
    if (nextIdx >= queue.length) { setReviewedCount(queue.length); setView("complete"); }
    else { setCurrentIdx(nextIdx); setFlipped(false); }
  }, [queue, currentIdx, review]);

  const handleGenerate = useCallback(async () => {
    if (!selectedDocId) return;
    try {
      const result = await generate(selectedDocId);
      setGenSuccess(result.count);
      fetchDecks();
      setTimeout(() => { setShowGenModal(false); setGenSuccess(null); setSelectedDocId(""); }, 1500);
    } catch { /* error already toasted in hook */ }
  }, [selectedDocId, generate, fetchDecks]);

  const handleBack = useCallback(() => {
    setView("decks"); setQueue([]); setFlipped(false); fetchDecks();
  }, [fetchDecks]);

  const currentCard = queue[currentIdx];
  const progress    = queue.length > 0 ? (currentIdx / queue.length) * 100 : 0;
  const readyDocs   = (documents || []).filter((d) => d.status === "ready");

  return (
    <div style={{ background: "#0A0908", minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <div style={{ height: "2px", background: "linear-gradient(90deg, transparent, #D4A856, transparent)" }} />

      <div style={{ flex: 1, maxWidth: "900px", margin: "0 auto", width: "100%", padding: "1.5rem 1rem" }} className="sm:px-6 sm:py-8">

        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.5rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <button onClick={view !== "decks" ? handleBack : () => navigate("/dashboard")} style={{ background: "none", border: "none", color: "#C0C0C8", padding: "4px" }} className="cursor-pointer hover:opacity-80">
              <ChevronLeft size={20} />
            </button>
            <div>
              <h1 style={{ color: "#F0E6D2", fontSize: "1.3rem", fontWeight: 700, letterSpacing: "-0.02em" }}>Flashcards</h1>
              <p style={{ color: "#C0C0C8", fontSize: "12px", marginTop: "2px" }}>
                {view === "decks" ? "Spaced repetition study system" : view === "session" ? `Card ${currentIdx + 1} of ${queue.length}` : "Session complete"}
              </p>
            </div>
          </div>
          {view === "decks" && (
            <motion.button onClick={() => setShowGenModal(true)} whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} style={{ background: "rgba(212,168,86,0.1)", border: "1px solid rgba(212,168,86,0.35)", borderRadius: "12px", padding: "0.55rem 1rem", color: "#D4A856", fontSize: "13px", fontWeight: 600, display: "flex", alignItems: "center", gap: "6px" }} className="cursor-pointer">
              <Plus size={15} />
              <span className="hidden sm:inline">Generate Deck</span>
              <span className="sm:hidden">Generate</span>
            </motion.button>
          )}
        </div>

        {/* Error */}
        <AnimatePresence>
          {error && (
            <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.25)", borderRadius: "12px", padding: "0.75rem 1rem", color: "#FCA5A5", fontSize: "13px", marginBottom: "1.5rem", display: "flex", alignItems: "center", gap: "8px" }}>
              <XCircle size={15} /> {error}
            </motion.div>
          )}
        </AnimatePresence>

        {/* VIEW: DECKS */}
        {view === "decks" && (
          <>
            {loading ? (
              <DeckSkeleton />
            ) : decks.length === 0 ? (
              <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45 }} style={{ textAlign: "center", padding: "3rem 2rem", background: "rgba(20,17,12,0.6)", border: "1px solid rgba(212,168,86,0.1)", borderRadius: "20px" }}>
                <Layers size={40} style={{ margin: "0 auto 1rem", color: "#D4A856", opacity: 0.4 }} />
                <h3 style={{ color: "#F0E6D2", fontWeight: 600, marginBottom: "0.5rem" }}>No flashcard decks yet</h3>
                <p style={{ color: "#C0C0C8", fontSize: "14px", marginBottom: "1.5rem" }}>Generate a deck from any uploaded document to start studying.</p>
                <motion.button onClick={() => setShowGenModal(true)} whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} style={{ background: "rgba(212,168,86,0.1)", border: "1px solid rgba(212,168,86,0.4)", borderRadius: "12px", padding: "0.75rem 1.5rem", color: "#D4A856", fontWeight: 600, fontSize: "14px", display: "inline-flex", alignItems: "center", gap: "8px" }} className="cursor-pointer">
                  <Plus size={16} /> Generate First Deck
                </motion.button>
              </motion.div>
            ) : (
              <>
                {(() => {
                  const totalDue = decks.reduce((s, d) => s + d.due, 0);
                  return totalDue > 0 ? (
                    <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} style={{ background: "rgba(212,168,86,0.06)", border: "1px solid rgba(212,168,86,0.2)", borderRadius: "14px", padding: "0.9rem 1.25rem", marginBottom: "1.5rem", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                        <Clock size={16} color="#D4A856" />
                        <span style={{ color: "#F0E6D2", fontSize: "14px" }}><span style={{ color: "#D4A856", fontWeight: 700 }}>{totalDue}</span> cards due for review</span>
                      </div>
                      <motion.button onClick={() => handleStudy(null)} whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} style={{ background: "rgba(212,168,86,0.12)", border: "1px solid rgba(212,168,86,0.4)", borderRadius: "10px", padding: "0.45rem 1rem", color: "#D4A856", fontSize: "13px", fontWeight: 600, display: "flex", alignItems: "center", gap: "6px" }} className="cursor-pointer">
                        Study All <ArrowRight size={13} />
                      </motion.button>
                    </motion.div>
                  ) : null;
                })()}
                <motion.div variants={deckGridVariants} initial="hidden" animate="visible" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: "1rem" }}>
                  {decks.map((deck) => (
                    <DeckCard key={deck.doc_id} deck={deck} onStudy={handleStudy} onDelete={removeDeck} />
                  ))}
                </motion.div>
              </>
            )}
          </>
        )}

        {/* VIEW: SESSION */}
        {view === "session" && currentCard && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ maxWidth: "580px", margin: "0 auto" }}>
            <div style={{ height: "3px", background: "rgba(255,255,255,0.06)", borderRadius: "2px", marginBottom: "1.5rem", overflow: "hidden" }}>
              <motion.div animate={{ width: `${progress}%` }} transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }} style={{ height: "100%", background: "linear-gradient(90deg, #D4A856, #E8B894)", borderRadius: "2px" }} />
            </div>
            <FlipCard front={currentCard.front} back={currentCard.back} flipped={flipped} onFlip={() => setFlipped((f) => !f)} />
            <AnimatePresence>
              {flipped && (
                <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }} style={{ marginTop: "1.5rem" }}>
                  <p style={{ textAlign: "center", fontSize: "11px", letterSpacing: "2px", color: "rgba(192,192,200,0.5)", textTransform: "uppercase", marginBottom: "0.75rem" }}>How well did you recall?</p>
                  <div style={{ display: "flex", gap: "0.4rem", justifyContent: "center", flexWrap: "wrap" }}>
                    {QUALITY_OPTIONS.map((q) => (
                      <motion.button key={q.score} onClick={() => handleReview(q.score)} whileHover={{ scale: 1.05, borderColor: `${q.color}80`, boxShadow: `0 0 16px ${q.color}25` }} whileTap={{ scale: 0.95 }} style={{ background: q.bg, border: `1px solid ${q.color}40`, borderRadius: "10px", padding: "0.55rem 0.85rem", color: q.color, fontSize: "13px", fontWeight: 600, minWidth: "72px" }} className="cursor-pointer">
                        {q.label}
                      </motion.button>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
            {!flipped && <p style={{ textAlign: "center", color: "rgba(192,192,200,0.35)", fontSize: "13px", marginTop: "1.25rem" }}>Tap the card to reveal the answer</p>}
            <div style={{ textAlign: "center", marginTop: "1rem" }}>
              <button
                onClick={() => {
                  const nextIdx = currentIdx + 1;
                  if (nextIdx >= queue.length) { setReviewedCount(queue.length); setView("complete"); }
                  else { setCurrentIdx(nextIdx); setFlipped(false); }
                }}
                style={{ background: "none", border: "none", color: "rgba(192,192,200,0.3)", fontSize: "12px", display: "inline-flex", alignItems: "center", gap: "4px" }}
                className="cursor-pointer hover:opacity-80"
              >
                <RotateCcw size={11} /> skip
              </button>
            </div>
          </motion.div>
        )}

        {/* VIEW: COMPLETE */}
        {view === "complete" && <SessionComplete reviewed={reviewedCount} onBack={handleBack} />}
      </div>

      {/* Generate Modal — portal-rendered so page transitions don't move it */}
      <ModalPortal>
        <AnimatePresence>
          {showGenModal && (
            <motion.div
              key="gen-modal-overlay"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
              style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.78)", zIndex: 9999, padding: "1rem", display: "flex", alignItems: "center", justifyContent: "center" }}
              onClick={(e) => { if (e.target === e.currentTarget) setShowGenModal(false); }}
            >
              <div style={{ position: "absolute", inset: 0, backdropFilter: "blur(8px)" }} />
              <motion.div
                key="gen-modal-content"
                initial={{ opacity: 0, scale: 0.93, y: 20, filter: "blur(4px)" }}
                animate={{ opacity: 1, scale: 1, y: 0, filter: "blur(0px)", transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] } }}
                exit={{ opacity: 0, scale: 0.97, y: 8, filter: "blur(2px)", transition: { duration: 0.22 } }}
                onClick={(e) => e.stopPropagation()}
                style={{ position: "relative", background: "#0A0908", border: "1px solid rgba(212,168,86,0.25)", borderRadius: "20px", padding: "1.75rem", width: "100%", maxWidth: "420px", boxShadow: "0 0 80px rgba(212,168,86,0.08), 0 32px 64px rgba(0,0,0,0.6)" }}
              >
                <div style={{ position: "absolute", top: 0, left: "2rem", right: "2rem", height: "1px", background: "linear-gradient(90deg, transparent, rgba(212,168,86,0.6), transparent)" }} />
                <h2 style={{ color: "#F0E6D2", fontWeight: 700, fontSize: "1.1rem", marginBottom: "0.25rem" }}>Generate Flashcard Deck</h2>
                <p style={{ color: "#C0C0C8", fontSize: "13px", marginBottom: "1.5rem" }}>The AI will extract key concepts from your document.</p>

                <div style={{ marginBottom: "1.25rem" }}>
                  <label style={{ display: "block", color: "#C0C0C8", fontSize: "11px", letterSpacing: "1px", textTransform: "uppercase", marginBottom: "0.5rem" }}>Select Document</label>
                  <select
                    value={selectedDocId}
                    onChange={(e) => setSelectedDocId(e.target.value)}
                    style={{ width: "100%", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(212,168,86,0.2)", borderRadius: "10px", padding: "0.65rem 1rem", color: selectedDocId ? "#F0E6D2" : "rgba(192,192,200,0.4)", fontSize: "14px", outline: "none", cursor: "pointer" }}
                  >
                    <option value="" style={{ background: "#0A0908" }}>Choose a document…</option>
                    {readyDocs.map((doc) => (
                      <option key={doc.id ?? doc._id} value={doc.id ?? doc._id} style={{ background: "#0A0908" }}>{doc.filename}</option>
                    ))}
                  </select>
                  {readyDocs.length === 0 && (
                    <p style={{ color: "rgba(239,68,68,0.6)", fontSize: "12px", marginTop: "0.5rem" }}>No ready documents found. Upload and process a PDF first.</p>
                  )}
                </div>

                <AnimatePresence>
                  {genSuccess && (
                    <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} style={{ background: "rgba(212,168,86,0.08)", border: "1px solid rgba(212,168,86,0.3)", borderRadius: "10px", padding: "0.65rem 1rem", color: "#D4A856", fontSize: "13px", marginBottom: "1rem", display: "flex", alignItems: "center", gap: "8px" }}>
                      <CheckCircle size={14} /> {genSuccess} cards generated successfully!
                    </motion.div>
                  )}
                </AnimatePresence>

                <div style={{ display: "flex", gap: "0.75rem" }}>
                  <button onClick={() => { setShowGenModal(false); setSelectedDocId(""); setGenSuccess(null); }} style={{ flex: 1, background: "none", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "10px", padding: "0.7rem", color: "#C0C0C8", fontSize: "14px", fontWeight: 500 }} className="cursor-pointer hover:opacity-80">
                    Cancel
                  </button>
                  <motion.button
                    onClick={handleGenerate}
                    disabled={!selectedDocId || generating}
                    whileHover={selectedDocId && !generating ? { scale: 1.02 } : {}}
                    whileTap={selectedDocId && !generating ? { scale: 0.97 } : {}}
                    style={{ flex: 2, background: selectedDocId && !generating ? "rgba(212,168,86,0.12)" : "rgba(255,255,255,0.03)", border: `1px solid ${selectedDocId && !generating ? "rgba(212,168,86,0.4)" : "rgba(255,255,255,0.06)"}`, borderRadius: "10px", padding: "0.7rem", color: selectedDocId && !generating ? "#D4A856" : "rgba(255,255,255,0.2)", fontSize: "14px", fontWeight: 600, display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}
                    className={selectedDocId && !generating ? "cursor-pointer" : ""}
                  >
                    {generating ? <><span style={{ opacity: 0.6 }}>Generating</span><span>…</span></> : <><Zap size={15} /> Generate</>}
                  </motion.button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </ModalPortal>

      <AppFooter />
    </div>
  );
}