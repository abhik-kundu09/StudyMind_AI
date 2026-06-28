// components/dashboard/ActivityBanner.jsx — Stage 10
import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { Flame, CalendarDays, ListChecks, Layers, TrendingUp } from "lucide-react";
import Skeleton from "../ui/Skeleton";

const GOLD   = "#D4A856";
const PEACH  = "#E8B894";
const SILVER = "#C0C0C8";
const BORDER = "rgba(212,168,86,0.15)";
const MUTED  = "rgba(180,195,230,0.45)";
const TEXT   = "#F0E6D2";

const AnimatedCount = ({ target, suffix = "", duration = 1200 }) => {
  const [val, setVal] = useState(0);
  const raf = useRef(null);
  useEffect(() => {
    if (target === 0) { setVal(0); return; }
    const start = performance.now();
    const tick = (now) => {
      const pct  = Math.min((now - start) / duration, 1);
      const ease = 1 - Math.pow(1 - pct, 3);
      setVal(Math.round(ease * target));
      if (pct < 1) raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
  }, [target, duration]);
  return <span>{val}{suffix}</span>;
};

const StatCard = ({ icon: Icon, label, value, suffix, accent, delay }) => {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setVisible(true), delay);
    return () => clearTimeout(t);
  }, [delay]);

  return (
    <motion.div
      animate={{
        opacity: visible ? 1 : 0,
        y: visible ? 0 : 16,
        boxShadow: "0 0 0px rgba(212,168,86,0)",
      }}
      whileHover={{ boxShadow: `0 0 20px ${accent}18`, borderColor: `${accent}30` }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      className="flex flex-col gap-2 rounded-2xl p-4"
      style={{
        background: "rgba(20,17,12,0.6)",
        border: `1px solid ${BORDER}`,
      }}
    >
      <div className="flex items-center gap-2">
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl" style={{ background: `${accent}15`, border: `1px solid ${accent}25` }}>
          <Icon size={13} style={{ color: accent }} />
        </div>
        <p className="text-[10px] font-semibold uppercase tracking-widest truncate" style={{ color: MUTED }}>{label}</p>
      </div>
      <p className="text-2xl font-bold tracking-tight" style={{ color: TEXT }}>
        {visible
          ? <AnimatedCount target={typeof value === "number" ? value : 0} suffix={suffix} />
          : "0"
        }
      </p>
    </motion.div>
  );
};

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl px-3 py-2 text-xs flex flex-col gap-1.5" style={{ background: "rgba(10,9,8,0.97)", border: `1px solid ${BORDER}`, backdropFilter: "blur(8px)" }}>
      <p className="font-medium" style={{ color: MUTED }}>{label}</p>
      {payload.map((p) => (
        <div key={p.dataKey} className="flex items-center gap-2">
          <div className="h-1.5 w-3 rounded-full" style={{ background: p.color }} />
          <span style={{ color: TEXT }}>{p.name}: <span style={{ color: p.color, fontWeight: 600 }}>{p.value}</span></span>
        </div>
      ))}
    </div>
  );
};

const BannerSkeleton = () => (
  <div className="w-full rounded-3xl p-5 sm:p-6" style={{ background: "rgba(14,12,10,0.8)", border: `1px solid ${BORDER}` }}>
    <div className="flex flex-col gap-4 lg:flex-row lg:items-stretch">
      <div className="grid grid-cols-2 gap-3 lg:w-72 lg:shrink-0">
        {[1,2,3,4].map(i => <Skeleton key={i} className="h-20 rounded-2xl" />)}
      </div>
      <div className="flex-1 min-w-0">
        <Skeleton className="h-full rounded-2xl" style={{ minHeight: 160 }} />
      </div>
    </div>
  </div>
);

const LINES = [
  { key: "quizzes",    name: "Quizzes",    color: GOLD,   gradId: "goldGrad",   stopOpacity: 0.25 },
  { key: "studyDays",  name: "Study Days", color: SILVER, gradId: "silverGrad", stopOpacity: 0.15 },
  { key: "flashcards", name: "Flashcards", color: PEACH,  gradId: "peachGrad",  stopOpacity: 0.15 },
];

