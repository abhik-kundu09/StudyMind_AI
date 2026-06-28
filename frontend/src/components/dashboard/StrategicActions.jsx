// components/dashboard/StrategicActions.jsx — Stage 9 update
// Changes: Flashcards button no longer disabled, onClick navigates to /flashcards
// Description updated from "Coming soon — Stage 9" to actual description

import { Sparkles, MessageSquare, Layers, CalendarClock } from "lucide-react";
import { useNavigate } from "react-router-dom";

const ActionButton = ({ icon: Icon, label, description, onClick, primary, disabled }) => (
  <button
    onClick={onClick}
    disabled={disabled}
    className="flex w-full items-center gap-3 rounded-2xl p-4 text-left transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer hover:opacity-80"
    style={{
      background: primary ? "linear-gradient(135deg, rgba(212,168,86,0.12), rgba(232,184,148,0.08))" : "rgba(20,17,12,0.7)",
      border: primary ? "1px solid rgba(212,168,86,0.35)" : "1px solid rgba(212,168,86,0.12)",
    }}
  >
    <div
      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl"
      style={{
        background: primary ? "rgba(212,168,86,0.2)" : "rgba(192,192,200,0.08)",
        color: primary ? "#D4A856" : "rgba(192,192,200,0.6)",
      }}
    >
      <Icon size={16} />
    </div>
    <div className="min-w-0">
      <p className="text-sm font-medium" style={{ color: "#F0E6D2" }}>
        {label}
      </p>
      <p className="text-xs mt-0.5" style={{ color: "rgba(180,195,230,0.4)" }}>
        {description}
      </p>
    </div>
  </button>
);

const StrategicActions = ({ onGenerateQuiz, onOpenStudyPlan }) => {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-xs font-semibold uppercase tracking-widest" style={{ color: "rgba(212,168,86,0.5)" }}>
        Quick Actions
      </h2>

      <div className="flex flex-col gap-3">
        <ActionButton
          icon={Sparkles}
          label="Generate Quiz"
          description="Test yourself on any of your documents"
          onClick={() => onGenerateQuiz()}
          primary
        />
        <ActionButton
          icon={MessageSquare}
          label="Ask StudyMind"
          description="Chat with your study materials"
          onClick={() => navigate("/chat")}
        />
        <ActionButton
          icon={CalendarClock}
          label="Study Plan"
          description="AI-powered exam preparation schedule"
          onClick={() => onOpenStudyPlan()}
        />
        <ActionButton
          icon={Layers}
          label="Flashcards"
          description="Spaced repetition from your documents"
          onClick={() => navigate("/flashcards")}
          primary={false}
        />
      </div>
    </div>
  );
};

export default StrategicActions;