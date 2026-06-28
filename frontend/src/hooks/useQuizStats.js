// frontend/src/hooks/useQuizStats.js
import { useCallback, useEffect, useState } from "react";
import { getQuizHistory, listQuizzes } from "../api/quiz";

export function useQuizStats() {
  const [quizzes, setQuizzes] = useState([]);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  const refetch = useCallback(async () => {
    setLoading(true);
    try {
      const [quizzesRes, historyRes] = await Promise.all([
        listQuizzes(),
        getQuizHistory(50),
      ]);
      setQuizzes(quizzesRes.data ?? []);
      setHistory(historyRes.data ?? []);
    } catch {
      // Non-fatal — dashboard stats are supplementary, not blocking.
      // Leave previous state in place rather than wiping it on a transient error.
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refetch();
  }, [refetch]);

  const totalQuizzes = quizzes.length;
  const totalAttempts = history.length;
  const bestScore =
    history.length > 0 ? Math.max(...history.map((h) => h.score_percent)) : null;
  const avgScore =
    history.length > 0
      ? Math.round(
          (history.reduce((sum, h) => sum + h.score_percent, 0) / history.length) * 10
        ) / 10
      : null;

  return {
    quizzes,
    history,
    loading,
    totalQuizzes,
    totalAttempts,
    bestScore,
    avgScore,
    refetch,
  };
}