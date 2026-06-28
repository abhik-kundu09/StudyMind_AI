// frontend/src/pages/Quiz/TakeQuiz.jsx
import { useEffect, useState } from "react";
import {
  CheckCircle2,
  XCircle,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  X,
} from "lucide-react";

const OptionLetter = ["A", "B", "C", "D", "E", "F"];

// ── Single question card (answering mode) ──────────────────────────────────

const QuestionCard = ({ question, index, total, selected, onSelect }) => (
  <div
    className="rounded-2xl p-6"
    style={{ background: "rgba(20,17,12,0.7)", border: "1px solid rgba(212,168,86,0.15)" }}
  >
    <p className="text-xs font-medium mb-3" style={{ color: "rgba(212,168,86,0.5)" }}>
      Question {index + 1} of {total}
    </p>
    <p className="text-base leading-relaxed mb-5" style={{ color: "#F0E6D2" }}>
      {question.question_text}
    </p>

    <div className="flex flex-col gap-2">
      {question.options.map((opt, i) => {
        const isSelected = selected === i;
        return (
          <button
            key={i}
            onClick={() => onSelect(question.id, i)}
            className="flex items-center gap-3 rounded-xl px-4 py-3 text-left text-sm transition-all"
            style={{
              background: isSelected ? "rgba(212,168,86,0.12)" : "rgba(255,255,255,0.02)",
              border: isSelected ? "1px solid rgba(212,168,86,0.45)" : "1px solid rgba(212,168,86,0.1)",
              color: isSelected ? "#F0E6D2" : "rgba(180,195,230,0.7)",
            }}
          >
            <span
              className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold"
              style={{
                background: isSelected ? "#D4A856" : "rgba(255,255,255,0.05)",
                color: isSelected ? "#0A0908" : "rgba(180,195,230,0.5)",
              }}
            >
              {OptionLetter[i]}
            </span>
            {opt}
          </button>
        );
      })}
    </div>
  </div>
);

// ── Results view ────────────────────────────────────────────────────────────

const ResultsView = ({ result, onRetake, onClose }) => {
  const scoreColor =
    result.score_percent >= 70 ? "#34d399" : result.score_percent >= 40 ? "#D4A856" : "#f87171";

  return (
    <div className="flex flex-col gap-6">
      <div
        className="flex flex-col items-center gap-2 rounded-2xl p-8"
        style={{ background: "rgba(20,17,12,0.7)", border: "1px solid rgba(212,168,86,0.15)" }}
      >
        <p className="text-xs font-medium uppercase tracking-widest" style={{ color: "rgba(180,195,230,0.4)" }}>
          Your Score
        </p>
        <p className="text-5xl font-bold" style={{ color: scoreColor }}>
          {result.score_percent}%
        </p>
        <p className="text-sm" style={{ color: "rgba(180,195,230,0.6)" }}>
          {result.score} of {result.total_questions} correct
          {result.time_taken_seconds != null && ` · ${Math.round(result.time_taken_seconds / 60)} min`}
        </p>
      </div>

      <div className="flex flex-col gap-3">
        {result.answers.map((a, idx) => (
          <div
            key={a.question_id}
            className="rounded-2xl p-5"
            style={{
              background: "rgba(20,17,12,0.7)",
              border: `1px solid ${a.is_correct ? "rgba(52,211,153,0.25)" : "rgba(248,113,113,0.25)"}`,
            }}
          >
            <div className="flex items-start gap-2 mb-3">
              {a.is_correct ? (
                <CheckCircle2 size={16} className="mt-0.5 shrink-0" style={{ color: "#34d399" }} />
              ) : (
                <XCircle size={16} className="mt-0.5 shrink-0" style={{ color: "#f87171" }} />
              )}
              <p className="text-sm leading-relaxed" style={{ color: "#F0E6D2" }}>
                {idx + 1}. {a.question_text}
              </p>
            </div>

            <div className="flex flex-col gap-1.5 ml-6">
              {a.options.map((opt, i) => {
                const isCorrectOpt = i === a.correct_index;
                const isSelectedOpt = i === a.selected_index;
                let style = { color: "rgba(180,195,230,0.4)" };
                if (isCorrectOpt) style = { color: "#34d399", fontWeight: 500 };
                else if (isSelectedOpt && !a.is_correct) style = { color: "#f87171", fontWeight: 500 };

                return (
                  <p key={i} className="text-xs" style={style}>
                    {OptionLetter[i]}. {opt}
                    {isCorrectOpt && " ✓"}
                    {isSelectedOpt && !isCorrectOpt && " (your answer)"}
                  </p>
                );
              })}
            </div>

            {a.explanation && (
              <p
                className="mt-3 ml-6 text-xs leading-relaxed"
                style={{ color: "rgba(180,195,230,0.5)" }}
              >
                {a.explanation}
              </p>
            )}
          </div>
        ))}
      </div>

      <div className="flex gap-3">
        <button
          onClick={onRetake}
          className="flex flex-1 items-center justify-center gap-2 rounded-xl py-3 text-sm font-medium transition-all"
          style={{
            background: "rgba(255,255,255,0.03)",
            border: "1px solid rgba(212,168,86,0.18)",
            color: "#E2E8F8",
          }}
        >
          <RotateCcw size={14} />
          New Quiz
        </button>
        <button
          onClick={onClose}
          className="flex flex-1 items-center justify-center gap-2 rounded-xl py-3 text-sm font-medium transition-all"
          style={{ background: "linear-gradient(135deg, #D4A856, #E8B894)", color: "#0A0908" }}
        >
          Done
        </button>
      </div>
    </div>
  );
};

