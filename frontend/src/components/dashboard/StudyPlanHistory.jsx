// frontend/src/components/dashboard/StudyPlanHistory.jsx
// Sits in dashboard row 2, col-span-2. Shows past plans with progress + View link.
// Receives plans/loading as props from Dashboard (single fetch, no duplicate call).

import { useNavigate } from "react-router-dom";
import {
  Sparkles,
  ChevronRight,
  CalendarClock,
  Zap,
  CalendarDays,
  CalendarRange,
  CheckCircle2,
  Loader2,
  XCircle,
  BookOpen,
  LayoutList,
  Target,
} from "lucide-react";

// Lucide icon + color per granularity
const GRANULARITY_META = {
  hourly: { Icon: Zap,          label: "Hourly",  color: "#f87171"  },
  daily:  { Icon: CalendarDays, label: "Daily",   color: "#D4A856"  },
  weekly: { Icon: CalendarRange,label: "Weekly",  color: "#34d399"  },
};

// Lucide icon + color per plan status
const STATUS_META = {
  ready:      { Icon: CheckCircle2, color: "rgba(52,211,153,0.7)"  },
  generating: { Icon: Loader2,      color: "rgba(212,168,86,0.7)"  },
  failed:     { Icon: XCircle,      color: "rgba(248,113,113,0.7)" },
};

const PlanRow = ({ plan }) => {
  const navigate = useNavigate();
  const g = GRANULARITY_META[plan.granularity] ?? GRANULARITY_META.daily;
  const s = STATUS_META[plan.status]           ?? STATUS_META.ready;
  const GIcon   = g.Icon;
  const SIcon   = s.Icon;

  const pct = plan.total_tasks > 0
    ? Math.round((plan.completed_tasks / plan.total_tasks) * 100)
    : 0;
  const barColor = pct >= 80 ? "#34d399" : pct >= 40 ? "#D4A856" : "#E8B894";

  const daysLabel =
    plan.days_until_exam <= 0  ? "Exam passed"
    : plan.days_until_exam === 1 ? "Tomorrow"
    : `${plan.days_until_exam}d left`;

  return (
    <div
      className="flex items-center gap-3 rounded-xl px-3 py-2.5 transition-all cursor-pointer group"
      style={{ background: "rgba(255,255,255,0.02)", border: "1px solid transparent" }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = "rgba(212,168,86,0.15)"; }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = "transparent"; }}
      onClick={() => plan.status === "ready" && navigate(`/study-plan/${plan.id}`)}
    >
      {/* Granularity icon badge */}
      <div
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
        style={{ background: `${g.color}12`, border: `1px solid ${g.color}25` }}
      >
        <GIcon size={13} style={{ color: g.color }} />
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 mb-0.5">
          <p className="text-xs font-medium truncate" style={{ color: "#F0E6D2" }}>
            {plan.exam_name}
          </p>
          <SIcon
            size={10}
            className="shrink-0"
            style={{
              color: s.color,
              animation: plan.status === "generating" ? "spin 1s linear infinite" : "none",
            }}
          />
        </div>
        {plan.total_tasks > 0 ? (
          <div className="flex items-center gap-2">
            <div className="flex-1 h-1 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.05)" }}>
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{ width: `${pct}%`, background: barColor }}
              />
            </div>
            <span className="text-[10px] shrink-0" style={{ color: "rgba(180,195,230,0.4)" }}>
              {pct}%
            </span>
          </div>
        ) : (
          <p className="text-[10px]" style={{ color: "rgba(180,195,230,0.3)" }}>
            {plan.status === "generating" ? "Generating…" : "No tasks"}
          </p>
        )}
      </div>

      {/* Right meta */}
      <div className="flex flex-col items-end gap-0.5 shrink-0">
        <span className="text-[10px]" style={{ color: "rgba(180,195,230,0.35)" }}>
          {daysLabel}
        </span>
        {plan.status === "ready" && (
          <ChevronRight
            size={12}
            className="transition-transform group-hover:translate-x-0.5"
            style={{ color: "rgba(212,168,86,0.4)" }}
          />
        )}
      </div>
    </div>
  );
};

