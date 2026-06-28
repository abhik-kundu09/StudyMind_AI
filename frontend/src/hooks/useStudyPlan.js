// frontend/src/hooks/useStudyPlan.js
// State machine: "idle" → "generating" → "ready" → "error"
// Mirrors useQuiz.js patterns (useCallback, useRef for polling, toast on errors).

import { useCallback, useRef, useState } from "react";
import { toast } from "sonner";
import {
  generateStudyPlan,
  getStudyPlan,
  getStudyPlanStatus,
  listStudyPlans,
  toggleTask,
  updateItemStatus,
} from "../api/study_plan";

const POLL_INTERVAL_MS = 2000;
const POLL_TIMEOUT_MS  = 90_000; // study plan LLM call can be heavier than quiz

// Phases: "idle" → "generating" → "ready" → "error"
export function useStudyPlan() {
  const [phase,        setPhase]        = useState("idle");
  const [planId,       setPlanId]       = useState(null);
  const [plan,         setPlan]         = useState(null);  // StudyPlanPublic
  const [errorMessage, setErrorMessage] = useState(null);

  const pollRef      = useRef(null);
  const pollStartRef = useRef(null);

  // ── Internals ───────────────────────────────────────────────────────────────

  const stopPolling = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  const reset = useCallback(() => {
    stopPolling();
    setPhase("idle");
    setPlanId(null);
    setPlan(null);
    setErrorMessage(null);
  }, [stopPolling]);

  const fetchFullPlan = useCallback(async (id) => {
    try {
      const { data } = await getStudyPlan(id);
      setPlan(data);
      setPhase("ready");
    } catch (err) {
      const msg = err?.response?.data?.detail ?? "Could not load study plan.";
      setErrorMessage(msg);
      setPhase("error");
      toast.error(msg);
    }
  }, []);

  // Poll /status until ready or failed (mirrors useQuiz.js startPolling)
  const startPolling = useCallback(
    (id) => {
      pollStartRef.current = Date.now();
      pollRef.current = setInterval(async () => {
        try {
          const { data } = await getStudyPlanStatus(id);

          if (data.status === "ready") {
            stopPolling();
            await fetchFullPlan(id);
            return;
          }
          if (data.status === "failed") {
            stopPolling();
            const msg = data.error_message ?? "Study plan generation failed.";
            setErrorMessage(msg);
            setPhase("error");
            toast.error(msg);
            return;
          }
          // still "generating" — check timeout
          if (Date.now() - pollStartRef.current > POLL_TIMEOUT_MS) {
            stopPolling();
            setErrorMessage("Study plan generation timed out. Please try again.");
            setPhase("error");
            toast.error("Study plan generation timed out.");
          }
        } catch {
          // transient network error — retry on next tick
        }
      }, POLL_INTERVAL_MS);
    },
    [fetchFullPlan, stopPolling]
  );

  // ── Public actions ──────────────────────────────────────────────────────────

  const generate = useCallback(
    async (docIds, examName, examDate, goal, dailyHours) => {
      reset();
      setPhase("generating");
      try {
        const { data } = await generateStudyPlan(
          docIds, examName, examDate, goal, dailyHours
        );
        setPlanId(data.plan_id);

        if (data.status === "ready") {
          await fetchFullPlan(data.plan_id);
        } else if (data.status === "failed") {
          setErrorMessage("Study plan generation failed.");
          setPhase("error");
          toast.error("Study plan generation failed.");
        } else {
          // "generating" — future async path
          startPolling(data.plan_id);
        }
      } catch (err) {
        const msg = err?.response?.data?.detail ?? "Could not start plan generation.";
        setErrorMessage(msg);
        setPhase("error");
        toast.error(msg);
      }
    },
    [reset, fetchFullPlan, startPolling]
  );

  // Optimistic task toggle — update local state immediately, then sync to server
  const toggleTaskDone = useCallback(
    async (itemIndex, taskIndex, done) => {
      if (!planId || !plan) return;

      // Optimistic update
      setPlan((prev) => {
        if (!prev) return prev;
        const items = prev.items.map((item, iIdx) => {
          if (iIdx !== itemIndex) return item;
          return {
            ...item,
            tasks: item.tasks.map((task, tIdx) =>
              tIdx === taskIndex ? { ...task, done } : task
            ),
          };
        });
        const completedTasks = items
          .flatMap((i) => i.tasks)
          .filter((t) => t.done).length;
        return { ...prev, items, completed_tasks: completedTasks };
      });

      try {
        await toggleTask(planId, itemIndex, taskIndex, done);
      } catch {
        // Rollback optimistic update on failure
        toast.error("Failed to save. Please try again.");
        await fetchFullPlan(planId);
      }
    },
    [planId, plan, fetchFullPlan]
  );

  // Update item-level status (pending / in_progress / done)
  const setItemStatus = useCallback(
    async (itemIndex, newStatus) => {
      if (!planId) return;

      // Optimistic update
      setPlan((prev) => {
        if (!prev) return prev;
        const items = prev.items.map((item, idx) =>
          idx === itemIndex ? { ...item, status: newStatus } : item
        );
        return { ...prev, items };
      });

      try {
        await updateItemStatus(planId, itemIndex, newStatus);
      } catch {
        toast.error("Failed to update status.");
        await fetchFullPlan(planId);
      }
    },
    [planId, fetchFullPlan]
  );

  // Load an existing plan by ID (e.g. navigating directly to /study-plan/:id)
  const loadPlan = useCallback(
    async (id) => {
      reset();
      setPhase("generating"); // show loading state while fetching
      setPlanId(id);
      await fetchFullPlan(id);
    },
    [reset, fetchFullPlan]
  );

  return {
    phase,         // "idle" | "generating" | "ready" | "error"
    planId,
    plan,          // StudyPlanPublic | null
    errorMessage,
    generate,
    loadPlan,
    toggleTaskDone,
    setItemStatus,
    reset,
  };
}

// ── List hook (dashboard) ─────────────────────────────────────────────────────
// Separate from useStudyPlan to avoid coupling the list fetch to the generation flow.

import { useEffect, useState as useStateAlias } from "react";

export function useStudyPlanList() {
  const [plans,   setPlans]   = useStateAlias([]);
  const [loading, setLoading] = useStateAlias(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await listStudyPlans();
      setPlans(data);
    } catch {
      // non-fatal — dashboard still works without plan history
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  return { plans, loading, refresh };
}