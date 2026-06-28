// components/dashboard/Scoreboards.jsx
import { motion } from "framer-motion";
import {
  Trophy, Target, ListChecks, Timer, CalendarClock, CheckCircle2,
  TrendingUp, History, CheckCheck, AlertTriangle, XCircle,
} from "lucide-react";

const cardVariants = {
  hidden:  { opacity: 0, y: 16, scale: 0.96 },
  visible: (i) => ({
    opacity: 1, y: 0, scale: 1,
    transition: { duration: 0.4, delay: i * 0.07, ease: [0.22, 1, 0.36, 1] },
  }),
};

const StatCard = ({ icon: Icon, label, value, accent, index }) => (
  <motion.div
    custom={index}
    variants={cardVariants}
    initial="hidden"
    animate="visible"
    whileHover={{
      boxShadow: `0 0 20px ${accent}18`,
      borderColor: `${accent}35`,
      transition: { duration: 0.2 },
    }}
    className="flex flex-col gap-2 rounded-2xl p-4"
    style={{ background: "rgba(20,17,12,0.7)", border: "1px solid rgba(212,168,86,0.15)" }}
  >
    <div className="flex items-center gap-2">
      <Icon size={13} style={{ color: accent ?? "#D4A856" }} />
      <p className="text-[11px] font-medium uppercase tracking-wide" style={{ color: "rgba(180,195,230,0.45)" }}>
        {label}
      </p>
    </div>
    <p className="text-2xl font-bold" style={{ color: "#F0E6D2" }}>
      {value}
    </p>
  </motion.div>
);

const Scoreboards = ({ stats, planCount = 0 }) => {
  const { totalQuizzes, totalAttempts, bestScore, avgScore, history, loading } = stats;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <TrendingUp size={12} style={{ color: "rgba(212,168,86,0.5)" }} />
        <h2 className="text-xs font-semibold uppercase tracking-widest" style={{ color: "rgba(212,168,86,0.5)" }}>
          Performance
        </h2>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <StatCard index={0} icon={Trophy}        label="Best Score"   value={bestScore != null ? `${bestScore}%` : "—"} accent="#D4A856" />
        <StatCard index={1} icon={Target}        label="Avg Score"    value={avgScore  != null ? `${avgScore}%`  : "—"} accent="#E8B894" />
        <StatCard index={2} icon={ListChecks}    label="Quizzes Made" value={totalQuizzes}   accent="#C0C0C8" />
        <StatCard index={3} icon={Timer}         label="Attempts"     value={totalAttempts}  accent="#C0C0C8" />
        <StatCard index={4} icon={CalendarClock} label="Study Plans"  value={planCount}      accent="#D4A856" />
        <StatCard
          index={5}
          icon={CheckCircle2}
          label="Completion"
          value={totalAttempts > 0 ? `${Math.round((totalAttempts / Math.max(totalQuizzes, 1)) * 100)}%` : "—"}
          accent="#34d399"
        />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.45, ease: [0.22, 1, 0.36, 1] }}
        className="rounded-2xl p-4"
        style={{ background: "rgba(20,17,12,0.7)", border: "1px solid rgba(212,168,86,0.15)" }}
      >
        <div className="flex items-center gap-2 mb-3">
          <History size={11} style={{ color: "rgba(180,195,230,0.45)" }} />
          <p className="text-[11px] font-medium uppercase tracking-wide" style={{ color: "rgba(180,195,230,0.45)" }}>
            Recent Attempts
          </p>
        </div>

        {loading && (
          <p className="text-xs py-3 text-center" style={{ color: "rgba(180,195,230,0.3)" }}>Loading…</p>
        )}
        {!loading && history.length === 0 && (
          <p className="text-xs py-3 text-center" style={{ color: "rgba(180,195,230,0.3)" }}>
            No attempts yet — take a quiz to see your history here.
          </p>
        )}

        <div className="flex flex-col gap-1.5">
          {history.slice(0, 6).map((h, idx) => {
            const scoreColor = h.score_percent >= 70 ? "#34d399" : h.score_percent >= 40 ? "#D4A856" : "#f87171";
            const StatusIcon = h.score_percent >= 70 ? CheckCheck : h.score_percent >= 40 ? AlertTriangle : XCircle;
            const iconColor  = scoreColor;
            return (
              <motion.div
                key={h.attempt_id}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.5 + idx * 0.05, duration: 0.3 }}
                className="flex items-center gap-2 rounded-lg px-2.5 py-2"
                style={{ background: "rgba(255,255,255,0.02)" }}
              >
                <StatusIcon size={11} style={{ color: iconColor }} />
                <p className="truncate text-xs flex-1 mr-2" style={{ color: "rgba(180,195,230,0.7)" }}>
                  {h.quiz_title}
                </p>
                <p className="text-xs font-semibold shrink-0" style={{ color: scoreColor }}>
                  {h.score_percent}%
                </p>
              </motion.div>
            );
          })}
        </div>
      </motion.div>
    </div>
  );
};

export default Scoreboards;