const ActivityBanner = ({ summary, loading }) => {
  const [chartVisible, setChartVisible] = useState(false);

  useEffect(() => {
    if (!loading && summary) {
      const t = setTimeout(() => setChartVisible(true), 300);
      return () => clearTimeout(t);
    }
  }, [loading, summary]);

  if (loading || !summary) return <BannerSkeleton />;

  const chartData = summary.activity.map((d) => ({
    day:        new Date(d.date + "T00:00:00").toLocaleDateString("en-US", { weekday: "short" }),
    quizzes:    d.quizzes,
    studyDays:  d.study_days,
    flashcards: d.flashcards ?? 0,
  }));

  const hasActivity = chartData.some((d) => d.quizzes > 0 || d.studyDays > 0 || d.flashcards > 0);
  const maxVal      = Math.max(...chartData.map((d) => Math.max(d.quizzes, d.studyDays, d.flashcards)), 1);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
      className="w-full rounded-3xl overflow-hidden"
      style={{
        background: "rgba(14,12,10,0.8)",
        border: `1px solid ${BORDER}`,
        backdropFilter: "blur(12px)",
        boxShadow: "0 0 60px rgba(212,168,86,0.04), inset 0 1px 0 rgba(212,168,86,0.08)",
      }}
    >
      <div className="h-px w-full" style={{ background: `linear-gradient(90deg, transparent, ${GOLD}60, ${PEACH}40, transparent)` }} />

      <div className="p-4 sm:p-6">
        <div className="flex items-center gap-2 mb-4 sm:mb-5">
          <TrendingUp size={13} style={{ color: GOLD }} />
          <h2 className="text-xs font-semibold uppercase tracking-widest" style={{ color: "rgba(212,168,86,0.6)" }}>Weekly Progress</h2>
          <div className="flex-1 h-px ml-2" style={{ background: `linear-gradient(90deg, ${BORDER}, transparent)` }} />
          <span className="text-[10px]" style={{ color: MUTED }}>Last 7 days</span>
        </div>

        <div className="flex flex-col gap-4 lg:flex-row lg:items-stretch">
          {/* Stat cards — 2x2 grid on all sizes */}
          <div className="grid grid-cols-2 gap-3 lg:w-72 lg:shrink-0">
            <StatCard icon={Flame}        label="Streak"     value={summary.streak}            suffix="d" accent="#f97316" delay={0}   />
            <StatCard icon={ListChecks}   label="Quizzes"    value={summary.total_quizzes}      suffix=""  accent={GOLD}   delay={100} />
            <StatCard icon={CalendarDays} label="Study Days" value={summary.study_days}         suffix=""  accent={SILVER} delay={200} />
            <StatCard icon={Layers}       label="Flashcards" value={summary.flashcard_sessions} suffix=""  accent={PEACH}  delay={300} />
          </div>

          <div className="hidden lg:block w-px shrink-0" style={{ background: BORDER }} />

          {/* Chart */}
          <motion.div
            className="flex-1 min-w-0 rounded-2xl p-3 sm:p-4"
            animate={{ opacity: chartVisible ? 1 : 0, x: chartVisible ? 0 : 20 }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            style={{
              background: "rgba(255,255,255,0.015)",
              border: "1px solid rgba(212,168,86,0.08)",
              minHeight: 160,
            }}
          >
            <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
              <p className="text-[10px] uppercase tracking-widest font-medium" style={{ color: MUTED }}>7-Day Activity</p>
              <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
                {LINES.map(({ color, name }) => (
                  <div key={name} className="flex items-center gap-1.5">
                    <div className="h-1.5 w-3 rounded-full" style={{ background: color }} />
                    <p className="text-[10px]" style={{ color: MUTED }}>{name}</p>
                  </div>
                ))}
              </div>
            </div>

            {!hasActivity ? (
              <div className="flex h-24 items-center justify-center">
                <p className="text-xs text-center max-w-[200px]" style={{ color: "rgba(180,195,230,0.2)" }}>
                  Take a quiz or complete a study plan to see your activity here.
                </p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={120}>
                <AreaChart data={chartData} margin={{ top: 4, right: 4, left: -28, bottom: 0 }}>
                  <defs>
                    {LINES.map(({ gradId, color, stopOpacity }) => (
                      <linearGradient key={gradId} id={gradId} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%"  stopColor={color} stopOpacity={stopOpacity} />
                        <stop offset="95%" stopColor={color} stopOpacity={0} />
                      </linearGradient>
                    ))}
                  </defs>
                  <XAxis dataKey="day" tick={{ fill: MUTED, fontSize: 9 }} axisLine={false} tickLine={false} />
                  <YAxis allowDecimals={false} domain={[0, maxVal + 1]} tick={{ fill: MUTED, fontSize: 9 }} axisLine={false} tickLine={false} />
                  <Tooltip content={<CustomTooltip />} />
                  {LINES.map(({ key, name, color, gradId }) => (
                    <Area
                      key={key}
                      type="monotone"
                      dataKey={key}
                      name={name}
                      stroke={color}
                      strokeWidth={key === "flashcards" ? 1.5 : 2}
                      strokeDasharray={key === "flashcards" ? "4 3" : undefined}
                      strokeOpacity={0.8}
                      fill={`url(#${gradId})`}
                      dot={key === "flashcards" ? false : { fill: color, r: 3, strokeWidth: 0 }}
                      activeDot={key === "flashcards" ? false : { r: 4 }}
                    />
                  ))}
                </AreaChart>
              </ResponsiveContainer>
            )}
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
};

export default ActivityBanner;