// ── Main widget ───────────────────────────────────────────────────────────────
const StudyPlanHistory = ({ onNewPlan, plans = [], loading = false }) => {
  const navigate  = useNavigate();

  const readyPlans = plans.filter(p => p.status === "ready");
  const totalTasks = readyPlans.reduce((a, p) => a + (p.total_tasks || 0), 0);
  const doneTasks  = readyPlans.reduce((a, p) => a + (p.completed_tasks || 0), 0);
  const overallPct = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0;

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <LayoutList size={12} style={{ color: "rgba(212,168,86,0.5)" }} />
          <h2 className="text-xs font-semibold uppercase tracking-widest" style={{ color: "rgba(212,168,86,0.5)" }}>
            Study Plans
          </h2>
        </div>
        <div className="flex items-center gap-2">
          {plans.length > 0 && (
            <span
              className="rounded-full px-2 py-0.5 text-[10px] font-semibold"
              style={{ background: "rgba(212,168,86,0.12)", color: "#D4A856", border: "1px solid rgba(212,168,86,0.2)" }}
            >
              {plans.length} plan{plans.length !== 1 ? "s" : ""}
            </span>
          )}
          <button
            onClick={onNewPlan}
            className="flex items-center gap-1 rounded-lg px-2.5 py-1 text-[11px] font-medium transition-all cursor-pointer hover:opacity-80 active:scale-95"
            style={{
              background: "rgba(212,168,86,0.08)",
              border: "1px solid rgba(212,168,86,0.2)",
              color: "#D4A856",
            }}
          >
            <Sparkles size={10} />
            New
          </button>
        </div>
      </div>

      <div
        className="rounded-2xl p-4 flex flex-col gap-3"
        style={{ background: "rgba(20,17,12,0.7)", border: "1px solid rgba(212,168,86,0.15)" }}
      >
        {/* Overall progress — only if ≥1 ready plan */}
        {readyPlans.length > 0 && (
          <div
            className="rounded-xl px-3 py-2.5 flex items-center gap-3"
            style={{ background: "rgba(212,168,86,0.04)", border: "1px solid rgba(212,168,86,0.1)" }}
          >
            <Target size={14} style={{ color: "#D4A856", flexShrink: 0 }} />
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-1">
                <p className="text-[11px] font-medium" style={{ color: "rgba(180,195,230,0.6)" }}>
                  Overall progress
                </p>
                <p className="text-[11px] font-bold" style={{ color: "#D4A856" }}>
                  {overallPct}%
                </p>
              </div>
              <div className="h-1 w-full rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.05)" }}>
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{
                    width: `${overallPct}%`,
                    background: overallPct >= 80
                      ? "linear-gradient(90deg, #34d399, #6ee7b7)"
                      : "linear-gradient(90deg, #D4A856, #E8B894)",
                  }}
                />
              </div>
            </div>
            <p className="text-[10px] shrink-0" style={{ color: "rgba(180,195,230,0.35)" }}>
              {doneTasks}/{totalTasks}
            </p>
          </div>
        )}

        {/* Plan list */}
        {loading && (
          <div className="flex flex-col gap-2">
            {[1, 2].map(i => (
              <div
                key={i}
                className="h-12 rounded-xl"
                style={{ background: "rgba(255,255,255,0.02)", animation: "pulse 2s infinite" }}
              />
            ))}
            <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}`}</style>
          </div>
        )}

        {!loading && plans.length === 0 && (
          <div className="flex flex-col items-center gap-3 py-6">
            <div
              className="flex h-10 w-10 items-center justify-center rounded-xl"
              style={{ background: "rgba(212,168,86,0.06)", border: "1px solid rgba(212,168,86,0.12)" }}
            >
              <BookOpen size={16} style={{ color: "rgba(212,168,86,0.4)" }} />
            </div>
            <p className="text-xs text-center" style={{ color: "rgba(180,195,230,0.35)" }}>
              No study plans yet
            </p>
            <button
              onClick={onNewPlan}
              className="text-xs font-medium transition-all cursor-pointer hover:opacity-80 active:scale-95"
              style={{ color: "#D4A856" }}
            >
              Create your first plan →
            </button>
          </div>
        )}

        {!loading && plans.length > 0 && (
          <div className="flex flex-col gap-1">
            {plans.slice(0, 5).map(plan => (
              <PlanRow key={plan.id} plan={plan} />
            ))}
            {plans.length > 5 && (
              <p
                className="text-center text-[10px] pt-1 cursor-pointer transition-all hover:opacity-80"
                style={{ color: "rgba(212,168,86,0.5)" }}
                onClick={() => navigate("/dashboard")}
              >
                +{plans.length - 5} more plans
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default StudyPlanHistory;