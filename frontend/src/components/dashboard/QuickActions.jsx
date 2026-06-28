// components/dashboard/QuickActions.jsx
// Single Quick Actions widget — replaces both StrategicActions and the old empty slot.
// All 4 buttons get uniform gold glow on hover via whileHover boxShadow.
import { MessageSquare, Sparkles, CalendarClock, Layers, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";

const ACTIONS = [
  {
    icon: Sparkles,
    label: "Generate Quiz",
    sub: "Test yourself on any document",
    color: "#D4A856",
    glowColor: "rgba(212,168,86,0.18)",
    borderActive: "rgba(212,168,86,0.45)",
    bgActive: "linear-gradient(135deg, rgba(212,168,86,0.13), rgba(232,184,148,0.07))",
    primary: true,
  },
  {
    icon: MessageSquare,
    label: "Ask StudyMind",
    sub: "Chat with your study materials",
    path: "/chat",
    color: "#C0C0C8",
    glowColor: "rgba(192,192,200,0.14)",
    borderActive: "rgba(192,192,200,0.35)",
    bgActive: "rgba(192,192,200,0.07)",
  },
  {
    icon: CalendarClock,
    label: "Study Plan",
    sub: "Build your exam schedule",
    color: "#E8B894",
    glowColor: "rgba(232,184,148,0.16)",
    borderActive: "rgba(232,184,148,0.4)",
    bgActive: "rgba(232,184,148,0.07)",
    isPlan: true,
  },
  {
    icon: Layers,
    label: "Flashcards",
    sub: "Review due cards",
    path: "/flashcards",
    color: "#C0C0C8",
    glowColor: "rgba(192,192,200,0.14)",
    borderActive: "rgba(192,192,200,0.35)",
    bgActive: "rgba(192,192,200,0.07)",
  },
];

const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08, delayChildren: 0.05 } },
};

const itemVariants = {
  hidden:  { opacity: 0, x: 14 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.38, ease: [0.22, 1, 0.36, 1] } },
};

export default function QuickActions({ onGenerateQuiz, onOpenStudyPlan }) {
  const navigate = useNavigate();

  const handleClick = (action) => {
    if (action.path)    return navigate(action.path);
    if (action.primary) return onGenerateQuiz?.();
    if (action.isPlan)  return onOpenStudyPlan?.();
  };

  return (
    <div className="flex flex-col gap-4 h-full">
      <div className="flex items-center gap-2">
        <div className="h-px flex-1" style={{ background: "rgba(212,168,86,0.12)" }} />
        <h2 className="text-xs font-semibold uppercase tracking-widest" style={{ color: "rgba(212,168,86,0.5)" }}>
          Quick Actions
        </h2>
        <div className="h-px flex-1" style={{ background: "rgba(212,168,86,0.12)" }} />
      </div>

      <motion.div
        className="flex flex-col gap-2"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {ACTIONS.map((action) => {
          const Icon = action.icon;
          return (
            <motion.button
              key={action.label}
              variants={itemVariants}
              onClick={() => handleClick(action)}
              whileHover={{
                x: 4,
                boxShadow: `0 0 24px ${action.glowColor}, inset 0 0 0 1px ${action.borderActive}`,
                background: action.bgActive,
                transition: { duration: 0.2 },
              }}
              whileTap={{ scale: 0.975 }}
              className="group flex items-center gap-3 rounded-2xl px-4 py-3 text-left w-full cursor-pointer"
              style={{
                background: action.primary
                  ? "linear-gradient(135deg, rgba(212,168,86,0.1), rgba(232,184,148,0.05))"
                  : "rgba(20,17,12,0.65)",
                border: action.primary
                  ? "1px solid rgba(212,168,86,0.28)"
                  : "1px solid rgba(212,168,86,0.1)",
              }}
            >
              <motion.div
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl"
                style={{
                  background: `${action.color}14`,
                  border: `1px solid ${action.color}22`,
                }}
                whileHover={{ background: `${action.color}24`, border: `1px solid ${action.color}45` }}
              >
                <Icon size={15} style={{ color: action.color }} />
              </motion.div>

              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium" style={{ color: "#F0E6D2" }}>{action.label}</p>
                <p className="text-xs mt-0.5" style={{ color: "rgba(180,195,230,0.4)" }}>{action.sub}</p>
              </div>

              <motion.div
                initial={{ opacity: 0, x: -4 }}
                whileHover={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.18 }}
                className="shrink-0"
              >
                <ArrowRight size={13} style={{ color: action.color }} />
              </motion.div>
            </motion.button>
          );
        })}
      </motion.div>
    </div>
  );
}