// ── Main component ──────────────────────────────────────────────────────────
//
// Props:
//   quizState   — the object returned by useQuiz() (phase, quiz, result, submit)
//   onClose     — called when the user is done (closes the take-quiz view)
//   onRetake    — called from results screen to start a fresh quiz (reopens generate modal)

const TakeQuiz = ({ quizState, onClose, onRetake }) => {
  const { quiz, result, phase, submit } = quizState;
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState({}); // { [question_id]: selected_index }
  const [startTime] = useState(() => Date.now());

  // Reset local answering state whenever a new quiz loads
  useEffect(() => {
    setCurrentIndex(0);
    setAnswers({});
  }, [quiz?.id]);

  if (phase === "graded" && result) {
    return <ResultsView result={result} onRetake={onRetake} onClose={onClose} />;
  }

  if (!quiz) return null;

  const total = quiz.questions.length;
  const currentQuestion = quiz.questions[currentIndex];
  const isLast = currentIndex === total - 1;
  const allAnswered = quiz.questions.every((q) => answers[q.id] !== undefined);

  const handleSelect = (questionId, index) => {
    setAnswers((prev) => ({ ...prev, [questionId]: index }));
  };

  const handleSubmit = () => {
    const payload = Object.entries(answers).map(([question_id, selected_index]) => ({
      question_id,
      selected_index,
    }));
    const timeTakenSeconds = Math.round((Date.now() - startTime) / 1000);
    submit(payload, timeTakenSeconds);
  };

  return (
    <div className="flex flex-col gap-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold" style={{ color: "#F0E6D2" }}>
            {quiz.title}
          </h2>
          <p className="text-xs mt-0.5" style={{ color: "rgba(180,195,230,0.4)" }}>
            {Object.keys(answers).length} of {total} answered
          </p>
        </div>
        <button onClick={onClose} className="rounded-lg p-1.5" style={{ color: "rgba(180,195,230,0.4)" }}>
          <X size={16} />
        </button>
      </div>

      {/* Progress bar */}
      <div className="h-1 w-full overflow-hidden rounded-full" style={{ background: "rgba(255,255,255,0.06)" }}>
        <div
          className="h-full rounded-full transition-all duration-300"
          style={{
            width: `${((currentIndex + 1) / total) * 100}%`,
            background: "linear-gradient(90deg, #D4A856, #E8B894)",
          }}
        />
      </div>

      <QuestionCard
        question={currentQuestion}
        index={currentIndex}
        total={total}
        selected={answers[currentQuestion.id]}
        onSelect={handleSelect}
      />

      {/* Navigation */}
      <div className="flex items-center justify-between gap-3">
        <button
          onClick={() => setCurrentIndex((i) => Math.max(0, i - 1))}
          disabled={currentIndex === 0}
          className="flex items-center gap-1 rounded-xl px-4 py-2.5 text-sm font-medium transition-all disabled:opacity-30 disabled:cursor-not-allowed"
          style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(212,168,86,0.15)", color: "#E2E8F8" }}
        >
          <ChevronLeft size={14} />
          Previous
        </button>

        {isLast ? (
          <button
            onClick={handleSubmit}
            disabled={!allAnswered || phase === "submitting"}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-medium transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            style={{ background: "linear-gradient(135deg, #D4A856, #E8B894)", color: "#0A0908" }}
          >
            {phase === "submitting" ? "Submitting…" : "Submit Quiz"}
          </button>
        ) : (
          <button
            onClick={() => setCurrentIndex((i) => Math.min(total - 1, i + 1))}
            className="flex items-center gap-1 rounded-xl px-4 py-2.5 text-sm font-medium transition-all"
            style={{ background: "rgba(212,168,86,0.1)", border: "1px solid rgba(212,168,86,0.25)", color: "#D4A856" }}
          >
            Next
            <ChevronRight size={14} />
          </button>
        )}
      </div>
    </div>
  );
};

export default TakeQuiz;