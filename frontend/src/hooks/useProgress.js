import { useState, useEffect, useCallback } from "react";
import { getProgressSummary } from "../api/progress";

export function useProgress() {
  const [summary, setSummary]   = useState(null);
  const [loading, setLoading]   = useState(true);
  const [error,   setError]     = useState(null);

  const fetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getProgressSummary();
      setSummary(res.data);
    } catch {
      setError("Failed to load progress");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  return { summary, loading, error, refetch: fetch };
}