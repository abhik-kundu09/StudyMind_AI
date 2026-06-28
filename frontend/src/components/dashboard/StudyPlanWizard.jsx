// components/dashboard/StudyPlanWizard.jsx
import { useEffect, useState } from "react";
import {
  X, ChevronRight, ChevronLeft, CalendarClock,
  BookOpen, Sparkles, CheckCircle2, AlertCircle,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import ModalPortal from "../ui/ModalPortal";

const STEPS = ["Select Documents", "Exam Details", "Generating"];

const overlayVariants = {
  hidden:  { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.25 } },
  exit:    { opacity: 0, transition: { duration: 0.2 } },
};

const modalVariants = {
  hidden:  { opacity: 0, scale: 0.93, y: 20, filter: "blur(6px)" },
  visible: {
    opacity: 1, scale: 1, y: 0, filter: "blur(0px)",
    transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] },
  },
  exit: {
    opacity: 0, scale: 0.97, y: 10, filter: "blur(3px)",
    transition: { duration: 0.22, ease: [0.55, 0, 1, 0.45] },
  },
};

const stepContentVariants = {
  hidden:  { opacity: 0, x: 12 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.3, ease: [0.22, 1, 0.36, 1] } },
  exit:    { opacity: 0, x: -12, transition: { duration: 0.2 } },
};

const StepDots = ({ current, total }) => (
  <div className="flex items-center gap-2">
    {Array.from({ length: total }).map((_, i) => (
      <motion.div
        key={i}
        animate={{
          width: i === current ? 20 : 6,
          background: i === current
            ? "linear-gradient(90deg, #D4A856, #E8B894)"
            : i < current ? "rgba(212,168,86,0.4)" : "rgba(255,255,255,0.1)",
        }}
        transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
        style={{ height: 6, borderRadius: 3 }}
      />
    ))}
  </div>
);

