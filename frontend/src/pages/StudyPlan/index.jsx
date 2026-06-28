// pages/StudyPlan/index.jsx
import { useEffect, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, CalendarClock, CheckCircle2, Circle, Clock,
  Sparkles, Target, TrendingUp, AlertCircle, BookOpen,
  Zap, CalendarDays, CalendarRange, LayoutList, PartyPopper, CalendarCheck,
} from "lucide-react";
import { useStudyPlan, useStudyPlanList } from "../../hooks/useStudyPlan";
import AppFooter from "../../components/AppFooter";

const GOLD   = "#D4A856";
const PEACH  = "#E8B894";
const SILVER = "#C0C0C8";
const BG     = "#0A0908";
const PANEL  = "rgba(20,17,12,0.7)";
const BORDER = "rgba(212,168,86,0.15)";
const TEXT   = "#F0E6D2";
const MUTED  = "rgba(180,195,230,0.5)";

const ProgressRing = ({ percent, size = 120, stroke = 8 }) => {
  const r      = (size - stroke) / 2;
  const circ   = 2 * Math.PI * r;
  const offset = circ - (percent / 100) * circ;
  const color  = percent >= 80 ? "#34d399" : percent >= 40 ? GOLD : PEACH;
  return (
    <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth={stroke} />
      <circle
        cx={size/2} cy={size/2} r={r} fill="none"
        stroke={color} strokeWidth={stroke} strokeLinecap="round"
        strokeDasharray={circ} strokeDashoffset={offset}
        style={{ transition: "stroke-dashoffset 0.8s cubic-bezier(0.4,0,0.2,1), stroke 0.5s" }}
      />
    </svg>
  );
};

