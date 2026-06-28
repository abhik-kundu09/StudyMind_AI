// frontend/src/hooks/useQuiz.js
import { useCallback, useRef, useState } from "react";
import { toast } from "sonner";
import {
  generateQuiz,
  getQuiz,
  getQuizStatus,
  submitQuiz,
} from "../api/quiz";

const POLL_INTERVAL_MS = 2000;
const POLL_TIMEOUT_MS = 60000; // generation is a single LLM call — bail if it hangs

// Phases: "idle" -> "generating" -> "ready" -> "submitting" -> "graded"
//                                -> "failed" (terminal)
export function useQuiz() {
  const [phase, setPhase] = useState("idle");
  const [quizId, setQuizId] = useState(null);
  const [quiz, setQuiz] = useState(null); // QuizPublic shape (no answers)
  const [result, setResult] = useState(null); // QuizResult shape (graded)
  const [errorMessage, setErrorMessage] = useState(null);

  const pollRef = useRef(null);
  const pollStartRef = useRef(null);

  const reset = useCallback(() => {
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = null;
    setPhase("idle");
    setQuizId(null);
    setQuiz(null);
    setResult(null);
    setErrorMessage(null);
  }, []);

  const stopPolling = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  // ── Fetch the public (answer-stripped) quiz once status is ready ──────────
  const fetchPublicQuiz = useCallback(async (id) => {
    try {
      const { data } = await getQuiz(id);
      setQuiz(data);
      setPhase("ready");
    } catch (err) {
      const msg = err?.response?.data?.detail ?? "Could not load quiz.";
      setErrorMessage(msg);
      setPhase("failed");
      toast.error(msg);
    }
  }, []);

  // ── Poll /quiz/{id}/status until ready or failed ───────────────────────────
  const startPolling = useCallback(
    (id) => {
      pollStartRef.current = Date.now();
      pollRef.current = setInterval(async () => {
        try {
          const { data } = await getQuizStatus(id);

          if (data.status === "ready") {
            stopPolling();
            await fetchPublicQuiz(id);
            return;
          }
          if (data.status === "failed") {
            stopPolling();
            const msg = data.error_message ?? "Quiz generation failed.";
            setErrorMessage(msg);
            setPhase("failed");
            toast.error(msg);
            return;
          }
          // still "generating" — keep polling, unless we've timed out
          if (Date.now() - pollStartRef.current > POLL_TIMEOUT_MS) {
            stopPolling();
            setErrorMessage("Quiz generation timed out. Please try again.");
            setPhase("failed");
            toast.error("Quiz generation timed out.");
          }
        } catch {
          // transient network hiccup — let the next tick retry rather than
          // failing the whole flow on one dropped request
        }
      }, POLL_INTERVAL_MS);
    },
    [fetchPublicQuiz, stopPolling]
  );

  // ── Kick off generation ─────────────────────────────────────────────────
  const generate = useCallback(
    async (docId, questionCount, difficulty) => {
      reset();
      setPhase("generating");
      try {
        const { data } = await generateQuiz(docId, questionCount, difficulty);
        setQuizId(data.quiz_id);

        if (data.status === "ready") {
          await fetchPublicQuiz(data.quiz_id);
        } else if (data.status === "failed") {
          setErrorMessage("Quiz generation failed.");
          setPhase("failed");
          toast.error("Quiz generation failed.");
        } else {
          // "generating" — the POST itself is synchronous in the current
          // backend (single LLM call), so this branch mainly guards against
          // a future async/Celery-backed version of the endpoint.
          startPolling(data.quiz_id);
        }
      } catch (err) {
        const msg = err?.response?.data?.detail ?? "Could not start quiz generation.";
        setErrorMessage(msg);
        setPhase("failed");
        toast.error(msg);
      }
    },
    [reset, fetchPublicQuiz, startPolling]
  );

  // ── Submit answers ──────────────────────────────────────────────────────
  const submit = useCallback(
    async (answers, timeTakenSeconds) => {
      if (!quizId) return null;
      setPhase("submitting");
      try {
        const { data } = await submitQuiz(quizId, answers, timeTakenSeconds);
        setResult(data);
        setPhase("graded");
        return data;
      } catch (err) {
        const msg = err?.response?.data?.detail ?? "Could not submit quiz.";
        toast.error(msg);
        setPhase("ready"); // let them retry rather than stranding them
        return null;
      }
    },
    [quizId]
  );

  return {
    phase, // "idle" | "generating" | "ready" | "submitting" | "graded" | "failed"
    quizId,
    quiz,
    result,
    errorMessage,
    generate,
    submit,
    reset,
  };
}