const DocSelectStep = ({ docs, selected, onToggle }) => (
  <div className="flex flex-col gap-3">
    <p className="text-sm" style={{ color: "rgba(180,195,230,0.6)" }}>
      Select one or more documents to base your study plan on.
    </p>
    {docs.length === 0 ? (
      <div className="rounded-xl p-6 text-center" style={{ border: "1px dashed rgba(212,168,86,0.2)" }}>
        <BookOpen size={20} style={{ color: "rgba(212,168,86,0.3)", margin: "0 auto 8px" }} />
        <p className="text-sm" style={{ color: "rgba(180,195,230,0.4)" }}>No documents uploaded yet.</p>
      </div>
    ) : (
      <div className="flex flex-col gap-2 max-h-56 overflow-y-auto pr-1" style={{ scrollbarWidth: "thin" }}>
        {docs.map((doc) => {
          const isSelected = selected.includes(doc._id || doc.id);
          return (
            <motion.button
              key={doc._id || doc.id}
              onClick={() => onToggle(doc._id || doc.id)}
              whileHover={{ x: 2 }}
              whileTap={{ scale: 0.98 }}
              className="flex items-center gap-3 rounded-xl px-4 py-3 text-left transition-all cursor-pointer w-full"
              style={{
                background: isSelected ? "rgba(212,168,86,0.1)" : "rgba(255,255,255,0.02)",
                border: isSelected ? "1px solid rgba(212,168,86,0.4)" : "1px solid rgba(212,168,86,0.1)",
              }}
            >
              <div
                className="flex h-5 w-5 shrink-0 items-center justify-center rounded"
                style={{
                  background: isSelected ? "#D4A856" : "rgba(255,255,255,0.05)",
                  border: isSelected ? "none" : "1px solid rgba(212,168,86,0.2)",
                }}
              >
                {isSelected && (
                  <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                    <path d="M1 4L3.5 6.5L9 1" stroke="#0A0908" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium truncate" style={{ color: "#F0E6D2" }}>
                  {doc.filename || doc.title || "Untitled"}
                </p>
                <p className="text-xs" style={{ color: "rgba(180,195,230,0.35)" }}>
                  {doc.page_count ? `${doc.page_count} pages` : "Ready"}
                </p>
              </div>
            </motion.button>
          );
        })}
      </div>
    )}
    {selected.length > 0 && (
      <p className="text-xs" style={{ color: "rgba(212,168,86,0.6)" }}>
        {selected.length} document{selected.length > 1 ? "s" : ""} selected
      </p>
    )}
  </div>
);

const ExamDetailsStep = ({ examName, setExamName, examDate, setExamDate, goal, setGoal, dailyHours, setDailyHours }) => {
  const daysUntil = examDate
    ? Math.ceil((new Date(examDate) - new Date()) / (1000 * 60 * 60 * 24))
    : null;

  const granularityHint =
    daysUntil === null ? null
    : daysUntil < 1 ? "Hourly cramming plan"
    : daysUntil <= 45 ? `Day-by-day plan (${daysUntil} days)`
    : `Week-by-week plan (${Math.ceil(daysUntil / 7)} weeks)`;

  const inputStyle = {
    background: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(212,168,86,0.2)",
    borderRadius: 10,
    color: "#F0E6D2",
    padding: "10px 14px",
    fontSize: 14,
    width: "100%",
    outline: "none",
  };

  const labelStyle = {
    display: "block",
    fontSize: 11,
    fontWeight: 500,
    textTransform: "uppercase",
    letterSpacing: "0.08em",
    color: "rgba(212,168,86,0.55)",
    marginBottom: 6,
  };

  return (
    <div className="flex flex-col gap-4">
      <div>
        <label style={labelStyle}>Exam / Subject Name</label>
        <input type="text" placeholder="e.g. Advanced Physics — Final Exam" value={examName} onChange={(e) => setExamName(e.target.value)} style={inputStyle} />
      </div>
      <div>
        <label style={labelStyle}>Exam Date & Time</label>
        <input type="datetime-local" value={examDate} onChange={(e) => setExamDate(e.target.value)} style={{ ...inputStyle, colorScheme: "dark" }} />
        {granularityHint && (
          <p className="mt-1.5 text-xs" style={{ color: "rgba(212,168,86,0.7)" }}>{granularityHint}</p>
        )}
      </div>
      <div>
        <label style={labelStyle}>Your Goal</label>
        <textarea
          placeholder="e.g. Pass with distinction, understand core concepts"
          value={goal}
          onChange={(e) => setGoal(e.target.value)}
          rows={2}
          style={{ ...inputStyle, resize: "none" }}
        />
      </div>
      <div>
        <label style={labelStyle}>Daily Study Hours: {dailyHours}h</label>
        <div className="flex items-center gap-3">
          <input type="range" min={0.5} max={10} step={0.5} value={dailyHours} onChange={(e) => setDailyHours(parseFloat(e.target.value))} style={{ flex: 1, accentColor: "#D4A856" }} />
          <span className="text-sm font-mono" style={{ color: "#D4A856", minWidth: 32 }}>{dailyHours}h</span>
        </div>
      </div>
    </div>
  );
};

const GeneratingStep = ({ phase, errorMessage, plan, onView }) => {
  if (phase === "error") {
    return (
      <div className="flex flex-col items-center gap-4 py-6">
        <AlertCircle size={32} style={{ color: "#f87171" }} />
        <p className="text-sm text-center" style={{ color: "rgba(180,195,230,0.6)" }}>
          {errorMessage || "Something went wrong generating your plan."}
        </p>
      </div>
    );
  }

  if (phase === "ready" && plan) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        className="flex flex-col items-center gap-4 py-4"
      >
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl" style={{ background: "rgba(212,168,86,0.12)", border: "1px solid rgba(212,168,86,0.25)" }}>
          <CheckCircle2 size={28} style={{ color: "#D4A856" }} />
        </div>
        <div className="text-center">
          <p className="font-semibold text-sm" style={{ color: "#F0E6D2" }}>Your study plan is ready!</p>
          <p className="text-xs mt-1" style={{ color: "rgba(180,195,230,0.5)" }}>
            {plan.items?.length} {plan.granularity} sessions · {plan.total_tasks} tasks
          </p>
        </div>
        <button
          onClick={onView}
          className="flex items-center gap-2 rounded-xl px-6 py-2.5 text-sm font-medium transition-all cursor-pointer active:scale-95"
          style={{ background: "linear-gradient(135deg, #D4A856, #E8B894)", color: "#0A0908" }}
        >
          <CalendarClock size={14} />
          View Study Plan
        </button>
      </motion.div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-5 py-6">
      <div className="relative">
        <div className="h-14 w-14 rounded-full" style={{ border: "2px solid rgba(212,168,86,0.1)", borderTop: "2px solid #D4A856", animation: "spin 1s linear infinite" }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        <Sparkles size={16} style={{ color: "#D4A856", position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)" }} />
      </div>
      <div className="text-center">
        <p className="text-sm font-medium" style={{ color: "#F0E6D2" }}>Crafting your personalised plan…</p>
        <p className="text-xs mt-1" style={{ color: "rgba(180,195,230,0.4)" }}>Analysing documents & structuring schedule</p>
      </div>
    </div>
  );
};

const StudyPlanWizard = ({ open, onClose, docs, studyPlanState }) => {
  const navigate = useNavigate();

  const [step,         setStep]         = useState(0);
  const [selectedDocs, setSelectedDocs] = useState([]);
  const [examName,     setExamName]     = useState("");
  const [examDate,     setExamDate]     = useState("");
  const [goal,         setGoal]         = useState("");
  const [dailyHours,   setDailyHours]   = useState(2);

  const { phase, plan, errorMessage, generate, reset } = studyPlanState;

  useEffect(() => {
    if (!open) return;
    setStep(0); setSelectedDocs([]); setExamName(""); setExamDate(""); setGoal(""); setDailyHours(2);
    reset();
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (phase === "generating" || phase === "ready" || phase === "error") setStep(2);
  }, [phase]);

  const toggleDoc = (id) =>
    setSelectedDocs((prev) => prev.includes(id) ? prev.filter((d) => d !== id) : [...prev, id]);

  const canProceedStep1 = selectedDocs.length > 0;
  const canProceedStep2 =
    examName.trim().length > 0 && examDate && new Date(examDate) > new Date() && goal.trim().length > 0;

  const handleGenerate = () => {
    const isoDate = new Date(examDate).toISOString();
    generate(selectedDocs, examName.trim(), isoDate, goal.trim(), dailyHours);
  };

  const handleViewPlan = () => {
    onClose();
    if (studyPlanState.planId) navigate(`/study-plan/${studyPlanState.planId}`);
  };

  const stepContent = [
    <DocSelectStep key="s1" docs={docs} selected={selectedDocs} onToggle={toggleDoc} />,
    <ExamDetailsStep key="s2" examName={examName} setExamName={setExamName} examDate={examDate} setExamDate={setExamDate} goal={goal} setGoal={setGoal} dailyHours={dailyHours} setDailyHours={setDailyHours} />,
    <GeneratingStep key="s3" phase={phase} errorMessage={errorMessage} plan={plan} onView={handleViewPlan} />,
  ];

  return (
    <ModalPortal>
      <AnimatePresence>
        {open && (
          <motion.div
            key="wizard-overlay"
            style={{
              position: "fixed", inset: 0, zIndex: 9999,
              display: "flex", alignItems: "center", justifyContent: "center",
              padding: "1rem", background: "rgba(10,9,8,0.88)",
            }}
            variants={overlayVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
          >
            <div style={{ position: "absolute", inset: 0, backdropFilter: "blur(8px)" }} />

            <motion.div
              key="wizard-content"
              style={{
                position: "relative", width: "100%", maxWidth: "448px",
                borderRadius: "1rem", padding: "1.5rem",
                display: "flex", flexDirection: "column", gap: "1.25rem",
                background: "rgba(14,12,10,0.98)",
                border: "1px solid rgba(212,168,86,0.22)",
                boxShadow: "0 0 100px rgba(212,168,86,0.07), 0 40px 80px rgba(0,0,0,0.7)",
              }}
              variants={modalVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              onClick={(e) => e.stopPropagation()}
            >
              <div style={{ position: "absolute", top: 0, left: "2rem", right: "2rem", height: "1px", background: "linear-gradient(90deg, transparent, rgba(212,168,86,0.5), transparent)" }} />

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-8 w-8 items-center justify-center rounded-xl" style={{ background: "rgba(212,168,86,0.12)" }}>
                    <CalendarClock size={15} style={{ color: "#D4A856" }} />
                  </div>
                  <div>
                    <h2 className="text-sm font-semibold" style={{ color: "#F0E6D2" }}>Study Plan Generator</h2>
                    <p className="text-xs" style={{ color: "rgba(180,195,230,0.4)" }}>{STEPS[step]}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <StepDots current={step} total={STEPS.length} />
                  <button onClick={onClose} className="rounded-lg p-1.5 transition-colors cursor-pointer hover:opacity-80" style={{ color: "rgba(180,195,230,0.4)" }}>
                    <X size={15} />
                  </button>
                </div>
              </div>

              <AnimatePresence mode="wait">
                <motion.div
                  key={step}
                  className="min-h-[200px]"
                  variants={stepContentVariants}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                >
                  {stepContent[step]}
                </motion.div>
              </AnimatePresence>

              {step < 2 && (
                <div className="flex gap-3">
                  {step > 0 && (
                    <button
                      onClick={() => setStep((s) => s - 1)}
                      className="flex items-center gap-1.5 rounded-xl px-4 py-2.5 text-sm font-medium transition-all cursor-pointer hover:opacity-80"
                      style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(212,168,86,0.15)", color: "#E2E8F8" }}
                    >
                      <ChevronLeft size={14} />
                      Back
                    </button>
                  )}
                  <button
                    onClick={step === 1 ? handleGenerate : () => setStep((s) => s + 1)}
                    disabled={step === 0 ? !canProceedStep1 : !canProceedStep2}
                    className="flex flex-1 items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-medium transition-all disabled:opacity-35 disabled:cursor-not-allowed cursor-pointer active:scale-95"
                    style={{ background: "linear-gradient(135deg, #D4A856, #E8B894)", color: "#0A0908" }}
                  >
                    {step === 1 ? (
                      <><Sparkles size={14} />Generate Plan</>
                    ) : (
                      <>Next<ChevronRight size={14} /></>
                    )}
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

export default StudyPlanWizard;