const StatCard = ({ icon: Icon, label, value, accent, index }) => (
  <motion.div
    initial={{ opacity: 0, y: 12 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay: 0.1 + index * 0.07, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
    className="flex flex-col gap-1 rounded-2xl p-4"
    style={{ background: PANEL, border: `1px solid ${BORDER}` }}
  >
    <div className="flex items-center gap-2 mb-1">
      <Icon size={13} style={{ color: accent || GOLD }} />
      <span className="text-[10px] uppercase tracking-widest font-medium" style={{ color: "rgba(212,168,86,0.5)" }}>{label}</span>
    </div>
    <p className="text-xl font-bold" style={{ color: accent || TEXT }}>{value}</p>
  </motion.div>
);

const GranularityBadge = ({ granularity }) => {
  const map = {
    hourly: { label: "Hourly Cramming", icon: Clock,         color: "#f87171" },
    daily:  { label: "Day-by-Day",      icon: CalendarClock, color: GOLD },
    weekly: { label: "Week-by-Week",    icon: TrendingUp,    color: "#34d399" },
  };
  const { label, icon: Icon, color } = map[granularity] || map.daily;
  return (
    <div className="inline-flex items-center gap-1.5 rounded-full px-3 py-1" style={{ background: `${color}18`, border: `1px solid ${color}40` }}>
      <Icon size={11} style={{ color }} />
      <span className="text-[11px] font-medium" style={{ color }}>{label}</span>
    </div>
  );
};

const TaskRow = ({ task, taskIndex, itemIndex, onToggle, animDelay }) => (
  <div
    className="flex items-start gap-2.5 rounded-lg px-3 py-2 transition-all"
    style={{
      background: task.done ? "rgba(212,168,86,0.04)" : "transparent",
      animation: `fadeSlideIn 0.3s ease forwards`,
      animationDelay: `${animDelay}ms`,
      opacity: 0,
    }}
  >
    <button
      onClick={() => onToggle(itemIndex, taskIndex, !task.done)}
      className="mt-0.5 shrink-0 transition-transform hover:scale-110 cursor-pointer"
      style={{ color: task.done ? GOLD : "rgba(180,195,230,0.3)" }}
    >
      {task.done ? <CheckCircle2 size={15} /> : <Circle size={15} />}
    </button>
    <p
      className="text-sm leading-relaxed transition-all"
      style={{ color: task.done ? "rgba(180,195,230,0.4)" : TEXT, textDecoration: task.done ? "line-through" : "none" }}
    >
      {task.text}
    </p>
  </div>
);

const ScheduleCard = ({ item, itemIndex, onToggleTask, onSetStatus, animDelay }) => {
  const tasksDone    = item.tasks.filter((t) => t.done).length;
  const tasksTotal   = item.tasks.length;
  const pct          = tasksTotal > 0 ? Math.round((tasksDone / tasksTotal) * 100) : 0;
  const isFullyDone  = item.status === "done" || (tasksTotal > 0 && tasksDone === tasksTotal);
  const isInProgress = item.status === "in_progress" || (tasksDone > 0 && !isFullyDone);
  const borderColor  = isFullyDone ? "rgba(52,211,153,0.3)" : isInProgress ? "rgba(212,168,86,0.3)" : BORDER;
  const dotColor     = isFullyDone ? "#34d399" : isInProgress ? GOLD : "rgba(180,195,230,0.2)";

  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{
        background: PANEL,
        border: `1px solid ${borderColor}`,
        animation: `fadeSlideIn 0.4s ease forwards`,
        animationDelay: `${animDelay}ms`,
        opacity: 0,
        transition: "border-color 0.3s",
      }}
    >
      <div className="flex items-start justify-between gap-3 px-5 py-4" style={{ borderBottom: "1px solid rgba(212,168,86,0.08)" }}>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <div className="h-2 w-2 rounded-full" style={{ background: dotColor }} />
            <span className="text-[10px] uppercase tracking-widest" style={{ color: "rgba(212,168,86,0.45)" }}>{item.label}</span>
          </div>
          <p className="text-sm font-semibold leading-snug" style={{ color: TEXT }}>{item.topic}</p>
        </div>
        <div className="flex flex-col items-end gap-1.5 shrink-0">
          <span className="text-[11px]" style={{ color: MUTED }}>
            {item.duration_minutes >= 60
              ? `${Math.floor(item.duration_minutes / 60)}h${item.duration_minutes % 60 > 0 ? ` ${item.duration_minutes % 60}m` : ""}`
              : `${item.duration_minutes}m`}
          </span>
          {tasksTotal > 0 && (
            <div className="w-16 h-1 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{ width: `${pct}%`, background: isFullyDone ? "linear-gradient(90deg,#34d399,#6ee7b7)" : `linear-gradient(90deg,${GOLD},${PEACH})` }}
              />
            </div>
          )}
        </div>
      </div>

      {item.tasks.length > 0 && (
        <div className="px-3 py-3 flex flex-col gap-0.5">
          {item.tasks.map((task, tIdx) => (
            <TaskRow key={tIdx} task={task} taskIndex={tIdx} itemIndex={itemIndex} onToggle={onToggleTask} animDelay={animDelay + tIdx * 40} />
          ))}
        </div>
      )}

      {pct === 100 && item.status !== "done" && (
        <div className="px-5 pb-4">
          <button
            onClick={() => onSetStatus(itemIndex, "done")}
            className="flex items-center gap-1.5 text-xs font-medium transition-all cursor-pointer hover:opacity-80"
            style={{ color: "#34d399" }}
          >
            <CheckCircle2 size={12} />
            Mark complete
          </button>
        </div>
      )}
    </div>
  );
};

const GRANULARITY_META = {
  hourly: { Icon: Zap,           color: "#f87171" },
  daily:  { Icon: CalendarDays,  color: GOLD },
  weekly: { Icon: CalendarRange, color: "#34d399" },
};

const PastPlansSidebar = ({ currentPlanId, plans, loading }) => {
  const navigate = useNavigate();
  return (
    <div className="flex flex-col gap-3 rounded-2xl p-4" style={{ background: PANEL, border: `1px solid ${BORDER}` }}>
      <div className="flex items-center gap-2">
        <LayoutList size={11} style={{ color: "rgba(212,168,86,0.5)" }} />
        <p className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: "rgba(212,168,86,0.5)" }}>Your Plans</p>
      </div>

      {loading && (
        <div className="flex flex-col gap-2">
          {[1,2,3].map((i) => (
            <div key={i} className="h-10 rounded-xl" style={{ background: "rgba(255,255,255,0.02)", animation: "pulse 2s infinite" }} />
          ))}
        </div>
      )}

      {!loading && plans.length === 0 && (
        <p className="text-[11px] text-center py-3" style={{ color: "rgba(180,195,230,0.3)" }}>No plans yet</p>
      )}

      <div className="flex flex-col gap-1.5">
        {plans.map((p) => {
          const isCurrent = p.id === currentPlanId;
          const g = GRANULARITY_META[p.granularity] ?? GRANULARITY_META.daily;
          const GIcon = g.Icon;
          const pct = p.total_tasks > 0 ? Math.round((p.completed_tasks / p.total_tasks) * 100) : 0;
          return (
            <button
              key={p.id}
              onClick={() => navigate(`/study-plan/${p.id}`)}
              className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-left w-full transition-all cursor-pointer hover:opacity-80"
              style={{
                background: isCurrent ? "rgba(212,168,86,0.1)" : "rgba(255,255,255,0.02)",
                border: isCurrent ? "1px solid rgba(212,168,86,0.3)" : "1px solid transparent",
              }}
            >
              <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg" style={{ background: `${g.color}15` }}>
                <GIcon size={11} style={{ color: g.color }} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[11px] font-medium truncate" style={{ color: isCurrent ? GOLD : "rgba(240,230,210,0.7)" }}>
                  {p.exam_name}
                </p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <div className="flex-1 h-0.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.05)" }}>
                    <div className="h-full rounded-full" style={{ width: `${pct}%`, background: pct >= 80 ? "#34d399" : GOLD }} />
                  </div>
                  <span className="text-[9px] shrink-0" style={{ color: MUTED }}>{pct}%</span>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      <button
        onClick={() => navigate("/dashboard")}
        className="flex items-center justify-center gap-1.5 rounded-xl py-2 text-[11px] font-medium transition-all mt-1 cursor-pointer hover:opacity-80"
        style={{ background: "rgba(212,168,86,0.06)", border: "1px solid rgba(212,168,86,0.15)", color: "rgba(212,168,86,0.7)" }}
      >
        + New Plan
      </button>
    </div>
  );
};

const StudyPlanPage = () => {
  const { planId }  = useParams();
  const navigate    = useNavigate();
  const { phase, plan, errorMessage, loadPlan, toggleTaskDone, setItemStatus } = useStudyPlan();
  const { plans, loading: plansLoading } = useStudyPlanList();
  const hasLoaded   = useRef(false);

  useEffect(() => {
    if (planId && !hasLoaded.current) {
      hasLoaded.current = true;
      loadPlan(planId);
    }
  }, [planId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { hasLoaded.current = false; }, [planId]);

  const completionPct = plan
    ? plan.total_tasks > 0 ? Math.round((plan.completed_tasks / plan.total_tasks) * 100) : 0
    : 0;

  return (
    <div className="min-h-screen flex flex-col" style={{ background: BG, color: TEXT }}>
      <style>{`
        @keyframes fadeSlideIn { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:translateY(0)} }
        @keyframes glowPulse   { 0%,100%{box-shadow:0 0 0 rgba(212,168,86,0)} 50%{box-shadow:0 0 30px rgba(212,168,86,0.08)} }
        @keyframes pulse       { 0%,100%{opacity:1} 50%{opacity:.4} }
        ::-webkit-scrollbar { width:4px }
        ::-webkit-scrollbar-track { background:transparent }
        ::-webkit-scrollbar-thumb { background:rgba(212,168,86,0.15);border-radius:2px }
      `}</style>

      {/* Top nav */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        className="sticky top-0 z-10 flex items-center gap-4 px-4 sm:px-6 py-4"
        style={{ background: "rgba(10,9,8,0.9)", borderBottom: `1px solid ${BORDER}`, backdropFilter: "blur(12px)" }}
      >
        <button
          onClick={() => navigate("/dashboard")}
          className="flex items-center gap-1.5 text-sm transition-all cursor-pointer hover:opacity-80"
          style={{ color: MUTED }}
        >
          <ArrowLeft size={15} />
          <span className="hidden sm:inline">Dashboard</span>
        </button>
        <div className="h-4 w-px hidden sm:block" style={{ background: BORDER }} />
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <CalendarClock size={14} style={{ color: GOLD }} />
          <span className="text-sm font-medium truncate" style={{ color: TEXT }}>
            {plan?.exam_name || "Study Plan"}
          </span>
        </div>
        {plan && <GranularityBadge granularity={plan.granularity} />}
      </motion.div>

      {/* Body */}
      <div className="flex flex-1 gap-6 px-4 sm:px-6 py-6 max-w-6xl mx-auto w-full">

        {/* Left sidebar */}
        <div className="hidden lg:flex flex-col gap-4 w-56 shrink-0">
          <PastPlansSidebar currentPlanId={planId} plans={plans} loading={plansLoading} />
        </div>

        {/* Main content */}
        <div className="flex-1 min-w-0 flex flex-col gap-8">

          {/* Mobile plan switcher */}
          {plans.length > 1 && (
            <div className="lg:hidden flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
              {plans.map((p) => {
                const gMeta = { hourly: Zap, daily: CalendarDays, weekly: CalendarRange };
                const GIcon = gMeta[p.granularity] ?? CalendarDays;
                const isCurrent = p.id === planId;
                return (
                  <button
                    key={p.id}
                    onClick={() => navigate(`/study-plan/${p.id}`)}
                    className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-medium whitespace-nowrap shrink-0 transition-all cursor-pointer hover:opacity-80"
                    style={{
                      background: isCurrent ? "rgba(212,168,86,0.12)" : "rgba(255,255,255,0.03)",
                      border: isCurrent ? "1px solid rgba(212,168,86,0.35)" : `1px solid ${BORDER}`,
                      color: isCurrent ? GOLD : MUTED,
                    }}
                  >
                    <GIcon size={10} />
                    {p.exam_name.length > 18 ? p.exam_name.slice(0, 18) + "…" : p.exam_name}
                  </button>
                );
              })}
            </div>
          )}

          {phase === "generating" && (
            <div className="flex flex-col gap-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-28 rounded-2xl" style={{ background: PANEL, border: `1px solid ${BORDER}`, animation: "pulse 2s cubic-bezier(0.4,0,0.6,1) infinite" }} />
              ))}
            </div>
          )}

          {phase === "error" && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col items-center gap-4 rounded-2xl p-10"
              style={{ background: PANEL, border: "1px solid rgba(248,113,113,0.2)" }}
            >
              <AlertCircle size={32} style={{ color: "#f87171" }} />
              <p className="text-sm text-center" style={{ color: MUTED }}>
                {errorMessage || "Could not load this study plan."}
              </p>
              <button
                onClick={() => navigate("/dashboard")}
                className="text-sm px-4 py-2 rounded-xl transition-all cursor-pointer hover:opacity-80"
                style={{ background: "rgba(255,255,255,0.04)", border: `1px solid ${BORDER}`, color: TEXT }}
              >
                Back to Dashboard
              </button>
            </motion.div>
          )}

          {phase === "ready" && plan && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5 }}
              className="flex flex-col gap-8"
            >
              {/* Hero */}
              <motion.div
                initial={{ opacity: 0, y: 20, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
                className="rounded-3xl p-5 sm:p-6"
                style={{ background: "rgba(20,17,12,0.8)", border: `1px solid ${BORDER}`, animation: "glowPulse 4s ease-in-out infinite" }}
              >
                <div className="flex flex-col sm:flex-row items-start gap-4 sm:gap-6">
                  <div className="relative shrink-0 self-center sm:self-start">
                    <ProgressRing percent={completionPct} size={90} stroke={7} />
                    <div className="absolute inset-0 flex flex-col items-center justify-center" style={{ pointerEvents: "none" }}>
                      <span className="text-lg font-bold" style={{ color: TEXT }}>{completionPct}%</span>
                      <span className="text-[9px]" style={{ color: MUTED }}>done</span>
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h1 className="text-lg sm:text-xl font-bold leading-tight mb-1" style={{ color: TEXT }}>{plan.exam_name}</h1>
                    <p className="text-sm mb-3" style={{ color: MUTED }}>{plan.goal}</p>
                    <div className="flex flex-wrap gap-2 text-xs">
                      <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1" style={{ background: "rgba(212,168,86,0.08)", color: GOLD, border: "1px solid rgba(212,168,86,0.2)" }}>
                        <CalendarCheck size={10} />
                        {plan.days_until_exam <= 0 ? "Exam today!" : `${plan.days_until_exam} days to exam`}
                      </span>
                      <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1" style={{ background: "rgba(192,192,200,0.06)", color: SILVER, border: "1px solid rgba(192,192,200,0.15)" }}>
                        <BookOpen size={10} />
                        <span className="truncate max-w-[160px]">{plan.doc_titles?.join(", ") || "Your documents"}</span>
                      </span>
                    </div>
                  </div>
                </div>

                <div className="mt-5 h-1.5 w-full rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.05)" }}>
                  <motion.div
                    className="h-full rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: `${completionPct}%` }}
                    transition={{ duration: 1, ease: [0.22, 1, 0.36, 1], delay: 0.3 }}
                    style={{ background: completionPct >= 80 ? "linear-gradient(90deg,#34d399,#6ee7b7)" : `linear-gradient(90deg,${GOLD},${PEACH})` }}
                  />
                </div>
                <div className="flex justify-between mt-1.5">
                  <span className="text-[10px]" style={{ color: MUTED }}>{plan.completed_tasks} of {plan.total_tasks} tasks completed</span>
                  <span className="text-[10px]" style={{ color: MUTED }}>{plan.items?.length} {plan.granularity} sessions</span>
                </div>
              </motion.div>

              {/* Stats — mobile: 2-col, sm+: 3-col */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <StatCard index={0} icon={Target}       label="Sessions"  value={plan.items?.length || 0}  accent={GOLD} />
                <StatCard index={1} icon={CheckCircle2} label="Done"      value={plan.completed_tasks}       accent="#34d399" />
                <StatCard index={2} icon={Clock}        label="Daily"     value={`${plan.daily_hours}h`}    accent={SILVER} />
              </div>

              {/* Schedule */}
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <Sparkles size={14} style={{ color: GOLD }} />
                  <h2 className="text-sm font-semibold uppercase tracking-widest" style={{ color: "rgba(212,168,86,0.6)" }}>
                    Your Schedule
                  </h2>
                </div>
                <div className="flex flex-col gap-3">
                  {plan.items.map((item, idx) => (
                    <ScheduleCard
                      key={item.index ?? idx}
                      item={item}
                      itemIndex={idx}
                      onToggleTask={toggleTaskDone}
                      onSetStatus={setItemStatus}
                      animDelay={idx * 60}
                    />
                  ))}
                </div>
              </div>

              <AnimatePresence>
                {completionPct === 100 && (
                  <motion.div
                    initial={{ opacity: 0, y: 16, scale: 0.96 }}
                    animate={{ opacity: 1, y: 0,  scale: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                    className="rounded-2xl p-6 text-center flex flex-col items-center gap-3"
                    style={{ background: "rgba(52,211,153,0.06)", border: "1px solid rgba(52,211,153,0.2)" }}
                  >
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl" style={{ background: "rgba(52,211,153,0.1)", border: "1px solid rgba(52,211,153,0.2)" }}>
                      <PartyPopper size={22} style={{ color: "#34d399" }} />
                    </div>
                    <p className="font-semibold" style={{ color: "#34d399" }}>Plan complete — you're ready.</p>
                    <p className="text-sm" style={{ color: MUTED }}>All {plan.total_tasks} tasks done. Good luck on {plan.exam_name}!</p>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}
        </div>
      </div>

      <AppFooter />
    </div>
  );
};

export default StudyPlanPage;